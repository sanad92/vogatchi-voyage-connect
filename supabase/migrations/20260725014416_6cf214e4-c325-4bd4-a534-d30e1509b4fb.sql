
-- 1. Latency + explorer columns on deliveries
ALTER TABLE public.event_deliveries
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_ms integer;

-- 2. Enriched payload column on events
ALTER TABLE public.domain_events
  ADD COLUMN IF NOT EXISTS enriched_payload jsonb;

-- 3. Notification rules table (per org overrides + platform defaults where organization_id IS NULL)
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, event_type)
);

GRANT SELECT ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read rules" ON public.notification_rules
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "platform admins manage rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Seed platform-default rules (organization_id NULL)
INSERT INTO public.notification_rules (organization_id, event_type, channels) VALUES
  (NULL, 'booking.created',            ARRAY['in_app','email']),
  (NULL, 'booking.stage_changed',      ARRAY['in_app']),
  (NULL, 'booking.completed',          ARRAY['in_app','email','whatsapp']),
  (NULL, 'quote.created',              ARRAY['in_app']),
  (NULL, 'quote.accepted',             ARRAY['in_app','email']),
  (NULL, 'quote.rejected',             ARRAY['in_app']),
  (NULL, 'invoice.created',            ARRAY['in_app','email']),
  (NULL, 'invoice.paid',               ARRAY['in_app','email','whatsapp']),
  (NULL, 'customer.payment.recorded',  ARRAY['in_app']),
  (NULL, 'supplier.po.created',        ARRAY['in_app']),
  (NULL, 'supplier.po.approved',       ARRAY['in_app']),
  (NULL, 'supplier.payment.recorded',  ARRAY['in_app']),
  (NULL, 'voucher.generated',          ARRAY['in_app','email','whatsapp']),
  (NULL, 'refund.requested',           ARRAY['in_app']),
  (NULL, 'refund.approved',            ARRAY['in_app','email']),
  (NULL, 'refund.paid',                ARRAY['in_app','email'])
ON CONFLICT (organization_id, event_type) DO NOTHING;

-- 4. Enrichment function
CREATE OR REPLACE FUNCTION public.enrich_event_payload(p_event public.domain_events)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := coalesce(p_event.payload, '{}'::jsonb);
  v_booking_id uuid;
  v_customer_id uuid;
  v_org_id uuid := p_event.organization_id;
BEGIN
  -- Resolve booking id
  IF p_event.aggregate_type = 'booking' THEN
    v_booking_id := p_event.aggregate_id;
  ELSE
    v_booking_id := NULLIF(p_event.payload->>'booking_id','')::uuid;
  END IF;

  -- Booking + financials
  IF v_booking_id IS NOT NULL THEN
    SELECT v_out || jsonb_build_object(
      'booking', jsonb_build_object(
        'id', b.id,
        'number', b.booking_number,
        'type', b.booking_type,
        'status', b.status,
        'workflow_stage', b.workflow_stage,
        'selling_price', b.selling_price,
        'cost_price', b.cost_price,
        'profit', b.profit,
        'currency', b.currency,
        'start_date', b.start_date,
        'end_date', b.end_date
      ),
      'customer_id', b.customer_id,
      'customer_name', b.customer_name,
      'employee_id', b.employee_id,
      'supplier_id', b.supplier_id,
      'supplier_name', b.supplier_name
    ) INTO v_out
    FROM public.bookings b WHERE b.id = v_booking_id;
    v_customer_id := (v_out->>'customer_id')::uuid;
  END IF;

  -- Customer id fallback from payload
  IF v_customer_id IS NULL THEN
    v_customer_id := NULLIF(v_out->>'customer_id','')::uuid;
  END IF;

  -- Customer context
  IF v_customer_id IS NOT NULL THEN
    SELECT v_out || jsonb_build_object(
      'customer', jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email,
        'phone', c.phone,
        'segment_id', c.segment_id
      ),
      'customer_email', c.email,
      'customer_phone', c.phone,
      'customer_name', coalesce(v_out->>'customer_name', c.name)
    ) INTO v_out
    FROM public.customers c WHERE c.id = v_customer_id;
  END IF;

  -- Consultant (employee) context
  IF (v_out->>'employee_id') IS NOT NULL THEN
    SELECT v_out || jsonb_build_object(
      'consultant', jsonb_build_object(
        'id', e.id,
        'name', e.full_name,
        'email', e.email,
        'phone', e.phone,
        'department', e.department
      )
    ) INTO v_out
    FROM public.employees e WHERE e.id = (v_out->>'employee_id')::uuid;
  END IF;

  -- Organization context
  IF v_org_id IS NOT NULL THEN
    SELECT v_out || jsonb_build_object(
      'organization', jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'plan', o.plan
      )
    ) INTO v_out
    FROM public.organizations o WHERE o.id = v_org_id;
  END IF;

  RETURN v_out;
EXCEPTION WHEN OTHERS THEN
  RETURN v_out;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enrich_event_payload(public.domain_events) FROM PUBLIC, anon;

-- 5. BEFORE INSERT trigger to populate enriched_payload
CREATE OR REPLACE FUNCTION public.trg_enrich_domain_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.enriched_payload IS NULL THEN
    NEW.enriched_payload := public.enrich_event_payload(NEW);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enrich_domain_event_before_insert ON public.domain_events;
