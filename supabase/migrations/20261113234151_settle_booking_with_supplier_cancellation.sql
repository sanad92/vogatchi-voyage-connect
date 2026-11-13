ALTER TABLE public.booking_cancellation_settlements
  ADD COLUMN IF NOT EXISTS supplier_result jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Both cancellation entry points use the same eligibility check.
CREATE OR REPLACE FUNCTION trip_amendment_private.supplier_cancellation_orders(_booking uuid, _org uuid)
RETURNS TABLE (id uuid, number text, supplier_name text, amount numeric, currency text, status text, blocked_reason text)
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT o.id, o.reference_number, s.name, o.amount, o.currency, o.status,
    CASE
      WHEN o.pilgrimage_b2b_agreement_id IS NOT NULL OR o.service_type = 'pilgrimage_b2b'
        THEN 'أمر الدفع تابع لتسوية العمرة B2B.'
      WHEN coalesce(o.status, '') NOT IN ('draft', 'pending', 'approved')
        THEN 'أمر الدفع يحتاج تسوية مالية قبل الإقفال.'
      WHEN i.id IS NULL OR i.supplier_id IS DISTINCT FROM o.supplier_id
        OR o.supplier_id IS NULL OR i.booking_id IS DISTINCT FROM o.booking_id
        OR i.currency IS DISTINCT FROM o.currency OR i.amount IS DISTINCT FROM o.amount
        OR coalesce(i.notes, '') NOT LIKE '[AUTO_FROM_PAYMENT_ORDER]%'
        OR EXISTS (SELECT FROM public.supplier_invoices x WHERE x.payment_order_id = o.id AND x.id <> i.id)
        THEN 'راجع المستندات المرتبطة بأمر الدفع في المالية.'
      WHEN coalesce(i.amount_paid, 0) <> 0 OR coalesce(i.status, '') NOT IN ('unpaid', 'cancelled')
        OR EXISTS (SELECT FROM public.supplier_payment_allocations a WHERE a.payment_order_id = o.id OR a.supplier_invoice_id = i.id)
        OR EXISTS (SELECT FROM public.refund_balance_settlements f WHERE f.supplier_order_id = o.id)
        OR EXISTS (
          SELECT FROM public.supplier_payments p WHERE p.organization_id = o.organization_id
            AND p.booking_id = o.booking_id AND (p.supplier_id = o.supplier_id OR p.supplier_id IS NULL)
            AND p.amount > 0 AND coalesce(p.status, '') NOT IN ('cancelled', 'canceled', 'void', 'rejected', 'failed')
        )
        OR EXISTS (
          SELECT FROM public.journal_entries j WHERE j.organization_id = o.organization_id AND (
            (j.source_type = 'supplier_invoice' AND j.source_id = i.id AND j.is_locked)
            OR (j.source_type = 'booking_cost' AND j.booking_id = o.booking_id AND j.status = 'posted'
              AND upper(coalesce(j.currency, o.currency)) = upper(o.currency))
          )
        )
        THEN 'أمر الدفع عليه سداد أو تسوية أو قيد مقفل. راجع المالية قبل الإلغاء.'
    END
  FROM public.supplier_payment_orders o
  LEFT JOIN public.suppliers s ON s.id = o.supplier_id AND s.organization_id = o.organization_id
  LEFT JOIN LATERAL (
    SELECT x.id, x.supplier_id, x.booking_id, x.currency, x.amount, x.notes, x.amount_paid, x.status
    FROM public.supplier_invoices x WHERE x.payment_order_id = o.id AND x.organization_id = o.organization_id
    ORDER BY x.id LIMIT 1
  ) i ON true
  WHERE o.booking_id = _booking AND o.organization_id = _org AND o.status IS DISTINCT FROM 'cancelled' AND o.amount > 0
