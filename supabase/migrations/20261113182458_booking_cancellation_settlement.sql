-- Cancellation settles the customer's receivable and wallet in one transaction.
CREATE TABLE public.booking_cancellation_settlements (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  reason text NOT NULL,
  fees jsonb NOT NULL,
  result jsonb NOT NULL DEFAULT '[]'::jsonb,
  settled_by uuid NOT NULL,
  settled_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.booking_cancellation_invoice_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_cancellation_settlements(booking_id),
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id),
  amount numeric NOT NULL CHECK (amount > 0)
);
ALTER TABLE public.booking_cancellation_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cancellation_invoice_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_cancellation_settlements, public.booking_cancellation_invoice_credits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION trip_amendment_private.invoice_credit(_invoice uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(sum(customer_due_reduction), 0) + coalesce(
    (SELECT amount FROM public.booking_cancellation_invoice_credits WHERE invoice_id = _invoice), 0
  )
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
  ) credits
  JOIN public.invoices i ON i.id = credits.customer_invoice_id AND i.organization_id = _org
  WHERE i.customer_id = _customer AND refund_balance_private.can_read(_org)
    AND EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id = _org
      AND m.user_id = auth.uid() AND m.is_active IS TRUE)
$$;

CREATE FUNCTION trip_amendment_private.can_settle_cancellation(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT trip_amendment_private.can_view(_org)
    AND refund_balance_private.can_operate(_org)
    AND EXISTS (SELECT FROM public._org_permission_state(_org, auth.uid(), 'bookings_cancel')
      WHERE granted AND data_scope = 'organization')
$$;

CREATE FUNCTION trip_amendment_private.cancellation_preview(b public.bookings)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'settled', (SELECT jsonb_build_object('at', s.settled_at, 'result', s.result)
      FROM public.booking_cancellation_settlements s WHERE s.booking_id = b.id),
    'can_refund', coalesce(public._can_manage_refunds(b.organization_id), false),
    'blocked_reason', CASE
      WHEN b.is_demo THEN 'تسوية الإلغاء متاحة للحجوزات الفعلية.'
      WHEN EXISTS (SELECT FROM public.refund_requests r WHERE r.booking_id = b.id
        AND r.organization_id = b.organization_id AND r.status = 'requested')
        THEN 'فيه طلب استرداد بانتظار الاعتماد. راجعه في المالية الأول.'
      WHEN EXISTS (SELECT FROM public.invoices i WHERE i.booking_id = b.id
        AND i.organization_id = b.organization_id AND NOT i.is_demo
        AND i.status = 'draft' AND coalesce(i.total_paid_amount, 0) > 0)
        THEN 'فيه دفعة على مسودة فاتورة. راجع تخصيصها في المالية الأول.'
      WHEN EXISTS (SELECT FROM public.invoices i WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
        AND NOT i.is_demo AND coalesce(i.status, '') NOT IN ('draft','cancelled')
        AND (i.status IS NULL OR i.customer_id IS DISTINCT FROM b.customer_id OR i.pilgrimage_b2b_agreement_id IS NOT NULL
          OR i.remaining_amount IS NULL OR i.total_paid_amount IS NULL))
        THEN 'فيه فاتورة بياناتها أو ربطها بالحجز محتاج مراجعة من المالية.'
      WHEN EXISTS (SELECT FROM public.refund_balance_settlements s
        JOIN public.invoices i ON i.id = s.invoice_id AND i.organization_id = s.organization_id
        WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
          AND i.status NOT IN ('draft','cancelled') AND NOT i.is_demo)
        THEN 'الحجز فيه دفعة مسددة برصيد محفظة. راجعها في المالية قبل الإلغاء.'
      WHEN (SELECT coalesce(sum(greatest(p.amount - coalesce((
          SELECT sum(a.amount) FROM public.customer_payment_allocations a
          WHERE a.payment_id = p.id AND a.organization_id = b.organization_id
        ), 0), 0)), 0) FROM public.customer_payments p WHERE p.booking_id = b.id
        AND p.organization_id = b.organization_id AND p.status = 'completed')
        > (SELECT coalesce(sum(r.advance_component), 0) FROM public.refund_requests r
          WHERE r.booking_id = b.id AND r.organization_id = b.organization_id AND r.status IN ('approved','paid'))
        THEN 'فيه دفعة مقدمة غير مخصصة لفاتورة. خصصها أو سوّها من المالية الأول.'
    END,
    'invoices', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'number', i.invoice_number, 'currency', coalesce(i.currency, b.currency, 'EGP'),
        'due', i.remaining_amount,
        'paid', greatest(coalesce(i.total_paid_amount, 0) - coalesce((
          SELECT sum(r.sales_return_component) FROM public.refund_requests r WHERE r.invoice_id = i.id
            AND r.organization_id = b.organization_id AND r.status IN ('approved','paid')
        ), 0), 0)
      ) ORDER BY i.id)
      FROM public.invoices i
      WHERE i.booking_id = b.id AND i.organization_id = b.organization_id AND NOT i.is_demo
        AND i.status NOT IN ('draft','cancelled') AND i.pilgrimage_b2b_agreement_id IS NULL
    ), '[]'::jsonb)
  )
