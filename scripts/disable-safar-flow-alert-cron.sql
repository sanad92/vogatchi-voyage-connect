-- Safar Flow V4 rollback: prevent new alerts; preserve all historical records.
DO $$
DECLARE job record;
BEGIN
  FOR job IN SELECT jobid FROM cron.job
    WHERE jobname='safar-flow-failure-alerts-v4'
  LOOP PERFORM cron.unschedule(job.jobid); END LOOP;
END $$;
