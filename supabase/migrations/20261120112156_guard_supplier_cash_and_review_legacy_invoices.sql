-- Require treasury evidence for new supplier payouts while retaining existing retry behavior.
CREATE OR REPLACE FUNCTION public.record_supplier_payment(_po_id uuid, _amount numeric, _currency text DEFAULT 'EGP'::text, _exchange_rate numeric DEFAULT 1, _method text DEFAULT 'bank_transfer'::text, _treasury_account_id uuid DEFAULT NULL::uuid, _payment_date date DEFAULT CURRENT_DATE, _reference text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_po public.supplier_payment_orders%ROWTYPE;
  v_payment_id uuid;
  v_allocated numeric;
  v_remaining numeric;
  v_base numeric;
  v_treasury_currency text;
  v_treasury_kind text;
  v_cash_code text;
  v_ap_code text;
BEGIN
  IF _amount IS NULL OR _amount<=0 OR COALESCE(_exchange_rate,0)<=0 THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;
  SELECT * INTO v_po FROM public.supplier_payment_orders WHERE id=_po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order not found'; END IF;
  IF NOT coalesce(public.can_process_org_payments(v_po.organization_id), false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF to_jsonb(v_po)->>'pilgrimage_b2b_agreement_id' IS NOT NULL THEN
    IF NOT coalesce(public._has_pilgrimage_finance_permission(v_po.organization_id, 'payments_process'), false) THEN
      RAISE EXCEPTION 'pilgrimage_supplier_payment_denied' USING ERRCODE = '42501';
    END IF;
    IF _exchange_rate IS DISTINCT FROM 1 OR _amount <> round(_amount, 2)
      OR _currency IS DISTINCT FROM v_po.currency OR _method IS DISTINCT FROM 'bank_transfer'
      OR nullif(btrim(_reference), '') IS NULL OR char_length(btrim(_reference)) > 120
      OR _payment_date IS NULL OR _payment_date NOT BETWEEN v_po.created_at::date AND current_date
      OR NOT EXISTS (SELECT 1 FROM public.bank_accounts b WHERE b.id = _treasury_account_id
        AND b.organization_id = v_po.organization_id AND b.is_active
        AND b.currency = v_po.currency AND b.treasury_kind = 'bank')
    THEN RAISE EXCEPTION 'invalid_pilgrimage_supplier_payment' USING ERRCODE = '22023'; END IF;
    SELECT p.id INTO v_payment_id FROM public.supplier_payments p
    JOIN public.supplier_payment_allocations a ON a.supplier_payment_id = p.id
    WHERE a.payment_order_id = v_po.id AND p.organization_id = v_po.organization_id
      AND lower(btrim(p.reference_number)) = lower(btrim(_reference));
    IF FOUND THEN
      IF EXISTS (SELECT 1 FROM public.supplier_payments p WHERE p.id = v_payment_id
        AND p.amount = _amount AND p.payment_date = _payment_date
        AND p.treasury_account_id = _treasury_account_id AND p.status IN ('paid','completed'))
      THEN RETURN v_payment_id; END IF;
      RAISE EXCEPTION 'pilgrimage_supplier_payment_reference_already_used' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_po.status = 'cancelled' THEN RAISE EXCEPTION 'Payment order is cancelled'; END IF;
  IF v_po.approval_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Payment order must be approved'; END IF;
  IF v_po.currency IS DISTINCT FROM _currency THEN RAISE EXCEPTION 'Payment currency must match payment order currency'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_allocated
  FROM public.supplier_payment_allocations WHERE payment_order_id=_po_id;
  v_allocated := v_allocated + (SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements
        WHERE supplier_order_id = _po_id);
  v_remaining := GREATEST(v_po.amount-v_allocated,0);
  IF _amount>v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds the remaining payment-order balance (%)',v_remaining;
  END IF;

  IF _treasury_account_id IS NULL THEN
    RAISE EXCEPTION 'اختر حساب الخزنة لصرف المورد';
  END IF;
  SELECT currency, treasury_kind INTO v_treasury_currency, v_treasury_kind
  FROM public.bank_accounts
  WHERE id = _treasury_account_id AND organization_id = v_po.organization_id AND is_active
  FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'حساب الخزنة غير متاح لهذه المؤسسة'; END IF;
  IF v_treasury_currency IS DISTINCT FROM _currency THEN
    RAISE EXCEPTION 'عملة حساب الخزنة لازم تطابق عملة الصرف';
  END IF;
  IF (COALESCE(_method, 'bank_transfer') = 'cash') <> COALESCE(v_treasury_kind = 'cash', false) THEN
    RAISE EXCEPTION 'حساب الخزنة غير مناسب لطريقة الصرف';
  END IF;

  v_cash_code := public._require_route_code(
    v_po.organization_id,
    CASE WHEN v_treasury_kind = 'cash' THEN 'cash' ELSE 'bank' END
  );
  v_ap_code := public._require_route_code(v_po.organization_id,'accounts_payable');

  v_base:=round(_amount*_exchange_rate,2);
  INSERT INTO public.supplier_payments(
    supplier_id,amount,currency,payment_date,payment_method,reference_number,
    booking_id,notes,status,created_by,paid_date,amount_in_egp,exchange_rate,
    organization_id,treasury_account_id
  ) VALUES (
    v_po.supplier_id,_amount,_currency,_payment_date,_method,_reference,
    v_po.booking_id,_notes,'pending',auth.uid(),_payment_date,v_base,_exchange_rate,
    v_po.organization_id,_treasury_account_id
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.supplier_payment_allocations(
    organization_id,supplier_payment_id,payment_order_id,amount,amount_base
  ) VALUES (v_po.organization_id,v_payment_id,_po_id,_amount,v_base);

  UPDATE public.supplier_payment_orders
  SET status=CASE WHEN _amount>=v_remaining THEN 'paid' ELSE 'partially_paid' END,
      updated_at=now()
  WHERE id=_po_id;

  -- Treasury balance is maintained solely by trg_bank_balance_update.
  INSERT INTO public.bank_account_transactions (
    bank_account_id, transaction_type, amount, description, transaction_date,
    reference_number, related_payment_order_id, organization_id, created_by
  ) VALUES (
    _treasury_account_id, 'withdrawal', _amount, COALESCE(_notes, 'Supplier payment'),
    _payment_date, _reference, _po_id, v_po.organization_id, auth.uid()
  );

  INSERT INTO public.finance_transactions(
    organization_id,booking_id,reference_type,reference_id,account_code,
    party_type,party_id,direction,amount,currency,exchange_rate,amount_base,memo,created_by
  ) VALUES
    (v_po.organization_id,v_po.booking_id,'supplier_payment',v_payment_id,v_ap_code,'supplier',v_po.supplier_id,
      'debit',_amount,_currency,_exchange_rate,v_base,'Accounts payable reduction',auth.uid()),
    (v_po.organization_id,v_po.booking_id,'supplier_payment',v_payment_id,v_cash_code,
      'treasury',_treasury_account_id,'credit',_amount,_currency,_exchange_rate,v_base,'Supplier cash disbursement',auth.uid());

  UPDATE public.supplier_payments SET status='paid' WHERE id=v_payment_id;
  RETURN v_payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_legacy_paid_invoice_review(_org uuid, _offset integer DEFAULT 0)
RETURNS TABLE (
  payment_id uuid,
  payment_date date,
  amount numeric,
  currency text,
  reference_number text,
  account_name text,
  booking_id uuid,
  booking_number text,
  invoice_id uuid,
  invoice_number text,
  reason text
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _org), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_org, auth.uid(), 'financial_view') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_org, auth.uid(), 'invoices_view') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'treasury_invoice_review_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT NULL::uuid, i.issued_date, i.total_paid_amount::numeric, i.currency::text,
    i.invoice_number::text, NULL::text, b.id, b.booking_number::text, i.id, i.invoice_number::text,
    'legacy_paid_invoice_evidence_missing'::text
  FROM public.invoices i
  LEFT JOIN public.bookings b ON b.id = i.booking_id AND b.organization_id = i.organization_id
  WHERE i.organization_id = _org AND i.is_demo IS NOT TRUE
    AND i.notes = 'تسوية تلقائية - مدفوعة'
    AND (i.status = 'paid' OR i.payment_status = 'paid') AND i.total_paid_amount > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_payments p
      WHERE p.organization_id = i.organization_id AND p.status = 'completed'
        AND p.is_demo IS NOT TRUE AND p.amount > 0
        AND (p.invoice_id = i.id OR EXISTS (
          SELECT 1 FROM public.customer_payment_allocations a
          WHERE a.organization_id = i.organization_id AND a.payment_id = p.id AND a.invoice_id = i.id
            AND a.amount > 0
        ))
    )
  ORDER BY i.issued_date DESC NULLS LAST, i.id DESC
  LIMIT 51 OFFSET greatest(coalesce(_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_legacy_paid_invoice_review(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_legacy_paid_invoice_review(uuid, integer) TO authenticated;
