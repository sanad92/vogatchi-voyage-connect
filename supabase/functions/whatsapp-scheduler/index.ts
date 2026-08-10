// Cron-driven worker: sends scheduled broadcasts and due auto-send follow-ups.
// Runs every minute. Everything it does is lock-guarded so nothing sends twice.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  WA_CORS as corsHeaders,
  buildTemplateComponents,
  graphSend,
  isWindowOpen,
  normalizePhone,
  resolveSettings,
} from '../_shared/whatsapp.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  const report = { broadcastsStarted: 0, followupsSent: 0, followupsFailed: 0 };

  try {
    // ---------- 1. Scheduled broadcasts that are due ----------
    const { data: dueBroadcasts } = await admin
      .from('whatsapp_broadcasts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .is('locked_at', null)
      .limit(5);

    for (const b of dueBroadcasts ?? []) {
      await admin.functions.invoke('whatsapp-send-broadcast', { body: { broadcastId: b.id, internal: true } });
      report.broadcastsStarted++;
    }

    // ---------- 2. Due auto-send follow-ups ----------
    // Claim rows atomically via an RPC so parallel workers can't grab the same one.
    const { data: claimed } = await admin.rpc('claim_due_whatsapp_followups', { _limit: 25 });

    for (const f of (claimed ?? []) as any[]) {
      try {
        const { data: conv } = await admin
          .from('whatsapp_conversations')
          .select('id, phone_number, organization_id, whatsapp_settings_id')
          .eq('id', f.conversation_id).maybeSingle();
        if (!conv) throw new Error('المحادثة غير موجودة | Conversation not found');

        const to = normalizePhone(conv.phone_number);
        if (!to) throw new Error('رقم غير صالح | Invalid phone number');

        const settings = await resolveSettings(admin, conv.organization_id, conv.whatsapp_settings_id);
        const windowOpen = await isWindowOpen(admin, conv.id);

        let payload: Record<string, any>;
        let tpl: any = null;
        const vars = normalizeVars(f.template_variables);

        if (f.template_id) {
          const { data } = await admin.from('whatsapp_templates')
            .select('id,name,language,status,meta_status,components,body_text,header_text,header_format,body_variable_count,header_variable_count')
            .eq('id', f.template_id).maybeSingle();
          tpl = data;
          if (!tpl) throw new Error('القالب غير موجود | Template not found');
          if (String(tpl.meta_status || tpl.status || '').toLowerCase() !== 'approved') {
            throw new Error(`القالب "${tpl.name}" غير معتمد | Template is not approved`);
          }
          const components = buildTemplateComponents(tpl, vars);
          payload = {
            messaging_product: 'whatsapp', to, type: 'template',
            template: { name: tpl.name, language: { code: tpl.language || 'ar' }, ...(components.length ? { components } : {}) },
          };
        } else {
          if (!windowOpen) {
            throw new Error('انتهت نافذة الـ24 ساعة ولم يتم اختيار قالب | 24-hour window closed and no template selected');
          }
          if (!f.message_body) throw new Error('لا يوجد نص للرسالة | No message body');
          payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: f.message_body, preview_url: false } };
        }

        const result = await graphSend(settings, payload);
        if (!result.ok) throw new Error(result.errorMessage || 'Send failed');

        const { data: msg } = await admin.from('whatsapp_messages').insert({
          organization_id: conv.organization_id,
          whatsapp_settings_id: settings.id,
          conversation_id: conv.id,
          message_id: result.providerMessageId,
          direction: 'outbound',
          message_type: tpl ? 'template' : 'text',
          content: tpl ? (tpl.body_text ?? null) : f.message_body,
          template_name: tpl?.name ?? null,
          template_language: tpl?.language ?? null,
          template_parameters: tpl ? vars : null,
          followup_id: f.id,
          idempotency_key: `followup:${f.id}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).select('id').maybeSingle();

        await admin.from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() }).eq('id', conv.id);

        await admin.from('whatsapp_followups').update({
          status: 'sent', sent_at: new Date().toISOString(), sent_message_id: msg?.id ?? null,
          locked_at: null, last_error: null,
        }).eq('id', f.id);
        report.followupsSent++;
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        const attempts = (f.attempt_count ?? 0) + 1;
        await admin.from('whatsapp_followups').update({
          status: attempts >= 3 ? 'failed' : 'pending',
          remind_at: attempts >= 3 ? f.remind_at : new Date(Date.now() + 10 * 60_000).toISOString(),
          last_error: msg,
          locked_at: null,
        }).eq('id', f.id);
        report.followupsFailed++;
      }
    }

    return json({ ok: true, ...report });
  } catch (e) {
    console.error('[whatsapp-scheduler]', e);
    return json({ error: String((e as Error)?.message || e), ...report }, 500);
  }
});

function normalizeVars(v: any) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return {
      body: Array.isArray(v.body) ? v.body.map(String) : [],
      header: Array.isArray(v.header) ? v.header.map(String) : [],
    };
  }
  return { body: Array.isArray(v) ? v.map(String) : [], header: [] };
}
