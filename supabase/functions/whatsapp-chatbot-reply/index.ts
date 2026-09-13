import { createClient } from 'npm:@supabase/supabase-js@2';
import { callLovableAI, corsHeaders, ChatMessage } from '../_shared/ai-gateway.ts';
import { requireInternalCaller, authErrorResponse } from '../_shared/auth.ts';
import { botMayReply } from '../_shared/whatsapp-bot-policy.ts';
import { graphSend, isWindowOpen, resolveSettings, normalizePhone } from '../_shared/whatsapp.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let pendingId: string | undefined;
  let orgId: string | undefined;
  let conversationId: string | undefined;
  let autoHandoffOnError = false;
  const started = Date.now();
  try {
    requireInternalCaller(req);
    const { organization_id, conversation_id, message_id } = await req.json();
    orgId = organization_id; conversationId = conversation_id;
    if (!orgId || !conversationId || !message_id) return json({ error: 'missing params' }, 400);
    // Derive the prompt from the persisted inbound message, not caller-supplied text.
    const { data: inbound, error: inboundError } = await db.from('whatsapp_messages').select('content')
      .eq('id', message_id).eq('organization_id', orgId).eq('conversation_id', conversationId).eq('direction', 'inbound').single();
    if (inboundError || !inbound?.content) return json({ error: 'invalid inbound message' }, 400);
    const user_message = inbound.content;
    const { data: settings, error: settingsError } = await db.from('whatsapp_chatbot_settings')
      .select('*').eq('organization_id', orgId).maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings?.is_enabled) return json({ ok: true, skipped: 'bot disabled' });
    autoHandoffOnError = settings.auto_handoff_on_error === true;
    // Fail closed: this option requires a business-hours calendar, not an ignored switch.
    if (settings.respond_only_outside_hours) {
      await db.from('whatsapp_conversations').update({ status: 'pending', assignment_reason: 'human_queue' })
        .eq('id', conversationId).eq('organization_id', orgId).is('assigned_to', null).in('status', ['open', 'active']);
      return json({ ok: true, skipped: 'outside-hours mode requires configured calendar', handoff: true });
    }
    const { data: convo, error: convoError } = await db.from('whatsapp_conversations').select('*')
      .eq('id', conversationId).eq('organization_id', orgId).single();
    if (convoError) throw convoError;
    if (!botMayReply(convo)) return json({ ok: true, skipped: 'human control or closed' });
    const handoff = async (reason: string) => {
      const { error } = await db.from('whatsapp_conversations')
        .update({ status: 'pending', priority: 'high', assignment_reason: reason })
        .eq('id', conversationId!).eq('organization_id', orgId!).is('assigned_to', null);
      if (error) throw error;
      await db.from('whatsapp_chatbot_interactions').insert({ organization_id: orgId, conversation_id: conversationId,
        message_id, user_message, was_handed_off: true, handoff_reason: reason, latency_ms: Date.now() - started });
    };
    const keywords = Array.isArray(settings.handoff_keywords) ? settings.handoff_keywords : [];
    if (keywords.some((k: string) => k.trim() && user_message.toLowerCase().includes(k.trim().toLowerCase()))) {
      await handoff('chatbot_handoff'); return json({ ok: true, handoff: true });
    }
    const { count, error: countError } = await db.from('whatsapp_chatbot_interactions')
      .select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('conversation_id', conversationId).not('bot_reply', 'is', null);
    if (countError) throw countError;
    if (settings.bot_mode !== 'guided' && (count || 0) >= settings.max_bot_replies) { await handoff('chatbot_max_replies'); return json({ ok: true, handoff: true }); }
    if (!await isWindowOpen(db, conversationId)) return json({ ok: true, skipped: 'window closed' });
    const { data: history, error: historyError } = await db.from('whatsapp_messages').select('direction, content')
      .eq('organization_id', orgId).eq('conversation_id', conversationId).not('content', 'is', null)
      .in('status', ['sent', 'delivered', 'read']).order('sent_at', { ascending: false }).limit(10);
    if (historyError) throw historyError;
    const messages: ChatMessage[] = [{ role: 'system', content: `${settings.system_prompt}\nمرجع الشركة المعتمد (لا تفترض معلومات غير موجودة فيه):\n${settings.knowledge_base || "لا توجد معلومات معتمدة؛ اجمع الطلب وحوّله للموظف."}\nلا تخترع أسعارًا أو توافرًا أو تؤكد حجزًا. اجمع الوجهة والتواريخ وعدد المسافرين وأعمار الأطفال والميزانية بسؤال واحد في كل رسالة دون تكرار معلومة ذكرها العميل. اشرح أن التأكيد النهائي من الموظف. لا تطلب بيانات بطاقات دفع أو كلمات مرور.` },
      ...(history || []).reverse().map((m: any): ChatMessage => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }))];
    if (messages[messages.length - 1].content !== user_message) messages.push({ role: 'user', content: user_message });
    // Reserve a unique outbound key BEFORE generating/sending. Retries cannot send twice.
    const account = await resolveSettings(db, orgId, convo.whatsapp_settings_id);
    const { data: pending, error: reserveError } = await db.from('whatsapp_messages').insert({
      organization_id: orgId, conversation_id: conversationId, whatsapp_settings_id: account.id,
      direction: 'outbound', message_type: 'text', content: null, status: 'sending',
      idempotency_key: `chatbot:${message_id}`, sent_at: new Date().toISOString(),
    }).select('id').single();
    if (reserveError?.code === '23505') return json({ ok: true, skipped: 'already processed' });
    if (reserveError) throw reserveError;
    pendingId = pending.id;
    let reply: string;
    let finalHandoff = false;
    try {
      if (settings.bot_mode === 'guided') {
        const { data: intake, error: intakeError } = await db.rpc('wa_intake_step', { _org_id: orgId, _conversation_id: conversationId, _message_id: message_id });
        if (intakeError) throw intakeError;
        if (intake?.skipped) {
          await db.from('whatsapp_messages').update({ status: 'failed', error_message: 'أُلغي السؤال: تغيرت حالة المحادثة' }).eq('id', pendingId);
          return json({ ok: true, skipped: 'intake no longer active' });
        }
        reply = intake.reply; finalHandoff = intake.completed;
        if (count === 0 && settings.welcome_message) reply = `${settings.welcome_message}\n${reply}`;
      } else reply = await callLovableAI({ messages, model: settings.model, temperature: 0.3 });
    }
    catch (e) { if (settings.auto_handoff_on_error) await handoff('chatbot_error'); throw e; }
    if (!reply.trim()) throw new Error('AI returned an empty reply');
    // Re-read immediately before sending: a human may have picked up during generation.
    const { data: latest, error: latestError } = await db.from('whatsapp_conversations').select('assigned_to,status,assignment_reason')
      .eq('id', conversationId).eq('organization_id', orgId).single();
    if (latestError) throw latestError;
    if ((!botMayReply(latest) && !(finalHandoff && !latest.assigned_to && latest.status === 'pending' && latest.assignment_reason === 'chatbot_intake_complete')) || !await isWindowOpen(db, conversationId)) {
      await db.from('whatsapp_messages').update({ status: 'failed', error_message: 'أُلغي الرد الآلي: تحكم بشري أو انتهاء نافذة الرد' }).eq('id', pendingId);
      return json({ ok: true, skipped: 'cancelled before send' });
    }
    const result = await graphSend(account, { messaging_product: 'whatsapp', to: normalizePhone(convo.phone_number), type: 'text', text: { body: reply } }, crypto.randomUUID());
    if (!result.ok) throw new Error(result.errorMessage || 'WhatsApp send failed');
    const { error: savedError } = await db.from('whatsapp_messages').update({ content: reply, status: 'sent', message_id: result.providerMessageId }).eq('id', pendingId);
    if (savedError) throw savedError;
    pendingId = undefined;
    await db.from('whatsapp_chatbot_interactions').insert({ organization_id: orgId, conversation_id: conversationId,
      message_id, user_message, bot_reply: reply, model_used: settings.bot_mode === 'guided' ? 'guided' : settings.model, latency_ms: Date.now() - started });
    return json({ ok: true });
  } catch (e: any) {
    if (autoHandoffOnError && orgId && conversationId) {
      await db.from('whatsapp_conversations').update({ status: 'pending', assignment_reason: 'chatbot_error' })
        .eq('id', conversationId).eq('organization_id', orgId).is('assigned_to', null).in('status', ['open', 'active', 'pending']);
    }
    if (pendingId) await db.from('whatsapp_messages').update({ status: 'failed', error_message: String(e?.message || e) }).eq('id', pendingId);
    return authErrorResponse(e, corsHeaders as Record<string, string>) || json({ error: String(e?.message || e) }, 500);
  }
});
