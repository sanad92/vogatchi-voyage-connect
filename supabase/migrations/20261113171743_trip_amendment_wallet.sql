-- Confirmed service amendments reuse the existing refund balances and settlements.
CREATE SCHEMA IF NOT EXISTS trip_amendment_private;
REVOKE ALL ON SCHEMA trip_amendment_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.trip_service_amendments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  service_kind text NOT NULL CHECK (service_kind IN ('hotel','flight','transport','car')),
  service_id uuid NOT NULL,
  service_source text NOT NULL CHECK (service_source IN ('linked','detail')),
  ticket_number text,
  terms jsonb NOT NULL,
  service_before jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected')),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz,
  decision jsonb,
  customer_refund_id uuid REFERENCES public.refund_requests(id),
  supplier_claim_id uuid REFERENCES public.supplier_refund_claims(id),
  customer_invoice_id uuid REFERENCES public.invoices(id),
  additional_invoice_id uuid REFERENCES public.invoices(id),
  supplier_order_id uuid REFERENCES public.supplier_payment_orders(id),
  customer_due_reduction numeric(16,2) NOT NULL DEFAULT 0
);
CREATE INDEX trip_service_amendments_booking ON public.trip_service_amendments (organization_id, booking_id, requested_at DESC);
CREATE INDEX trip_service_amendments_invoice ON public.trip_service_amendments (customer_invoice_id)
  WHERE customer_due_reduction > 0;
CREATE UNIQUE INDEX trip_service_amendments_one_cancellation
  ON public.trip_service_amendments (booking_id, service_kind, service_id, service_source, coalesce(ticket_number, ''))
  WHERE status = 'applied' AND terms->>'operation' = 'cancel';

ALTER TABLE public.trip_service_amendments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_service_amendments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.trip_service_amendments TO authenticated;
CREATE FUNCTION trip_amendment_private.can_view(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = _org
      AND m.user_id = auth.uid() AND m.is_active IS TRUE)
    AND EXISTS (SELECT FROM public._org_permission_state(_org, auth.uid(), 'bookings_view')
      WHERE granted AND data_scope = 'organization')
$$;
CREATE POLICY trip_service_amendment_read ON public.trip_service_amendments FOR SELECT TO authenticated
  USING (refund_balance_private.can_read(organization_id) AND trip_amendment_private.can_view(organization_id));

