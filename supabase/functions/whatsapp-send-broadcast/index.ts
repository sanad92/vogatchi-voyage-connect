import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

    await supabase.from('whatsapp_broadcasts').update({
      status: 'sending', started_at: new Date().toISOString(),
    }).eq('id', broadcastId);

    const { data: recipients } = await supabase
      .from('whatsapp_broadcast_recipients')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending');

    let sent = 0, failed = 0;

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

        const { error: sendErr } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: r.phone_number,
            message,
            organization_id: broadcast.organization_id,
            template_id: broadcast.template_id,
          },
        });
        if (sendErr) throw sendErr;

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

      // simple throttle to respect rate limits
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
