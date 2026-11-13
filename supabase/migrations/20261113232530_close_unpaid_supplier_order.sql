CREATE OR REPLACE FUNCTION public.close_unpaid_supplier_order(_order_id uuid, _confirmation text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_order public.supplier_payment_orders%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_invoice public.supplier_invoices%ROWTYPE;
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
  IF v_order.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'أمر الدفع يحتاج تسوية مالية قبل الإقفال.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invoice FROM public.supplier_invoices
  WHERE payment_order_id = v_order.id AND organization_id = v_order.organization_id AND booking_id = v_booking.id
  FOR UPDATE;
  IF NOT FOUND OR coalesce(v_invoice.notes, '') NOT LIKE '[AUTO_FROM_PAYMENT_ORDER]%'
    OR EXISTS (SELECT FROM public.supplier_invoices WHERE payment_order_id = v_order.id AND id <> v_invoice.id) THEN
    RAISE EXCEPTION 'راجع المستندات المرتبطة بأمر الدفع في المالية.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(v_invoice.amount_paid, 0) <> 0
    OR EXISTS (SELECT FROM public.supplier_payment_allocations WHERE payment_order_id = v_order.id OR supplier_invoice_id = v_invoice.id)
    OR EXISTS (SELECT FROM public.refund_balance_settlements WHERE supplier_order_id = v_order.id)
    OR EXISTS (SELECT FROM public.journal_entries WHERE organization_id = v_order.organization_id AND is_locked
      AND ((source_type = 'supplier_invoice' AND source_id = v_invoice.id)
        OR (source_type = 'booking_cost' AND source_id = v_booking.id))) THEN
    RAISE EXCEPTION 'أمر الدفع عليه سداد أو تسوية أو قيد مقفل. راجع المالية قبل الإلغاء.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.supplier_payment_orders
  SET status = 'cancelled', approval_status = 'rejected', rejection_reason = v_confirmation,
      approved_by = auth.uid(), approved_at = now(), updated_at = now()
  WHERE id = v_order.id;
  IF NOT EXISTS (SELECT FROM public.supplier_invoices WHERE id = v_invoice.id AND status = 'cancelled') THEN
    RAISE EXCEPTION 'تعذر تحديث فاتورة المورد المرتبطة.' USING ERRCODE = '23514';
  END IF;
  RETURN v_order.id;
END;
$$;
REVOKE ALL ON FUNCTION public.close_unpaid_supplier_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_unpaid_supplier_order(uuid, text) TO authenticated;
