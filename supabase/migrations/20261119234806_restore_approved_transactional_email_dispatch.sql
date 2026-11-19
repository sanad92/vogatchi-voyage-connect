-- Only messages from producers explicitly migrated to the dispatcher can be sent.
ALTER TABLE public.email_queue
  ADD COLUMN dispatch_source text,
  ADD COLUMN dispatch_key text,
  ADD COLUMN dispatch_claim uuid,
  ADD COLUMN dispatch_claimed_at timestamptz,
  ADD COLUMN dispatch_started_at timestamptz,
  ADD COLUMN provider_message_id text,
  ADD CONSTRAINT email_queue_dispatch_source_check CHECK (
    (dispatch_source IS NULL AND dispatch_key IS NULL)
    OR (
      organization_id IS NOT NULL
      AND length(dispatch_key) BETWEEN 1 AND 200
      AND (dispatch_source, email_type) IN (
        ('organization_onboarding', 'welcome'),
        ('booking_confirmation', 'booking_confirmation'),
        ('customer_registration', 'customer_registered')
      )
    ) IS TRUE
  );

-- The application uses server producers. Keep existing read grants and RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.email_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_queue TO service_role;
CREATE UNIQUE INDEX email_queue_dispatch_key_unique
  ON public.email_queue (organization_id, dispatch_source, dispatch_key);
CREATE INDEX email_queue_dispatch_due
  ON public.email_queue (scheduled_for, id)
  WHERE dispatch_source IS NOT NULL AND status IN ('pending', 'processing');