-- The effective invoice receivable includes amendment credits. These credits
-- must never be interpreted as cash collected, including on later allocations.
CREATE FUNCTION trip_amendment_private.invoice_credit(_invoice uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(sum(customer_due_reduction), 0) FROM public.trip_service_amendments
  WHERE customer_invoice_id = _invoice AND status = 'applied' AND customer_due_reduction > 0
$$;

CREATE FUNCTION trip_amendment_private.apply_invoice_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_credit numeric;
BEGIN
  v_credit := trip_amendment_private.invoice_credit(NEW.id);
  IF v_credit > 0 THEN
    IF coalesce(NEW.total_paid_amount, 0) + v_credit > NEW.final_amount THEN
      RAISE EXCEPTION 'مدفوعات الفاتورة وتسوياتها تتجاوز قيمتها';
    END IF;
    NEW.remaining_amount := NEW.final_amount - coalesce(NEW.total_paid_amount, 0) - v_credit;
    NEW.payment_status := CASE WHEN NEW.remaining_amount = 0 THEN 'paid'
      WHEN coalesce(NEW.total_paid_amount, 0) > 0 THEN 'partial' ELSE 'unpaid' END;
    IF NEW.remaining_amount = 0 AND NEW.status NOT IN ('draft', 'cancelled') THEN
      NEW.status := 'paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_zz_trip_amendment_invoice_balance
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.apply_invoice_balance();

-- Both native payment recording and direct allocation obey the same ceiling.
-- The trigger below runs in addition to the existing allocation validation.
CREATE FUNCTION trip_amendment_private.guard_invoice_credit_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_credit numeric;
  v_allocated numeric;
BEGIN
  SELECT * INTO STRICT v_invoice FROM public.invoices WHERE id = NEW.invoice_id FOR UPDATE;
  v_credit := trip_amendment_private.invoice_credit(NEW.invoice_id);
  IF v_credit > 0 THEN
    SELECT coalesce(sum(a.amount), 0) INTO v_allocated FROM public.customer_payment_allocations a
    WHERE a.invoice_id = NEW.invoice_id AND (TG_OP = 'INSERT' OR a.id <> NEW.id);
    IF v_credit + v_allocated + NEW.amount
      + refund_balance_private.allocation_offset(v_invoice.organization_id, NEW.invoice_id, false) > v_invoice.final_amount THEN
      RAISE EXCEPTION 'التخصيص يتجاوز الرصيد المستحق بعد تعديل الرحلة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_zz_trip_amendment_invoice_allocation
  BEFORE INSERT OR UPDATE ON public.customer_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.guard_invoice_credit_allocation();

DO $patch$
DECLARE
  v_definition text := pg_get_functiondef('public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid)'::regprocedure);
  v_original text := 'GREATEST(COALESCE(v_final,0)-COALESCE(v_paid,0),0)';
BEGIN
  IF strpos(v_definition, v_original) = 0 THEN
    RAISE EXCEPTION 'Trip amendment migration: payment allocation baseline changed';
  END IF;
  EXECUTE replace(v_definition, v_original,
    'GREATEST(COALESCE(v_final,0)-COALESCE(v_paid,0)-trip_amendment_private.invoice_credit(_invoice_id),0)');
END;
$patch$;

CREATE FUNCTION trip_amendment_private.amount(_terms jsonb, _field text, _negative boolean DEFAULT false)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE v_amount numeric;
BEGIN
  IF jsonb_typeof(_terms->_field) IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'قيمة مالية غير صالحة';
  END IF;
  v_amount := (_terms->>_field)::numeric;
  IF abs(v_amount) >= 1e12 OR round(v_amount, 2) <> v_amount OR (NOT _negative AND v_amount < 0) THEN
    RAISE EXCEPTION 'قيمة مالية غير صالحة';
  END IF;
  RETURN v_amount;
END;
$$;

-- Read a single whitelisted source. Do not expose full legacy rows or PII.
CREATE FUNCTION trip_amendment_private.service(
  _booking uuid, _org uuid, _kind text, _source text, _service uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_table text;
  v_row jsonb;
  v_result jsonb;
BEGIN
  v_table := CASE WHEN _source = 'detail' THEN CASE _kind
    WHEN 'hotel' THEN 'booking_hotel_details' WHEN 'flight' THEN 'booking_flight_details'
    WHEN 'transport' THEN 'booking_transport_details' WHEN 'car' THEN 'booking_car_details' END
  WHEN _source = 'linked' THEN CASE _kind
    WHEN 'hotel' THEN 'hotel_bookings' WHEN 'flight' THEN 'flight_bookings'
    WHEN 'transport' THEN 'transport_bookings' WHEN 'car' THEN 'car_rentals' END END;
  IF v_table IS NULL THEN RAISE EXCEPTION 'نوع الخدمة غير صالح'; END IF;

  EXECUTE format('SELECT to_jsonb(s) FROM public.%I s WHERE id = $1 AND booking_id = $2%s FOR UPDATE',
    v_table, CASE WHEN _source = 'linked' THEN ' AND organization_id = $3' ELSE '' END)
    INTO v_row USING _service, _booking, _org;
  IF v_row IS NULL THEN RAISE EXCEPTION 'الخدمة غير موجودة في الحجز'; END IF;

  v_result := jsonb_build_object(
    'status_id', v_row->>'status_id',
    'currency', v_row->>'currency',
    'supplier_id', v_row->>'supplier_id',
    'selling', coalesce(v_row->>'selling_amount', CASE _kind WHEN 'hotel' THEN v_row->>'total_cost_customer'
      WHEN 'car' THEN v_row->>'total_rental_cost' ELSE v_row->>'total_cost' END),
    'start_date', coalesce(v_row->>'check_in', v_row->>'check_in_date', v_row->>'departure_date', v_row->>'pickup_date', v_row->>'rental_start_date'),
    'end_date', coalesce(v_row->>'check_out', v_row->>'check_out_date', v_row->>'arrival_date', v_row->>'dropoff_date', v_row->>'rental_end_date'),
    'tickets', CASE WHEN jsonb_typeof(v_row->'ticket_numbers') = 'array' THEN v_row->'ticket_numbers'
      WHEN nullif(v_row->>'ticket_number', '') IS NOT NULL THEN jsonb_build_array(v_row->>'ticket_number')
      ELSE '[]'::jsonb END
  );
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.create_trip_service_amendment(
  _id uuid, _booking uuid, _kind text, _source text, _service uuid, _ticket text, _terms jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  a public.trip_service_amendments%ROWTYPE;
  v_service jsonb;
  v_operation text := _terms->>'operation';
  v_rule text := _terms->>'rule';
  v_currency text := _terms->>'customer_currency';
  v_ticket text := nullif(btrim(_ticket), '');
  v_value numeric;
  v_fee numeric;
  v_delta numeric;
  v_supplier numeric;
  v_supplier_fee numeric;
  v_start date;
  v_end date;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;
  IF b.id IS NULL OR _id IS NULL OR _service IS NULL OR NOT coalesce(public.can_org_write(b.organization_id), false)
    OR NOT EXISTS (SELECT FROM public._org_permission_state(b.organization_id, auth.uid(), 'bookings_edit')
      WHERE granted AND data_scope = 'organization')
    OR NOT refund_balance_private.can_read(b.organization_id) OR NOT trip_amendment_private.can_view(b.organization_id)
    OR NOT EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = b.organization_id
      AND m.user_id = auth.uid() AND m.is_active IS TRUE) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسجيل تعديل لهذا الحجز' USING ERRCODE = '42501';
  END IF;
  IF b.status::text IN ('cancelled', 'canceled') OR b.workflow_stage::text = 'cancelled'
    OR coalesce(b.is_demo, false) THEN
    RAISE EXCEPTION 'هذا الحجز غير متاح للتعديل';
  END IF;
  IF jsonb_typeof(_terms) IS DISTINCT FROM 'object' OR pg_column_size(_terms) > 12000
    OR coalesce(v_operation, '') NOT IN ('change', 'cancel')
    OR coalesce(v_currency, '') NOT IN ('EGP','USD','SAR')
    OR v_currency IS DISTINCT FROM upper(coalesce(b.currency, 'EGP'))
    OR char_length(btrim(coalesce(_terms->>'policy', ''))) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION 'راجع نوع العملية وعملة الحجز وشروط المورد';
  END IF;

  SELECT * INTO a FROM public.trip_service_amendments WHERE id = _id;
  IF FOUND THEN
    IF (a.organization_id, a.booking_id, a.service_kind, a.service_source, a.service_id,
      a.ticket_number, a.terms, a.requested_by) IS DISTINCT FROM
      (b.organization_id, _booking, _kind, _source, _service, v_ticket, _terms, auth.uid()) THEN
      RAISE EXCEPTION 'معرّف الطلب مستخدم بالفعل';
    END IF;
    RETURN a.id;
  END IF;

  v_service := trip_amendment_private.service(_booking, b.organization_id, _kind, _source, _service);
  IF v_ticket IS NOT NULL AND (_kind <> 'flight' OR NOT ((v_service->'tickets') ? v_ticket)) THEN
    RAISE EXCEPTION 'اختر رقم تذكرة مسجلاً على خدمة الطيران';
  END IF;
  IF EXISTS (
    SELECT FROM public.trip_service_amendments prev
    WHERE prev.booking_id = _booking AND prev.service_kind = _kind AND prev.service_id = _service
      AND prev.service_source = _source AND prev.status = 'applied' AND prev.terms->>'operation' = 'cancel'
      AND (prev.ticket_number IS NULL OR v_ticket IS NULL OR prev.ticket_number = v_ticket)
  ) OR EXISTS (SELECT FROM public.booking_statuses s
    WHERE s.id::text = v_service->>'status_id' AND lower(s.name) IN ('cancelled', 'canceled')) THEN
    RAISE EXCEPTION 'الخدمة أو التذكرة سبق إلغاؤها بالكامل أو جزئياً';
  END IF;

  v_value := trip_amendment_private.amount(_terms, 'cancel_value');
  v_fee := trip_amendment_private.amount(_terms, 'customer_fee');
  v_delta := trip_amendment_private.amount(_terms, 'fare_delta', true);
  v_supplier := trip_amendment_private.amount(_terms, 'supplier_wallet');
  v_supplier_fee := trip_amendment_private.amount(_terms, 'supplier_fee');
  PERFORM trip_amendment_private.amount(_terms, 'supplier_fare_delta', true);
  IF v_operation = 'cancel' THEN
    IF coalesce(v_rule, '') NOT IN ('nonrefundable','partial','full') OR v_value <= 0 OR v_delta <> 0
      OR (v_rule = 'nonrefundable' AND v_fee <> v_value)
      OR (v_rule = 'partial' AND (v_fee <= 0 OR v_fee >= v_value))
      OR (v_rule = 'full' AND v_fee <> 0)
      OR (_terms->>'supplier_fare_delta')::numeric > 0
      OR (_terms->>'start_date') IS NOT NULL OR (_terms->>'end_date') IS NOT NULL
      OR (v_ticket IS NULL AND v_service->>'selling' IS NOT NULL
        AND upper(coalesce(v_service->>'currency', v_currency)) = v_currency
        AND (v_service->>'selling')::numeric > 0 AND v_value >
          (v_service->>'selling')::numeric + coalesce((
            SELECT sum((prev.terms->>'customer_fee')::numeric + (prev.terms->>'fare_delta')::numeric)
            FROM public.trip_service_amendments prev
            WHERE prev.booking_id = _booking AND prev.service_id = _service AND prev.service_kind = _kind
              AND prev.service_source = _source AND prev.ticket_number IS NULL
              AND prev.status = 'applied' AND prev.terms->>'operation' = 'change'
          ), 0)) THEN
      RAISE EXCEPTION 'قيمة الإلغاء أو الغرامة لا تتوافق مع الشروط المختارة';
    END IF;
  ELSE
    v_start := (_terms->>'start_date')::date;
    v_end := (_terms->>'end_date')::date;
    IF v_start IS NULL OR v_end IS NULL OR v_start > v_end OR (_kind = 'hotel' AND v_start = v_end)
      OR v_value <> 0 OR coalesce(v_rule, '') NOT IN ('free','repriced')
      OR (v_rule = 'free' AND (v_delta <> 0 OR v_fee <> 0 OR v_supplier_fee <> 0
        OR (_terms->>'supplier_fare_delta')::numeric <> 0 OR v_supplier <> 0))
      OR (v_rule = 'repriced' AND v_delta = 0 AND v_fee = 0 AND v_supplier_fee = 0
        AND (_terms->>'supplier_fare_delta')::numeric = 0 AND v_supplier = 0) THEN
      RAISE EXCEPTION 'راجع التواريخ الجديدة ورسوم التعديل';
    END IF;
  END IF;
  IF (nullif(btrim(_terms->>'new_ticket'), '') IS NOT NULL
      AND (v_service->'tickets') ? btrim(_terms->>'new_ticket'))
    OR char_length(coalesce(_terms->>'new_ticket', '')) > 80
    OR (nullif(btrim(_terms->>'new_ticket'), '') IS NOT NULL AND (v_ticket IS NULL OR v_operation <> 'change'))
    OR char_length(coalesce(_terms->>'supplier_finance_ref', '')) > 500 THEN
    RAISE EXCEPTION 'راجع مرجع المالية أو رقم التذكرة البديلة';
  END IF;
  IF (v_supplier > 0 OR v_supplier_fee > 0 OR (_terms->>'supplier_fare_delta')::numeric <> 0)
    AND coalesce(_terms->>'supplier_currency', '') NOT IN ('EGP','USD','SAR') THEN
    RAISE EXCEPTION 'حدد عملة تسوية المورد';
  END IF;

  INSERT INTO public.trip_service_amendments (
    id, organization_id, booking_id, service_kind, service_id, service_source, ticket_number, terms, service_before, requested_by
  ) VALUES (_id, b.organization_id, b.id, _kind, _service, _source, v_ticket, _terms, v_service, auth.uid());
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  VALUES (b.organization_id, b.id, 'service_amendment_requested', auth.uid(),
    'تم تسجيل طلب تعديل أو إلغاء خدمة', jsonb_build_object('amendment_id', _id, 'operation', v_operation));
  RETURN _id;
END;
$$;

CREATE FUNCTION trip_amendment_private.update_service(a public.trip_service_amendments)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_start date := (a.terms->>'start_date')::date;
  v_end date := (a.terms->>'end_date')::date;
  v_status uuid;
  v_new_ticket text := nullif(btrim(a.terms->>'new_ticket'), '');
BEGIN
  -- Individual ticket changes belong to their own record. The shared PNR
  -- still contains the other passengers' original service.
  IF a.ticket_number IS NOT NULL THEN
    IF v_new_ticket IS NOT NULL AND a.service_source = 'detail' THEN
      UPDATE public.booking_flight_details SET ticket_number = v_new_ticket WHERE id = a.service_id;
    ELSIF v_new_ticket IS NOT NULL THEN
      UPDATE public.flight_bookings f SET ticket_numbers = (
        SELECT jsonb_agg(CASE WHEN item.ticket = to_jsonb(a.ticket_number) THEN to_jsonb(v_new_ticket)
          ELSE item.ticket END ORDER BY item.position)
        FROM jsonb_array_elements(f.ticket_numbers) WITH ORDINALITY item(ticket, position)
      ) WHERE id = a.service_id;
    END IF;
    RETURN;
  END IF;
  IF a.terms->>'operation' = 'cancel' THEN
    IF a.service_source = 'detail' THEN RETURN; END IF;
    v_status := coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'));
    IF v_status IS NULL THEN RAISE EXCEPTION 'حالة إلغاء الخدمة غير مُهيأة'; END IF;
    CASE a.service_kind
      WHEN 'hotel' THEN UPDATE public.hotel_bookings SET status_id = v_status WHERE id = a.service_id;
      WHEN 'flight' THEN UPDATE public.flight_bookings SET status_id = v_status WHERE id = a.service_id;
      WHEN 'transport' THEN UPDATE public.transport_bookings SET status_id = v_status WHERE id = a.service_id;
      WHEN 'car' THEN UPDATE public.car_rentals SET status_id = v_status WHERE id = a.service_id;
    END CASE;
  ELSIF a.service_source = 'detail' THEN
    CASE a.service_kind
      WHEN 'hotel' THEN UPDATE public.booking_hotel_details SET check_in = v_start, check_out = v_end, nights = v_end - v_start WHERE id = a.service_id;
      WHEN 'flight' THEN UPDATE public.booking_flight_details SET departure_date = v_start, arrival_date = v_end WHERE id = a.service_id;
      WHEN 'car' THEN UPDATE public.booking_car_details SET pickup_date = v_start, dropoff_date = v_end WHERE id = a.service_id;
      WHEN 'transport' THEN NULL; -- These historical rows have no date columns.
    END CASE;
  ELSE
    CASE a.service_kind
      WHEN 'hotel' THEN UPDATE public.hotel_bookings SET check_in_date = v_start, check_out_date = v_end,
        number_of_nights = v_end - v_start WHERE id = a.service_id;
      WHEN 'flight' THEN UPDATE public.flight_bookings SET departure_date = v_start, arrival_date = v_end WHERE id = a.service_id;
      WHEN 'transport' THEN UPDATE public.transport_bookings SET departure_date = v_start, arrival_date = v_end WHERE id = a.service_id;
      WHEN 'car' THEN UPDATE public.car_rentals SET rental_start_date = v_start, rental_end_date = v_end WHERE id = a.service_id;
    END CASE;
  END IF;
END;
$$;

CREATE FUNCTION public.resolve_trip_service_amendment(
  _id uuid, _approve boolean, _customer_reference text, _supplier_reference text, _note text,
  _expected_customer_due_reduction numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  a public.trip_service_amendments%ROWTYPE;
  b public.bookings%ROWTYPE;
  i public.invoices%ROWTYPE;
  s public.supplier_invoices%ROWTYPE;
  v_service jsonb;
  v_customer_ref text := nullif(btrim(_customer_reference), '');
  v_supplier_ref text := nullif(btrim(_supplier_reference), '');
  v_note text := nullif(btrim(_note), '');
  v_change numeric;
  v_supplier_amount numeric;
  v_supplier_delta numeric;
  v_supplier_id uuid;
  v_paid_cash numeric;
  v_used_cash numeric;
  v_due_reduction numeric := 0;
  v_wallet numeric := 0;
  v_tax numeric;
  v_rate numeric;
  v_subtotal numeric;
  v_ar uuid;
  v_returns uuid;
  v_refund uuid;
  v_invoice uuid;
  v_claim uuid;
  v_order uuid;
  v_customer_currency text;
  v_supplier_currency text;
  v_document_note text;
BEGIN
  SELECT * INTO a FROM public.trip_service_amendments WHERE id = _id FOR UPDATE;
  IF a.id IS NULL OR NOT coalesce(public.can_org_write(a.organization_id), false)
    OR NOT EXISTS (SELECT FROM public._org_permission_state(a.organization_id, auth.uid(), 'bookings_confirm')
      WHERE granted AND data_scope = 'organization')
    OR NOT refund_balance_private.can_read(a.organization_id) OR NOT trip_amendment_private.can_view(a.organization_id)
    OR NOT EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = a.organization_id
      AND m.user_id = auth.uid() AND m.is_active IS TRUE AND m.role::text IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لمراجعة هذا التعديل' USING ERRCODE = '42501';
  END IF;
  IF a.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'يجب أن يراجع الطلب مدير مختلف عن مقدم الطلب' USING ERRCODE = '42501';
  END IF;
  IF _approve IS NULL OR char_length(coalesce(v_note, '')) > 1000
    OR char_length(coalesce(v_customer_ref, '')) > 500 OR char_length(coalesce(v_supplier_ref, '')) > 500 THEN
    RAISE EXCEPTION 'بيانات المراجعة غير صالحة';
  END IF;
  IF a.status <> 'pending' THEN
    IF a.status = (CASE WHEN _approve THEN 'applied' ELSE 'rejected' END) THEN RETURN a.id; END IF;
    RAISE EXCEPTION 'اتُخذ قرار مختلف على هذا الطلب';
  END IF;
  IF NOT _approve THEN
    IF char_length(coalesce(v_note, '')) < 3 THEN RAISE EXCEPTION 'اكتب سبب الرفض'; END IF;
    UPDATE public.trip_service_amendments SET status = 'rejected', resolved_at = now(),
      resolved_by = auth.uid(), decision = jsonb_build_object('note', v_note) WHERE id = a.id;
    INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
    VALUES (a.organization_id, a.booking_id, 'service_amendment_rejected', auth.uid(),
      'تم رفض طلب تعديل أو إلغاء الخدمة', jsonb_build_object('amendment_id', a.id));
    RETURN a.id;
  END IF;

  IF v_customer_ref IS NULL OR v_supplier_ref IS NULL THEN
    RAISE EXCEPTION 'سجل مرجع موافقة العميل ومرجع تأكيد تنفيذ المورد';
  END IF;
  SELECT * INTO STRICT b FROM public.bookings WHERE id = a.booking_id AND organization_id = a.organization_id FOR UPDATE;
  v_customer_currency := a.terms->>'customer_currency';
  v_supplier_currency := a.terms->>'supplier_currency';
  IF b.status::text IN ('cancelled','canceled') OR b.workflow_stage::text = 'cancelled' OR b.is_demo IS TRUE
    OR upper(coalesce(b.currency, 'EGP')) <> v_customer_currency THEN
    RAISE EXCEPTION 'تغيرت حالة الحجز أو عملته. سجل طلباً جديداً';
  END IF;
  v_service := trip_amendment_private.service(a.booking_id, a.organization_id, a.service_kind, a.service_source, a.service_id);
  IF a.service_before IS DISTINCT FROM v_service OR EXISTS (
    SELECT FROM public.trip_service_amendments prev
    WHERE prev.booking_id = a.booking_id AND prev.service_kind = a.service_kind
      AND prev.service_id = a.service_id AND prev.service_source = a.service_source AND prev.status = 'applied'
      AND (prev.ticket_number IS NULL OR a.ticket_number IS NULL OR prev.ticket_number = a.ticket_number)
      AND (prev.terms->>'operation' = 'cancel' OR prev.resolved_at >= a.requested_at)
  ) THEN
    RAISE EXCEPTION 'تغيرت الخدمة منذ تسجيل الطلب. راجع البيانات وسجل طلباً جديداً';
  END IF;

  v_change := (a.terms->>'fare_delta')::numeric + (a.terms->>'customer_fee')::numeric - (a.terms->>'cancel_value')::numeric;
  v_supplier_amount := (a.terms->>'supplier_wallet')::numeric;
  -- On cancellation a penalty is a retained part of the original cost.
  -- On changes the supplier fee is an additional charge.
  v_supplier_delta := (a.terms->>'supplier_fare_delta')::numeric
    + CASE WHEN a.terms->>'operation' = 'change' THEN (a.terms->>'supplier_fee')::numeric ELSE 0 END;
  IF (v_change <> 0 OR v_supplier_amount <> 0 OR v_supplier_delta <> 0)
    AND NOT refund_balance_private.can_operate(a.organization_id) THEN
    RAISE EXCEPTION 'تنفيذ الأثر المالي يتطلب صلاحية معالجة المدفوعات على مستوى المؤسسة' USING ERRCODE = '42501';
  END IF;

  v_document_note := 'تعديل خدمة ' || a.service_kind || ' / ' || a.id::text;
  IF v_change <> 0 THEN
    SELECT * INTO i FROM public.invoices
    WHERE id = (a.terms->>'customer_invoice_id')::uuid AND booking_id = a.booking_id
      AND organization_id = a.organization_id AND customer_id = b.customer_id
      AND coalesce(currency, 'EGP') = v_customer_currency AND status NOT IN ('draft','cancelled')
      AND is_demo IS FALSE AND pilgrimage_b2b_agreement_id IS NULL
    FOR UPDATE;
    IF i.id IS NULL THEN RAISE EXCEPTION 'اختر فاتورة عميل صادرة لهذا الحجز بنفس العملة'; END IF;

    IF v_change < 0 THEN
      SELECT coalesce(sum(amount), 0) INTO v_used_cash FROM public.refund_requests
      WHERE organization_id = a.organization_id AND invoice_id = i.id
        AND status IN ('requested','approved','paid');
      IF -v_change > i.final_amount - trip_amendment_private.invoice_credit(i.id) - v_used_cash THEN
        RAISE EXCEPTION 'التخفيض يتجاوز قيمة الفاتورة بعد التسويات السابقة';
      END IF;
      v_due_reduction := least(-v_change, greatest(coalesce(i.remaining_amount, 0), 0));
      IF _expected_customer_due_reduction IS DISTINCT FROM v_due_reduction THEN
        RAISE EXCEPTION 'تغير الرصيد المستحق للفاتورة. حدّث المعاينة وأعد المراجعة';
      END IF;
      v_wallet := -v_change - v_due_reduction;

      IF v_wallet > 0 THEN
        IF NOT coalesce(public._can_manage_refunds(a.organization_id), false) THEN
          RAISE EXCEPTION 'اعتماد رصيد العميل يتطلب صلاحية اعتماد الاستردادات' USING ERRCODE = '42501';
        END IF;
        SELECT greatest(coalesce(i.total_paid_amount, 0) - coalesce(sum(amount), 0), 0)
          INTO v_paid_cash FROM public.refund_balance_settlements WHERE invoice_id = i.id;
        IF v_wallet > v_paid_cash - v_used_cash THEN
          RAISE EXCEPTION 'رصيد الاسترداد يتجاوز المبلغ المؤهل والمدفوع على هذه الفاتورة';
        END IF;
        -- Preserve the standard request, approval and wallet journal. The
        -- invoice chosen for the service is authoritative for sales returns.
        SELECT CASE WHEN v_customer_currency = 'EGP' THEN 1 ELSE
          CASE WHEN count(DISTINCT p.exchange_rate) = 1 THEN min(p.exchange_rate) END END
        INTO v_rate FROM public.customer_payment_allocations al
        JOIN public.customer_payments p ON p.id = al.payment_id AND p.status = 'completed'
        WHERE al.invoice_id = i.id AND al.organization_id = a.organization_id;
        IF v_rate IS NULL THEN
          RAISE EXCEPTION 'راجع سعر الصرف مع المالية. الفاتورة تتضمن أسعار صرف متعددة أو لا يوجد سعر موثق';
        END IF;
        v_refund := public.create_refund_request(a.booking_id, v_wallet, v_customer_currency, v_rate, NULL, v_document_note);
        UPDATE public.refund_requests SET invoice_id = i.id, advance_component = 0, sales_return_component = v_wallet
        WHERE id = v_refund;
        UPDATE public.booking_timeline_events SET payload = payload ||
          jsonb_build_object('advance_component', 0, 'sales_return_component', v_wallet)
        WHERE organization_id = a.organization_id AND booking_id = a.booking_id
          AND kind = 'refund_requested' AND payload->>'refund_id' = v_refund::text;
        PERFORM public.approve_refund_request(v_refund, true, v_customer_ref);
      END IF;

      IF v_due_reduction > 0 THEN
        SELECT l.account_id, e.fx_rate INTO STRICT v_ar, v_rate FROM public.journal_entries e
        JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
        WHERE e.organization_id = a.organization_id AND e.source_type = 'invoice' AND e.source_id = i.id
          AND e.status = 'posted' AND l.debit = i.final_amount;
        v_returns := public.get_org_account_route(a.organization_id, 'sales_returns');
        v_tax := round(v_due_reduction * i.vat_amount / i.final_amount, 2);
        PERFORM refund_balance_private.post(
          a.organization_id, 'trip_amendment_invoice_credit', a.id, a.booking_id, v_customer_currency, coalesce(v_rate, 1),
          ARRAY[v_returns, CASE WHEN v_tax > 0 THEN public.get_org_account_route(a.organization_id, 'tax_payable') ELSE v_returns END],
          ARRAY[v_due_reduction - v_tax, v_tax], v_ar, v_document_note
        );
      END IF;
    ELSE
      v_subtotal := round(v_change / (1 + coalesce(i.vat_rate, 0) / 100), 2);
      IF v_subtotal + round(v_subtotal * coalesce(i.vat_rate, 0) / 100, 2) <> v_change THEN
        RAISE EXCEPTION 'فرق السعر لا يمكن توزيعه على الضريبة المطبقة لأقرب قرش. راجع قيمة الفرق';
      END IF;
      INSERT INTO public.invoices (organization_id, booking_id, booking_type, customer_id, customer_name,
        invoice_number, currency, subtotal, vat_rate, status, issued_date, created_by, notes)
      VALUES (a.organization_id, a.booking_id, i.booking_type, i.customer_id, i.customer_name,
        'INV-AMD-' || replace(a.id::text, '-', ''), v_customer_currency, v_subtotal, i.vat_rate,
        'unpaid', CURRENT_DATE, auth.uid(), v_document_note) RETURNING id INTO v_invoice;
      INSERT INTO public.invoice_items (invoice_id, organization_id, description, quantity, unit_price, total_price)
      VALUES (v_invoice, a.organization_id, 'فرق سعر ورسوم تعديل الخدمة', 1, v_subtotal, v_subtotal);
      IF NOT EXISTS (SELECT FROM public.journal_entries WHERE organization_id = a.organization_id
        AND source_type = 'invoice' AND source_id = v_invoice AND status = 'posted') THEN
        RAISE EXCEPTION 'تعذر ترحيل فاتورة فرق السعر';
      END IF;
    END IF;
  END IF;

  IF v_supplier_amount > 0 OR v_supplier_delta > 0 THEN
    SELECT * INTO s FROM public.supplier_invoices
    WHERE id = (a.terms->>'supplier_invoice_id')::uuid AND organization_id = a.organization_id
      AND booking_id = a.booking_id AND currency = v_supplier_currency AND status <> 'cancelled'
      AND supplier_id IS NOT NULL AND to_jsonb(supplier_invoices)->>'pilgrimage_b2b_agreement_id' IS NULL
    FOR UPDATE;
    v_supplier_id := coalesce((v_service->>'supplier_id')::uuid, b.supplier_id);
    IF s.id IS NULL OR (v_supplier_id IS NOT NULL AND v_supplier_id <> s.supplier_id) THEN
      RAISE EXCEPTION 'اختر فاتورة المورد المطابقة للخدمة والحجز والعملة';
    END IF;
  END IF;
  IF v_supplier_amount > 0 THEN
    v_claim := public.manage_supplier_refund_claim(a.organization_id, a.id, 'create', s.id, v_supplier_amount, v_supplier_ref);
    PERFORM public.manage_supplier_refund_claim(a.organization_id, v_claim, 'confirm', NULL, NULL, NULL);
  END IF;
  IF v_supplier_delta > 0 THEN
    IF v_supplier_currency = 'EGP' THEN
      INSERT INTO public.supplier_payment_orders (organization_id, booking_id, supplier_id, service_type,
        reference_number, amount, currency, status, source_type, source_id, notes)
      VALUES (a.organization_id, a.booking_id, s.supplier_id, a.service_kind,
        'PO-AMD-' || replace(a.id::text, '-', ''), v_supplier_delta, v_supplier_currency,
        'draft', 'trip_service_amendment', a.id, v_document_note) RETURNING id INTO v_order;
    ELSIF nullif(btrim(a.terms->>'supplier_finance_ref'), '') IS NULL THEN
      RAISE EXCEPTION 'سجل مرجع مستند المالية لفرق تكلفة المورد بالعملة الأجنبية';
    END IF;
  END IF;
  IF v_supplier_delta < 0 AND -v_supplier_delta > v_supplier_amount
    AND nullif(btrim(a.terms->>'supplier_finance_ref'), '') IS NULL THEN
    RAISE EXCEPTION 'سجل مرجع مستند المالية لتخفيض مستحق المورد غير المدفوع';
  END IF;

  PERFORM trip_amendment_private.update_service(a);
  UPDATE public.trip_service_amendments SET
    status = 'applied', resolved_at = clock_timestamp(), resolved_by = auth.uid(),
    decision = jsonb_build_object('customer_reference', v_customer_ref, 'supplier_reference', v_supplier_ref, 'note', v_note),
    customer_refund_id = v_refund, supplier_claim_id = v_claim, customer_invoice_id = i.id,
    additional_invoice_id = v_invoice, supplier_order_id = v_order, customer_due_reduction = v_due_reduction
  WHERE id = a.id;
  IF v_due_reduction > 0 THEN
    UPDATE public.invoices SET remaining_amount = remaining_amount - v_due_reduction, updated_at = now() WHERE id = i.id;
  END IF;
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  VALUES (a.organization_id, a.booking_id, 'service_amendment_applied', auth.uid(),
    CASE a.terms->>'operation' WHEN 'cancel' THEN 'تم تسجيل إلغاء الخدمة' ELSE 'تم تسجيل تعديل الخدمة' END,
    jsonb_build_object('amendment_id', a.id, 'operation', a.terms->>'operation', 'service_kind', a.service_kind));
  RETURN a.id;
END;
$$;

-- The trip itinerary displays operational results separately from amounts and evidence.
CREATE FUNCTION public.get_trip_service_amendment_history(_booking uuid)
RETURNS TABLE (
  service_kind text, service_id uuid, service_source text, ticket_number text, operation text,
  start_date text, end_date text, new_ticket text, applied_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.service_kind, a.service_id, a.service_source, a.ticket_number, a.terms->>'operation',
    a.terms->>'start_date', a.terms->>'end_date', a.terms->>'new_ticket', a.resolved_at
  FROM public.trip_service_amendments a
  JOIN public.bookings b ON b.id = a.booking_id AND b.organization_id = a.organization_id
  WHERE a.booking_id = _booking AND a.status = 'applied'
    AND trip_amendment_private.can_view(b.organization_id)
  ORDER BY a.resolved_at DESC
$$;

CREATE FUNCTION public.get_customer_trip_invoice_credits(_org uuid, _customer uuid)
RETURNS TABLE (id uuid, customer_invoice_id uuid, customer_due_reduction numeric, resolved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.id, a.customer_invoice_id, a.customer_due_reduction, a.resolved_at
  FROM public.invoices i
  JOIN public.trip_service_amendments a ON a.customer_invoice_id = i.id AND a.organization_id = i.organization_id
  WHERE i.customer_id = _customer AND i.organization_id = _org AND a.status = 'applied' AND a.customer_due_reduction > 0
    AND refund_balance_private.can_read(_org)
    AND EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = _org
      AND m.user_id = auth.uid() AND m.is_active IS TRUE)
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trip_amendment_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION trip_amendment_private.can_view(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_trip_service_amendment(uuid,uuid,text,text,uuid,text,jsonb),
  public.resolve_trip_service_amendment(uuid,boolean,text,text,text,numeric),
  public.get_trip_service_amendment_history(uuid),
  public.get_customer_trip_invoice_credits(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trip_service_amendment(uuid,uuid,text,text,uuid,text,jsonb),
  public.resolve_trip_service_amendment(uuid,boolean,text,text,text,numeric),
  public.get_trip_service_amendment_history(uuid),
  public.get_customer_trip_invoice_credits(uuid,uuid) TO authenticated;
