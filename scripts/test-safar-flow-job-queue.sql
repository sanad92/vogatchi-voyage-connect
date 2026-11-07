-- Safar Flow V2 isolated PostgreSQL integration test.
-- Runs in a throwaway database only; never use this file against live Safar ERP.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE TABLE public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  event_type text NOT NULL
);
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  status text NOT NULL,
  start_date date
);
CREATE TABLE public.booking_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text,
  priority text,
  source text,
  due_at timestamptz
);

\i scripts/deploy-safar-flow-job-queue.sql

DO $$
BEGIN
  IF has_schema_privilege('authenticated', 'safar_flow', 'USAGE') OR
     has_function_privilege('authenticated', 'safar_flow.enqueue_booking_task(uuid,text,integer)', 'EXECUTE') OR
     has_function_privilege('authenticated', 'safar_flow.process_due_booking_tasks(integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Public/user execution access was exposed';
  END IF;
END $$;

-- Multiple organizations, pending/confirmed/cancelled and future booking.
INSERT INTO public.bookings(id,organization_id,status,start_date) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','pending', CURRENT_DATE+2),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','pending', CURRENT_DATE+1),
('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','cancelled', CURRENT_DATE+1),
('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','confirmed', CURRENT_DATE+1),
('00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000001','confirmed', CURRENT_DATE+30),
('00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000001','pending', CURRENT_DATE+2);

INSERT INTO public.domain_events(id,organization_id,aggregate_type,aggregate_id,event_type) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000101','booking.created'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000101','booking.pre_travel'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002','booking','00000000-0000-4000-8000-000000000102','booking.created'),
('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000103','booking.created'),
('00000000-0000-4000-8000-000000000205','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000104','booking.pre_travel'),
('00000000-0000-4000-8000-000000000206','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000105','booking.pre_travel'),
('00000000-0000-4000-8000-000000000207','00000000-0000-4000-8000-000000000002','booking','00000000-0000-4000-8000-000000000101','booking.created'),
('00000000-0000-4000-8000-000000000208','00000000-0000-4000-8000-000000000001','booking','00000000-0000-4000-8000-000000000106','booking.created');

DO $$
DECLARE first_id uuid; second_id uuid; denied boolean := false;
BEGIN
  first_id := safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000201','supplier_confirmation');
  second_id := safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000201','supplier_confirmation');
  IF first_id IS DISTINCT FROM second_id THEN RAISE EXCEPTION 'Non-idempotent enqueue'; END IF;
  PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000202','pretravel_checklist');
  PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000203','supplier_confirmation');
  PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000204','supplier_confirmation');
  PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000205','pretravel_checklist');
  PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000206','pretravel_checklist');

  BEGIN
    PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000207','supplier_confirmation');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-organization event accepted'; END IF;

  denied := false;
  BEGIN
    PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000201','pretravel_checklist');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Wrong event/template accepted'; END IF;

  denied := false;
  BEGIN
    PERFORM safar_flow.enqueue_booking_task('00000000-0000-4000-8000-000000000201','supplier_confirmation',-1);
  EXCEPTION WHEN invalid_parameter_value THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid schedule delay accepted'; END IF;

  IF (SELECT count(*) FROM safar_flow.jobs) <> 6 THEN
    RAISE EXCEPTION 'Expected 6 unique jobs';
  END IF;
END $$;

-- Fail one task to exercise retry/backoff/dead-letter (without executing the action).
CREATE FUNCTION public.test_job_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.booking_id='00000000-0000-4000-8000-000000000106'
 THEN RAISE EXCEPTION 'simulated task write failure'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER test_job_failure BEFORE INSERT ON public.booking_tasks
FOR EACH ROW EXECUTE FUNCTION public.test_job_failure();

SELECT safar_flow.enqueue_booking_task(
  '00000000-0000-4000-8000-000000000208','supplier_confirmation'
);

DO $$
DECLARE result jsonb;
BEGIN
  result := safar_flow.process_due_booking_tasks(50);
  IF result->>'succeeded' <> '4' OR result->>'skipped' <> '2' OR result->>'retrying' <> '1' THEN
    RAISE EXCEPTION 'Unexpected first batch: %', result;
  END IF;
  IF (SELECT count(*) FROM public.booking_tasks) <> 4 THEN
    RAISE EXCEPTION 'Expected four booking tasks for valid orgs';
  END IF;
  IF (SELECT count(*) FROM public.booking_tasks WHERE organization_id='00000000-0000-4000-8000-000000000002') <> 1 THEN
    RAISE EXCEPTION 'Organization cross-over in actions';
  END IF;
  result := safar_flow.process_due_booking_tasks();
  IF result->>'succeeded' <> '0' OR result->>'retrying' <> '0' THEN
    RAISE EXCEPTION 'Unintended duplicate or early retry: %', result;
  END IF;
END $$;

-- Advance mock clock by setting due time ONLY IN THIS TEST DATABASE.
UPDATE safar_flow.jobs
SET available_at=now()-interval '1 second'
WHERE status='retrying';

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.process_due_booking_tasks();
  IF r->>'retrying' <> '1' THEN RAISE EXCEPTION 'Second attempt missing: %', r; END IF;
END $$;

UPDATE safar_flow.jobs
SET available_at=now()-interval '1 second'
WHERE status='retrying';

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.process_due_booking_tasks();
  IF r->>'dead' <> '1' THEN RAISE EXCEPTION 'Dead-letter after 3 attempts missing: %', r; END IF;
  IF (SELECT count(*) FROM safar_flow.jobs WHERE status='dead' AND attempts=3) <> 1 THEN
    RAISE EXCEPTION 'Incorrect dead-letter state';
  END IF;
  IF (SELECT count(*) FROM public.booking_tasks) <> 4 THEN
    RAISE EXCEPTION 'Side effect leaked from failed transaction';
  END IF;
END $$;

DROP TRIGGER test_job_failure ON public.booking_tasks;
DROP FUNCTION public.test_job_failure();

DO $$
DECLARE dead_id uuid; r jsonb;
BEGIN
  SELECT id INTO dead_id FROM safar_flow.jobs WHERE status='dead';
  IF NOT safar_flow.retry_dead_booking_task(dead_id) THEN
    RAISE EXCEPTION 'Unable to retry dead-letter job';
  END IF;
  r := safar_flow.process_due_booking_tasks();
  IF r->>'succeeded' <> '1' THEN RAISE EXCEPTION 'Retry after recovery failed: %', r; END IF;
  IF (SELECT count(*) FROM public.booking_tasks) <> 5 THEN
    RAISE EXCEPTION 'Recovery did not insert exactly one task';
  END IF;
  IF safar_flow.retry_dead_booking_task(dead_id) THEN
    RAISE EXCEPTION 'Already completed job was retried';
  END IF;
  r := safar_flow.process_due_booking_tasks();
  IF r->>'succeeded' <> '0' THEN RAISE EXCEPTION 'Duplicate side effects: %', r; END IF;
END $$;

SELECT 'Safar Flow queue integration checks passed' AS result;
