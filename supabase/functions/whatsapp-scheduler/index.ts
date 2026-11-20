// Cron-driven worker: sends scheduled broadcasts and due auto-send follow-ups.
// Runs every minute. An interrupted send is retried only when Meta was not called.
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

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const unconfirmedDelivery = 'تعذر تأكيد الإرسال؛ راجع سجل الرسائل قبل إعادة الإرسال.';
const confirmedRejections = new Set([400, 401, 403, 404, 429]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    requireInternalCaller(req);
  } catch (e) {
    return authErrorResponse(e, corsHeaders) ?? json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  const report = { broadcastsStarted: 0, followupsSent: 0, followupsFailed: 0, followupsUnconfirmed: 0 };

  try {
    // ---------- 1. Scheduled broadcasts that are due ----------
    const { data: dueBroadcasts } = await admin
      .from('whatsapp_broadcasts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .is('locked_at', null)
      .limit(5);

    // ---------- 1b. Campaigns mid-flight whose batch ended: continue them ----------
    // whatsapp-send-broadcast sends a bounded batch per run and releases its lock,
    // leaving the campaign as 'sending' with recipients still pending.
    const { data: stalled } = await admin
      .from('whatsapp_broadcasts')
      .select('id')
      .eq('status', 'sending')
      .or(`locked_at.is.null,locked_at.lt.${new Date(Date.now() - 3 * 60_000).toISOString()}`)
      .limit(3);

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
    // Claim rows atomically via an RPC so parallel workers can't grab the same one.
    const { data: claimed, error: claimError } = await admin.rpc('claim_tracked_whatsapp_followups', { _limit: 10 });
    if (claimError) throw new Error('Failed to claim scheduled WhatsApp follow-ups', { cause: claimError });

    for (const f of (claimed ?? []) as any[]) {
      const updateClaim = (changes: Record<string, unknown>) => admin.from('whatsapp_followups')
        .update(changes).eq('id', f.id).eq('status', 'sending').eq('locked_at', f.locked_at).select('id').maybeSingle();
      let outcomeUnconfirmed = false;
      let providerAccepted = false;
      try {
        const { data: conv, error: conversationError } = await admin
          .from('whatsapp_conversations')
          .select('id, phone_number, organization_id, whatsapp_settings_id')
          .eq('id', f.conversation_id).eq('organization_id', f.organization_id).maybeSingle();
        if (conversationError) throw new Error('تعذر قراءة المحادثة | Conversation lookup failed');
        if (!conv) throw new Error('المحادثة غير موجودة | Conversation not found');

        const to = normalizePhone(conv.phone_number);
        if (!to) throw new Error('رقم غير صالح | Invalid phone number');

        const settings = await resolveSettings(admin, conv.organization_id, conv.whatsapp_settings_id);
        let payload: Record<string, any>;
        let tpl: any = null;
        const vars = normalizeVars(f.template_variables);

        if (f.template_id) {
          const { data, error } = await admin.from('whatsapp_templates')
            .select('id,name,language,status,meta_status,components,body_text,header_text,header_format,body_variable_count,header_variable_count')
            .eq('id', f.template_id).eq('organization_id', f.organization_id).maybeSingle();
          if (error) throw new Error('تعذر قراءة القالب | Template lookup failed');
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
          if (!await isWindowOpen(admin, conv.id)) {
            throw new Error('انتهت نافذة الـ24 ساعة ولم يتم اختيار قالب | 24-hour window closed and no template selected');
          }
          if (!f.message_body) throw new Error('لا يوجد نص للرسالة | No message body');
          payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: f.message_body, preview_url: false } };
        }

        const { data: canDispatch, error: dispatchError } = await admin.rpc('begin_whatsapp_followup_dispatch', {
          _id: f.id, _lease_at: f.locked_at,
        });
        if (dispatchError) throw new Error('تعذر تأكيد حجز المتابعة | Follow-up claim could not be verified');
        if (canDispatch !== true) continue;

        outcomeUnconfirmed = true;
        const result = await graphSend(settings, payload, undefined, AbortSignal.timeout(10_000));
        if (!result.ok || !result.providerMessageId) {
          // A structured Meta rejection rules out delivery. Network errors, upstream
          // failures and accepted-looking responses without a message ID do not.
          if (!result.ok && confirmedRejections.has(result.httpStatus)
            && result.errorDetails && typeof result.errorDetails === 'object') {
            outcomeUnconfirmed = false;
          }
          throw new Error(result.errorMessage || 'Send could not be confirmed');
        }
        providerAccepted = true;

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
          idempotency_key: `followup:${f.id}`,
          status: 'sent',
          sent_at: sentAt,
        }).select('id').single();
        if (messageError || !msg) throw new Error('Could not record accepted WhatsApp message');

        const { data: saved, error: updateError } = await updateClaim({
          status: 'sent', sent_at: sentAt, sent_message_id: msg.id,
          locked_at: null, last_error: null,
        });
        if (updateError || !saved) throw new Error('Could not persist WhatsApp follow-up completion');
        report.followupsSent++;

        await admin.from('whatsapp_conversations')
          .update({ last_message_at: sentAt }).eq('id', conv.id).eq('organization_id', conv.organization_id)
          .then(({ error }) => {
            if (error) console.error('[whatsapp-scheduler] conversation timestamp update failed', conv.id);
          }, () => console.error('[whatsapp-scheduler] conversation timestamp update failed', conv.id));
      } catch (e) {
        if (providerAccepted) {
          // Leave the lease in place. Recovery reconciles a persisted provider
          // message, or asks for manual review without duplicating delivery.
          report.followupsUnconfirmed++;
          console.error('[whatsapp-scheduler] accepted message persistence unconfirmed', f.id);
          continue;
        }
        const retry = !outcomeUnconfirmed && f.attempt_count < 3;
        const { data: saved, error: updateError } = await updateClaim({
          status: retry ? 'pending' : 'failed',
          ...(retry ? { remind_at: new Date(Date.now() + 10 * 60_000).toISOString() } : {}),
          last_error: outcomeUnconfirmed ? unconfirmedDelivery : String((e as Error)?.message || e).slice(0, 500),
          locked_at: null,
        });
        if (updateError || !saved || outcomeUnconfirmed) {
          report.followupsUnconfirmed++;
          if (updateError) console.error('[whatsapp-scheduler] follow-up outcome persistence unconfirmed', f.id);
        } else {
          report.followupsFailed++;
        }
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
