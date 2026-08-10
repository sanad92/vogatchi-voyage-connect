CREATE OR REPLACE FUNCTION public.recompute_broadcast_counters(_broadcast_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.whatsapp_broadcasts b
  SET sent_count = c.sent,
      delivered_count = c.delivered,
      read_count = c.read,
      failed_count = c.failed,
      skipped_count = c.skipped
  FROM (
    SELECT
      count(*) FILTER (WHERE status IN ('sent','delivered','read'))::int AS sent,
      count(*) FILTER (WHERE status IN ('delivered','read'))::int        AS delivered,
      count(*) FILTER (WHERE status = 'read')::int                       AS read,
      count(*) FILTER (WHERE status = 'failed')::int                     AS failed,
      count(*) FILTER (WHERE status = 'skipped')::int                    AS skipped
    FROM public.whatsapp_broadcast_recipients
    WHERE broadcast_id = _broadcast_id
  ) c
  WHERE b.id = _broadcast_id;
$$;

REVOKE ALL ON FUNCTION public.recompute_broadcast_counters(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_broadcast_counters(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_due_whatsapp_followups(_limit integer DEFAULT 25)
RETURNS SETOF public.whatsapp_followups
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.whatsapp_followups f
  SET status = 'sending', locked_at = now(), attempt_count = f.attempt_count + 1
  WHERE f.id IN (
    SELECT id FROM public.whatsapp_followups
    WHERE status = 'pending'
      AND mode = 'auto_send'
      AND remind_at <= now()
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
    ORDER BY remind_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING f.*;
$$;

REVOKE ALL ON FUNCTION public.claim_due_whatsapp_followups(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_whatsapp_followups(integer) TO service_role;
