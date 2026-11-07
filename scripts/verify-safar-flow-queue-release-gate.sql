-- Safar Flow: fail-closed, READ-ONLY release gate for V2 / V3 / V4 / V6.
-- Run against a STAGING CLONE after all staged SQL has been reviewed/applied.
-- In CI this runs in an ephemeral PostgreSQL fixture database.
-- Does not mutate business data, schedule cron, send notifications or enqueue jobs.
\set ON_ERROR_STOP on

DO $gate$
DECLARE
  v_name text;
  v_oid oid;
  v_rls boolean;
BEGIN
  -- Do not certify a partially deployed engine.
  FOREACH v_name IN ARRAY ARRAY[
    'public.bookings', 'public.booking_tasks', 'public.domain_events',
    'public.organization_members', 'public.notifications',
    'safar_flow.jobs', 'safar_flow.job_alerts'
  ] LOOP
    IF to_regclass(v_name) IS NULL THEN
      RAISE EXCEPTION 'Release BLOCKED: missing relation %', v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY ARRAY[
    'safar_flow.enqueue_booking_task(uuid,text,integer)',
    'safar_flow.process_due_booking_tasks(integer)',
    'safar_flow.retry_dead_booking_task(uuid)',
    'safar_flow.enqueue_recent_booking_events(integer,timestamptz)',
    'safar_flow.enqueue_upcoming_pretravel_checklists(integer,integer)',
    'safar_flow.dispatch_booking_tasks(integer)',
    'safar_flow.dispatch_failure_alerts(integer,integer)'
  ] LOOP
    v_oid := to_regprocedure(v_name);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Release BLOCKED: missing private function %', v_name;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE')
       OR has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Release BLOCKED: private function callable by browser role: %', v_name;
    END IF;
    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Release BLOCKED: service role cannot execute %', v_name;
    END IF;
  END LOOP;

  IF has_schema_privilege('anon', 'safar_flow', 'USAGE')
     OR has_schema_privilege('authenticated', 'safar_flow', 'USAGE') THEN
    RAISE EXCEPTION 'Release BLOCKED: private queue schema exposed';
  END IF;

  FOREACH v_name IN ARRAY ARRAY[
    'safar_flow.jobs', 'safar_flow.job_alerts'
  ] LOOP
    SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c
    WHERE c.oid = to_regclass(v_name);
    IF NOT COALESCE(v_rls, false) THEN
      RAISE EXCEPTION 'Release BLOCKED: RLS disabled on %', v_name;
    END IF;
    IF has_table_privilege('authenticated', v_name, 'SELECT')
       OR has_table_privilege('authenticated', v_name, 'INSERT')
       OR has_table_privilege('authenticated', v_name, 'UPDATE')
       OR has_table_privilege('authenticated', v_name, 'DELETE') THEN
      RAISE EXCEPTION 'Release BLOCKED: direct Data API access to %', v_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'safar_flow.jobs'::regclass
      AND conname = 'safar_flow_jobs_booking_template_unique'
      AND contype = 'u'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'safar_flow.job_alerts'::regclass
      AND conname = 'safar_flow_job_alert_once'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'Release BLOCKED: deduplication constraints absent';
  END IF;

  -- Read-only monitoring must be visible to signed-in users, not anonymous.
  FOREACH v_name IN ARRAY ARRAY[
    'public.get_safar_flow_job_health(uuid,integer)',
    'public.get_safar_flow_alert_health(uuid,integer)'
  ] LOOP
    v_oid := to_regprocedure(v_name);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Release BLOCKED: missing monitoring RPC %', v_name;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Release BLOCKED: monitoring RPC grant mismatch %', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Safar Flow queue/monitor/alerts READ-ONLY release gate: PASS';
END;
$gate$;
