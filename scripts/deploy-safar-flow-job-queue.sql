-- Safar Flow V2: private, transactional queue for INTERNAL booking tasks only.
-- STAGED: do not apply to production until cross-tenant tests and project DB access succeed.
-- This is NOT a universal executor and NEVER calls WhatsApp, email or payment services.
-- The event dispatcher is NOT wired to this queue yet; enqueue is service-role-only.
BEGIN;

CREATE SCHEMA IF NOT EXISTS safar_flow;
REVOKE ALL ON SCHEMA safar_flow FROM PUBLIC;
REVOKE ALL ON SCHEMA safar_flow FROM anon, authenticated;
GRANT USAGE ON SCHEMA safar_flow TO service_role;

CREATE TABLE IF NOT EXISTS safar_flow.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  source_event_id uuid NOT NULL REFERENCES public.domain_events(id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL,
  template_key text NOT NULL CHECK (template_key IN ('supplier_confirmation', 'pretravel_checklist')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'retrying', 'succeeded', 'skipped', 'dead', 'cancelled')),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 5),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safar_flow_jobs_booking_template_unique
    UNIQUE (organization_id, booking_id, template_key)
);

CREATE INDEX IF NOT EXISTS safar_flow_jobs_due
  ON safar_flow.jobs (available_at, id)
  WHERE status IN ('scheduled', 'retrying');
CREATE INDEX IF NOT EXISTS safar_flow_jobs_org_recent
  ON safar_flow.jobs (organization_id, created_at DESC);

-- These jobs are internal. No direct Data API access for staff.
REVOKE ALL ON ALL TABLES IN SCHEMA safar_flow FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON safar_flow.jobs TO service_role;
ALTER TABLE safar_flow.jobs ENABLE ROW LEVEL SECURITY;