$$;

CREATE FUNCTION public.get_booking_cancellation_preview(_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking;
  IF NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسوية إلغاء هذا الحجز' USING ERRCODE = '42501';
  END IF;
  RETURN trip_amendment_private.cancellation_preview(b);
END
$$;

CREATE FUNCTION public.settle_booking_cancellation(_booking uuid, _reason text, _fees jsonb, _expected jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  v_prior public.booking_cancellation_settlements%ROWTYPE;
  i public.invoices%ROWTYPE;
  v_reason text := btrim(coalesce(_reason, ''));
  v_preview jsonb;
  v_item record;
  v_fee numeric;
  v_reduce numeric;
  v_wallet numeric;
  v_rate numeric;
  v_tax numeric;
  v_ar uuid;
  v_returns uuid;
  v_credit uuid;
  v_cancel_status uuid := coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'));
  v_refund uuid;
  v_result jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;
  IF NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسوية إلغاء هذا الحجز' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_reason) NOT BETWEEN 3 AND 500 OR jsonb_typeof(_fees) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'أدخل سبب الإلغاء والغرامة المتفق عليها' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_prior FROM public.booking_cancellation_settlements WHERE booking_id = b.id;
  IF FOUND THEN
    IF v_prior.fees = _fees AND v_prior.reason = v_reason THEN RETURN v_prior.result; END IF;
    RAISE EXCEPTION 'سبق اعتماد تسوية هذا الحجز';
  END IF;

  PERFORM 1 FROM public.invoices x WHERE x.booking_id = b.id AND x.organization_id = b.organization_id
    ORDER BY x.id FOR UPDATE;
  v_preview := trip_amendment_private.cancellation_preview(b);
  IF v_preview->>'blocked_reason' IS NOT NULL THEN
    RAISE EXCEPTION '%', v_preview->>'blocked_reason';
  END IF;
  IF v_preview IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'بيانات الفواتير أو الدفعات اتغيرت. راجع المعاينة الجديدة قبل الاعتماد.';
  END IF;
  IF EXISTS (SELECT FROM jsonb_each(_fees) f WHERE jsonb_typeof(f.value) <> 'number'
    OR NOT EXISTS (SELECT FROM jsonb_array_elements(v_preview->'invoices') item WHERE item->>'id' = f.key)) THEN
    RAISE EXCEPTION 'الغرامة لازم ترتبط بفاتورة ضمن الحجز';
  END IF;

  INSERT INTO public.booking_cancellation_settlements (booking_id, organization_id, reason, fees, settled_by)
  VALUES (b.id, b.organization_id, v_reason, _fees, auth.uid());

  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_preview->'invoices') AS x(id uuid, currency text, due numeric, paid numeric)
  LOOP
    SELECT * INTO STRICT i FROM public.invoices WHERE id = v_item.id;
    v_fee := coalesce((_fees->>i.id::text)::numeric, 0);
    IF v_fee < 0 OR scale(v_fee) > 2 OR v_fee > v_item.due + v_item.paid THEN
      RAISE EXCEPTION 'الغرامة لا يمكن أن تتجاوز الرصيد والمدفوع المؤهل في الفاتورة %', i.invoice_number;
    END IF;
    v_reduce := v_item.due - greatest(v_fee - v_item.paid, 0);
    v_wallet := greatest(v_item.paid - v_fee, 0);
    v_refund := NULL;
    IF v_wallet > 0 THEN
      IF NOT (v_preview->>'can_refund')::boolean THEN
        RAISE EXCEPTION 'تسوية المبلغ المدفوع تتطلب صلاحية اعتماد الاستردادات' USING ERRCODE = '42501';
      END IF;
      SELECT CASE WHEN v_item.currency = 'EGP' THEN 1 ELSE
        CASE WHEN count(DISTINCT p.exchange_rate) = 1 THEN min(p.exchange_rate) END END
      INTO v_rate FROM public.customer_payment_allocations al
      JOIN public.customer_payments p ON p.id = al.payment_id AND p.status = 'completed'
      WHERE al.invoice_id = i.id AND al.organization_id = b.organization_id;
      IF v_rate IS NULL OR v_item.currency <> upper(coalesce(b.currency, 'EGP')) THEN
        RAISE EXCEPTION 'راجع مع المالية عملة الفاتورة % وسعر الصرف المسجل قبل الاسترداد', i.invoice_number;
      END IF;
      v_refund := public.create_refund_request(b.id, v_wallet, v_item.currency, v_rate, NULL, v_reason);
      UPDATE public.refund_requests SET invoice_id = i.id, advance_component = 0, sales_return_component = v_wallet
      WHERE id = v_refund;
      UPDATE public.booking_timeline_events SET payload = payload ||
        jsonb_build_object('advance_component', 0, 'sales_return_component', v_wallet)
      WHERE organization_id = b.organization_id AND booking_id = b.id
        AND kind = 'refund_requested' AND payload->>'refund_id' = v_refund::text;
      PERFORM public.approve_refund_request(v_refund, true, v_reason);
    END IF;
    IF v_reduce > 0 THEN
      SELECT l.account_id, e.fx_rate INTO v_ar, v_rate FROM public.journal_entries e
      JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
      WHERE e.organization_id = b.organization_id AND e.source_type = 'invoice' AND e.source_id = i.id
        AND e.status = 'posted' AND l.debit = i.final_amount;
      IF v_ar IS NULL THEN
        RAISE EXCEPTION 'الفاتورة % تحتاج مراجعة قيد الإصدار في المالية', i.invoice_number;
      END IF;
      v_returns := public.get_org_account_route(b.organization_id, 'sales_returns');
      v_tax := round(v_reduce * coalesce(i.vat_amount, 0) / i.final_amount, 2);
      INSERT INTO public.booking_cancellation_invoice_credits (booking_id, invoice_id, amount)
      VALUES (b.id, i.id, v_reduce) RETURNING id INTO v_credit;
      PERFORM refund_balance_private.post(
        b.organization_id, 'booking_cancellation_invoice_credit', v_credit, b.id, v_item.currency, coalesce(v_rate, 1),
        ARRAY[v_returns, CASE WHEN v_tax > 0 THEN public.get_org_account_route(b.organization_id, 'tax_payable') ELSE v_returns END],
        ARRAY[v_reduce - v_tax, v_tax], v_ar, 'تسوية فاتورة بعد إلغاء حجز'
      );
      UPDATE public.invoices SET remaining_amount = remaining_amount - v_reduce, updated_at = now() WHERE id = i.id;
    END IF;
    v_result := v_result || jsonb_build_array(jsonb_build_object('invoice_id', i.id, 'number', i.invoice_number,
      'currency', v_item.currency, 'fee', v_fee, 'due_reduction', v_reduce, 'remaining', v_item.due - v_reduce,
      'refund', v_wallet, 'refund_id', v_refund));
  END LOOP;

  UPDATE public.invoices SET status = 'cancelled', remaining_amount = 0, updated_at = now()
  WHERE booking_id = b.id AND organization_id = b.organization_id AND NOT is_demo AND status = 'draft';
  UPDATE public.booking_cancellation_settlements SET result = v_result WHERE booking_id = b.id;
  UPDATE public.bookings SET status = 'cancelled', workflow_stage = 'cancelled',
    status_id = coalesce(v_cancel_status, status_id), updated_at = now()
  WHERE id = b.id AND (status IS DISTINCT FROM 'cancelled' OR workflow_stage::text IS DISTINCT FROM 'cancelled'
    OR status_id IS DISTINCT FROM coalesce(v_cancel_status, status_id));
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  VALUES (b.organization_id, b.id, 'booking_cancellation_settled', auth.uid(),
    'تم اعتماد تسوية إلغاء الحجز', jsonb_build_object('booking_id', b.id));
  RETURN v_result;
END
$$;

-- Guard every booking write path, including workflow rules and older clients.
-- Existing cancelled rows can still be settled from the new screen.
CREATE FUNCTION trip_amendment_private.guard_booking_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_cancel_status uuid := coalesce(public.get_booking_status_id('cancelled'), public.get_booking_status_id('canceled'));
  v_settled boolean;
BEGIN
  SELECT EXISTS (SELECT FROM public.booking_cancellation_settlements s WHERE s.booking_id = NEW.id) INTO v_settled;
  IF NOT v_settled AND (
    (NEW.status IN ('cancelled','canceled') AND NEW.status IS DISTINCT FROM OLD.status)
    OR (NEW.workflow_stage::text = 'cancelled' AND NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage)
    OR (NEW.status_id = v_cancel_status AND NEW.status_id IS DISTINCT FROM OLD.status_id)
  ) THEN
    RAISE EXCEPTION 'افتح مساحة الحجز واعتمد تسوية الإلغاء أولاً' USING ERRCODE = '22023';
  END IF;
  IF v_settled AND (NEW.status IS DISTINCT FROM 'cancelled' OR NEW.workflow_stage::text IS DISTINCT FROM 'cancelled'
    OR (v_cancel_status IS NOT NULL AND NEW.status_id IS DISTINCT FROM v_cancel_status)) THEN
    RAISE EXCEPTION 'الحجز ملغي وتم اعتماد تسويته' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_zz_require_booking_cancellation_settlement
  BEFORE UPDATE OF status, workflow_stage, status_id ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.workflow_stage IS DISTINCT FROM NEW.workflow_stage
    OR OLD.status_id IS DISTINCT FROM NEW.status_id)
  EXECUTE FUNCTION trip_amendment_private.guard_booking_cancellation();