$$;
REVOKE ALL ON FUNCTION trip_amendment_private.supplier_cancellation_orders(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.close_unpaid_supplier_order(_order_id uuid, _confirmation text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_order public.supplier_payment_orders%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_invoice uuid;
  v_blocked text;
  v_confirmation text := nullif(btrim(_confirmation), '');
BEGIN
  SELECT b.* INTO v_booking
  FROM public.bookings b JOIN public.supplier_payment_orders o
    ON o.booking_id = b.id AND o.organization_id = b.organization_id
  WHERE o.id = _order_id;
  IF NOT FOUND OR NOT coalesce(public.can_process_org_payments(v_booking.organization_id), false)
    OR NOT EXISTS (
      SELECT FROM public._org_permission_state(v_booking.organization_id, auth.uid(), 'payments_process')
      WHERE granted AND data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لإقفال مستحق المورد لهذا الحجز.' USING ERRCODE = '42501';
  END IF;
  IF v_confirmation IS NULL OR char_length(v_confirmation) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'سجّل مرجع تأكيد المورد أن المبلغ غير مستحق.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = v_booking.id FOR UPDATE;
  SELECT * INTO v_order FROM public.supplier_payment_orders
  WHERE id = _order_id AND booking_id = v_booking.id AND organization_id = v_booking.organization_id FOR UPDATE;
  IF NOT FOUND OR coalesce(v_booking.is_demo, false)
    OR (coalesce(v_booking.status, '') NOT IN ('cancelled', 'canceled')
        AND coalesce(v_booking.workflow_stage::text, '') <> 'cancelled')
    OR v_order.pilgrimage_b2b_agreement_id IS NOT NULL THEN
    RAISE EXCEPTION 'الإقفال متاح لأمر دفع مرتبط بحجز ملغى خارج تسويات العمرة B2B.' USING ERRCODE = '22023';
  END IF;
  IF v_order.status = 'cancelled' THEN RETURN v_order.id; END IF;

  SELECT i.id INTO v_invoice FROM public.supplier_invoices i
  WHERE i.payment_order_id = v_order.id AND i.organization_id = v_order.organization_id
  ORDER BY i.id LIMIT 1 FOR UPDATE;
  SELECT o.blocked_reason INTO v_blocked
  FROM trip_amendment_private.supplier_cancellation_orders(v_booking.id, v_booking.organization_id) o
  WHERE o.id = _order_id;
  IF NOT FOUND OR v_blocked IS NOT NULL THEN
    RAISE EXCEPTION '%', coalesce(v_blocked, 'أمر الدفع يحتاج تسوية مالية قبل الإقفال.') USING ERRCODE = '22023';
  END IF;

  UPDATE public.supplier_payment_orders
  SET status = 'cancelled', approval_status = 'rejected', rejection_reason = v_confirmation,
      approved_by = auth.uid(), approved_at = now(), updated_at = now()
  WHERE id = v_order.id;
  IF NOT EXISTS (SELECT FROM public.supplier_invoices WHERE id = v_invoice AND status = 'cancelled')
    OR EXISTS (SELECT FROM public.journal_entries WHERE organization_id = v_order.organization_id
      AND source_type = 'supplier_invoice' AND source_id = v_invoice AND status = 'posted') THEN
    RAISE EXCEPTION 'تعذر تسوية فاتورة المورد والقيد المرتبط بها.' USING ERRCODE = '23514';
  END IF;
  RETURN v_order.id;
END;
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
  RETURN v_customer || jsonb_build_object('supplier_orders', v_orders, 'closed_supplier_orders', coalesce(v_closed, '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_booking_cancellation_with_supplier(
  _booking uuid, _reason text, _fees jsonb, _expected jsonb, _supplier_confirmations jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  v_prior public.booking_cancellation_settlements%ROWTYPE;
  v_current jsonb;
  v_customer jsonb;
  v_closed jsonb;
  v_order jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking FOR UPDATE;
  IF NOT coalesce(trip_amendment_private.can_settle_cancellation(b.organization_id), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لتسوية إلغاء هذا الحجز' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_supplier_confirmations) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'بيانات تأكيد إلغاء المورد غير صالحة.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_prior FROM public.booking_cancellation_settlements WHERE booking_id = b.id;
  IF FOUND THEN
    IF v_prior.reason IS DISTINCT FROM btrim(_reason) OR v_prior.fees IS DISTINCT FROM _fees
      OR _supplier_confirmations IS DISTINCT FROM coalesce((
        SELECT jsonb_object_agg(o->>'id', o->>'confirmation') FROM jsonb_array_elements(v_prior.supplier_result) o
      ), '{}'::jsonb) THEN
      RAISE EXCEPTION 'سبق اعتماد تسوية هذا الحجز';
    END IF;
    RETURN jsonb_build_object('invoices', v_prior.result, 'closed_supplier_orders', v_prior.supplier_result);
  END IF;

  -- A payment and a cancellation must serialize on the same order/invoice.
  PERFORM 1 FROM public.supplier_payment_orders o
  WHERE o.organization_id = b.organization_id AND o.booking_id = b.id ORDER BY o.id FOR UPDATE;
  PERFORM 1 FROM public.supplier_invoices i
  WHERE i.organization_id = b.organization_id AND i.booking_id = b.id AND i.payment_order_id IS NOT NULL
  ORDER BY i.id FOR UPDATE;

  v_current := public.get_booking_cancellation_with_supplier_preview(b.id);
  IF v_current->'supplier_orders' IS DISTINCT FROM _expected->'supplier_orders' THEN
    RAISE EXCEPTION 'أوامر دفع المورد اتغيرت. راجع المعاينة الجديدة قبل الاعتماد.';
  END IF;
  IF EXISTS (
    SELECT FROM jsonb_each(_supplier_confirmations) c
    WHERE jsonb_typeof(c.value) <> 'string' OR char_length(c.value #>> '{}') NOT BETWEEN 3 AND 500
      OR btrim(c.value #>> '{}') IS DISTINCT FROM c.value #>> '{}'
      OR NOT EXISTS (
        SELECT FROM jsonb_array_elements(v_current->'supplier_orders') o
        WHERE o->>'id' = c.key AND o->>'blocked_reason' IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'راجع أهلية أمر الدفع ومرجع تأكيد الإلغاء المجاني من المورد.' USING ERRCODE = '22023';
  END IF;

  v_customer := public.settle_booking_cancellation(
    b.id, _reason, _fees, _expected - 'supplier_orders' - 'closed_supplier_orders'
  );
  FOR v_order IN SELECT o FROM jsonb_array_elements(v_current->'supplier_orders') o
    WHERE _supplier_confirmations ? (o->>'id')
  LOOP
    PERFORM public.close_unpaid_supplier_order((v_order->>'id')::uuid, _supplier_confirmations->>(v_order->>'id'));
  END LOOP;
  SELECT coalesce(jsonb_agg((o - 'blocked_reason' - 'status') ||
    jsonb_build_object('confirmation', _supplier_confirmations->>(o->>'id')) ORDER BY o->>'id'), '[]'::jsonb)
  INTO v_closed FROM jsonb_array_elements(v_current->'supplier_orders') o WHERE _supplier_confirmations ? (o->>'id');
  IF jsonb_array_length(v_closed) > 0 THEN
    UPDATE public.booking_cancellation_settlements SET supplier_result = v_closed WHERE booking_id = b.id;
    UPDATE public.booking_timeline_events SET payload = payload || jsonb_build_object('closed_supplier_orders', v_closed)
    WHERE organization_id = b.organization_id AND booking_id = b.id AND kind = 'booking_cancellation_settled';
  END IF;
  RETURN jsonb_build_object('invoices', v_customer, 'closed_supplier_orders', v_closed);
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_cancellation_with_supplier_preview(uuid),
  public.settle_booking_cancellation_with_supplier(uuid, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_cancellation_with_supplier_preview(uuid),
  public.settle_booking_cancellation_with_supplier(uuid, text, jsonb, jsonb, jsonb) TO authenticated;
