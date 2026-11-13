BEGIN;

CREATE TABLE trip_amendment_private.booking_supplier_cancellations (
  booking_id uuid PRIMARY KEY REFERENCES public.booking_cancellation_settlements(booking_id),
  terms jsonb NOT NULL,
  result jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE trip_amendment_private.booking_supplier_cancellation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES trip_amendment_private.booking_supplier_cancellations(booking_id),
  organization_id uuid NOT NULL,
  supplier_id uuid,
  invoice_id uuid UNIQUE REFERENCES public.supplier_invoices(id),
  order_id uuid UNIQUE REFERENCES public.supplier_payment_orders(id),
  fee_order_id uuid UNIQUE,
  currency text NOT NULL,
  reference text NOT NULL,
  fee numeric NOT NULL,
  paid numeric NOT NULL,
  refunded numeric NOT NULL
);
CREATE INDEX booking_supplier_cancellation_lines_supplier_idx
  ON trip_amendment_private.booking_supplier_cancellation_lines(organization_id, supplier_id);

-- The source invoice and order are closed for payment but preserved for audit.
CREATE FUNCTION trip_amendment_private.guard_settled_supplier_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking uuid;
BEGIN
  IF TG_OP <> 'INSERT' AND EXISTS (
    SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
    WHERE x.organization_id = OLD.organization_id
      AND CASE WHEN TG_TABLE_NAME = 'supplier_invoices' THEN x.invoice_id = OLD.id ELSE x.order_id = OLD.id END
  ) THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled'
      AND (to_jsonb(NEW) - ARRAY['status','updated_at','rejection_reason'])
        = (to_jsonb(OLD) - ARRAY['status','updated_at','rejection_reason']) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'تمت تسوية مستحق المورد ضمن إلغاء الحجز';
  END IF;
  IF TG_OP <> 'INSERT' AND EXISTS (
    SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
    WHERE x.organization_id = OLD.organization_id
      AND CASE WHEN TG_TABLE_NAME = 'supplier_payment_orders' THEN x.fee_order_id = OLD.id
        ELSE x.fee_order_id = (to_jsonb(OLD)->>'payment_order_id')::uuid END
  ) THEN
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'supplier_payment_orders'
      AND NEW.status <> 'cancelled' AND to_jsonb(NEW)->>'approval_status' <> 'rejected'
      AND (to_jsonb(NEW) - ARRAY['status','updated_at','approval_status','approved_at','approved_by','rejection_reason'])
        = (to_jsonb(OLD) - ARRAY['status','updated_at','approval_status','approved_at','approved_by','rejection_reason']) THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'supplier_invoices' AND NEW.status <> 'cancelled'
      AND (to_jsonb(NEW) - ARRAY['status','updated_at','amount_paid','amount_base','exchange_rate'])
        = (to_jsonb(OLD) - ARRAY['status','updated_at','amount_paid','amount_base','exchange_rate']) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'غرامة الإلغاء المعتمدة تحتاج مستند تسوية لتعديلها';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.booking_id IS NOT DISTINCT FROM OLD.booking_id
    AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
    AND NOT (OLD.status = 'cancelled' AND NEW.status <> 'cancelled') THEN
    RETURN NEW;
  END IF;
  -- An order may create its invoice during the same transaction. Lock the
  -- booking before a new document becomes visible to a cancellation.
  SELECT id INTO v_booking FROM public.bookings
  WHERE id = NEW.booking_id AND organization_id = NEW.organization_id FOR KEY SHARE;
  IF EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellations s WHERE s.booking_id = v_booking)
    AND NOT (
      (TG_TABLE_NAME = 'supplier_payment_orders' AND to_jsonb(NEW)->>'source_type' = 'booking_cancellation_fee'
        AND EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
          WHERE x.booking_id = v_booking AND x.organization_id = NEW.organization_id AND x.fee_order_id = NEW.id
            AND x.id = (to_jsonb(NEW)->>'source_id')::uuid AND x.supplier_id = NEW.supplier_id
            AND x.currency = NEW.currency AND (to_jsonb(NEW)->>'amount')::numeric = x.fee - x.paid + x.refunded))
      OR (TG_TABLE_NAME = 'supplier_invoices' AND EXISTS (
        SELECT FROM public.supplier_payment_orders o WHERE o.id = (to_jsonb(NEW)->>'payment_order_id')::uuid
          AND o.booking_id = v_booking AND o.organization_id = NEW.organization_id AND o.source_type = 'booking_cancellation_fee'
          AND o.supplier_id = NEW.supplier_id AND o.currency = NEW.currency AND o.amount = (to_jsonb(NEW)->>'amount')::numeric
          AND NOT EXISTS (SELECT FROM public.supplier_invoices i WHERE i.payment_order_id = o.id)
      ))
    ) THEN
    RAISE EXCEPTION 'تمت تسوية مستحقات الموردين لهذا الحجز';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_guard_settled_supplier_invoice
BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.guard_settled_supplier_document();
CREATE TRIGGER trg_guard_settled_supplier_order
BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_payment_orders
FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.guard_settled_supplier_document();

CREATE FUNCTION trip_amendment_private.guard_supplier_invoice_cancellation_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
      WHERE x.invoice_id = OLD.id AND x.organization_id = OLD.organization_id)
    AND EXISTS (SELECT FROM public.journal_entries j WHERE j.organization_id = OLD.organization_id
      AND j.source_type = 'supplier_invoice' AND j.source_id = OLD.id AND j.is_locked) THEN
    RAISE EXCEPTION 'The financial source is locked by a posted journal entry';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_invoice_cancellation ON public.supplier_invoices;
CREATE TRIGGER trg_guard_locked_supplier_invoice_cancellation
BEFORE UPDATE OF status ON public.supplier_invoices FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trip_amendment_private.guard_supplier_invoice_cancellation_status();

CREATE FUNCTION public.is_closed_booking_supplier_order(_order uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (current_setting('role', true) = 'service_role' OR coalesce(public.can_org_write(_org), false))
    AND EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
      WHERE x.order_id = _order AND x.organization_id = _org)
$$;
-- The existing invoker trigger can check the order state without reading settlement data.
REVOKE ALL ON FUNCTION public.is_closed_booking_supplier_order(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_closed_booking_supplier_order(uuid,uuid) TO authenticated, service_role;

-- Preserve existing posting and lock rules for all unrelated documents.
DO $functions$
DECLARE
  v_def text;
  v_anchor text;
  v_replacements text[][] := ARRAY[
    ARRAY['public.post_supplier_invoice(uuid)', 'IF i.status = ''cancelled'' OR COALESCE(i.amount, 0) <= 0 THEN',
      'IF i.status = ''cancelled'' AND EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellation_lines x
          WHERE x.invoice_id = i.id AND x.organization_id = i.organization_id) THEN RETURN v_je; END IF;
        IF i.status = ''cancelled'' OR COALESCE(i.amount, 0) <= 0 THEN'],
    ARRAY['public.sync_supplier_invoice_from_payment_order()', 'IF NEW.supplier_id IS NULL OR COALESCE(NEW.amount, 0) <= 0 THEN',
      'IF NEW.status = ''cancelled'' AND public.is_closed_booking_supplier_order(NEW.id, NEW.organization_id) THEN RETURN NEW; END IF;
        IF NEW.supplier_id IS NULL OR COALESCE(NEW.amount, 0) <= 0 THEN']
  ];
  v_item text[];
BEGIN
  FOREACH v_item SLICE 1 IN ARRAY v_replacements LOOP
    v_def := pg_get_functiondef(v_item[1]::regprocedure);
    v_anchor := v_item[2];
    IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected definition for %', v_item[1]; END IF;
    EXECUTE replace(v_def, v_anchor, v_item[3]);
  END LOOP;
END
$functions$;

-- Only payable sources belonging to this booking and tenant are eligible.
CREATE FUNCTION trip_amendment_private.supplier_cancellation_preview(b public.bookings)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$
  WITH orders AS (
    SELECT o.* FROM public.supplier_payment_orders o
    WHERE o.booking_id = b.id AND o.organization_id = b.organization_id
      AND o.status <> 'cancelled' AND o.amount > 0
  ), invoices AS (
    SELECT i.* FROM public.supplier_invoices i
    WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
      AND (i.status <> 'cancelled' OR EXISTS (SELECT FROM orders o WHERE o.id = i.payment_order_id))
  ), documents AS (
    SELECT i.id, i.id AS invoice_id, i.payment_order_id AS order_id, i.supplier_id,
      i.invoice_number AS reference, i.currency, i.amount, coalesce(i.amount_paid, 0) AS paid,
      coalesce((SELECT sum(c.amount) FROM public.supplier_refund_claims c
        WHERE c.organization_id = b.organization_id AND c.supplier_invoice_id = i.id AND c.confirmed_at IS NOT NULL), 0) AS refunded
    FROM invoices i
    UNION ALL
    SELECT o.id, NULL, o.id, o.supplier_id, o.reference_number, o.currency, o.amount, 0, 0
    FROM orders o WHERE NOT EXISTS (SELECT FROM invoices i WHERE i.payment_order_id = o.id)
    UNION ALL
    SELECT b.id, NULL, NULL, b.supplier_id, NULL, coalesce(b.currency, 'EGP'), greatest(coalesce(b.cost_price, 0), 0), 0, 0
    WHERE NOT EXISTS (SELECT FROM invoices) AND NOT EXISTS (SELECT FROM orders)
      AND coalesce(b.cost_price, 0) > 0 AND NOT EXISTS (
        SELECT FROM public.supplier_invoices i WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
          AND i.status = 'cancelled' AND (i.payment_order_id IS NULL OR EXISTS (
            SELECT FROM public.supplier_payment_orders o WHERE o.id = i.payment_order_id
              AND o.booking_id = b.id AND o.organization_id = b.organization_id AND o.status = 'cancelled'
          ))
      )
  )
  SELECT coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object('supplier', s.name) ORDER BY d.id), '[]')
  FROM documents d LEFT JOIN public.suppliers s ON s.id = d.supplier_id AND s.organization_id = b.organization_id
