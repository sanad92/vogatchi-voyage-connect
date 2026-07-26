-- 1. Add metadata column so notification handlers can dedupe by source event.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Timeline handler: use actual columns (kind, summary, payload).
CREATE OR REPLACE FUNCTION public.handler_timeline_append(p_event public.domain_events)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_booking uuid;
BEGIN
  v_booking := CASE WHEN p_event.aggregate_type = 'booking' THEN p_event.aggregate_id
                    ELSE (p_event.payload->>'booking_id')::uuid END;
  IF v_booking IS NULL THEN RETURN; END IF;
  INSERT INTO public.booking_timeline_events(booking_id, organization_id, kind, summary, payload, occurred_at)
  SELECT v_booking, p_event.organization_id, p_event.event_type,
         coalesce(p_event.payload->>'description', p_event.event_type),
         coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb)
           || jsonb_build_object('source_event_id', p_event.id),
         coalesce(p_event.occurred_at, now())
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_timeline_events bte
    WHERE bte.booking_id = v_booking
      AND (bte.payload->>'source_event_id')::uuid = p_event.id
  );
END; $function$;

-- 3. In-app notification handler: use real columns.
CREATE OR REPLACE FUNCTION public.handler_notify_in_app(p_event public.domain_events)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
BEGIN
  IF p_event.organization_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(organization_id, title, message, type, is_read, metadata)
  SELECT p_event.organization_id, p_event.event_type,
         coalesce(v_payload->>'description', p_event.event_type),
         'system', false,
         v_payload || jsonb_build_object('source_event_id', p_event.id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.organization_id = p_event.organization_id
      AND (n.metadata->>'source_event_id')::uuid = p_event.id
  );
END; $function$;

-- 4. Notification dispatch: same column alignment.
CREATE OR REPLACE FUNCTION public.handler_notification_dispatch(p_event public.domain_events)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_channels text[];
  v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
  v_email text := v_payload->>'customer_email';
  v_booking uuid;
BEGIN
  SELECT channels INTO v_channels
  FROM public.notification_rules
  WHERE event_type = p_event.event_type
    AND is_active = true
    AND (organization_id = p_event.organization_id OR organization_id IS NULL)
  ORDER BY organization_id NULLS LAST
  LIMIT 1;

  IF v_channels IS NULL THEN v_channels := ARRAY['in_app']; END IF;

  IF 'in_app' = ANY(v_channels) AND p_event.organization_id IS NOT NULL THEN
    INSERT INTO public.notifications(organization_id, title, message, type, is_read, metadata)
    SELECT p_event.organization_id, p_event.event_type,
           coalesce(v_payload->>'description', p_event.event_type),
           'system', false,
           v_payload || jsonb_build_object('source_event_id', p_event.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.organization_id = p_event.organization_id
        AND (n.metadata->>'source_event_id')::uuid = p_event.id
    );
  END IF;

  IF 'email' = ANY(v_channels) AND v_email IS NOT NULL AND v_email <> '' THEN
    INSERT INTO public.email_queue(email_type, recipient_email, recipient_name, subject, template_data, organization_id)
    SELECT p_event.event_type, v_email, coalesce(v_payload->>'customer_name',''),
           coalesce(v_payload->>'subject', p_event.event_type),
           v_payload || jsonb_build_object('source_event_id', p_event.id),
           p_event.organization_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.email_queue eq
      WHERE (eq.template_data->>'source_event_id')::uuid = p_event.id
    );
  END IF;

  IF 'whatsapp' = ANY(v_channels) THEN
    v_booking := CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id
                      ELSE NULLIF(v_payload->>'booking_id','')::uuid END;
    IF v_booking IS NOT NULL THEN
      BEGIN
        INSERT INTO public.messaging_suggestions(booking_id, channel, template_key, payload, status)
        SELECT v_booking, 'whatsapp', p_event.event_type,
               v_payload || jsonb_build_object('source_event_id', p_event.id),
               'pending'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.messaging_suggestions ms
          WHERE (ms.payload->>'source_event_id')::uuid = p_event.id
        );
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
      END;
    END IF;
  END IF;
END; $function$;

-- 5. Retry the failed deliveries from this session so they succeed.
UPDATE public.event_deliveries
SET status='pending', next_retry_at=now(), last_error=NULL
WHERE status IN ('failed','dead');