-- Serialize newly issued invoices with booking settlement and refuse any
-- new receivable after the booking's cancellation has been settled.
CREATE FUNCTION trip_amendment_private.guard_cancelled_booking_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.booking_id IS NOT DISTINCT FROM OLD.booking_id
    AND NOT (OLD.status IN ('draft','cancelled') AND NEW.status NOT IN ('draft','cancelled')) THEN
    RETURN NEW;
  END IF;
  PERFORM 1 FROM public.bookings WHERE id = NEW.booking_id AND organization_id = NEW.organization_id FOR SHARE;
  IF EXISTS (SELECT FROM public.booking_cancellation_settlements WHERE booking_id = NEW.booking_id
    AND organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'تسوية إلغاء الحجز معتمدة. لا يمكن إصدار فاتورة جديدة عليه.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_guard_cancelled_booking_invoice
  BEFORE INSERT OR UPDATE OF booking_id, status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.guard_cancelled_booking_invoice();

CREATE OR REPLACE FUNCTION public.trg_run_booking_automation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('cancelled','canceled') OR NEW.workflow_stage::text = 'cancelled' THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.run_booking_automation(NEW.id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION trip_amendment_private.can_settle_cancellation(uuid),
  trip_amendment_private.cancellation_preview(public.bookings), trip_amendment_private.guard_booking_cancellation(),
  trip_amendment_private.guard_cancelled_booking_invoice()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_booking_cancellation_preview(uuid),
  public.settle_booking_cancellation(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_cancellation_preview(uuid),
  public.settle_booking_cancellation(uuid,text,jsonb,jsonb) TO authenticated;

-- The booking cockpit must use the effective receivable after cancellation
-- credits, even when the original invoice's face value is still displayed.
DO $cockpit$
DECLARE
  v_def text := pg_get_functiondef('public.get_booking_profit_cockpit(uuid)'::regprocedure);
  v_anchor text := 'v_customer_due := greatest(v_customer_obligation - v_collected, 0);';
BEGIN
  IF strpos(v_def, v_anchor) = 0 THEN
    RAISE EXCEPTION 'Booking cockpit receivable calculation has changed';
  END IF;
  EXECUTE replace(v_def, v_anchor, v_anchor || '
  IF EXISTS (SELECT FROM public.booking_cancellation_settlements s WHERE s.booking_id = _booking) THEN
    SELECT coalesce(sum(i.remaining_amount), 0) INTO v_customer_due
    FROM public.invoices i
    WHERE i.booking_id = _booking AND i.organization_id = v_booking.organization_id
      AND i.status NOT IN (''draft'', ''cancelled'') AND NOT i.is_demo
      AND upper(coalesce(i.currency, v_currency)) = v_currency;
  END IF;');
END
$cockpit$;