$$;

CREATE FUNCTION trip_amendment_private.apply_supplier_cancellation(b public.bookings, _terms jsonb, _preview jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_line record;
  v_invoice public.supplier_invoices%ROWTYPE;
  v_order public.supplier_payment_orders%ROWTYPE;
  v_entry public.journal_entries%ROWTYPE;
  v_fee numeric;
  v_paid numeric;
  v_allocated numeric;
  v_cash numeric;
  v_release numeric;
  v_refund numeric;
  v_due numeric;
  v_reference text;
  v_claim_id uuid;
  v_fee_order uuid;
  v_adjustment uuid;
  v_expense uuid;
  v_ap uuid;
  v_result jsonb := '[]';
BEGIN
  IF jsonb_typeof(_terms) IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(_terms)) <> jsonb_array_length(_preview) THEN
    RAISE EXCEPTION 'سجّل شروط الإلغاء المؤكدة لكل مستحق مورد';
  END IF;
  IF EXISTS (SELECT FROM jsonb_to_recordset(_preview) AS x(order_id uuid)
    WHERE order_id IS NOT NULL GROUP BY order_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'أمر دفع مرتبط بأكثر من فاتورة مورد. راجع الربط قبل التسوية.';
  END IF;
  IF EXISTS (SELECT FROM public.journal_entries j WHERE j.organization_id = b.organization_id
      AND j.booking_id = b.id AND j.source_type = 'booking_cost' AND j.status = 'posted')
    AND jsonb_array_length(_preview) <> 1 THEN
    RAISE EXCEPTION 'قيد تكلفة قديم يغطي أكثر من مستحق. راجع توزيعه قبل التسوية.';
  END IF;
  IF EXISTS (
    SELECT FROM public.supplier_payments p WHERE p.organization_id = b.organization_id AND p.booking_id = b.id
      AND p.status IN ('pending', 'paid', 'completed', 'succeeded')
      AND (p.status = 'pending' OR p.amount IS DISTINCT FROM (
        SELECT sum(a.amount) FROM public.supplier_payment_allocations a JOIN public.supplier_invoices i ON i.id = a.supplier_invoice_id
        WHERE a.supplier_payment_id = p.id AND a.organization_id = b.organization_id
          AND i.organization_id = b.organization_id AND i.booking_id = b.id AND i.supplier_id = p.supplier_id
          AND i.currency = p.currency AND i.status <> 'cancelled'
      ))
  ) THEN
    RAISE EXCEPTION 'فيه دفعة مورد معلّقة أو غير موزعة على فواتير الحجز';
  END IF;
  INSERT INTO trip_amendment_private.booking_supplier_cancellations(booking_id, terms) VALUES (b.id, _terms);

  FOR v_line IN SELECT * FROM jsonb_to_recordset(_preview)
    AS x(id uuid, invoice_id uuid, order_id uuid, supplier_id uuid, reference text, currency text, amount numeric, paid numeric, refunded numeric)
  LOOP
    IF jsonb_typeof(_terms->(v_line.id::text)->'fee') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'أدخل غرامة الإلغاء المؤكدة لكل مورد';
    END IF;
    v_fee := (_terms->(v_line.id::text)->>'fee')::numeric;
    v_reference := btrim(coalesce(_terms->(v_line.id::text)->>'reference', ''));
    IF v_fee < 0 OR round(v_fee, 2) <> v_fee OR v_fee > v_line.amount
      OR length(v_reference) NOT BETWEEN 1 AND 150 THEN
      RAISE EXCEPTION 'راجع غرامة المورد ومرجع تأكيد الإلغاء';
    END IF;
    SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id = v_line.invoice_id AND organization_id = b.organization_id;
    SELECT * INTO v_order FROM public.supplier_payment_orders
    WHERE id = v_line.order_id AND organization_id = b.organization_id AND booking_id = b.id;
    IF v_invoice.id IS NOT NULL AND v_invoice.booking_id IS DISTINCT FROM b.id THEN
      RAISE EXCEPTION 'فاتورة المورد غير مرتبطة بالحجز';
    END IF;
    IF (v_line.order_id IS NOT NULL AND v_order.id IS NULL)
      OR (v_order.id IS NOT NULL AND v_invoice.id IS NOT NULL AND
        (v_order.supplier_id, v_order.amount, v_order.currency) IS DISTINCT FROM (v_invoice.supplier_id, v_invoice.amount, v_invoice.currency))
      OR (v_line.supplier_id IS NOT NULL AND NOT EXISTS (SELECT FROM public.suppliers WHERE id = v_line.supplier_id AND organization_id = b.organization_id)) THEN
      RAISE EXCEPTION 'بيانات أمر الدفع وفاتورة المورد غير متطابقة';
    END IF;

    SELECT coalesce(sum(a.amount), 0), coalesce(sum(a.amount) FILTER (WHERE p.status IN ('paid','completed')), 0)
    INTO v_allocated, v_cash
    FROM public.supplier_payment_allocations a JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
    WHERE a.organization_id = b.organization_id AND p.organization_id = b.organization_id
      AND (a.supplier_invoice_id = v_invoice.id OR a.payment_order_id = v_order.id);
    IF v_allocated <> v_cash OR v_cash > v_line.paid OR v_line.paid > v_line.amount
      OR (v_invoice.status = 'cancelled' AND (v_line.paid > 0 OR v_fee > 0))
      OR (v_order.status IN ('paid','partially_paid') AND v_line.paid = 0)
      OR EXISTS (SELECT FROM public.supplier_payment_allocations a
        JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
        WHERE (a.supplier_invoice_id = v_invoice.id OR a.payment_order_id = v_order.id)
          AND (a.organization_id IS DISTINCT FROM b.organization_id OR p.organization_id IS DISTINCT FROM b.organization_id
            OR a.supplier_invoice_id IS DISTINCT FROM v_invoice.id OR p.supplier_id IS DISTINCT FROM v_line.supplier_id
            OR p.currency IS DISTINCT FROM v_line.currency))
      OR EXISTS (SELECT FROM public.supplier_invoices i WHERE i.payment_order_id = v_order.id
        AND i.id IS DISTINCT FROM v_invoice.id)
      OR EXISTS (SELECT FROM public.supplier_refund_claims c WHERE c.supplier_invoice_id = v_invoice.id
        AND c.organization_id = b.organization_id AND c.confirmed_at IS NULL AND c.rejected_at IS NULL) THEN
      RAISE EXCEPTION 'راجع دفعات واستردادات فاتورة المورد % قبل الإلغاء', v_line.reference;
    END IF;
    -- A wallet offset is a real settlement, but it is not a cash refund.
    SELECT v_cash + coalesce(sum(s.amount), 0) INTO v_paid
    FROM public.refund_balance_settlements s
    WHERE s.supplier_invoice_id = v_invoice.id AND s.organization_id = b.organization_id;
    IF v_paid <> v_line.paid OR v_line.refunded > v_cash
      OR v_fee > v_line.amount - v_line.refunded THEN
      RAISE EXCEPTION 'دفعات أو أرصدة المورد غير مطابقة للغرامة المؤكدة';
    END IF;

    v_release := greatest(v_line.amount - v_paid, 0);
    v_refund := greatest(v_paid - v_line.refunded - v_fee, 0);
    v_due := greatest(v_fee - (v_paid - v_line.refunded), 0);
    IF v_refund + v_line.refunded > v_cash THEN
      RAISE EXCEPTION 'الفاتورة مسددة جزئيًا برصيد مورد. راجع استرداد الرصيد المستخدم أولًا.';
    END IF;
    IF v_due > 0 AND v_line.supplier_id IS NULL THEN
      RAISE EXCEPTION 'حدد المورد قبل تسجيل غرامة مستحقة';
    END IF;

    IF (SELECT count(*) FROM public.journal_entries j WHERE j.organization_id = b.organization_id
        AND j.booking_id = b.id AND j.status = 'posted'
        AND ((j.source_type = 'supplier_invoice' AND j.source_id = v_invoice.id)
          OR (j.source_type = 'booking_cost' AND j.source_id = b.id))) > 1 THEN
      RAISE EXCEPTION 'يوجد أكثر من قيد لتكلفة نفس المستحق. راجع القيود قبل الإلغاء.';
    END IF;
    SELECT * INTO v_entry FROM public.journal_entries j WHERE j.organization_id = b.organization_id
      AND j.booking_id = b.id AND j.status = 'posted'
      AND ((j.source_type = 'supplier_invoice' AND j.source_id = v_invoice.id)
        OR (j.source_type = 'booking_cost' AND j.source_id = b.id))
    ORDER BY j.source_type DESC LIMIT 1 FOR UPDATE;
    IF v_entry.id IS NOT NULL THEN
      IF v_entry.total_credit <> v_line.amount OR v_entry.currency <> v_line.currency THEN
        RAISE EXCEPTION 'قيد تكلفة المورد غير مطابق للمستند %', v_line.reference;
      END IF;
      SELECT account_id INTO STRICT v_expense FROM public.journal_entry_lines
      WHERE journal_entry_id = v_entry.id AND debit = v_entry.total_debit;
      SELECT account_id INTO STRICT v_ap FROM public.journal_entry_lines
      WHERE journal_entry_id = v_entry.id AND credit = v_entry.total_credit;
    ELSIF v_paid > 0 OR (v_invoice.id IS NOT NULL AND v_invoice.status <> 'cancelled' AND v_line.amount > 0) THEN
      RAISE EXCEPTION 'قيد تكلفة المورد غير موجود للمستند %', v_line.reference;
    END IF;

    v_claim_id := NULL;
    IF v_refund > 0 THEN
      v_claim_id := public.manage_supplier_refund_claim(b.organization_id, gen_random_uuid(), 'create',
        v_invoice.id, v_refund, v_reference || ' / ' || v_invoice.id::text);
      PERFORM public.manage_supplier_refund_claim(b.organization_id, v_claim_id, 'confirm', NULL, NULL, NULL);
    END IF;
    v_fee_order := CASE WHEN v_due > 0 THEN gen_random_uuid() END;
    INSERT INTO trip_amendment_private.booking_supplier_cancellation_lines
      (booking_id, organization_id, supplier_id, invoice_id, order_id, fee_order_id, currency, reference, fee, paid, refunded)
    VALUES (b.id, b.organization_id, v_line.supplier_id, v_invoice.id, v_order.id, v_fee_order, v_line.currency, v_reference, v_fee, v_paid, v_refund + v_line.refunded)
    RETURNING id INTO v_adjustment;

    IF v_entry.id IS NOT NULL THEN
      IF v_release > 0 THEN
        PERFORM refund_balance_private.post(b.organization_id, 'booking_cancellation_supplier_credit', v_adjustment,
          b.id, v_line.currency, coalesce(v_entry.fx_rate, 1), ARRAY[v_ap], ARRAY[v_release], v_expense,
          'عكس استحقاق المورد عند إلغاء الحجز');
      END IF;
      UPDATE public.journal_entries SET is_locked = true WHERE id = v_entry.id AND NOT is_locked;
    END IF;
    -- The original payment remains allocated to the original invoice. Lock
    -- its posting so a future replay cannot reclassify it as an advance.
    UPDATE public.journal_entries j SET is_locked = true WHERE j.organization_id = b.organization_id
      AND j.source_type = 'supplier_payment' AND j.status = 'posted' AND NOT j.is_locked
      AND EXISTS (SELECT FROM public.supplier_payment_allocations a WHERE a.supplier_payment_id = j.source_id
        AND a.organization_id = b.organization_id AND (a.supplier_invoice_id = v_invoice.id OR a.payment_order_id = v_order.id));

    UPDATE public.supplier_invoices SET status = 'cancelled' WHERE id = v_invoice.id AND status <> 'cancelled';
    UPDATE public.supplier_payment_orders SET status = 'cancelled', rejection_reason = v_reference
    WHERE id = v_order.id AND status <> 'cancelled';

    IF v_fee_order IS NOT NULL THEN
      INSERT INTO public.supplier_payment_orders
        (id, organization_id, booking_id, supplier_id, service_type, reference_number, amount, currency, due_date,
         status, approval_status, source_type, source_id, notes)
      VALUES (v_fee_order, b.organization_id, b.id, v_line.supplier_id, coalesce(v_order.service_type, b.booking_type, 'other'),
        'CXL-' || substr(v_adjustment::text, 1, 12), v_due, v_line.currency, v_order.due_date,
        'pending', 'pending', 'booking_cancellation_fee', v_adjustment, v_reference);
      UPDATE public.supplier_invoices
      SET exchange_rate = coalesce(v_entry.fx_rate, v_invoice.exchange_rate, 1),
        amount_base = round(amount * coalesce(v_entry.fx_rate, v_invoice.exchange_rate, 1), 2)
      WHERE payment_order_id = v_fee_order AND organization_id = b.organization_id
        AND exchange_rate IS DISTINCT FROM coalesce(v_entry.fx_rate, v_invoice.exchange_rate, 1);
    END IF;
    v_result := v_result || jsonb_build_array(to_jsonb(v_line) || jsonb_build_object(
      'fee', v_fee, 'remaining', v_due, 'refund', v_refund, 'refund_id', v_claim_id,
      'fee_order_id', v_fee_order, 'confirmation', v_reference
    ));
  END LOOP;
  UPDATE trip_amendment_private.booking_supplier_cancellations SET result = v_result WHERE booking_id = b.id;
  RETURN v_result;
END
$$;

CREATE FUNCTION public.get_booking_cancellation_workflow(_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking;
  IF NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسوية إلغاء هذا الحجز' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('customer', trip_amendment_private.cancellation_preview(b),
    'suppliers', CASE WHEN EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellations WHERE booking_id = b.id)
      THEN '[]'::jsonb ELSE trip_amendment_private.supplier_cancellation_preview(b) END,
    'supplier_result', (SELECT result FROM trip_amendment_private.booking_supplier_cancellations WHERE booking_id = b.id),
    'closed_supplier_orders', coalesce((SELECT supplier_result FROM public.booking_cancellation_settlements WHERE booking_id = b.id), '[]'));
