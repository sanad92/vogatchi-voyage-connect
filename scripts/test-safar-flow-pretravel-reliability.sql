-- Safar Flow V6 isolated PostgreSQL regression:
-- old booking.created events can still cause pre-travel checklist tasks.
-- Run only in the ephemeral safar_flow_test DB AFTER V2/V3/V4 fixtures.
\set ON_ERROR_STOP on

\i scripts/deploy-safar-flow-pretravel-reliability.sql

-- No direct browser execution of internal scanning or dispatcher.
DO $$
BEGIN
  IF has_function_privilege('authenticated',
        'safar_flow.enqueue_upcoming_pretravel_checklists(integer,integer)', 'EXECUTE')
      OR has_function_privilege('authenticated',
        'safar_flow.dispatch_booking_tasks(integer)', 'EXECUTE')
      OR has_schema_privilege('authenticated','safar_flow','USAGE')
  THEN
    RAISE EXCEPTION 'Internal pretravel functions were exposed to app users';
  END IF;
END $$;

-- All these test bookings were made 21 days ago. They are now in
-- or out of the pre-travel window. One has no trusted creation event.
INSERT INTO public.bookings(id, organization_id, status, start_date) VALUES
('00000000-0000-4000-8000-000000000301',
 '00000000-0000-4000-8000-000000000001','confirmed',CURRENT_DATE+2),
('00000000-0000-4000-8000-000000000302',
 '00000000-0000-4000-8000-000000000002','confirmed',CURRENT_DATE+2),
('00000000-0000-4000-8000-000000000303',
 '00000000-0000-4000-8000-000000000001','confirmed',CURRENT_DATE+25),
('00000000-0000-4000-8000-000000000304',
 '00000000-0000-4000-8000-000000000001','cancelled',CURRENT_DATE+2),
('00000000-0000-4000-8000-000000000305',
 '00000000-0000-4000-8000-000000000001','confirmed',CURRENT_DATE+2),
('00000000-0000-4000-8000-000000000306',
 '00000000-0000-4000-8000-000000000001','confirmed',CURRENT_DATE+2);

INSERT INTO public.domain_events(
  id,organization_id,aggregate_type,aggregate_id,event_type,occurred_at
) VALUES
('00000000-0000-4000-8000-000000000401',
 '00000000-0000-4000-8000-000000000001',
 'booking','00000000-0000-4000-8000-000000000301',
 'booking.created',now()-interval '21 days'),
('00000000-0000-4000-8000-000000000402',
 '00000000-0000-4000-8000-000000000002',
 'booking','00000000-0000-4000-8000-000000000302',
 'booking.created',now()-interval '21 days'),
('00000000-0000-4000-8000-000000000403',
 '00000000-0000-4000-8000-000000000001',
 'booking','00000000-0000-4000-8000-000000000303',
 'booking.created',now()-interval '21 days'),
('00000000-0000-4000-8000-000000000404',
 '00000000-0000-4000-8000-000000000001',
 'booking','00000000-0000-4000-8000-000000000304',
 'booking.created',now()-interval '21 days'),
-- Forged/mismatched-tenant event must never authorize a job for org A booking.
('00000000-0000-4000-8000-000000000406',
 '00000000-0000-4000-8000-000000000002',
 'booking','00000000-0000-4000-8000-000000000306',
 'booking.created',now()-interval '21 days');

-- The original 24h event scanner cannot see our month-old creation events.
DO $$
DECLARE n integer;
BEGIN
  n:=safar_flow.enqueue_recent_booking_events(50,now()-interval '1 day');
  IF EXISTS (
    SELECT 1 FROM safar_flow.jobs j
    WHERE j.booking_id IN (
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000302'
    )
  ) THEN RAISE EXCEPTION 'Old creation event unexpectedly processed by one-day scan'; END IF;
END $$;

DO $$
DECLARE n integer; repeat_n integer;
BEGIN
  n:=safar_flow.enqueue_upcoming_pretravel_checklists(100,3);
  IF n < 2 THEN RAISE EXCEPTION 'Old booking events were not discovered: %',n; END IF;

  IF (SELECT count(*) FROM safar_flow.jobs
      WHERE template_key='pretravel_checklist'
        AND booking_id IN (
          '00000000-0000-4000-8000-000000000301',
          '00000000-0000-4000-8000-000000000302'
        )) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly one pretravel job for each old booking'; END IF;

  IF EXISTS (
    SELECT 1 FROM safar_flow.jobs
    WHERE booking_id IN (
      '00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000304',
      '00000000-0000-4000-8000-000000000305',
      '00000000-0000-4000-8000-000000000306'
    )
  ) THEN RAISE EXCEPTION 'Invalid, cancelled, far or cross-org booking was queued'; END IF;

  -- Stable unique (organization, booking, template) eliminates repeat scans.
  repeat_n:=safar_flow.enqueue_upcoming_pretravel_checklists(100,3);
  IF repeat_n <> 0 THEN RAISE EXCEPTION 'Pretravel scan is not idempotent: %',repeat_n; END IF;
END $$;

-- A cancellation after queuing must prevent the actual task from being made.
UPDATE public.bookings SET status='cancelled'
WHERE id='00000000-0000-4000-8000-000000000302';

DO $$
DECLARE result jsonb;
BEGIN
  result:=safar_flow.dispatch_booking_tasks(100);
  IF result->>'upcoming_pretravel_jobs' <> '0' THEN
    RAISE EXCEPTION 'Previously queued pretravel jobs were duplicated: %',result;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM safar_flow.jobs
    WHERE booking_id='00000000-0000-4000-8000-000000000301'
      AND template_key='pretravel_checklist' AND status='succeeded'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.booking_tasks
    WHERE booking_id='00000000-0000-4000-8000-000000000301'
      AND title='مراجعة مستندات الرحلة قبل السفر'
  ) THEN RAISE EXCEPTION 'Old confirmed booking did not receive its review task'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM safar_flow.jobs
    WHERE booking_id='00000000-0000-4000-8000-000000000302'
      AND template_key='pretravel_checklist' AND status='skipped'
  ) OR EXISTS (
    SELECT 1 FROM public.booking_tasks
    WHERE booking_id='00000000-0000-4000-8000-000000000302'
  ) THEN RAISE EXCEPTION 'Cancelled booking generated a task'; END IF;

  result:=safar_flow.dispatch_booking_tasks(100);
  IF EXISTS (
    SELECT 1 FROM public.booking_tasks
    WHERE booking_id='00000000-0000-4000-8000-000000000301'
      GROUP BY booking_id HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate pretravel task on repeated dispatch'; END IF;
END $$;

-- Tight input controls for internal privileged APIs.
DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM safar_flow.enqueue_upcoming_pretravel_checklists(50,0);
  EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Invalid pretravel interval accepted'; END IF;
END $$;

SELECT 'Safar Flow V6 pretravel reliability checks passed' AS result;
