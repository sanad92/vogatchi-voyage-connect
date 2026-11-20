CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.whatsapp_followup_dispatches (
  followup_id uuid PRIMARY KEY REFERENCES public.whatsapp_followups(id) ON DELETE CASCADE,
  lease_at timestamptz NOT NULL,
  started_at timestamptz
);

REVOKE ALL ON TABLE private.whatsapp_followup_dispatches FROM PUBLIC, anon, authenticated;

CREATE INDEX whatsapp_followups_stale_sending_idx
  ON public.whatsapp_followups (locked_at)
  WHERE status = 'sending' AND mode = 'auto_send';

CREATE FUNCTION private.claim_whatsapp_followups(_limit integer, _track_dispatch boolean)
RETURNS SETOF public.whatsapp_followups
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_limit integer := greatest(0, least(coalesce(_limit, 25), 25));
BEGIN
  -- Reclaim expired leases in bounded batches. A legacy worker left no marker
  -- before calling Meta, so an unconfirmed legacy send needs manual review.
  WITH expired AS (
    SELECT f.id, f.locked_at, f.attempt_count, f.organization_id, f.conversation_id
    FROM public.whatsapp_followups f
    WHERE f.status = 'sending' AND f.mode = 'auto_send'
      AND (f.locked_at IS NULL OR f.locked_at < v_now - interval '10 minutes')
    ORDER BY f.locked_at NULLS FIRST, f.id
    LIMIT 50
    FOR UPDATE OF f SKIP LOCKED
  ), recovered AS (
    SELECT e.*, m.id AS message_id, m.sent_at AS delivered_at,
      d.followup_id IS NOT NULL AND d.started_at IS NULL AS before_dispatch
    FROM expired e
    LEFT JOIN private.whatsapp_followup_dispatches d
      ON d.followup_id = e.id AND d.lease_at = e.locked_at
    LEFT JOIN public.whatsapp_messages m
      ON m.organization_id = e.organization_id AND m.conversation_id = e.conversation_id
      AND m.idempotency_key = 'followup:' || e.id::text AND m.followup_id = e.id
      AND m.direction = 'outbound' AND m.status IN ('sent', 'delivered', 'read')
      AND nullif(m.message_id, '') IS NOT NULL
  )
  UPDATE public.whatsapp_followups f
  SET status = CASE
        WHEN r.message_id IS NOT NULL THEN 'sent'
        WHEN r.before_dispatch AND r.attempt_count < 3 THEN 'pending'
        ELSE 'failed'
      END,
      locked_at = NULL,
      sent_message_id = CASE WHEN r.message_id IS NOT NULL THEN r.message_id ELSE f.sent_message_id END,
      sent_at = CASE WHEN r.message_id IS NOT NULL THEN coalesce(r.delivered_at, v_now) ELSE f.sent_at END,
      last_error = CASE
        WHEN r.message_id IS NOT NULL THEN NULL
        WHEN r.before_dispatch AND r.attempt_count < 3 THEN NULL
        WHEN r.before_dispatch THEN 'توقفت معالجة المتابعة قبل الإرسال بعد بلوغ حد المحاولات.'
        ELSE 'تعذر تأكيد الإرسال؛ راجع سجل الرسائل قبل إعادة الإرسال.'
      END
  FROM recovered r
  WHERE f.id = r.id;

  RETURN QUERY
    WITH due AS (
      SELECT f.id
      FROM public.whatsapp_followups f
      WHERE f.status = 'pending' AND f.mode = 'auto_send' AND f.remind_at <= v_now
        AND f.attempt_count < 3
        AND (f.locked_at IS NULL OR f.locked_at < v_now - interval '10 minutes')
      ORDER BY f.remind_at, f.id
      LIMIT v_limit
      FOR UPDATE OF f SKIP LOCKED
    ), claimed AS (
      UPDATE public.whatsapp_followups f
      SET status = 'sending', locked_at = v_now, attempt_count = f.attempt_count + 1
      FROM due
      WHERE f.id = due.id
      RETURNING f.*
    ), tracked AS (
      INSERT INTO private.whatsapp_followup_dispatches (followup_id, lease_at)
      SELECT id, v_now FROM claimed WHERE _track_dispatch
      ON CONFLICT (followup_id) DO UPDATE
      SET lease_at = EXCLUDED.lease_at, started_at = NULL
    )
    SELECT claimed.* FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION private.claim_whatsapp_followups(integer, boolean) FROM PUBLIC, anon, authenticated;

-- Keep the deployed scheduler's existing RPC usable while the new worker is rolled out.
CREATE OR REPLACE FUNCTION public.claim_due_whatsapp_followups(_limit integer DEFAULT 25)
RETURNS SETOF public.whatsapp_followups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_followup public.whatsapp_followups%ROWTYPE;
BEGIN
  FOR v_followup IN SELECT * FROM private.claim_whatsapp_followups(_limit, false) LOOP
    -- The legacy worker adds one to this value when deciding whether to retry.
    -- Keep the authoritative increment in storage and pass it the pre-claim value.
    v_followup.attempt_count := v_followup.attempt_count - 1;
    RETURN NEXT v_followup;
  END LOOP;
END;
$$;

CREATE FUNCTION public.claim_tracked_whatsapp_followups(_limit integer DEFAULT 25)
RETURNS SETOF public.whatsapp_followups
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT * FROM private.claim_whatsapp_followups(_limit, true);
$$;

CREATE FUNCTION public.begin_whatsapp_followup_dispatch(_id uuid, _lease_at timestamptz)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.whatsapp_followups f
  WHERE f.id = _id AND f.status = 'sending' AND f.mode = 'auto_send'
    AND f.locked_at = _lease_at AND f.locked_at >= clock_timestamp() - interval '9 minutes'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE private.whatsapp_followup_dispatches
  SET started_at = clock_timestamp()
  WHERE followup_id = _id AND lease_at = _lease_at AND started_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_whatsapp_followups(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_tracked_whatsapp_followups(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_whatsapp_followup_dispatch(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_whatsapp_followups(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_tracked_whatsapp_followups(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_whatsapp_followup_dispatch(uuid, timestamptz) TO service_role;
