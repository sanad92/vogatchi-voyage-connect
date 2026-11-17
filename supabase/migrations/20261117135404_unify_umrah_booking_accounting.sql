ALTER TABLE public.bookings DROP CONSTRAINT bookings_booking_type_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('hotel','flight','car_rental','transport','umrah'));

ALTER TABLE public.umrah_inventory_bookings
  ADD COLUMN booking_id uuid UNIQUE REFERENCES public.bookings(id);

CREATE UNIQUE INDEX invoices_one_umrah_booking
  ON public.invoices (booking_id) WHERE booking_type = 'umrah' AND booking_id IS NOT NULL;

CREATE TABLE public.umrah_booking_invoice_credits (
  operation_id uuid PRIMARY KEY REFERENCES public.pilgrimage_operations(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX umrah_booking_invoice_credits_invoice_idx ON public.umrah_booking_invoice_credits (invoice_id);
ALTER TABLE public.umrah_booking_invoice_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umrah_booking_invoice_credits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION trip_amendment_private.invoice_credit(_invoice uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(sum(customer_due_reduction), 0)
    + coalesce((SELECT amount FROM public.booking_cancellation_invoice_credits WHERE invoice_id = _invoice), 0)
    + coalesce((SELECT sum(amount) FROM public.umrah_booking_invoice_credits WHERE invoice_id = _invoice), 0)
  FROM public.trip_service_amendments
  WHERE customer_invoice_id = _invoice AND status = 'applied' AND customer_due_reduction > 0
$$;

CREATE OR REPLACE FUNCTION public.get_customer_trip_invoice_credits(_org uuid, _customer uuid)
RETURNS TABLE (id uuid, customer_invoice_id uuid, customer_due_reduction numeric, resolved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT credits.*
  FROM (
    SELECT a.id, a.customer_invoice_id, a.customer_due_reduction, a.resolved_at
    FROM public.trip_service_amendments a
    WHERE a.organization_id = _org AND a.status = 'applied' AND a.customer_due_reduction > 0
    UNION ALL
    SELECT c.id, c.invoice_id, c.amount, s.settled_at
    FROM public.booking_cancellation_invoice_credits c
    JOIN public.booking_cancellation_settlements s ON s.booking_id = c.booking_id AND s.organization_id = _org
    UNION ALL
    SELECT u.operation_id, u.invoice_id, u.amount, u.created_at
    FROM public.umrah_booking_invoice_credits u WHERE u.organization_id = _org
  ) credits
  JOIN public.invoices i ON i.id = credits.customer_invoice_id AND i.organization_id = _org
  WHERE i.customer_id = _customer AND refund_balance_private.can_read(_org)
    AND EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = _org
      AND m.user_id = auth.uid() AND m.is_active IS TRUE)
$$;

CREATE FUNCTION pilgrimage_inventory_private.create_unified_reference(_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  reservation public.umrah_inventory_bookings%ROWTYPE;
  program public.pilgrimage_programs%ROWTYPE;
  invoice public.invoices%ROWTYPE;
  buyer text;
BEGIN
  SELECT * INTO STRICT reservation FROM public.umrah_inventory_bookings WHERE id = _id FOR UPDATE;
  IF reservation.booking_id IS NOT NULL THEN RETURN; END IF;
  IF auth.uid() IS NULL OR reservation.created_by IS DISTINCT FROM auth.uid()
     OR NOT coalesce(public.has_org_permission(reservation.organization_id, 'invoices_create'), false)
  THEN RAISE EXCEPTION 'umrah_unified_invoice_permission' USING ERRCODE = '42501'; END IF;
  SELECT * INTO STRICT program FROM public.pilgrimage_programs
    WHERE id = reservation.program_id AND organization_id = reservation.organization_id;
  SELECT name INTO STRICT buyer FROM public.customers
    WHERE id = reservation.customer_id AND organization_id = reservation.organization_id;

  -- The existing booking automation issues the invoice and posts the receivable.
  INSERT INTO public.bookings (
    id, organization_id, booking_number, booking_type, customer_id, customer_name,
    selling_price, base_selling_price, cost_price, base_cost_price, currency,
    start_date, end_date, status, workflow_stage, revenue_recognition_mode, notes
  ) VALUES (
    reservation.id, reservation.organization_id, 'UMR-' || reservation.booking_number, 'umrah',
    reservation.customer_id, buyer, reservation.total_price, reservation.total_price, 0, 0,
    reservation.currency, program.departure_date, program.return_date, 'confirmed', 'confirmed',
    'principal_gross', program.name
  );

  SELECT * INTO invoice FROM public.invoices
    WHERE booking_id = reservation.id AND organization_id = reservation.organization_id;
  IF NOT FOUND OR invoice.customer_id IS DISTINCT FROM reservation.customer_id
     OR invoice.currency IS DISTINCT FROM reservation.currency
     OR invoice.final_amount IS DISTINCT FROM reservation.total_price
     OR NOT EXISTS (
       SELECT 1 FROM public.journal_entries j WHERE j.organization_id = reservation.organization_id
         AND j.source_type = 'invoice' AND j.source_id = invoice.id AND j.status = 'posted'
     )
  THEN RAISE EXCEPTION 'umrah_unified_invoice_not_created' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.invoice_items (invoice_id, organization_id, description, quantity, unit_price, total_price)
    VALUES (invoice.id, reservation.organization_id, program.name, 1, reservation.total_price, reservation.total_price);
  UPDATE public.umrah_inventory_bookings SET booking_id = reservation.id WHERE id = reservation.id;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.guard_unified_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_type = 'umrah' THEN
      RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_type = 'umrah' AND current_user IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501';
    END IF;
  ELSIF (OLD.booking_type = 'umrah' OR NEW.booking_type = 'umrah') AND (
    NEW.booking_type IS DISTINCT FROM OLD.booking_type
    OR (NEW.id, NEW.organization_id, NEW.booking_number, NEW.customer_id, NEW.currency, NEW.start_date, NEW.end_date)
      IS DISTINCT FROM (OLD.id, OLD.organization_id, OLD.booking_number, OLD.customer_id, OLD.currency, OLD.start_date, OLD.end_date)
    OR (current_user IN ('authenticated','anon') AND (
      NEW.selling_price, NEW.base_selling_price, NEW.cost_price, NEW.base_cost_price,
      NEW.supplier_id, NEW.status, NEW.workflow_stage, NEW.status_id, NEW.revenue_recognition_mode
    ) IS DISTINCT FROM (
      OLD.selling_price, OLD.base_selling_price, OLD.cost_price, OLD.base_cost_price,
      OLD.supplier_id, OLD.status, OLD.workflow_stage, OLD.status_id, OLD.revenue_recognition_mode
    ))
  ) THEN RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501'; END IF;

  IF NEW.booking_type = 'umrah' AND coalesce(NEW.cost_price, 0) = 0 THEN
    NEW.profit := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Runs after the standard financial normalization.
CREATE TRIGGER zz_umrah_unified_booking_guard BEFORE INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_unified_booking();

CREATE FUNCTION pilgrimage_inventory_private.guard_unified_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_type = 'umrah' THEN
      RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.booking_type = 'umrah' AND (
    NEW.booking_type, NEW.booking_id, NEW.organization_id, NEW.customer_id, NEW.currency,
    NEW.subtotal, NEW.vat_rate, NEW.discount_amount, NEW.invoice_number
  ) IS DISTINCT FROM (
    OLD.booking_type, OLD.booking_id, OLD.organization_id, OLD.customer_id, OLD.currency,
    OLD.subtotal, OLD.vat_rate, OLD.discount_amount, OLD.invoice_number
  ) THEN RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = NEW.booking_id;
  IF b.booking_type = 'umrah' OR NEW.booking_type = 'umrah' THEN
    IF b.booking_type IS DISTINCT FROM 'umrah'
      OR NEW.booking_type IS DISTINCT FROM 'umrah' OR NEW.organization_id IS DISTINCT FROM b.organization_id
      OR NEW.customer_id IS DISTINCT FROM b.customer_id OR NEW.currency IS DISTINCT FROM b.currency
      OR NEW.status IN ('draft','cancelled','void') THEN
      RAISE EXCEPTION 'umrah_use_departure_operations' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_umrah_unified_invoice_guard BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_unified_invoice();

CREATE FUNCTION pilgrimage_inventory_private.guard_unified_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  invoice_booking uuid;
BEGIN
  IF NEW.pilgrim_id IS NOT NULL AND EXISTS (
    SELECT FROM public.pilgrims g JOIN public.umrah_inventory_bookings u ON u.id = g.inventory_booking_id
    WHERE g.id = NEW.pilgrim_id AND u.booking_id IS NOT NULL
  ) THEN RAISE EXCEPTION 'umrah_payment_on_unified_invoice' USING ERRCODE = '42501'; END IF;
  SELECT i.booking_id INTO invoice_booking FROM public.invoices i WHERE i.id = NEW.invoice_id AND i.booking_type = 'umrah';
  SELECT * INTO b FROM public.bookings WHERE id = coalesce(invoice_booking, NEW.booking_id);
  IF b.booking_type = 'umrah' AND (
    invoice_booking IS DISTINCT FROM b.id OR NEW.booking_id IS DISTINCT FROM b.id
    OR NEW.organization_id IS DISTINCT FROM b.organization_id OR NEW.customer_id IS DISTINCT FROM b.customer_id
    OR NEW.currency IS DISTINCT FROM b.currency
    OR (b.status = 'cancelled' AND (TG_OP = 'INSERT' OR NEW.status = 'completed'))
    OR (NEW.status = 'completed' AND (
      TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM 'completed' AND NOT EXISTS (
        SELECT FROM public.finance_transactions f WHERE f.organization_id = b.organization_id
          AND f.booking_id = b.id AND f.reference_type = 'customer_payment' AND f.reference_id = NEW.id
          AND f.direction = 'debit' AND f.amount = NEW.amount
      ))
    ))
  ) THEN RAISE EXCEPTION 'umrah_payment_on_unified_invoice' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_umrah_unified_payment_guard
  BEFORE INSERT OR UPDATE OF pilgrim_id, booking_id, invoice_id, status ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_unified_payment();

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.create_unified_reference(uuid),
  pilgrimage_inventory_private.guard_unified_booking(), pilgrimage_inventory_private.guard_unified_invoice(),
  pilgrimage_inventory_private.guard_unified_payment() FROM PUBLIC, anon, authenticated;

DO $patch$
DECLARE
  definition text;
  needle text;
  target regprocedure;
BEGIN
  SELECT pg_get_functiondef('pilgrimage_inventory_private.create_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric)'::regprocedure) INTO definition;
  needle := 'RETURN _id;';
  IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected Umrah booking function'; END IF;
  EXECUTE replace(definition, needle, 'PERFORM pilgrimage_inventory_private.create_unified_reference(_id);
  RETURN _id;');

  FOREACH target IN ARRAY ARRAY[
    'public.settle_booking_cancellation(uuid,text,jsonb,jsonb)'::regprocedure,
    'public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb)'::regprocedure
  ] LOOP
    SELECT pg_get_functiondef(target) INTO definition;
    needle := 'SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;';
    IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected unified cancellation function'; END IF;
    EXECUTE replace(definition, needle, needle || '
    IF b.booking_type = ''umrah'' THEN
      RAISE EXCEPTION ''umrah_use_departure_operations'' USING ERRCODE = ''42501'';
    END IF;');
  END LOOP;
END
$patch$;

CREATE FUNCTION pilgrimage_inventory_private.settle_cancelled_passenger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  invoice public.invoices%ROWTYPE;
  operation public.pilgrimage_operations%ROWTYPE;
  reduction numeric := OLD.total_price - NEW.cancellation_fee;
  due_credit numeric;
  wallet_credit numeric;
  paid_cash numeric;
  reserved_refunds numeric;
  exchange_rate numeric;
  ar_account uuid;
  returns_account uuid;
  tax_amount numeric;
  created_refund uuid;
  customer_reason text;
  cancellation_preview jsonb;
  new_total numeric;
  active_count bigint;
  cancel_status uuid;
BEGIN
  SELECT x.* INTO b FROM public.umrah_inventory_bookings u
    JOIN public.bookings x ON x.id = u.booking_id AND x.organization_id = u.organization_id
    WHERE u.id = NEW.inventory_booking_id AND u.organization_id = NEW.organization_id
    FOR NO KEY UPDATE OF x;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF auth.uid() IS NULL OR NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'umrah_unified_cancellation_permission' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT operation FROM public.pilgrimage_operations a
    WHERE a.pilgrim_id = NEW.id AND a.organization_id = b.organization_id AND a.action = 'cancel'
      AND a.created_by = auth.uid() AND a.transaction_id = txid_current();
  SELECT * INTO STRICT invoice FROM public.invoices i
    WHERE i.booking_id = b.id AND i.organization_id = b.organization_id FOR UPDATE;
  customer_reason := 'إلغاء مسافر · ' || b.booking_number || ' · ' || operation.reason;

  IF reduction > 0 THEN
    -- Reuse the financial cancellation checks for unmatched advances, wallet
    -- allocations and unresolved customer refunds.
    cancellation_preview := trip_amendment_private.cancellation_preview(b);
    IF cancellation_preview->>'blocked_reason' IS NOT NULL THEN
      RAISE EXCEPTION '%', cancellation_preview->>'blocked_reason' USING ERRCODE = '22023';
    END IF;
    due_credit := least(reduction, greatest(invoice.remaining_amount, 0));
    wallet_credit := reduction - due_credit;
    IF wallet_credit > 0 THEN
      SELECT coalesce(sum(amount), 0) INTO reserved_refunds FROM public.refund_requests r
        WHERE r.invoice_id = invoice.id AND r.organization_id = b.organization_id
          AND r.status IN ('requested','approved','paid');
      paid_cash := invoice.total_paid_amount - reserved_refunds;
      IF wallet_credit > paid_cash OR NOT coalesce(public._can_manage_refunds(b.organization_id), false) THEN
        RAISE EXCEPTION 'umrah_unified_refund_review_required' USING ERRCODE = '42501';
      END IF;
      SELECT CASE WHEN invoice.currency = 'EGP' THEN 1
        WHEN count(DISTINCT cp.exchange_rate) = 1 THEN min(cp.exchange_rate) END
      INTO exchange_rate FROM public.customer_payment_allocations al
      JOIN public.customer_payments cp ON cp.id = al.payment_id AND cp.status = 'completed'
      WHERE al.invoice_id = invoice.id AND al.organization_id = b.organization_id;
      IF exchange_rate IS NULL THEN RAISE EXCEPTION 'umrah_unified_refund_fx_review_required' USING ERRCODE = '22023'; END IF;
      created_refund := public.create_refund_request(b.id, wallet_credit, invoice.currency, exchange_rate, NULL, customer_reason);
      PERFORM public.approve_refund_request(created_refund, true, customer_reason);
      UPDATE public.pilgrimage_operations SET refund_id = created_refund WHERE id = operation.id;
    END IF;
    IF due_credit > 0 THEN
      SELECT l.account_id, j.fx_rate INTO STRICT ar_account, exchange_rate
      FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id = j.id
      WHERE j.organization_id = b.organization_id AND j.source_type = 'invoice'
        AND j.source_id = invoice.id AND j.status = 'posted' AND l.debit = invoice.final_amount;
      returns_account := public.get_org_account_route(b.organization_id, 'sales_returns');
      tax_amount := round(due_credit * coalesce(invoice.vat_amount, 0) / invoice.final_amount, 2);
      INSERT INTO public.umrah_booking_invoice_credits (operation_id, organization_id, invoice_id, amount)
        VALUES (operation.id, b.organization_id, invoice.id, due_credit);
      PERFORM refund_balance_private.post(
        b.organization_id, 'booking_cancellation_invoice_credit', operation.id, b.id,
        invoice.currency, coalesce(exchange_rate, 1),
        ARRAY[returns_account, CASE WHEN tax_amount > 0 THEN public.get_org_account_route(b.organization_id, 'tax_payable') ELSE returns_account END],
        ARRAY[due_credit - tax_amount, tax_amount], ar_account, customer_reason
      );
      UPDATE public.invoices SET remaining_amount = greatest(remaining_amount - due_credit, 0) WHERE id = invoice.id;
    END IF;
  END IF;

  SELECT count(*) FILTER (WHERE status <> 'cancelled'),
    coalesce(sum(CASE WHEN status = 'cancelled' THEN cancellation_fee ELSE total_price END), 0)
    INTO active_count, new_total FROM public.pilgrims
    WHERE inventory_booking_id = NEW.inventory_booking_id AND organization_id = b.organization_id;
  IF active_count = 0 THEN
    INSERT INTO public.booking_cancellation_settlements (booking_id, organization_id, reason, fees, result, settled_by)
      VALUES (b.id, b.organization_id, operation.reason, jsonb_build_object(invoice.id, new_total),
        jsonb_build_array(jsonb_build_object('invoice_id', invoice.id, 'number', invoice.invoice_number,
          'currency', invoice.currency, 'fee', new_total, 'remaining', greatest(invoice.remaining_amount - coalesce(due_credit, 0), 0),
          'refund', coalesce(wallet_credit, 0), 'refund_id', created_refund)), auth.uid());
    cancel_status := coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'));
    UPDATE public.bookings SET status = 'cancelled', workflow_stage = 'cancelled', status_id = coalesce(cancel_status, status_id),
      selling_price = new_total, base_selling_price = new_total WHERE id = b.id;
  ELSE
    UPDATE public.bookings SET selling_price = new_total, base_selling_price = new_total WHERE id = b.id;
  END IF;

  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
    VALUES (b.organization_id, b.id, 'umrah_passenger_cancelled', auth.uid(), 'تم اعتماد إلغاء مسافر وتحديث رصيد الدفعة',
      jsonb_build_object('operation_id', operation.id, 'pilgrim_id', NEW.id, 'credit', coalesce(due_credit, 0), 'refund_id', created_refund));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.settle_cancelled_passenger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zz_umrah_unified_passenger_cancellation AFTER UPDATE OF status ON public.pilgrims
  FOR EACH ROW WHEN (OLD.status <> 'cancelled' AND NEW.status = 'cancelled' AND NEW.inventory_booking_id IS NOT NULL)
  EXECUTE FUNCTION pilgrimage_inventory_private.settle_cancelled_passenger();

DO $patch$
DECLARE
  definition text;
  needle text := 'WHERE id = passenger.id;';
BEGIN
  SELECT pg_get_functiondef('public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure) INTO definition;
  IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected pilgrimage operations function'; END IF;
  EXECUTE replace(definition, needle, needle || '
    SELECT a.refund_id INTO refund FROM public.pilgrimage_operations a WHERE a.id = request_id;');
END
$patch$;