END
$$;

CREATE FUNCTION public.settle_booking_cancellation_workflow(
  _booking uuid, _reason text, _fees jsonb, _supplier_terms jsonb, _expected jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  v_workflow jsonb;
  v_cancel_status uuid;
  v_supplier_result jsonb;
  v_prior jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;
  IF NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسوية إلغاء هذا الحجز' USING ERRCODE = '42501';
  END IF;
  SELECT terms INTO v_prior
  FROM trip_amendment_private.booking_supplier_cancellations WHERE booking_id = b.id;
  IF FOUND THEN
    IF v_prior IS DISTINCT FROM _supplier_terms OR (_expected #> '{customer,settled}' = 'null' AND NOT EXISTS (
      SELECT FROM public.booking_cancellation_settlements s WHERE s.booking_id = b.id
        AND s.fees = _fees AND s.reason = btrim(_reason)
    )) THEN RAISE EXCEPTION 'سبق اعتماد تسوية هذا الحجز'; END IF;
    RETURN public.get_booking_cancellation_workflow(b.id);
  END IF;

  -- Payables and allocations use the same order → invoice lock sequence as
  -- supplier payment recording. This keeps the quote valid through settlement.
  PERFORM 1 FROM public.supplier_payment_orders WHERE booking_id = b.id AND organization_id = b.organization_id
    ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.supplier_invoices WHERE booking_id = b.id AND organization_id = b.organization_id
    ORDER BY id FOR UPDATE;
  v_workflow := public.get_booking_cancellation_workflow(b.id);
  IF v_workflow IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'بيانات العميل أو المورد اتغيرت. راجع المعاينة الجديدة قبل الاعتماد.';
  END IF;
  IF v_workflow #> '{customer,settled}' = 'null' THEN
    PERFORM public.settle_booking_cancellation(b.id, _reason, _fees, v_workflow->'customer');
  END IF;
  v_supplier_result := trip_amendment_private.apply_supplier_cancellation(b, _supplier_terms, v_workflow->'suppliers');

  v_cancel_status := coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'));
  IF v_cancel_status IS NULL THEN RAISE EXCEPTION 'حالة إلغاء الخدمات غير مهيأة'; END IF;
  UPDATE public.hotel_bookings SET status_id = v_cancel_status
  WHERE booking_id = b.id AND organization_id = b.organization_id AND status_id IS DISTINCT FROM v_cancel_status;
  UPDATE public.flight_bookings SET status_id = v_cancel_status
  WHERE booking_id = b.id AND organization_id = b.organization_id AND status_id IS DISTINCT FROM v_cancel_status;
  UPDATE public.transport_bookings SET status_id = v_cancel_status
  WHERE booking_id = b.id AND organization_id = b.organization_id AND status_id IS DISTINCT FROM v_cancel_status;
  UPDATE public.car_rentals SET status_id = v_cancel_status
  WHERE booking_id = b.id AND organization_id = b.organization_id AND status_id IS DISTINCT FROM v_cancel_status;
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  VALUES (b.organization_id, b.id, 'booking_supplier_cancellation_settled', auth.uid(),
    'تمت تسوية مستحقات الموردين بعد الإلغاء', jsonb_build_object('suppliers', v_supplier_result));
  RETURN public.get_booking_cancellation_workflow(b.id);
