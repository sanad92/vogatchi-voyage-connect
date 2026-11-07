-- Safar Flow V4 opt-in INTERNAL alert scheduler.
-- Manual deployment ONLY after V2/V3/V4 staging QA and backlog review.
-- Never automatically install this cron job from the app build.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    RAISE EXCEPTION 'pg_cron must be installed first';
  END IF;
  IF to_regprocedure('safar_flow.dispatch_failure_alerts(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Safar Flow alert dispatcher must be deployed first';
  END IF;
END $$;
DO $$
DECLARE job record;
BEGIN
  FOR job IN SELECT jobid FROM cron.job
    WHERE jobname='safar-flow-failure-alerts-v4'
  LOOP PERFORM cron.unschedule(job.jobid); END LOOP;
END $$;
SELECT cron.schedule(
  'safar-flow-failure-alerts-v4',
  '*/10 * * * *',
  $job$ SELECT safar_flow.dispatch_failure_alerts(50,30); $job$
);
COMMIT;
