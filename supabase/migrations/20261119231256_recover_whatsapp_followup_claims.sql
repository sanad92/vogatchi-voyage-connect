CREATE OR REPLACE FUNCTION public.recover_stale_whatsapp_followups()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH expired AS (
    SELECT f.id, f.organization_id, f.conversation_id
    FROM public.whatsapp_followups f
    WHERE f.status = 'sending' AND COALESCE(f.locked_at, f.updated_at) < now() - interval '10 minutes'
    FOR UPDATE SKIP LOCKED
  ), outcomes AS (
    SELECT e.id, m.id AS message_id, m.sent_at
    FROM expired e
    LEFT JOIN LATERAL (
      SELECT wm.id, wm.sent_at FROM public.whatsapp_messages wm
      WHERE wm.organization_id = e.organization_id AND wm.conversation_id = e.conversation_id
        AND wm.idempotency_key = 'followup:' || e.id::text
        AND wm.status IN ('sent', 'delivered', 'read')
      LIMIT 1
    ) m ON true
  ), recovered AS (
    UPDATE public.whatsapp_followups f
    SET status = CASE WHEN o.message_id IS NULL THEN 'failed' ELSE 'sent' END,
        sent_message_id = o.message_id,
        sent_at = o.sent_at,
        locked_at = NULL,
        last_error = CASE WHEN o.message_id IS NULL THEN 'تعذّر تأكيد نتيجة الإرسال. تحقّق من المحادثة قبل إعادة الإرسال.' END
    FROM outcomes o WHERE f.id = o.id
    RETURNING f.id
  )
  SELECT count(*)::integer FROM recovered;
$$;

REVOKE ALL ON FUNCTION public.recover_stale_whatsapp_followups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_whatsapp_followups() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_due_whatsapp_followups(_limit integer DEFAULT 25)
RETURNS SETOF public.whatsapp_followups
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.whatsapp_followups f
  SET status = 'sending', locked_at = now(), attempt_count = f.attempt_count + 1
  WHERE f.id IN (
    SELECT due.id FROM public.whatsapp_followups due
    WHERE due.status = 'pending' AND due.mode = 'auto_send' AND due.remind_at <= now()
      AND due.attempt_count < 3
      AND (due.locked_at IS NULL OR due.locked_at < now() - interval '10 minutes')
    ORDER BY due.remind_at, due.id
    LIMIT greatest(0, least(coalesce(_limit, 25), 100))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING f.*;
$$;

REVOKE ALL ON FUNCTION public.claim_due_whatsapp_followups(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_whatsapp_followups(integer) TO service_role;
