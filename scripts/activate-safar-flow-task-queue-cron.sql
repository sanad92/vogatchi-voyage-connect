-- Safar Flow V2 manual opt-in scheduler: INTERNAL BOOKING TASKS ONLY.
-- Activate only after the queue SQL was deployed and fully tested on staging.
-- When enabled, scans trusted booking events from the last day AND processes due jobs.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    RAISE EXCEPTION 'pg_cron is required before activation';
  END IF;
  IF to_regprocedure('safar_flow.dispatch_booking_tasks(integer)') IS NULL THEN
    RAISE EXCEPTION 'Safar Flow job queue was not deployed';
  END IF;
END $$;

DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname='safar-flow-booking-task-queue-v2'
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'safar-flow-booking-task-queue-v2',
  '*/5 * * * *',
  $job$ SELECT safar_flow.dispatch_booking_tasks(50); $job$
);
COMMIT;
