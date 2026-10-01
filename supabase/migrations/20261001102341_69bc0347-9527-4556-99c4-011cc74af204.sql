-- lovable-cron-fallback-reviewed: IMAP has no push webhook; user chose 2-minute delivery window
CREATE POLICY "org members read email attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'email-attachments' AND ((storage.foldername(name))[1])::uuid = ANY(public.get_user_org_ids(auth.uid())));

DO $b$ DECLARE j bigint; BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname = 'email-sync-every-2-min' LOOP PERFORM cron.unschedule(j); END LOOP;
END $b$;
SELECT cron.schedule('email-sync-every-2-min', '*/2 * * * *', $job$
  SELECT net.http_post(
    url := 'https://gvozalurfthzxpuasplo.supabase.co/functions/v1/email-sync',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)),
    body := '{}'::jsonb, timeout_milliseconds := 120000) AS request_id;
$job$);