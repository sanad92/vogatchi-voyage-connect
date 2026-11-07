-- Safar Flow V6: reliable pre-travel task discovery.
-- Staged only, deploy AFTER V2 queue SQL. Never enable existing cron by default.
-- No external notifications, payments, or booking-state changes.
--
-- The existing booking event trigger emits booking.created, but there is no
-- verified booking.pre_travel producer in repository migrations. This adapter
-- discovers upcoming bookings via their dates and uses a trusted historical
-- booking.created event only as provenance for the private jobs table.
BEGIN;

CREATE OR REPLACE FUNCTION safar_flow.enqueue_upcoming_pretravel_checklists(
  p_limit integer DEFAULT 50,
  p_days_before integer DEFAULT 3
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_days_before IS NULL OR p_days_before NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'invalid pretravel scan parameters' USING ERRCODE='22023';
  END IF;

  -- Match booking and its historical event by BOTH booking ID and tenant.
  -- The provenance event can be many weeks old: lookback on occurred_at
  -- would silently miss trips booked far in advance.
  WITH candidates AS MATERIALIZED (
    SELECT b.organization_id, b.id AS booking_id, e.id AS source_event_id
    FROM public.bookings b
    JOIN LATERAL (
      SELECT d.id
      FROM public.domain_events d
      WHERE d.aggregate_type = 'booking'
        AND d.aggregate_id = b.id
        AND d.organization_id = b.organization_id
        AND d.event_type = 'booking.created'
      ORDER BY d.occurred_at, d.id
      LIMIT 1
    ) e ON TRUE
    WHERE b.organization_id IS NOT NULL
      AND b.status IN ('pending', 'confirmed')
      AND b.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_before
      AND NOT EXISTS (
        SELECT 1 FROM safar_flow.jobs j
        WHERE j.organization_id = b.organization_id
          AND j.booking_id = b.id
          AND j.template_key = 'pretravel_checklist'
      )
    ORDER BY b.start_date, b.id
    LIMIT p_limit
  ), inserted AS (
    INSERT INTO safar_flow.jobs (
      organization_id, source_event_id, booking_id, template_key, available_at
    )
    SELECT c.organization_id, c.source_event_id, c.booking_id,
           'pretravel_checklist', now()
    FROM candidates c
    ON CONFLICT ON CONSTRAINT safar_flow_jobs_booking_template_unique
      DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

-- Retain the original API keys for existing callers and tests.
-- A single trusted scheduler invocation discovers BOTH new booking events
-- and pre-travel deadlines, then processes due jobs in bounded batches.
CREATE OR REPLACE FUNCTION safar_flow.dispatch_booking_tasks(
  p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_events integer;
  v_pretravel integer;
  v_result jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'batch limit must be 1..100' USING ERRCODE='22023';
  END IF;

  v_events := safar_flow.enqueue_recent_booking_events(p_limit);
  v_pretravel := safar_flow.enqueue_upcoming_pretravel_checklists(p_limit, 3);
  v_result := safar_flow.process_due_booking_tasks(p_limit);
  RETURN jsonb_build_object(
    'scanned_new_events', v_events,
    'upcoming_pretravel_jobs', v_pretravel,
    'jobs', v_result
  );
END;
$$;

-- The scheduler role may call the dispatcher. Signed-in clients may not.
REVOKE ALL ON FUNCTION safar_flow.enqueue_upcoming_pretravel_checklists(integer,integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION safar_flow.dispatch_booking_tasks(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION safar_flow.enqueue_upcoming_pretravel_checklists(integer,integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION safar_flow.dispatch_booking_tasks(integer)
  TO service_role;

COMMIT;