CREATE FUNCTION public.claim_transactional_emails(_limit integer DEFAULT 6, _email_id uuid DEFAULT NULL)
RETURNS SETOF public.email_queue
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Keep ambiguous sends visible after the bounded retry window. Use a limited
  -- sweep so a backlog cannot stall every subsequent claim.
  WITH expired AS (
    SELECT e.id
    FROM public.email_queue e
    WHERE e.dispatch_source IS NOT NULL AND e.status IN ('pending', 'processing')
      AND (e.status = 'pending' OR e.dispatch_claimed_at < now() - interval '5 minutes')
      AND (coalesce(e.scheduled_for, e.created_at) < now() - interval '1 day'
        OR e.dispatch_started_at < now() - interval '1 hour'
        OR e.attempts >= least(e.max_attempts, 3))
    ORDER BY e.created_at, e.id
    LIMIT 24
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_queue e
  SET status = CASE WHEN e.dispatch_started_at IS NULL THEN 'failed' ELSE 'needs_review' END,
    error_message = CASE WHEN e.dispatch_started_at IS NULL THEN 'dispatch_expired' ELSE 'dispatch_outcome_unknown' END,
    dispatch_claim = NULL, dispatch_claimed_at = NULL, updated_at = now()
  FROM expired
  WHERE e.id = expired.id;

  RETURN QUERY
  WITH candidates AS (
    SELECT e.id
    FROM public.email_queue e
    WHERE e.dispatch_source IS NOT NULL AND (_email_id IS NULL OR e.id = _email_id)
      AND (
        (e.status = 'pending' AND coalesce(e.scheduled_for, e.created_at) <= now())
        OR (e.status = 'processing' AND e.dispatch_claimed_at < now() - interval '5 minutes')
      )
      AND coalesce(e.scheduled_for, e.created_at) >= now() - interval '1 day'
      AND (e.dispatch_started_at IS NULL OR e.dispatch_started_at >= now() - interval '1 hour')
      AND e.attempts < least(e.max_attempts, 3)
    ORDER BY e.scheduled_for NULLS FIRST, e.id
    LIMIT greatest(1, least(coalesce(_limit, 6), 6))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_queue e
  SET status = 'processing', attempts = e.attempts + 1,
    dispatch_claim = gen_random_uuid(), dispatch_claimed_at = now(),
    dispatch_started_at = coalesce(e.dispatch_started_at, now()), updated_at = now()
  FROM candidates
  WHERE e.id = candidates.id
  RETURNING e.*;
END;
$$;

CREATE FUNCTION public.finish_transactional_email(
  _email_id uuid, _claim uuid, _outcome text, _provider_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF _outcome NOT IN ('sent', 'rejected', 'retry', 'needs_review') OR _outcome IS NULL
    OR (_outcome = 'sent' AND (nullif(btrim(_provider_id), '') IS NULL OR length(_provider_id) > 200)) THEN
    RAISE EXCEPTION 'Invalid email dispatch outcome' USING ERRCODE = '22023';
  END IF;
  UPDATE public.email_queue
  SET status = CASE
      WHEN _outcome = 'sent' THEN 'sent'
      WHEN _outcome = 'rejected' THEN 'failed'
      WHEN _outcome = 'retry' AND attempts < least(max_attempts, 3) THEN 'pending'
      ELSE 'needs_review' END,
    scheduled_for = CASE WHEN _outcome = 'retry' THEN now() + make_interval(mins => attempts * 2) ELSE scheduled_for END,
    sent_at = CASE WHEN _outcome = 'sent' THEN now() ELSE sent_at END,
    provider_message_id = CASE WHEN _outcome = 'sent' THEN _provider_id ELSE NULL END,
    error_message = CASE WHEN _outcome = 'sent' THEN NULL ELSE _outcome END,
    dispatch_claim = NULL, dispatch_claimed_at = NULL, updated_at = now()
  WHERE id = _email_id AND status = 'processing' AND dispatch_claim = _claim;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_transactional_emails(integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_transactional_email(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_transactional_emails(integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_transactional_email(uuid, uuid, text, text) TO service_role;

-- Booking and onboarding producers call from a service-role Edge Function.
CREATE FUNCTION public.enqueue_approved_transactional_email(
  _org uuid, _source text, _key text, _type text, _recipient text, _name text, _subject text, _data jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE existing_status text;
BEGIN
  INSERT INTO public.email_queue (
    organization_id, email_type, recipient_email, recipient_name, subject,
    template_data, dispatch_source, dispatch_key
  ) VALUES (_org, _type, _recipient, _name, coalesce(_subject, ''), coalesce(_data, '{}'::jsonb), _source, _key)
  ON CONFLICT (organization_id, dispatch_source, dispatch_key) DO NOTHING;
  IF FOUND THEN RETURN 'pending'; END IF;
  SELECT e.status INTO existing_status
  FROM public.email_queue e
  WHERE e.organization_id = _org AND e.dispatch_source = _source AND e.dispatch_key = _key;
  RETURN existing_status;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_approved_transactional_email(uuid, text, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_approved_transactional_email(uuid, text, text, text, text, text, text, jsonb)
  TO service_role;

-- Preserve CRM registration emails after removing direct browser queue writes.
CREATE OR REPLACE FUNCTION public.queue_customer_registration_automation(p_org_id uuid, p_customer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_action record;
  v_queued integer := 0;
BEGIN
  IF auth.uid() IS NULL
    OR NOT coalesce(public.user_belongs_to_org(auth.uid(), p_org_id), false)
    OR NOT coalesce(public.can_org_write(p_org_id), false)
    OR public.has_org_permission(p_org_id, 'customers_create') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Customer registration automation not available' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND organization_id = p_org_id
    AND created_by = (SELECT auth.uid()) AND NOT is_demo AND archived_at IS NULL;
  IF NOT FOUND OR nullif(btrim(v_customer.email), '') IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_action IN
    SELECT r.id AS rule_id, a.id AS action_id, a.action_config
    FROM public.automation_rules r JOIN public.automation_actions a ON a.rule_id = r.id
    WHERE r.organization_id = p_org_id AND r.is_active
      AND r.trigger_type = 'customer_registered' AND r.trigger_config = '{"has_email":true}'::jsonb
      AND a.is_active AND a.action_type = 'send_email'
      AND NOT EXISTS (
        SELECT 1 FROM public.automation_actions other
        WHERE other.rule_id = r.id AND other.is_active AND other.action_type <> 'send_email'
      )
    ORDER BY r.id, a.sort_order, a.id
  LOOP
    INSERT INTO public.automation_logs (rule_id, organization_id, trigger_type, action_type, status, metadata)
    VALUES (v_action.rule_id, p_org_id, 'customer_registered', 'send_email', 'queued',
      jsonb_build_object('customer_id', p_customer_id, 'action_id', v_action.action_id))
    ON CONFLICT (rule_id, (metadata->>'customer_id'), (metadata->>'action_id'))
    WHERE trigger_type = 'customer_registered' AND action_type = 'send_email'
    DO NOTHING;
    IF FOUND THEN
      PERFORM public.enqueue_approved_transactional_email(
        p_org_id, 'customer_registration',
        p_customer_id::text || ':' || v_action.rule_id::text || ':' || v_action.action_id::text,
        'customer_registered', btrim(v_customer.email), v_customer.name,
        nullif(btrim(v_action.action_config->>'subject'), ''),
        jsonb_build_object('customer_name', v_customer.name, 'customer_id', p_customer_id)
      );
      v_queued := v_queued + 1;
    END IF;
  END LOOP;

  RETURN v_queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_customer_registration_automation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_customer_registration_automation(uuid, uuid) TO authenticated;

-- An isolated/staging database must never post to a hard-coded production URL.
DO $$
DECLARE job_id bigint;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;
  FOR job_id IN SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue-every-minute'
  LOOP
    PERFORM cron.unschedule(job_id);
  END LOOP;
  job_id := cron.schedule('process-email-queue-every-minute', '* * * * *', $job$
    SELECT net.http_post(
      url := rtrim(environment.origin, '/') || '/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || environment.credential,
        'apikey', environment.credential
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    )
    FROM (
      SELECT
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_project_url' LIMIT 1) AS origin,
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1) AS credential
    ) environment
    WHERE environment.origin ~ '^https://[a-zA-Z0-9.-]+/?$'
      AND nullif(btrim(environment.credential), '') IS NOT NULL;
  $job$);
  -- Restored databases can contain credentials from the source project.
  -- Keep this job inactive until the environment's Vault records are checked.
  PERFORM cron.alter_job(job_id, active := false);
END;
$$;