-- Enqueue only already-recorded, trusted domain_events for same-org bookings.
CREATE OR REPLACE FUNCTION safar_flow.enqueue_booking_task(
  p_event_id uuid,
  p_template_key text,
  p_delay_minutes integer DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = safar_flow, public, pg_temp AS $$
DECLARE
  ev public.domain_events;
  v_id uuid;
BEGIN
  IF p_template_key NOT IN ('supplier_confirmation', 'pretravel_checklist')
     OR p_delay_minutes IS NULL
     OR p_delay_minutes NOT BETWEEN 0 AND 43200
  THEN
    RAISE EXCEPTION 'invalid Safar Flow template or delay' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO ev FROM public.domain_events e WHERE e.id = p_event_id;
  IF NOT FOUND OR ev.organization_id IS NULL
     OR ev.aggregate_type <> 'booking'
     OR ev.aggregate_id IS NULL
     OR (p_template_key = 'supplier_confirmation' AND ev.event_type <> 'booking.created')
     OR (p_template_key = 'pretravel_checklist' AND ev.event_type <> 'booking.pre_travel')
     OR NOT EXISTS (
       SELECT 1 FROM public.bookings b
       WHERE b.id = ev.aggregate_id AND b.organization_id = ev.organization_id
     )
  THEN
    RAISE EXCEPTION 'event does not authorize requested booking/template/organization'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO safar_flow.jobs (
    organization_id, source_event_id, booking_id, template_key, available_at
  ) VALUES (
    ev.organization_id, ev.id, ev.aggregate_id, p_template_key,
    now() + make_interval(mins => p_delay_minutes)
  )
  ON CONFLICT ON CONSTRAINT safar_flow_jobs_booking_template_unique
    DO UPDATE SET id = jobs.id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Execute only small DB-local, transactional actions.
-- Row locks protect concurrent dispatches; the task INSERT and success marker
-- are one transaction. Exceptions roll back the task and schedule bounded retries.
CREATE OR REPLACE FUNCTION safar_flow.process_due_booking_tasks(
  p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = safar_flow, public, pg_temp AS $$
DECLARE
  job safar_flow.jobs%ROWTYPE;
  b public.bookings%ROWTYPE;
  v_attempt integer;
  v_success integer := 0;
  v_skipped integer := 0;
  v_retry integer := 0;
  v_dead integer := 0;
  v_title text;
  v_description text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'batch limit must be 1..100' USING ERRCODE = '22023';
  END IF;

  FOR job IN
    SELECT * FROM safar_flow.jobs j
    WHERE j.status IN ('scheduled', 'retrying')
      AND j.available_at <= now()
    ORDER BY j.available_at, j.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_attempt := job.attempts + 1;
    BEGIN
      SELECT * INTO b
      FROM public.bookings
      WHERE id = job.booking_id AND organization_id = job.organization_id;

      IF NOT FOUND OR b.status IN ('cancelled', 'completed') THEN
        UPDATE safar_flow.jobs SET status = 'skipped', attempts = v_attempt,
          processed_at = now(), updated_at = now(),
          last_error = 'booking unavailable or no longer actionable'
        WHERE id = job.id;
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      IF job.template_key = 'supplier_confirmation' THEN
        IF b.status <> 'pending' THEN
          UPDATE safar_flow.jobs SET status = 'skipped', attempts = v_attempt,
            processed_at = now(), updated_at = now(),
            last_error = 'booking no longer awaits supplier confirmation'
          WHERE id = job.id;
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;
        v_title := 'متابعة تأكيد المورد للحجز';
        v_description := 'راجع تأكيد المورد ومرجع الحجز قبل تحديث الحالة.';
      ELSIF job.template_key = 'pretravel_checklist' THEN
        IF b.start_date IS NULL OR b.start_date < CURRENT_DATE
           OR b.start_date > CURRENT_DATE + 7 THEN
          UPDATE safar_flow.jobs SET status = 'skipped', attempts = v_attempt,
            processed_at = now(), updated_at = now(),
            last_error = 'travel date not in upcoming 7-day window'
          WHERE id = job.id;
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;
        v_title := 'مراجعة مستندات الرحلة قبل السفر';
        v_description := 'تحقق من التذاكر والفواتشر والانتقالات وتأكيدات الموردين.';
      ELSE
        RAISE EXCEPTION 'unknown job template: %', job.template_key;
      END IF;

      INSERT INTO public.booking_tasks (
        booking_id, organization_id, title, description, status,
        priority, source, due_at
      ) VALUES (
        b.id, job.organization_id, v_title, v_description, 'open',
        CASE WHEN job.template_key = 'pretravel_checklist' THEN 'high' ELSE 'normal' END,
        'automation', now()
      );
      UPDATE safar_flow.jobs
      SET status = 'succeeded', attempts = v_attempt,
        processed_at = now(), last_error = NULL, updated_at = now()
      WHERE id = job.id;
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      -- The failed insert above is rolled back in this subtransaction.
      UPDATE safar_flow.jobs
      SET status = CASE WHEN v_attempt >= max_attempts THEN 'dead' ELSE 'retrying' END,
          attempts = v_attempt,
          available_at = now() + make_interval(mins => least(60, 5 * (2 ^ (v_attempt - 1))::integer)),
          last_error = left(SQLERRM, 500), updated_at = now(),
          processed_at = CASE WHEN v_attempt >= max_attempts THEN now() ELSE NULL END
      WHERE id = job.id;
      IF v_attempt >= job.max_attempts THEN
        v_dead := v_dead + 1;
      ELSE
        v_retry := v_retry + 1;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'succeeded', v_success, 'skipped', v_skipped,
    'retrying', v_retry, 'dead', v_dead
  );
END;
$$;

-- Manual recovery must be deliberate and internal-only, with a new attempt budget.
CREATE OR REPLACE FUNCTION safar_flow.retry_dead_booking_task(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = safar_flow, public, pg_temp AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE safar_flow.jobs
  SET status = 'retrying', attempts = 0, last_error = NULL,
      available_at = now(), processed_at = NULL, updated_at = now()
  WHERE id = p_job_id AND status = 'dead';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

-- Internal adapter for existing Safar domain events; the queue remains optional.
-- Designed for a bounded polling window rather than modifying the existing
-- shared event dispatcher. The unique queue key absorbs concurrent scans.
CREATE OR REPLACE FUNCTION safar_flow.enqueue_recent_booking_events(
  p_limit integer DEFAULT 50,
  p_since timestamptz DEFAULT now() - interval '1 day'
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = safar_flow, public, pg_temp AS $$
DECLARE
  ev record;
  v_count integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_since IS NULL THEN
    RAISE EXCEPTION 'invalid source scan window or limit' USING ERRCODE='22023';
  END IF;

  FOR ev IN
    SELECT e.id, e.event_type
    FROM public.domain_events e
    JOIN public.bookings b
      ON b.id = e.aggregate_id AND b.organization_id = e.organization_id
    WHERE e.aggregate_type = 'booking'
      AND e.organization_id IS NOT NULL
      AND e.occurred_at >= p_since
      AND (
        (e.event_type = 'booking.created' AND b.status = 'pending')
        OR (
          e.event_type = 'booking.pre_travel'
          AND b.status IN ('pending', 'confirmed')
          AND b.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM safar_flow.jobs j
        WHERE j.organization_id = e.organization_id
          AND j.booking_id = e.aggregate_id
          AND j.template_key = CASE
            WHEN e.event_type = 'booking.created' THEN 'supplier_confirmation'
            ELSE 'pretravel_checklist'
          END
      )
    ORDER BY e.occurred_at, e.id
    LIMIT p_limit
  LOOP
    PERFORM safar_flow.enqueue_booking_task(
      ev.id,
      CASE WHEN ev.event_type = 'booking.created'
        THEN 'supplier_confirmation' ELSE 'pretravel_checklist' END
    );
    v_count := v_count + 1;
  END LOOP;
  -- Number of candidate events attempted; concurrent scans may overlap.
  RETURN v_count;
END;
$$;

-- One bounded invocation for a privileged scheduler (not exposed to browser).
CREATE OR REPLACE FUNCTION safar_flow.dispatch_booking_tasks(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = safar_flow, public, pg_temp AS $$
DECLARE
  v_enqueued integer;
  v_processed jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'batch limit must be 1..100' USING ERRCODE='22023';
  END IF;
  v_enqueued := safar_flow.enqueue_recent_booking_events(p_limit);
  v_processed := safar_flow.process_due_booking_tasks(p_limit);
  RETURN jsonb_build_object('scanned_new_events', v_enqueued, 'jobs', v_processed);
END;
$$;

-- Internal execution only. Do not grant these capabilities to authenticated.
REVOKE ALL ON FUNCTION safar_flow.enqueue_booking_task(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION safar_flow.process_due_booking_tasks(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION safar_flow.retry_dead_booking_task(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION safar_flow.enqueue_recent_booking_events(integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION safar_flow.dispatch_booking_tasks(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION safar_flow.enqueue_booking_task(uuid, text, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION safar_flow.process_due_booking_tasks(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION safar_flow.retry_dead_booking_task(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION safar_flow.enqueue_recent_booking_events(integer, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION safar_flow.dispatch_booking_tasks(integer)
  TO service_role;

COMMIT;
