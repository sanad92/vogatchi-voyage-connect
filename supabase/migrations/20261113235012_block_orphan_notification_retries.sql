BEGIN;

ALTER TABLE public.event_deliveries ADD COLUMN failure_code text;

-- Keep the original failure and the attempt count on existing deliveries.
UPDATE public.event_deliveries d
SET status = 'dead', failure_code = 'notification_organization_missing'
FROM public.domain_events e
WHERE d.event_id = e.id AND d.handler_key IN ('notify', 'notification_dispatch')
  AND d.status IN ('pending', 'failed', 'dead') AND e.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = e.organization_id);

CREATE OR REPLACE FUNCTION public.process_event_deliveries(p_limit integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_event public.domain_events;
  v_started timestamptz;
  v_processed integer := 0;
BEGIN
  FOR r IN
    SELECT d.id, d.event_id, d.handler_key, d.attempts
    FROM public.event_deliveries d
    WHERE d.status IN ('pending','failed')
      AND d.next_retry_at <= now()
    ORDER BY d.next_retry_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_started := clock_timestamp();
    SELECT * INTO v_event FROM public.domain_events WHERE id = r.event_id;
    IF r.handler_key IN ('notify', 'notification_dispatch') AND v_event.organization_id IS NOT NULL THEN
      PERFORM 1 FROM public.organizations o WHERE o.id = v_event.organization_id FOR KEY SHARE;
      IF NOT FOUND THEN
        UPDATE public.event_deliveries
        SET status = 'dead', failure_code = 'notification_organization_missing',
            last_error = 'Organization no longer exists; notification was not sent',
            started_at = v_started, completed_at = clock_timestamp(),
            processing_ms = extract(millisecond from (clock_timestamp() - v_started))::int,
            updated_at = now()
        WHERE id = r.id;
        v_processed := v_processed + 1;
        CONTINUE;
      END IF;
    END IF;

    BEGIN
      CASE r.handler_key
        WHEN 'timeline'              THEN PERFORM public.handler_timeline_append(v_event);
        WHEN 'automation'            THEN PERFORM public.handler_run_booking_automation(v_event);
        WHEN 'finance'               THEN PERFORM public.handler_finance_post(v_event);
        WHEN 'notify'                THEN PERFORM public.handler_notify_in_app(v_event);
        WHEN 'email'                 THEN PERFORM public.handler_enqueue_email(v_event);
        WHEN 'whatsapp'              THEN PERFORM public.handler_enqueue_whatsapp_suggestion(v_event);
        WHEN 'audit'                 THEN PERFORM public.handler_audit_write(v_event);
        WHEN 'ai_summary'            THEN PERFORM public.handler_ai_summary_refresh(v_event);
        WHEN 'notification_dispatch' THEN PERFORM public.handler_notification_dispatch(v_event);
        WHEN 'workflow_rules'        THEN PERFORM public.handler_workflow_rules(v_event);
        ELSE NULL;
      END CASE;

      UPDATE public.event_deliveries
      SET status='succeeded', attempts=attempts+1, last_error=NULL, failure_code=NULL,
          started_at=v_started, completed_at=clock_timestamp(),
          processing_ms=extract(millisecond from (clock_timestamp()-v_started))::int,
          updated_at=now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.event_deliveries
      SET status=CASE WHEN r.attempts+1>=6 THEN 'dead' ELSE 'failed' END,
          attempts=attempts+1, last_error=SQLERRM, failure_code=NULL,
          started_at=v_started, completed_at=clock_timestamp(),
          processing_ms=extract(millisecond from (clock_timestamp()-v_started))::int,
          next_retry_at=now()+(interval '30 seconds'*power(2,r.attempts)),
          updated_at=now()
      WHERE id = r.id;
    END;
    v_processed := v_processed+1;
  END LOOP;
  RETURN v_processed;
END; $function$
;

CREATE FUNCTION platform_company_private.notification_org_missing(p_handler text, p_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT p_handler IN ('notify', 'notification_dispatch') AND p_organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_organization_id)
$$;
REVOKE ALL ON FUNCTION platform_company_private.notification_org_missing(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.retry_event_delivery(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.event_deliveries d
  SET status = 'pending', attempts = 0, next_retry_at = now(), last_error = NULL, failure_code = NULL, updated_at = now()
  FROM public.domain_events e
  WHERE d.id = p_delivery_id AND d.event_id = e.id AND d.status IN ('failed', 'dead')
    AND NOT platform_company_private.notification_org_missing(d.handler_key, e.organization_id);
  IF FOUND THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.event_deliveries d JOIN public.domain_events e ON e.id = d.event_id
    WHERE d.id = p_delivery_id AND d.status IN ('failed', 'dead')
      AND platform_company_private.notification_org_missing(d.handler_key, e.organization_id)
  ) THEN
    RAISE EXCEPTION 'notification_organization_missing' USING ERRCODE = 'P0001';
  END IF;
  RAISE EXCEPTION 'No failed delivery to retry' USING ERRCODE = '22023';
END $$;

CREATE OR REPLACE FUNCTION public.replay_event(p_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.event_deliveries d
  SET status = 'pending', attempts = 0, next_retry_at = now(), last_error = NULL, failure_code = NULL, updated_at = now()
  FROM public.domain_events e
  WHERE e.id = p_event_id AND d.event_id = e.id AND d.status IN ('failed', 'dead')
    AND NOT platform_company_private.notification_org_missing(d.handler_key, e.organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 AND EXISTS (
    SELECT 1 FROM public.event_deliveries d JOIN public.domain_events e ON e.id = d.event_id
    WHERE e.id = p_event_id AND d.status IN ('failed', 'dead')
      AND platform_company_private.notification_org_missing(d.handler_key, e.organization_id)
  ) THEN
    RAISE EXCEPTION 'notification_organization_missing' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_count;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