END
$$;

CREATE OR REPLACE FUNCTION public.get_booking_cancellation_with_supplier_preview(_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_customer jsonb := public.get_booking_cancellation_preview(_booking);
  v_org uuid;
  v_orders jsonb;
  v_closed jsonb;
BEGIN
  SELECT organization_id INTO STRICT v_org FROM public.bookings WHERE id = _booking;
  SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id), '[]'::jsonb) INTO v_orders
  FROM trip_amendment_private.supplier_cancellation_orders(_booking, v_org) o;
  SELECT supplier_result INTO v_closed FROM public.booking_cancellation_settlements WHERE booking_id = _booking;
  SELECT coalesce(v_closed, '[]') || coalesce(jsonb_agg(jsonb_build_object(
    'id', x->>'order_id', 'number', x->>'reference', 'supplier_name', x->>'supplier',
    'amount', x->'amount', 'currency', x->>'currency', 'confirmation', x->>'confirmation')), '[]') INTO v_closed
  FROM trip_amendment_private.booking_supplier_cancellations s
  CROSS JOIN LATERAL jsonb_array_elements(s.result) x
  WHERE s.booking_id = _booking AND x->>'order_id' IS NOT NULL;
  RETURN v_customer || jsonb_build_object('supplier_orders', v_orders, 'closed_supplier_orders', v_closed);
