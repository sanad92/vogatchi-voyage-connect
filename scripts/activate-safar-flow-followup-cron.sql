-- Safar Flow V1 (MANUAL OPT-IN): enable five-minute in-app quote followups.
-- Run only AFTER deploy-safar-flow-followup-dispatch.sql is deployed and the
-- test environment passes tenant, notification, concurrency and cron checks.
-- Initial run may notify staff for historically overdue pending followups.
-- Do NOT run as part of normal app build or migration without review.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron must be installed first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='dispatch_quote_followups'
  ) THEN
    RAISE EXCEPTION 'dispatch_quote_followups() must be deployed first';
  END IF;
END;
$$;

DO $$
DECLARE job record;
BEGIN
  FOR job IN SELECT jobid FROM cron.job WHERE jobname = 'safar-flow-quote-followups-v1'
  LOOP PERFORM cron.unschedule(job.jobid); END LOOP;
END;
$$;

SELECT cron.schedule(
  'safar-flow-quote-followups-v1',
  '*/5 * * * *',
  $job$ SELECT public.dispatch_quote_followups(); $job$
);

COMMIT;
