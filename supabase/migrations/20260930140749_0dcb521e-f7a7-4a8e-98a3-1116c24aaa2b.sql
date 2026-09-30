ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS last_read_at timestamptz;
UPDATE public.whatsapp_conversations SET last_read_at = now() WHERE last_read_at IS NULL;
DROP FUNCTION IF EXISTS public.wa_conversation_summaries(uuid);
CREATE FUNCTION public.wa_conversation_summaries(_org uuid)
RETURNS TABLE(conversation_id uuid, last_inbound_at timestamptz, sent_at timestamptz, direction text, content text, message_type text, template_name text, unread_count integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id,
    (SELECT max(m.sent_at) FROM whatsapp_messages m WHERE m.conversation_id = c.id AND m.direction = 'inbound'),
    l.sent_at, l.direction, l.content, l.message_type, l.template_name,
    (SELECT count(*)::int FROM whatsapp_messages m WHERE m.conversation_id = c.id AND m.direction = 'inbound'
       AND m.sent_at > COALESCE(c.last_read_at, '-infinity'::timestamptz))
  FROM whatsapp_conversations c
  LEFT JOIN LATERAL (
    SELECT m.sent_at, m.direction::text, m.content, m.message_type::text, m.template_name
    FROM whatsapp_messages m WHERE m.conversation_id = c.id ORDER BY m.sent_at DESC LIMIT 1
  ) l ON true
  WHERE c.organization_id = _org;
$$;
REVOKE ALL ON FUNCTION public.wa_conversation_summaries(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wa_conversation_summaries(uuid) TO authenticated;