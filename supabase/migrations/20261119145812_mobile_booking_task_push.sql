CREATE TABLE public.mobile_push_devices (
  token text PRIMARY KEY CHECK (char_length(token) BETWEEN 10 AND 4096),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL DEFAULT ((auth.jwt()->>'session_id')::uuid),
  registered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mobile_push_devices_user_idx ON public.mobile_push_devices(user_id);
ALTER TABLE public.mobile_push_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_push_devices FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.mobile_push_devices TO authenticated;
GRANT INSERT (token,user_id,auth_session_id,registered_at),
  UPDATE (token,user_id,auth_session_id,registered_at) ON public.mobile_push_devices TO authenticated;
GRANT SELECT, DELETE ON public.mobile_push_devices TO service_role;
CREATE POLICY mobile_push_devices_self_select ON public.mobile_push_devices FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY mobile_push_devices_self_delete ON public.mobile_push_devices FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND auth_session_id = (SELECT (auth.jwt()->>'session_id')::uuid));
CREATE POLICY mobile_push_devices_self_insert ON public.mobile_push_devices FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND auth_session_id = (SELECT (auth.jwt()->>'session_id')::uuid));
CREATE POLICY mobile_push_devices_self_update ON public.mobile_push_devices FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()) AND auth_session_id = (SELECT (auth.jwt()->>'session_id')::uuid));

CREATE TABLE public.mobile_task_push_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.booking_tasks(id) ON DELETE CASCADE,
  token text NOT NULL REFERENCES public.mobile_push_devices(token) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sent','dropped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, token)
);
CREATE INDEX mobile_task_push_pending_idx ON public.mobile_task_push_jobs(next_attempt_at,id)
WHERE state = 'pending';
CREATE INDEX mobile_task_push_token_idx ON public.mobile_task_push_jobs(token);
CREATE INDEX mobile_task_push_task_idx ON public.mobile_task_push_jobs(task_id);
ALTER TABLE public.mobile_task_push_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_task_push_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE (state,next_attempt_at) ON public.mobile_task_push_jobs TO service_role;

CREATE FUNCTION operations_private.enqueue_mobile_task_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  delivery text := NEW.metadata->>'delivery_key';
  task_id uuid;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.user_id IS NULL OR delivery IS NULL
    OR delivery !~ '^task:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NEW; END IF;
  task_id := substring(delivery FROM 6)::uuid;
  INSERT INTO public.mobile_task_push_jobs(notification_id,task_id,token,auth_session_id)
  SELECT NEW.id,task_id,d.token,d.auth_session_id
  FROM public.mobile_push_devices d
  JOIN public.booking_tasks t ON t.id = task_id AND t.organization_id = NEW.organization_id
  WHERE d.user_id = NEW.user_id AND t.assignee_id = NEW.user_id
    AND t.status NOT IN ('cancelled','canceled','done','completed')
  ON CONFLICT (notification_id,token) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.enqueue_mobile_task_push() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enqueue_mobile_task_push AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION operations_private.enqueue_mobile_task_push();

CREATE FUNCTION operations_private.claim_mobile_task_push(_limit integer)
RETURNS TABLE(job_id bigint, notification_id uuid, token text, attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.mobile_task_push_jobs j WHERE j.queued_at < now() - interval '7 days';
  RETURN QUERY
  WITH eligible AS (
    SELECT j.id
    FROM public.mobile_task_push_jobs j
    JOIN public.notifications n ON n.id = j.notification_id
    JOIN public.mobile_push_devices d ON d.token = j.token AND d.user_id = n.user_id
      AND d.auth_session_id = j.auth_session_id
    JOIN auth.sessions s ON s.id = j.auth_session_id AND s.user_id = d.user_id
      AND (s.not_after IS NULL OR s.not_after > now())
    JOIN public.booking_tasks t ON t.id = j.task_id AND t.organization_id = n.organization_id
      AND t.assignee_id = n.user_id
    JOIN public.bookings b ON b.id = t.booking_id AND b.organization_id = t.organization_id AND NOT coalesce(b.is_demo,false)
    WHERE j.state = 'pending' AND j.attempts < 5 AND j.next_attempt_at <= now()
      AND j.queued_at > now() - interval '1 day'
      AND NOT coalesce(n.is_read,false) AND t.status NOT IN ('cancelled','canceled','done','completed')
      AND operations_private.notification_recipient(t.organization_id,t.booking_id,n.user_id,'bookings_view')
        IS NOT DISTINCT FROM n.user_id
    ORDER BY j.next_attempt_at,j.id
    LIMIT least(greatest(coalesce(_limit,20),1),50)
    FOR UPDATE OF j SKIP LOCKED
  )
  UPDATE public.mobile_task_push_jobs j
  SET next_attempt_at = now() + interval '5 minutes', attempts = j.attempts + 1
  FROM eligible e WHERE e.id = j.id
  RETURNING j.id,j.notification_id,j.token,j.attempts;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.claim_mobile_task_push(integer) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA operations_private TO service_role;
GRANT EXECUTE ON FUNCTION operations_private.claim_mobile_task_push(integer) TO service_role;

CREATE FUNCTION public.claim_mobile_task_push(_limit integer DEFAULT 20)
RETURNS TABLE(job_id bigint, notification_id uuid, token text, attempts integer)
LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM operations_private.claim_mobile_task_push(_limit) $$;
REVOKE ALL ON FUNCTION public.claim_mobile_task_push(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mobile_task_push(integer) TO service_role;

-- The scheduler stays inert until the deployment URL and worker secret exist in Vault.
DO $schedule$
BEGIN
  IF to_regclass('cron.job') IS NULL OR to_regclass('vault.decrypted_secrets') IS NULL OR
    to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN RETURN; END IF;
  PERFORM cron.schedule('safar-mobile-task-push', '* * * * *', $job$
    SELECT net.http_post(
      url := destination.decrypted_secret,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secret.decrypted_secret),
      body := '{}'::jsonb, timeout_milliseconds := 30000
    )
    FROM vault.decrypted_secrets destination
    CROSS JOIN vault.decrypted_secrets secret
    WHERE destination.name = 'safar_mobile_push_worker_url'
      AND destination.decrypted_secret LIKE 'https://%/functions/v1/mobile-task-push'
      AND secret.name = 'safar_mobile_push_worker_secret' AND char_length(secret.decrypted_secret) >= 32
      AND EXISTS (
        SELECT FROM public.mobile_task_push_jobs j WHERE j.state = 'pending' AND j.attempts < 5
          AND j.next_attempt_at <= now() AND j.queued_at > now() - interval '1 day'
      )
    LIMIT 1
  $job$);
END;
$schedule$;
