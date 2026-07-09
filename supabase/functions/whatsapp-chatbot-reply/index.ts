import { createClient } from 'npm:@supabase/supabase-js@2';
import { callLovableAI, corsHeaders, ChatMessage } from '../_shared/ai-gateway.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const started = Date.now();
  try {
    const { organization_id, conversation_id, message_id, user_message } = await req.json();
    if (!organization_id || !conversation_id || !user_message) {
      return new Response(JSON.stringify({ error: 'missing params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load bot settings
    const { data: settings } = await supabase
      .from('whatsapp_chatbot_settings')
      .select('*')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: 'bot disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check handoff keywords
    const keywords: string[] = Array.isArray(settings.handoff_keywords) ? settings.handoff_keywords : [];
    const lowered = String(user_message).toLowerCase();
    const wantsHandoff = keywords.some((k) => lowered.includes(String(k).toLowerCase()));
    if (wantsHandoff) {
      await supabase.from('whatsapp_conversations')
        .update({ status: 'pending', priority: 'high', assignment_reason: 'chatbot_handoff' })
        .eq('id', conversation_id);
      await supabase.from('whatsapp_chatbot_interactions').insert({
        organization_id, conversation_id, message_id, user_message,
        was_handed_off: true, handoff_reason: 'keyword_match',
        latency_ms: Date.now() - started,
      });
      return new Response(JSON.stringify({ ok: true, handoff: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check conversation status: only reply if unassigned
    const { data: convo } = await supabase.from('whatsapp_conversations')
      .select('assigned_to, phone_number, status').eq('id', conversation_id).maybeSingle();
    if (!convo) throw new Error('conversation not found');
    if (convo.assigned_to) {
      return new Response(JSON.stringify({ ok: true, skipped: 'already assigned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check bot reply limit
    const { count: botReplyCount } = await supabase
      .from('whatsapp_chatbot_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id)
      .not('bot_reply', 'is', null);
    if ((botReplyCount || 0) >= settings.max_bot_replies) {
      await supabase.from('whatsapp_conversations')
        .update({ status: 'pending', assignment_reason: 'chatbot_max_replies' })
        .eq('id', conversation_id);
      await supabase.from('whatsapp_chatbot_interactions').insert({
        organization_id, conversation_id, message_id, user_message,
        was_handed_off: true, handoff_reason: 'max_replies_reached',
        latency_ms: Date.now() - started,
      });
      return new Response(JSON.stringify({ ok: true, handoff: true, reason: 'max_replies' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, content, sent_at')
      .eq('conversation_id', conversation_id)
      .not('content', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10);

    const chatHistory: ChatMessage[] = (history || []).reverse().map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));

    const messages: ChatMessage[] = [
      { role: 'system', content: settings.system_prompt },
      ...chatHistory,
    ];

    // Ensure last message is the current user message
    if (!chatHistory.length || chatHistory[chatHistory.length - 1].content !== user_message) {
      messages.push({ role: 'user', content: user_message });
    }

    let reply = '';
    let errMsg: string | null = null;
    try {
      reply = await callLovableAI({
        messages, model: settings.model, temperature: 0.7,
      });
    } catch (e: any) {
      errMsg = String(e?.message || e);
      if (settings.auto_handoff_on_error) {
        await supabase.from('whatsapp_conversations')
          .update({ status: 'pending', assignment_reason: 'chatbot_error' })
          .eq('id', conversation_id);
      }
      await supabase.from('whatsapp_chatbot_interactions').insert({
        organization_id, conversation_id, message_id, user_message,
        was_handed_off: settings.auto_handoff_on_error, handoff_reason: 'ai_error',
        model_used: settings.model, error_message: errMsg,
        latency_ms: Date.now() - started,
      });
      return new Response(JSON.stringify({ ok: false, error: errMsg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reply.trim()) {
      return new Response(JSON.stringify({ ok: true, skipped: 'empty reply' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via WhatsApp
    const { error: sendErr } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        phone: convo.phone_number,
        message: reply,
        organization_id,
        conversation_id,
      },
    });
    if (sendErr) throw new Error(sendErr.message);

    await supabase.from('whatsapp_chatbot_interactions').insert({
      organization_id, conversation_id, message_id, user_message, bot_reply: reply,
      model_used: settings.model, latency_ms: Date.now() - started,
    });

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
