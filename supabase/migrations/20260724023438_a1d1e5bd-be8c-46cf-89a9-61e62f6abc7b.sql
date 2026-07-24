
-- ============================================================
-- PHASE 8: WORKFLOW ORCHESTRATOR & EVENT BUS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  emitted_by uuid,
  correlation_id uuid
);
CREATE INDEX IF NOT EXISTS idx_domain_events_type_time ON public.domain_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON public.domain_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_org ON public.domain_events(organization_id, occurred_at DESC);

GRANT SELECT ON public.domain_events TO authenticated;
GRANT ALL ON public.domain_events TO service_role;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read domain_events" ON public.domain_events
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = domain_events.organization_id AND om.user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.event_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  handler_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, handler_key)
);
GRANT SELECT ON public.event_subscriptions TO authenticated;
GRANT ALL ON public.event_subscriptions TO service_role;
ALTER TABLE public.event_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read subscriptions" ON public.event_subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.event_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
  handler_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|succeeded|failed|dead
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, handler_key)
);
CREATE INDEX IF NOT EXISTS idx_event_deliveries_pending
  ON public.event_deliveries(status, next_retry_at) WHERE status IN ('pending','failed');

GRANT SELECT ON public.event_deliveries TO authenticated;
GRANT ALL ON public.event_deliveries TO service_role;
ALTER TABLE public.event_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read deliveries" ON public.event_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.domain_events de
    LEFT JOIN public.organization_members om
      ON om.organization_id = de.organization_id AND om.user_id = auth.uid()
    WHERE de.id = event_deliveries.event_id
      AND (de.organization_id IS NULL OR om.user_id IS NOT NULL)
  ));

-- ---------- Emit function ----------