CREATE TRIGGER trg_enrich_domain_event_before_insert
  BEFORE INSERT ON public.domain_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_enrich_domain_event();

-- 6. Centralized notification dispatcher
CREATE OR REPLACE FUNCTION public.handler_notification_dispatch(p_event public.domain_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channels text[];
  v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
  v_email text := v_payload->>'customer_email';
  v_phone text := v_payload->>'customer_phone';
  v_booking uuid;
BEGIN
  -- Resolve channels: org override first, then platform default
  SELECT channels INTO v_channels
  FROM public.notification_rules
  WHERE event_type = p_event.event_type
    AND is_active = true
    AND (organization_id = p_event.organization_id OR organization_id IS NULL)
  ORDER BY organization_id NULLS LAST
  LIMIT 1;

  IF v_channels IS NULL THEN
    v_channels := ARRAY['in_app'];
  END IF;

  -- In-app
  IF 'in_app' = ANY(v_channels) AND p_event.organization_id IS NOT NULL THEN
    INSERT INTO public.notifications(organization_id, title, message, type, is_read, metadata)
    SELECT p_event.organization_id,
           p_event.event_type,
           coalesce(v_payload->>'description', p_event.event_type),
           'system', false,
           v_payload || jsonb_build_object('source_event_id', p_event.id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.organization_id = p_event.organization_id
        AND (n.metadata->>'source_event_id')::uuid = p_event.id
    );
  END IF;

  -- Email
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

  -- WhatsApp suggestion
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
END; $$;

REVOKE EXECUTE ON FUNCTION public.handler_notification_dispatch(public.domain_events) FROM PUBLIC, anon;

-- Register dispatcher subscription for all seeded event types (idempotent)
INSERT INTO public.event_subscriptions(event_type, handler_key, is_active)
SELECT DISTINCT event_type, 'notification_dispatch', true
FROM public.event_subscriptions
ON CONFLICT DO NOTHING;

-- 7. Upgrade existing in-app/email/whatsapp handlers to prefer enriched payload
CREATE OR REPLACE FUNCTION public.handler_notify_in_app(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.handler_enqueue_email(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
        v_email text; v_name text;
BEGIN
  v_email := v_payload->>'customer_email';
  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;
  v_name := coalesce(v_payload->>'customer_name','');
  INSERT INTO public.email_queue(email_type, recipient_email, recipient_name, subject, template_data, organization_id)
  SELECT p_event.event_type, v_email, v_name,
         coalesce(v_payload->>'subject', p_event.event_type),
         v_payload || jsonb_build_object('source_event_id', p_event.id),
         p_event.organization_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_queue eq
    WHERE (eq.template_data->>'source_event_id')::uuid = p_event.id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.handler_enqueue_whatsapp_suggestion(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
        v_booking uuid;
BEGIN
  v_booking := CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id
                    ELSE NULLIF(v_payload->>'booking_id','')::uuid END;
  IF v_booking IS NULL THEN RETURN; END IF;
  INSERT INTO public.messaging_suggestions(booking_id, channel, template_key, payload, status)
  SELECT v_booking, 'whatsapp', p_event.event_type,
         v_payload || jsonb_build_object('source_event_id', p_event.id),
         'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.messaging_suggestions ms
    WHERE (ms.payload->>'source_event_id')::uuid = p_event.id
  );
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END; $$;

-- 8. Wrap process_event_deliveries to record latency (recreate with same signature if exists)
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_def FROM pg_proc WHERE proname = 'process_event_deliveries' LIMIT 1;
  -- We only add columns; the existing worker still functions. We update it below fully.
END $$;

CREATE OR REPLACE FUNCTION public.process_event_deliveries(p_limit integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        ELSE NULL;
      END CASE;

      UPDATE public.event_deliveries
      SET status = 'succeeded',
          attempts = attempts + 1,
          last_error = NULL,
          started_at = v_started,
          completed_at = clock_timestamp(),
          processing_ms = extract(millisecond from (clock_timestamp() - v_started))::int,
          updated_at = now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.event_deliveries
      SET status = CASE WHEN r.attempts + 1 >= 6 THEN 'dead' ELSE 'failed' END,
          attempts = attempts + 1,
          last_error = SQLERRM,
          started_at = v_started,
          completed_at = clock_timestamp(),
          processing_ms = extract(millisecond from (clock_timestamp() - v_started))::int,
          next_retry_at = now() + (interval '30 seconds' * power(2, r.attempts)),
          updated_at = now()
      WHERE id = r.id;
    END;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END; $$;

REVOKE EXECUTE ON FUNCTION public.process_event_deliveries(integer) FROM PUBLIC, anon;

-- 9. Safe replay function — resets deliveries; handler idempotency prevents duplicates
CREATE OR REPLACE FUNCTION public.replay_event(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.event_deliveries
  SET status = 'pending',
      next_retry_at = now(),
      last_error = NULL,
      updated_at = now()
  WHERE event_id = p_event_id
    AND status IN ('failed','dead','succeeded');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

REVOKE EXECUTE ON FUNCTION public.replay_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replay_event(uuid) TO authenticated;

-- 10. Backfill enriched_payload for existing rows (best-effort)
UPDATE public.domain_events
SET enriched_payload = public.enrich_event_payload(domain_events.*)
WHERE enriched_payload IS NULL;
