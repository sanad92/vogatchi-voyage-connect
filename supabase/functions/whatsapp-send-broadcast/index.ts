// Bulk WhatsApp sender. Marketing/proactive sends MUST use an approved template
// with the correct number of variables — free-form bulk text is rejected by Meta
// outside the 24h service window (error 131047) and is never attempted here.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  WA_CORS as corsHeaders,
  buildTemplateComponents,
  graphSend,
  normalizePhone,
  resolveSettings,
  isWindowOpen,
} from '../_shared/whatsapp.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const STALE_LOCK_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { broadcastId, internal } = await req.json();
    if (!broadcastId) return json({ error: 'broadcastId required' }, 400);

    const { data: broadcast } = await admin
      .from('whatsapp_broadcasts').select('*').eq('id', broadcastId).maybeSingle();
    if (!broadcast) return json({ error: 'broadcast not found' }, 404);

    // Caller authorization (skipped for the internal scheduler which uses the service key)
    if (!internal) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: member } = await admin.from('organization_members').select('id')
        .eq('organization_id', broadcast.organization_id).eq('user_id', user.id).maybeSingle();
      if (!member) return json({ error: 'Forbidden' }, 403);
    }

    // Lock: prevents concurrent runs from double-sending
    const lockedRecently = broadcast.locked_at && Date.now() - new Date(broadcast.locked_at).getTime() < STALE_LOCK_MS;
    if (broadcast.status === 'completed' || broadcast.status === 'cancelled' || lockedRecently) {
      return json({ error: 'already processed or currently sending', status: broadcast.status }, 409);
    }

    let settings;
    try {
      settings = await resolveSettings(admin, broadcast.organization_id, broadcast.whatsapp_settings_id);
    } catch (e) {
      await admin.from('whatsapp_broadcasts').update({
        status: 'failed', completed_at: new Date().toISOString(), last_error: String((e as Error).message),
      }).eq('id', broadcastId);
      return json({ error: String((e as Error).message) }, 400);
    }

    // Template is mandatory for bulk sends
    let tpl: any = null;
    if (broadcast.template_id) {
      const { data } = await admin.from('whatsapp_templates')
        .select('id,name,language,status,meta_status,components,body_text,header_text,header_format,body_variable_count,header_variable_count')
        .eq('id', broadcast.template_id).eq('organization_id', broadcast.organization_id).maybeSingle();
      tpl = data;
    }
    if (!tpl) {
      const msg = 'يجب اختيار قالب معتمد لإرسال حملة | An approved template is required for a broadcast';
      await admin.from('whatsapp_broadcasts').update({ status: 'failed', last_error: msg, completed_at: new Date().toISOString() }).eq('id', broadcastId);
      return json({ error: msg }, 400);
    }
    if (String(tpl.meta_status || tpl.status || '').toLowerCase() !== 'approved') {
      const msg = `القالب "${tpl.name}" غير معتمد من Meta | Template is not approved`;
      await admin.from('whatsapp_broadcasts').update({ status: 'failed', last_error: msg, completed_at: new Date().toISOString() }).eq('id', broadcastId);
      return json({ error: msg }, 400);
    }

    await admin.from('whatsapp_broadcasts').update({
      status: 'sending', started_at: broadcast.started_at ?? new Date().toISOString(),
      locked_at: new Date().toISOString(), last_error: null,
    }).eq('id', broadcastId);

    const { data: recipients } = await admin
      .from('whatsapp_broadcast_recipients')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending')
      .limit(2000);

    let sent = 0, failed = 0, skipped = 0;
    const defaults = (broadcast.template_variables || {}) as Record<string, any>;

    for (const r of recipients ?? []) {
      const to = normalizePhone(r.phone_number);
      if (!to) {
        await markRecipient(admin, r.id, 'skipped', { error_code: 'INVALID_PHONE', error_message: 'رقم غير صالح | Invalid phone number' });
        skipped++;
        continue;
      }

      // Respect opt-out
      if (r.customer_id) {
        const { data: cust } = await admin.from('customers').select('whatsapp_opt_out').eq('id', r.customer_id).maybeSingle();
        if (cust?.whatsapp_opt_out) {
          await markRecipient(admin, r.id, 'skipped', { error_code: 'OPTED_OUT', error_message: 'العميل ألغى الاشتراك | Customer opted out' });
          skipped++;
          continue;
        }
      }

      const p = (r.personalization || {}) as Record<string, any>;
      const vars = {
        body: (Array.isArray(p.body) ? p.body : Array.isArray(defaults.body) ? defaults.body : []).map((v: any) =>
          String(v ?? '').replace(/\{\{customer_name\}\}/g, r.customer_name || '')),
        header: (Array.isArray(p.header) ? p.header : Array.isArray(defaults.header) ? defaults.header : []).map((v: any) =>
          String(v ?? '').replace(/\{\{customer_name\}\}/g, r.customer_name || '')),
      };

      let components;
      try {
        components = buildTemplateComponents(tpl, vars);
      } catch (e) {
        await markRecipient(admin, r.id, 'failed', {
          error_code: 'TEMPLATE_PARAM_MISMATCH', error_message: String((e as Error).message),
          failed_at: new Date().toISOString(),
        });
        failed++;
        continue;
      }

      const result = await graphSend(settings, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: tpl.name,
          language: { code: tpl.language || 'ar' },
          ...(components.length ? { components } : {}),
        },
      });

      if (!result.ok) {
        await markRecipient(admin, r.id, 'failed', {
          failed_at: new Date().toISOString(),
          error_code: result.errorCode,
          error_message: result.errorMessage,
          error_details: result.errorDetails,
        });
        failed++;
      } else {
        await markRecipient(admin, r.id, 'sent', {
          sent_at: new Date().toISOString(),
          provider_message_id: result.providerMessageId,
          error_code: null, error_message: null, error_details: null,
        });
        await mirrorToConversation(admin, broadcast, settings, r, to, tpl, vars, result.providerMessageId);
        sent++;
      }

      await new Promise((res) => setTimeout(res, 200));
    }

    const { count: stillPending } = await admin
      .from('whatsapp_broadcast_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('broadcast_id', broadcastId).eq('status', 'pending');

    await admin.from('whatsapp_broadcasts').update({
      status: stillPending ? 'sending' : (sent === 0 && failed > 0 ? 'failed' : 'completed'),
      completed_at: stillPending ? null : new Date().toISOString(),
      locked_at: null,
    }).eq('id', broadcastId);

    await admin.rpc('recompute_broadcast_counters', { _broadcast_id: broadcastId });

    return json({ ok: true, sent, failed, skipped });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

async function markRecipient(admin: any, id: string, status: string, patch: Record<string, unknown>) {
  await admin.from('whatsapp_broadcast_recipients').update({ status, ...patch }).eq('id', id);
}

/**
 * Mirror the broadcast send into the conversation thread so staff see the whole
 * customer history in one place and status webhooks can resolve it.
 */
async function mirrorToConversation(
  admin: any, broadcast: any, settings: any, recipient: any, to: string,
  tpl: any, vars: any, providerMessageId: string | null,
) {
  try {
    let convId: string | null = null;
    const { data: conv } = await admin.from('whatsapp_conversations')
      .select('id').eq('organization_id', broadcast.organization_id).eq('phone_number', to).maybeSingle();
    if (conv) convId = conv.id;
    else {
      const { data: created } = await admin.from('whatsapp_conversations').insert({
        organization_id: broadcast.organization_id,
        whatsapp_settings_id: settings.id,
        phone_number: to,
        customer_id: recipient.customer_id ?? null,
        status: 'active',
        priority: 'normal',
        last_message_at: new Date().toISOString(),
      }).select('id').maybeSingle();
      convId = created?.id ?? null;
    }
    if (!convId) return;

    await admin.from('whatsapp_messages').insert({
      organization_id: broadcast.organization_id,
      whatsapp_settings_id: settings.id,
      conversation_id: convId,
      message_id: providerMessageId,
      direction: 'outbound',
      message_type: 'template',
      content: tpl.body_text ?? null,
      template_name: tpl.name,
      template_language: tpl.language,
      template_parameters: vars,
      broadcast_id: broadcast.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    await admin.from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() }).eq('id', convId);
  } catch (e) {
    console.error('[broadcast] mirror failed', e);
  }
}
