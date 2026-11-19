// Cron-driven worker: sends scheduled broadcasts and due auto-send follow-ups.
// Claims follow-ups before sending and holds uncertain provider outcomes for review.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  WA_CORS as corsHeaders,
  buildTemplateComponents,
  graphSend,
  isWindowOpen,
  normalizePhone,
  resolveSettings,
} from '../_shared/whatsapp.ts';
import { requireInternalCaller, authErrorResponse } from '../_shared/auth.ts';

const UNKNOWN_OUTCOME = 'تعذّر تأكيد نتيجة الإرسال. تحقّق من المحادثة قبل إعادة الإرسال.';
const MAX_FOLLOWUP_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10 * 60_000;

class FollowupRejected extends Error {}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    requireInternalCaller(req);
  } catch (e) {
    return authErrorResponse(e, corsHeaders) ?? json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  const report = { broadcastsStarted: 0, followupsSent: 0, followupsFailed: 0, followupsRetried: 0, followupsRecovered: 0 };

  try {
    // ---------- 1. Scheduled broadcasts that are due ----------
    const { data: dueBroadcasts, error: broadcastError } = await admin
      .from('whatsapp_broadcasts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .is('locked_at', null)
      .limit(5);

    // ---------- 1b. Campaigns mid-flight whose batch ended: continue them ----------
    // whatsapp-send-broadcast sends a bounded batch per run and releases its lock,
    // leaving the campaign as 'sending' with recipients still pending.
    const { data: stalled, error: stalledError } = await admin
      .from('whatsapp_broadcasts')
      .select('id')
      .eq('status', 'sending')
      .or(`locked_at.is.null,locked_at.lt.${new Date(Date.now() - 3 * 60_000).toISOString()}`)
      .limit(3);

    if (broadcastError || stalledError) throw broadcastError ?? stalledError;
    for (const b of [...(dueBroadcasts ?? []), ...(stalled ?? [])]) {
      // Fire-and-forget: the batch run is longer than this worker's own budget.
      const task = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ broadcastId: b.id, internal: true }),
      }).catch((e) => console.error('[whatsapp-scheduler] broadcast continue failed', b.id, e));
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(task);
      report.broadcastsStarted++;
    }

    // ---------- 2. Due auto-send follow-ups ----------
    const { data: recovered, error: recoveryError } = await admin.rpc('recover_stale_whatsapp_followups');
    if (recoveryError) throw recoveryError;
    report.followupsRecovered = recovered;

    const { data: claimed, error: claimError } = await admin.rpc('claim_due_whatsapp_followups', { _limit: 25 });
    if (claimError) throw claimError;

    for (const f of (claimed ?? []) as any[]) {
      const key = `followup:${f.id}`;
      const updateClaim = async (values: Record<string, unknown>) => {
        const { data, error } = await admin.from('whatsapp_followups').update(values)
          .eq('id', f.id).eq('organization_id', f.organization_id)
          .eq('status', 'sending').eq('locked_at', f.locked_at).select('id').maybeSingle();
        if (error || !data) throw error ?? new Error('Follow-up claim expired');
      };
      const markSent = (messageId: string, sentAt: string) => updateClaim({
        status: 'sent', sent_at: sentAt, sent_message_id: messageId, locked_at: null, last_error: null,
      });
      let providerOutcomeUncertain = false;
      let sentRecordPersisted = false;
      try {
        const { data: existing, error: existingError } = await admin.from('whatsapp_messages')
          .select('id, sent_at').eq('organization_id', f.organization_id)
          .eq('conversation_id', f.conversation_id).eq('idempotency_key', key)
          .in('status', ['sent', 'delivered', 'read']).maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          sentRecordPersisted = true;
          await markSent(existing.id, existing.sent_at ?? nowIso);
          report.followupsSent++;
          continue;
        }

        const { data: conv, error: conversationError } = await admin.from('whatsapp_conversations')
          .select('id, phone_number, organization_id, whatsapp_settings_id, customer_id')
          .eq('id', f.conversation_id).eq('organization_id', f.organization_id).maybeSingle();
        if (conversationError) throw conversationError;
        if (!conv) throw new FollowupRejected('المحادثة غير موجودة');

        if (conv.customer_id) {
          const { data: customer, error } = await admin.from('customers').select('whatsapp_opt_out')
            .eq('id', conv.customer_id).eq('organization_id', f.organization_id).maybeSingle();
          if (error) throw error;
          if (!customer || customer.whatsapp_opt_out) throw new FollowupRejected('العميل غير متاح للإرسال عبر واتساب');
        }

        const to = normalizePhone(conv.phone_number);
        if (!to) throw new FollowupRejected('رقم واتساب غير صالح');

        const settings = await resolveSettings(admin, conv.organization_id, conv.whatsapp_settings_id);
        const windowOpen = await isWindowOpen(admin, conv.id);

        let payload: Record<string, any>;
        let tpl: any = null;
        const vars = normalizeVars(f.template_variables);

        if (f.template_id) {
          const { data, error } = await admin.from('whatsapp_templates')
            .select('id,name,language,status,meta_status,components,body_text,header_text,header_format,body_variable_count,header_variable_count')
            .eq('id', f.template_id).eq('organization_id', f.organization_id).maybeSingle();
          if (error) throw error;
          tpl = data;
          if (!tpl) throw new FollowupRejected('القالب غير موجود | Template not found');
          if (String(tpl.meta_status || tpl.status || '').toLowerCase() !== 'approved') {
            throw new FollowupRejected(`القالب "${tpl.name}" غير معتمد | Template is not approved`);
          }
          const components = buildTemplateComponents(tpl, vars);
          payload = {
            messaging_product: 'whatsapp', to, type: 'template',
            template: { name: tpl.name, language: { code: tpl.language || 'ar' }, ...(components.length ? { components } : {}) },
          };
        } else {
          if (!windowOpen) {
            throw new FollowupRejected('انتهت نافذة الـ24 ساعة ولم يتم اختيار قالب | 24-hour window closed and no template selected');
          }
          if (!f.message_body) throw new FollowupRejected('لا يوجد نص للرسالة | No message body');
          payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: f.message_body, preview_url: false } };
        }

        const { data: renewed, error: leaseError } = await admin.from('whatsapp_followups')
          .update({ locked_at: new Date().toISOString() })
          .eq('id', f.id).eq('organization_id', f.organization_id)
          .eq('status', 'sending').eq('locked_at', f.locked_at)
          .gt('locked_at', new Date(Date.now() - RETRY_DELAY_MS).toISOString())
          .select('locked_at').maybeSingle();
        if (leaseError) throw leaseError;
        if (!renewed) continue;
        f.locked_at = renewed.locked_at;

        providerOutcomeUncertain = true;
        const result = await graphSend(settings, payload);
        if (!result.ok) {
          const rejected = result.httpStatus >= 400 && result.httpStatus < 500 && result.httpStatus !== 408;
          providerOutcomeUncertain = !rejected && result.errorCode !== 'WHATSAPP_NOT_CONNECTED';
          if (result.httpStatus === 429) throw new Error(result.errorMessage || 'WhatsApp rate limit');
          throw new FollowupRejected(result.errorMessage || 'تعذّر إرسال متابعة واتساب');
        }
        if (!result.providerMessageId) throw new Error(UNKNOWN_OUTCOME);

        const sentAt = new Date().toISOString();
        const { data: msg, error: messageError } = await admin.from('whatsapp_messages').insert({
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
          idempotency_key: key,
          status: 'sent',
          sent_at: sentAt,
        }).select('id').single();
        if (messageError) throw messageError;
        sentRecordPersisted = true;

        await markSent(msg.id, sentAt);
        report.followupsSent++;
        const { error: activityError } = await admin.from('whatsapp_conversations')
          .update({ last_message_at: sentAt }).eq('id', conv.id).eq('organization_id', f.organization_id);
        if (activityError) console.error('[whatsapp-scheduler] conversation update failed', conv.id, activityError);
      } catch (error) {
        if (sentRecordPersisted) {
          console.error('[whatsapp-scheduler] recorded send awaits follow-up recovery', f.id, error);
          report.followupsFailed++;
          continue;
        }
        const msg = errorMessage(error);
        const retry = !providerOutcomeUncertain && !(error instanceof FollowupRejected) && f.attempt_count < MAX_FOLLOWUP_ATTEMPTS;
        try {
          await updateClaim({
            status: retry ? 'pending' : 'failed',
            ...(retry && { remind_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString() }),
            last_error: providerOutcomeUncertain ? UNKNOWN_OUTCOME : msg,
            locked_at: null,
          });
          if (retry) report.followupsRetried++;
          else report.followupsFailed++;
        } catch (stateError) {
          console.error('[whatsapp-scheduler] follow-up outcome could not be saved', f.id, stateError);
          report.followupsFailed++;
        }
      }
    }

    return json({ ok: true, ...report });
  } catch (e) {
    console.error('[whatsapp-scheduler]', e);
    return json({ error: errorMessage(e), ...report }, 500);
  }
});

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function normalizeVars(v: any) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return {
      body: Array.isArray(v.body) ? v.body.map(String) : [],
      header: Array.isArray(v.header) ? v.header.map(String) : [],
    };
  }
  return { body: Array.isArray(v) ? v.map(String) : [], header: [] };
}
