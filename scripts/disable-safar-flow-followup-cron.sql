-- Safar Flow V1 rollback: disable future dispatches (preserve records).
-- No quote, notification or audit history is deleted.
DO $$
DECLARE job record;
BEGIN
  FOR job IN SELECT jobid FROM cron.job WHERE jobname = 'safar-flow-quote-followups-v1'
  LOOP PERFORM cron.unschedule(job.jobid); END LOOP;
END;
$$;
