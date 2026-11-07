-- Stop future Safar Flow V2 dispatches. No job or booking data is deleted.
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname='safar-flow-booking-task-queue-v2'
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;
