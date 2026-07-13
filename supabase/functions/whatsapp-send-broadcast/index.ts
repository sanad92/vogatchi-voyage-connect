import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function computeAppSecretProof(token: string, appSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(p: string): string {
  return (p || '').replace(/[^\d]/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { broadcastId } = await req.json();
    if (!broadcastId) {
      return new Response(JSON.stringify({ error: 'broadcastId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: broadcast, error: bErr } = await supabase
      .from('whatsapp_broadcasts').select('*').eq('id', broadcastId).single();
    if (bErr || !broadcast) throw new Error(bErr?.message || 'broadcast not found');

    if (broadcast.status === 'sending' || broadcast.status === 'completed') {
      return new Response(JSON.stringify({ error: 'already processed' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load active WhatsApp settings for the org
    const { data: settings, error: sErr } = await supabase
      .from('whatsapp_settings')
      .select('phone_number_id, access_token, api_version')
      .eq('organization_id', broadcast.organization_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sErr || !settings?.phone_number_id || !settings?.access_token) {
      await supabase.from('whatsapp_broadcasts').update({
        status: 'failed', completed_at: new Date().toISOString(),
      }).eq('id', broadcastId);
      return new Response(JSON.stringify({ error: 'WhatsApp settings not configured for this organization' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiVersion = settings.api_version || 'v20.0';
    const appSecret = Deno.env.get('META_APP_SECRET') || '';
    const appsecret_proof = appSecret
      ? await computeAppSecretProof(settings.access_token, appSecret)
      : null;

    // Optional template info
    let templateName: string | null = null;
    let templateLang = 'ar';
    if (broadcast.template_id) {
      const { data: tpl } = await supabase
        .from('whatsapp_templates')
        .select('name, language')
        .eq('id', broadcast.template_id)
        .maybeSingle();
      if (tpl?.name) {
        templateName = tpl.name;
        templateLang = tpl.language || 'ar';
      }
    }

    await supabase.from('whatsapp_broadcasts').update({
      status: 'sending', started_at: new Date().toISOString(),
    }).eq('id', broadcastId);

    const { data: recipients } = await supabase
      .from('whatsapp_broadcast_recipients')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending');

    let sent = 0, failed = 0;
    const url = `https://graph.facebook.com/${apiVersion}/${settings.phone_number_id}/messages`;

    for (const r of recipients || []) {
      try {
        let message = broadcast.message_body || '';
        const p = (r.personalization || {}) as Record<string, string>;
        message = message
          .replace(/\{\{customer_name\}\}/g, r.customer_name || p.customer_name || '')
          .replace(/\{\{phone\}\}/g, r.phone_number || '');
        for (const [k, v] of Object.entries(p)) {
          message = message.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
        }

        const to = normalizePhone(r.phone_number);
        if (!to) throw new Error('invalid phone');

        const payload: any = templateName
          ? {
              messaging_product: 'whatsapp',
              to,
              type: 'template',
              template: { name: templateName, language: { code: templateLang } },
            }
          : {
              messaging_product: 'whatsapp',
              to,
              type: 'text',
              text: { body: message, preview_url: false },
            };

        const fetchUrl = appsecret_proof ? `${url}?appsecret_proof=${appsecret_proof}` : url;
        const resp = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const text = await resp.text();
        if (!resp.ok) {
          let msg = text;
          try { msg = JSON.parse(text)?.error?.message || text; } catch {}
          throw new Error(`Meta ${resp.status}: ${msg}`);
        }

        await supabase.from('whatsapp_broadcast_recipients').update({
          status: 'sent', sent_at: new Date().toISOString(),
        }).eq('id', r.id);
        sent++;
      } catch (e: any) {
        await supabase.from('whatsapp_broadcast_recipients').update({
          status: 'failed', error_message: String(e?.message || e),
        }).eq('id', r.id);
        failed++;
      }

      await new Promise((res) => setTimeout(res, 250));
    }

    await supabase.from('whatsapp_broadcasts').update({
      status: failed > 0 && sent === 0 ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
    }).eq('id', broadcastId);

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