END
$$;

CREATE OR REPLACE FUNCTION public.settle_booking_cancellation_with_supplier(
  _booking uuid, _reason text, _fees jsonb, _expected jsonb, _supplier_confirmations jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_old_preview jsonb;
  v_workflow jsonb;
  v_terms jsonb;
  v_result jsonb;
BEGIN
  PERFORM 1 FROM public.bookings WHERE id = _booking FOR UPDATE;
  v_old_preview := public.get_booking_cancellation_with_supplier_preview(_booking);
  v_workflow := public.get_booking_cancellation_workflow(_booking);
  IF jsonb_typeof(_supplier_confirmations) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'بيانات تأكيد إلغاء المورد غير صالحة' USING ERRCODE = '22023';
  END IF;
  IF v_workflow->'supplier_result' = 'null' AND v_workflow #> '{customer,settled}' <> 'null'
    AND v_old_preview->'closed_supplier_orders' <> '[]' AND v_workflow->'suppliers' = '[]' THEN
    RETURN jsonb_build_object('invoices', v_workflow #> '{customer,settled,result}',
      'closed_supplier_orders', v_old_preview->'closed_supplier_orders');
  END IF;
  IF v_workflow->'supplier_result' = 'null' AND v_old_preview IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'بيانات الإلغاء اتغيرت. راجع المعاينة الجديدة قبل الاعتماد.';
  END IF;
  IF EXISTS (SELECT FROM jsonb_array_elements(v_workflow->'suppliers') x
    WHERE (x->>'paid')::numeric > 0 OR x->>'order_id' IS NULL) THEN
    RAISE EXCEPTION 'افتح شاشة تسوية الإلغاء الجديدة لتسجيل شروط المورد.';
  END IF;
  SELECT coalesce(jsonb_object_agg(x->>'id', jsonb_build_object('fee', 0, 'reference', _supplier_confirmations->>(x->>'order_id'))), '{}')
  INTO v_terms
  FROM jsonb_array_elements(CASE WHEN v_workflow->'supplier_result' = 'null' THEN v_workflow->'suppliers' ELSE v_workflow->'supplier_result' END) x
  WHERE nullif(btrim(_supplier_confirmations->>(x->>'order_id')), '') IS NOT NULL;

  v_result := public.settle_booking_cancellation_workflow(_booking, _reason, _fees, v_terms, v_workflow);
  RETURN jsonb_build_object('invoices', v_result #> '{customer,settled,result}',
    'closed_supplier_orders', public.get_booking_cancellation_with_supplier_preview(_booking)->'closed_supplier_orders');
END
$$;

-- The old entry point remains available to the workflow owner only.
REVOKE EXECUTE ON FUNCTION public.settle_booking_cancellation(uuid,text,jsonb,jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION trip_amendment_private.guard_settled_supplier_document(),
  trip_amendment_private.guard_supplier_invoice_cancellation_status(),
  trip_amendment_private.supplier_cancellation_preview(public.bookings),
  trip_amendment_private.apply_supplier_cancellation(public.bookings,jsonb,jsonb)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_booking_cancellation_workflow(uuid),
  public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_cancellation_workflow(uuid),
  public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb) TO authenticated;

CREATE FUNCTION public.booking_supplier_cancellation_completed(_booking uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM trip_amendment_private.booking_supplier_cancellations s
    JOIN public.bookings b ON b.id = s.booking_id
    WHERE s.booking_id = _booking AND auth.uid() IS NOT NULL
      AND public._can_read_org_finance(b.organization_id))
$$;
REVOKE ALL ON FUNCTION public.booking_supplier_cancellation_completed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_supplier_cancellation_completed(uuid) TO authenticated;

DO $reports$
DECLARE
  v_def text;
  v_anchor text;
BEGIN
  v_def := pg_get_functiondef('public.get_booking_profit_cockpit(uuid)'::regprocedure);
  v_anchor := 'WHEN v_supplier_invoiced > 0 THEN v_supplier_invoiced WHEN';
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier obligation calculation'; END IF;
  v_def := replace(v_def, v_anchor, v_anchor || ' public.booking_supplier_cancellation_completed(_booking) THEN 0 WHEN');
  v_anchor := 'WHEN v_supplier_invoiced > 0 THEN ''supplier_invoices'' WHEN';
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier obligation basis'; END IF;
  EXECUTE replace(v_def, v_anchor, v_anchor ||
    ' public.booking_supplier_cancellation_completed(_booking) THEN ''cancelled_supplier_invoices'' WHEN');

  v_def := pg_get_functiondef('public.get_supplier_ledger(uuid,date,date)'::regprocedure);
  v_anchor := 'po.approval_status=''approved''';
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier ledger definition'; END IF;
  v_def := replace(v_def, v_anchor, v_anchor || ' AND po.status <> ''cancelled''');
  v_anchor := 'SELECT * FROM obligations';
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier ledger events'; END IF;
  EXECUTE replace(v_def, v_anchor, v_anchor || $events$
    UNION ALL
    -- Keep historical payments in the ledger, and recognize their transfer
    -- out of the original payable. Any supplier refund is shown in its wallet.
    SELECT s.settled_at,'booking_cancellation',x.reference,x.booking_id,0::numeric,x.paid,x.currency
    FROM trip_amendment_private.booking_supplier_cancellation_lines x
    JOIN public.booking_cancellation_settlements s ON s.booking_id = x.booking_id AND s.organization_id = x.organization_id
    WHERE x.organization_id = v_org AND x.supplier_id = _supplier_id
      AND (_from IS NULL OR s.settled_at::date >= _from) AND (_to IS NULL OR s.settled_at::date <= _to)
    UNION ALL
    SELECT s.created_at,'supplier_wallet_offset',s.reference,i.booking_id,s.amount,0::numeric,s.currency
    FROM public.refund_balance_settlements s
    JOIN public.supplier_invoices i ON i.id = s.supplier_invoice_id AND i.organization_id = s.organization_id
    WHERE s.organization_id = v_org AND i.supplier_id = _supplier_id AND s.supplier_claim_id IS NOT NULL
      AND (_from IS NULL OR s.created_at::date >= _from) AND (_to IS NULL OR s.created_at::date <= _to)
  $events$);
  v_def := pg_get_functiondef('public.close_unpaid_supplier_order(uuid,text)'::regprocedure);
  v_anchor := 'IF v_order.status = ''cancelled'' THEN RETURN v_order.id; END IF;';
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier order closing function'; END IF;
  EXECUTE replace(v_def, v_anchor, v_anchor || '
  IF v_order.source_type = ''booking_cancellation_fee'' THEN
    RAISE EXCEPTION ''غرامة الإلغاء المعتمدة تحتاج مستند تسوية لتعديلها'' USING ERRCODE = ''22023'';
  END IF;');
END
$reports$;

-- Some installations protect converted quote links on every service update.
-- Permit only the status change from an already recorded full cancellation.
DO $quote_links$
DECLARE
  v_guard regprocedure := to_regprocedure('public.guard_quote_conversion_links()');
  v_def text;
  v_anchor text := 'FOR parent IN SELECT DISTINCT x FROM unnest(ARRAY[';
BEGIN
  IF v_guard IS NULL THEN RETURN; END IF;
  v_def := pg_get_functiondef(v_guard);
  IF strpos(v_def, v_anchor) = 0 THEN RAISE EXCEPTION 'Unexpected quote conversion guard'; END IF;
  EXECUTE replace(v_def, v_anchor, $exception$
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('hotel_bookings','flight_bookings','transport_bookings','car_rentals')
      AND (to_jsonb(NEW) - ARRAY['status_id','updated_at']) = (to_jsonb(OLD) - ARRAY['status_id','updated_at'])
      AND (to_jsonb(NEW)->>'status_id')::uuid = coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'))
      AND EXISTS (
        SELECT FROM trip_amendment_private.booking_supplier_cancellations s
        JOIN public.booking_cancellation_settlements cs ON cs.booking_id = s.booking_id
        WHERE s.booking_id = (to_jsonb(NEW)->>'booking_id')::uuid AND cs.organization_id = NEW.organization_id
      ) THEN RETURN NEW; END IF;
    FOR parent IN SELECT DISTINCT x FROM unnest(ARRAY[
  $exception$);
END
$quote_links$;

COMMIT;