CREATE OR REPLACE FUNCTION public.emit_event(
  p_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.domain_events(event_type, aggregate_type, aggregate_id, organization_id, payload, idempotency_key)
  VALUES (p_type, p_aggregate_type, p_aggregate_id, p_organization_id, coalesce(p_payload,'{}'::jsonb), p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN NULL; -- already emitted
  END IF;

  INSERT INTO public.event_deliveries(event_id, handler_key)
  SELECT v_event_id, s.handler_key
  FROM public.event_subscriptions s
  WHERE s.event_type = p_type AND s.is_active = true
  ON CONFLICT DO NOTHING;

  RETURN v_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.emit_event(text,text,uuid,uuid,jsonb,text) FROM PUBLIC, anon;

-- ---------- Handlers (idempotent) ----------

CREATE OR REPLACE FUNCTION public.handler_timeline_append(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking uuid;
BEGIN
  v_booking := CASE WHEN p_event.aggregate_type = 'booking' THEN p_event.aggregate_id
                    ELSE (p_event.payload->>'booking_id')::uuid END;
  IF v_booking IS NULL THEN RETURN; END IF;
  INSERT INTO public.booking_timeline_events(booking_id, event_type, description, metadata)
  SELECT v_booking, p_event.event_type,
         coalesce(p_event.payload->>'description', p_event.event_type),
         p_event.payload || jsonb_build_object('source_event_id', p_event.id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_timeline_events bte
    WHERE bte.booking_id = v_booking
      AND (bte.metadata->>'source_event_id')::uuid = p_event.id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.handler_run_booking_automation(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking uuid;
BEGIN
  v_booking := CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id
                    ELSE (p_event.payload->>'booking_id')::uuid END;
  IF v_booking IS NULL THEN RETURN; END IF;
  BEGIN
    PERFORM public.run_booking_automation(v_booking);
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.handler_finance_post(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- GL posting already handled by dedicated triggers on customer_payments/invoices.
  -- Kept as a no-op hook so future providers can subscribe without another migration.
  RETURN;
END; $$;

CREATE OR REPLACE FUNCTION public.handler_notify_in_app(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_event.organization_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(organization_id, title, message, type, is_read, metadata)
  SELECT p_event.organization_id,
         p_event.event_type,
         coalesce(p_event.payload->>'description', p_event.event_type),
         'system', false,
         p_event.payload || jsonb_build_object('source_event_id', p_event.id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.organization_id = p_event.organization_id
      AND (n.metadata->>'source_event_id')::uuid = p_event.id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.handler_enqueue_email(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_name text;
BEGIN
  v_email := p_event.payload->>'customer_email';
  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;
  v_name := coalesce(p_event.payload->>'customer_name','');
  INSERT INTO public.email_queue(email_type, recipient_email, recipient_name, subject, template_data, organization_id)
  SELECT p_event.event_type, v_email, v_name,
         coalesce(p_event.payload->>'subject', p_event.event_type),
         p_event.payload || jsonb_build_object('source_event_id', p_event.id),
         p_event.organization_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_queue eq
    WHERE (eq.template_data->>'source_event_id')::uuid = p_event.id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.handler_enqueue_whatsapp_suggestion(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking uuid;
BEGIN
  v_booking := CASE WHEN p_event.aggregate_type='booking' THEN p_event.aggregate_id
                    ELSE (p_event.payload->>'booking_id')::uuid END;
  IF v_booking IS NULL THEN RETURN; END IF;
  INSERT INTO public.messaging_suggestions(booking_id, channel, template_key, payload, status)
  SELECT v_booking, 'whatsapp', p_event.event_type,
         p_event.payload || jsonb_build_object('source_event_id', p_event.id),
         'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.messaging_suggestions ms
    WHERE (ms.payload->>'source_event_id')::uuid = p_event.id
  );
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.handler_audit_write(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_audit_log(organization_id, action, table_name, record_id, details, actor_id)
  SELECT p_event.organization_id, p_event.event_type, p_event.aggregate_type, p_event.aggregate_id,
         p_event.payload || jsonb_build_object('source_event_id', p_event.id),
         p_event.emitted_by
  WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_audit_log a
    WHERE (a.details->>'source_event_id')::uuid = p_event.id
  );
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.handler_ai_summary_refresh(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Placeholder: mark AI threads as needing refresh when relevant tables exist.
  RETURN;
END; $$;

-- ---------- Worker ----------

CREATE OR REPLACE FUNCTION public.process_event_deliveries(p_limit int DEFAULT 200)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_event public.domain_events;
  v_processed int := 0;
  v_backoff interval;
BEGIN
  FOR r IN
    SELECT d.* FROM public.event_deliveries d
    WHERE d.status IN ('pending','failed')
      AND d.next_retry_at <= now()
      AND d.attempts < 5
    ORDER BY d.next_retry_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_event FROM public.domain_events WHERE id = r.event_id;
    BEGIN
      CASE r.handler_key
        WHEN 'timeline' THEN PERFORM public.handler_timeline_append(v_event);
        WHEN 'automation' THEN PERFORM public.handler_run_booking_automation(v_event);
        WHEN 'finance' THEN PERFORM public.handler_finance_post(v_event);
        WHEN 'notify' THEN PERFORM public.handler_notify_in_app(v_event);
        WHEN 'email' THEN PERFORM public.handler_enqueue_email(v_event);
        WHEN 'whatsapp' THEN PERFORM public.handler_enqueue_whatsapp_suggestion(v_event);
        WHEN 'audit' THEN PERFORM public.handler_audit_write(v_event);
        WHEN 'ai_summary' THEN PERFORM public.handler_ai_summary_refresh(v_event);
        ELSE NULL;
      END CASE;
      UPDATE public.event_deliveries
        SET status='succeeded', attempts=attempts+1, updated_at=now(), last_error=NULL
        WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      v_backoff := (power(2, r.attempts+1) || ' minutes')::interval;
      UPDATE public.event_deliveries
        SET status = CASE WHEN attempts+1 >= 5 THEN 'dead' ELSE 'failed' END,
            attempts = attempts+1,
            last_error = SQLERRM,
            next_retry_at = now() + v_backoff,
            updated_at = now()
        WHERE id = r.id;
    END;
    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END; $$;
REVOKE ALL ON FUNCTION public.process_event_deliveries(int) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.retry_event_delivery(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_deliveries
    SET status='pending', next_retry_at=now(), last_error=NULL, updated_at=now()
    WHERE id = p_delivery_id;
END; $$;
REVOKE ALL ON FUNCTION public.retry_event_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_event_delivery(uuid) TO authenticated;

-- ---------- Producers ----------

CREATE OR REPLACE FUNCTION public.trg_emit_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_event('booking.created','booking',NEW.id, NEW.organization_id,
      to_jsonb(NEW), 'booking.created:'||NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    IF coalesce(NEW.workflow_stage,'') IS DISTINCT FROM coalesce(OLD.workflow_stage,'') THEN
      PERFORM public.emit_event('booking.stage_changed','booking',NEW.id, NEW.organization_id,
        jsonb_build_object('from',OLD.workflow_stage,'to',NEW.workflow_stage,'booking',to_jsonb(NEW)),
        'booking.stage_changed:'||NEW.id::text||':'||coalesce(NEW.workflow_stage,''));
    END IF;
    IF coalesce(NEW.status,'') = 'completed' AND coalesce(OLD.status,'') IS DISTINCT FROM 'completed' THEN
      PERFORM public.emit_event('booking.completed','booking',NEW.id, NEW.organization_id,
        to_jsonb(NEW), 'booking.completed:'||NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_booking ON public.bookings;
CREATE TRIGGER trg_emit_booking AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_booking();

CREATE OR REPLACE FUNCTION public.trg_emit_quote() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_event('quote.created','quote',NEW.id,NEW.organization_id, to_jsonb(NEW),'quote.created:'||NEW.id::text);
  ELSIF TG_OP='UPDATE' AND coalesce(NEW.status,'') IS DISTINCT FROM coalesce(OLD.status,'') THEN
    IF NEW.status='accepted' THEN
      PERFORM public.emit_event('quote.accepted','quote',NEW.id,NEW.organization_id,to_jsonb(NEW),'quote.accepted:'||NEW.id::text);
    ELSIF NEW.status='rejected' THEN
      PERFORM public.emit_event('quote.rejected','quote',NEW.id,NEW.organization_id,to_jsonb(NEW),'quote.rejected:'||NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_quote ON public.quotes;
CREATE TRIGGER trg_emit_quote AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_quote();

CREATE OR REPLACE FUNCTION public.trg_emit_invoice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_event('invoice.created','invoice',NEW.id,NEW.organization_id,to_jsonb(NEW),'invoice.created:'||NEW.id::text);
  ELSIF TG_OP='UPDATE' AND coalesce(NEW.status,'') IS DISTINCT FROM coalesce(OLD.status,'') AND NEW.status='paid' THEN
    PERFORM public.emit_event('invoice.paid','invoice',NEW.id,NEW.organization_id,to_jsonb(NEW),'invoice.paid:'||NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_invoice ON public.invoices;
CREATE TRIGGER trg_emit_invoice AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_invoice();

CREATE OR REPLACE FUNCTION public.trg_emit_customer_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_event('customer.payment.recorded','customer_payment',NEW.id,NEW.organization_id,
    to_jsonb(NEW),'customer.payment.recorded:'||NEW.id::text);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_customer_payment ON public.customer_payments;
CREATE TRIGGER trg_emit_customer_payment AFTER INSERT ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_customer_payment();

CREATE OR REPLACE FUNCTION public.trg_emit_supplier_po() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_event('supplier.po.created','supplier_payment_order',NEW.id,NEW.organization_id,
      to_jsonb(NEW),'supplier.po.created:'||NEW.id::text);
  ELSIF TG_OP='UPDATE' AND coalesce(NEW.status,'') IS DISTINCT FROM coalesce(OLD.status,'') AND NEW.status='approved' THEN
    PERFORM public.emit_event('supplier.po.approved','supplier_payment_order',NEW.id,NEW.organization_id,
      to_jsonb(NEW),'supplier.po.approved:'||NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_supplier_po ON public.supplier_payment_orders;
CREATE TRIGGER trg_emit_supplier_po AFTER INSERT OR UPDATE ON public.supplier_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_supplier_po();

CREATE OR REPLACE FUNCTION public.trg_emit_supplier_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_event('supplier.payment.recorded','supplier_payment',NEW.id,NEW.organization_id,
    to_jsonb(NEW),'supplier.payment.recorded:'||NEW.id::text);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_supplier_payment ON public.supplier_payments;
CREATE TRIGGER trg_emit_supplier_payment AFTER INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_supplier_payment();

CREATE OR REPLACE FUNCTION public.trg_emit_voucher() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_event('voucher.generated','booking_voucher',NEW.id,NEW.organization_id,
    to_jsonb(NEW),'voucher.generated:'||NEW.id::text);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_voucher ON public.booking_vouchers;
CREATE TRIGGER trg_emit_voucher AFTER INSERT ON public.booking_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_voucher();

CREATE OR REPLACE FUNCTION public.trg_emit_refund() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_event('refund.requested','refund_request',NEW.id,NEW.organization_id,
      to_jsonb(NEW),'refund.requested:'||NEW.id::text);
  ELSIF TG_OP='UPDATE' AND coalesce(NEW.status,'') IS DISTINCT FROM coalesce(OLD.status,'') THEN
    IF NEW.status='approved' THEN
      PERFORM public.emit_event('refund.approved','refund_request',NEW.id,NEW.organization_id,to_jsonb(NEW),'refund.approved:'||NEW.id::text);
    ELSIF NEW.status='paid' THEN
      PERFORM public.emit_event('refund.paid','refund_request',NEW.id,NEW.organization_id,to_jsonb(NEW),'refund.paid:'||NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_refund ON public.refund_requests;
CREATE TRIGGER trg_emit_refund AFTER INSERT OR UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_emit_refund();

-- ---------- Default subscriptions ----------

INSERT INTO public.event_subscriptions(event_type, handler_key) VALUES
  ('booking.created','timeline'),('booking.created','automation'),('booking.created','notify'),('booking.created','audit'),
  ('booking.stage_changed','timeline'),('booking.stage_changed','automation'),('booking.stage_changed','notify'),('booking.stage_changed','ai_summary'),
  ('booking.completed','timeline'),('booking.completed','notify'),('booking.completed','email'),('booking.completed','whatsapp'),('booking.completed','audit'),
  ('quote.created','timeline'),('quote.created','notify'),
  ('quote.accepted','timeline'),('quote.accepted','automation'),('quote.accepted','notify'),
  ('quote.rejected','timeline'),('quote.rejected','notify'),
  ('invoice.created','timeline'),('invoice.created','finance'),('invoice.created','notify'),
  ('invoice.paid','timeline'),('invoice.paid','finance'),('invoice.paid','notify'),('invoice.paid','whatsapp'),
  ('customer.payment.recorded','timeline'),('customer.payment.recorded','finance'),('customer.payment.recorded','notify'),
  ('supplier.po.created','timeline'),('supplier.po.created','notify'),
  ('supplier.po.approved','timeline'),('supplier.po.approved','notify'),('supplier.po.approved','audit'),
  ('supplier.payment.recorded','timeline'),('supplier.payment.recorded','finance'),('supplier.payment.recorded','audit'),
  ('voucher.generated','timeline'),('voucher.generated','email'),('voucher.generated','whatsapp'),
  ('refund.requested','timeline'),('refund.requested','notify'),
  ('refund.approved','timeline'),('refund.approved','finance'),('refund.approved','notify'),('refund.approved','audit'),
  ('refund.paid','timeline'),('refund.paid','finance'),('refund.paid','notify')
ON CONFLICT DO NOTHING;

-- ---------- Scheduler ----------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('phase8-process-events') FROM cron.job WHERE jobname='phase8-process-events';
    PERFORM cron.schedule('phase8-process-events','* * * * *', $cron$SELECT public.process_event_deliveries(500);$cron$);
  END IF;
END $$;
