CREATE OR REPLACE FUNCTION public._require_route_code(_org_id uuid, _routing_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := public.get_org_account_route_code(_org_id, _routing_key);
  IF v_code IS NULL OR btrim(v_code) = '' THEN
    RAISE EXCEPTION 'Account routing is not configured for "%". Configure it in Account Routing before posting.', _routing_key
      USING ERRCODE = '23514';
  END IF;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public._require_route_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._require_route_code(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_customer_payment(_invoice_id uuid, _amount numeric, _currency text DEFAULT 'EGP'::text, _exchange_rate numeric DEFAULT 1, _method text DEFAULT 'cash'::text, _treasury_account_id uuid DEFAULT NULL::uuid, _payment_date date DEFAULT CURRENT_DATE, _reference text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _client_ref text DEFAULT NULL::text, _booking_id uuid DEFAULT NULL::uuid, _customer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_payment_id uuid;
  v_booking uuid := _booking_id;
  v_customer uuid := _customer_id;
  v_final numeric := 0;
  v_paid numeric := 0;
  v_allocate numeric := 0;
  v_base numeric;
  v_treasury_currency text;
  v_cash_code text;
  v_ar_code text;
  v_advance_code text;
BEGIN
  IF _amount IS NULL OR _amount<=0 OR COALESCE(_exchange_rate,0)<=0 THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;

  IF _invoice_id IS NOT NULL THEN
    SELECT organization_id,booking_id,customer_id,final_amount,total_paid_amount
      INTO v_org,v_booking,v_customer,v_final,v_paid
    FROM public.invoices WHERE id=_invoice_id FOR UPDATE;
    IF v_org IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF COALESCE((SELECT currency FROM public.invoices WHERE id=_invoice_id),'EGP')<>_currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency';
    END IF;
    v_allocate := LEAST(_amount,GREATEST(COALESCE(v_final,0)-COALESCE(v_paid,0),0));
  ELSIF v_booking IS NOT NULL THEN
    SELECT organization_id,customer_id INTO v_org,v_customer
    FROM public.bookings WHERE id=v_booking;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Organization could not be resolved'; END IF;
  IF NOT public.can_process_org_payments(v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF _treasury_account_id IS NOT NULL THEN
    SELECT currency INTO v_treasury_currency FROM public.bank_accounts
    WHERE id=_treasury_account_id AND organization_id=v_org AND is_active;
    IF v_treasury_currency IS NULL THEN RAISE EXCEPTION 'Treasury account not found'; END IF;
    IF v_treasury_currency<>_currency THEN RAISE EXCEPTION 'Treasury currency must match payment currency'; END IF;
  ELSIF COALESCE(_method,'cash')<>'cash' THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash payments';
  END IF;

  IF _client_ref IS NOT NULL THEN
    SELECT id INTO v_payment_id FROM public.customer_payments
    WHERE organization_id=v_org AND client_ref=_client_ref;
    IF v_payment_id IS NOT NULL THEN RETURN v_payment_id; END IF;
  END IF;

  v_cash_code := public._require_route_code(
    v_org,
    CASE WHEN _method='cash' AND _treasury_account_id IS NULL THEN 'cash' ELSE 'bank' END
  );
  IF v_allocate>0 THEN
    v_ar_code := public._require_route_code(v_org,'accounts_receivable');
  END IF;
  IF _amount-v_allocate>0 THEN
    v_advance_code := public._require_route_code(v_org,'refunds_payable');
  END IF;

  v_base := round(_amount*_exchange_rate,2);
  INSERT INTO public.customer_payments (
    organization_id,booking_id,customer_id,invoice_id,treasury_account_id,
    amount,currency,exchange_rate,amount_base,payment_method,reference_number,
    payment_date,notes,status,client_ref,created_by
  ) VALUES (
    v_org,v_booking,v_customer,_invoice_id,_treasury_account_id,
    _amount,_currency,_exchange_rate,v_base,_method,_reference,
    _payment_date,_notes,'pending',_client_ref,auth.uid()
  ) RETURNING id INTO v_payment_id;

  IF _invoice_id IS NOT NULL AND v_allocate>0 THEN
    INSERT INTO public.customer_payment_allocations(
      organization_id,payment_id,invoice_id,amount,amount_base
    ) VALUES (v_org,v_payment_id,_invoice_id,v_allocate,round(v_allocate*_exchange_rate,2));
    UPDATE public.invoices
    SET total_paid_amount=LEAST(final_amount,COALESCE(total_paid_amount,0)+v_allocate)
    WHERE id=_invoice_id;
  END IF;

  IF _treasury_account_id IS NOT NULL THEN
    UPDATE public.bank_accounts
    SET current_balance=COALESCE(current_balance,0)+_amount,updated_at=now()
    WHERE id=_treasury_account_id;
    INSERT INTO public.bank_account_transactions(
      bank_account_id,transaction_type,amount,description,transaction_date,
      reference_number,related_invoice_id,organization_id,created_by
    ) VALUES (
      _treasury_account_id,'deposit',_amount,COALESCE(_notes,'Customer payment'),
      _payment_date,_reference,_invoice_id,v_org,auth.uid()
    );
  END IF;

  INSERT INTO public.finance_transactions(
    organization_id,booking_id,reference_type,reference_id,account_code,
    party_type,party_id,direction,amount,currency,exchange_rate,amount_base,memo,created_by
  ) VALUES
    (v_org,v_booking,'customer_payment',v_payment_id,v_cash_code,
      'treasury',_treasury_account_id,'debit',_amount,_currency,_exchange_rate,v_base,'Customer payment received',auth.uid());
  IF v_allocate>0 THEN
    INSERT INTO public.finance_transactions(
      organization_id,booking_id,reference_type,reference_id,account_code,
      party_type,party_id,direction,amount,currency,exchange_rate,amount_base,memo,created_by
    ) VALUES (v_org,v_booking,'customer_payment',v_payment_id,v_ar_code,'customer',v_customer,
      'credit',v_allocate,_currency,_exchange_rate,round(v_allocate*_exchange_rate,2),'Accounts receivable reduction',auth.uid());
  END IF;
  IF _amount-v_allocate>0 THEN
    INSERT INTO public.finance_transactions(
      organization_id,booking_id,reference_type,reference_id,account_code,
      party_type,party_id,direction,amount,currency,exchange_rate,amount_base,memo,created_by
    ) VALUES (v_org,v_booking,'customer_payment',v_payment_id,v_advance_code,'customer',v_customer,
      'credit',_amount-v_allocate,_currency,_exchange_rate,round((_amount-v_allocate)*_exchange_rate,2),'Customer advance',auth.uid());
  END IF;

  UPDATE public.customer_payments SET status='completed' WHERE id=v_payment_id;
  RETURN v_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(_po_id uuid, _amount numeric, _currency text DEFAULT 'EGP'::text, _exchange_rate numeric DEFAULT 1, _method text DEFAULT 'bank_transfer'::text, _treasury_account_id uuid DEFAULT NULL::uuid, _payment_date date DEFAULT CURRENT_DATE, _reference text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_po public.supplier_payment_orders%ROWTYPE;
  v_payment_id uuid;
  v_allocated numeric;
  v_remaining numeric;
  v_base numeric;
  v_treasury_currency text;
  v_cash_code text;
  v_ap_code text;
BEGIN
  IF _amount IS NULL OR _amount<=0 OR COALESCE(_exchange_rate,0)<=0 THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;
  SELECT * INTO v_po FROM public.supplier_payment_orders WHERE id=_po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order not found'; END IF;
  IF NOT public.can_process_org_payments(v_po.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_po.status = 'cancelled' THEN RAISE EXCEPTION 'Payment order is cancelled'; END IF;
  IF v_po.approval_status<>'approved' THEN RAISE EXCEPTION 'Payment order must be approved'; END IF;
  IF v_po.currency<>_currency THEN RAISE EXCEPTION 'Payment currency must match payment order currency'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_allocated
  FROM public.supplier_payment_allocations WHERE payment_order_id=_po_id;
  v_remaining := GREATEST(v_po.amount-v_allocated,0);
  IF _amount>v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds the remaining payment-order balance (%)',v_remaining;
  END IF;

  IF _treasury_account_id IS NOT NULL THEN
    SELECT currency INTO v_treasury_currency FROM public.bank_accounts
    WHERE id=_treasury_account_id AND organization_id=v_po.organization_id AND is_active;
    IF v_treasury_currency IS NULL THEN RAISE EXCEPTION 'Treasury account not found'; END IF;
    IF v_treasury_currency<>_currency THEN RAISE EXCEPTION 'Treasury currency must match payment currency'; END IF;
  ELSIF COALESCE(_method,'bank_transfer')<>'cash' THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash supplier payments';
  END IF;

  v_cash_code := public._require_route_code(
    v_po.organization_id,
    CASE WHEN _method='cash' AND _treasury_account_id IS NULL THEN 'cash' ELSE 'bank' END
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

  IF _treasury_account_id IS NOT NULL THEN
    UPDATE public.bank_accounts
    SET current_balance=COALESCE(current_balance,0)-_amount,updated_at=now()
    WHERE id=_treasury_account_id;
    INSERT INTO public.bank_account_transactions(
      bank_account_id,transaction_type,amount,description,transaction_date,
      reference_number,related_payment_order_id,organization_id,created_by
    ) VALUES (
      _treasury_account_id,'withdrawal',_amount,COALESCE(_notes,'Supplier payment'),
      _payment_date,_reference,_po_id,v_po.organization_id,auth.uid()
    );
  END IF;

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

CREATE OR REPLACE FUNCTION public.pay_refund_request(_refund_id uuid, _treasury_account_id uuid, _reference text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_r public.refund_requests%ROWTYPE;
  v_treasury_kind text;
  v_treasury_currency text;
  v_current_balance numeric;
  v_cash_code text;
  v_advance_code text;
  v_sales_return_code text;
BEGIN
  SELECT * INTO v_r
  FROM public.refund_requests
  WHERE id=_refund_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
  IF v_r.status<>'approved' THEN RAISE EXCEPTION 'Refund is not approved'; END IF;
  IF NOT public._can_manage_refunds(v_r.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT treasury_kind,upper(COALESCE(currency,'EGP')),COALESCE(current_balance,0)
    INTO v_treasury_kind,v_treasury_currency,v_current_balance
  FROM public.bank_accounts
  WHERE id=_treasury_account_id
    AND organization_id=v_r.organization_id
    AND is_active
  FOR UPDATE;
  IF v_treasury_kind IS NULL THEN RAISE EXCEPTION 'Treasury account not found'; END IF;
  IF v_treasury_currency<>v_r.currency THEN
    RAISE EXCEPTION 'Treasury currency must match refund currency';
  END IF;
  IF v_treasury_kind='cash' AND v_current_balance<v_r.amount THEN
    RAISE EXCEPTION 'Cash treasury has insufficient balance';
  END IF;

  v_cash_code := public._require_route_code(
    v_r.organization_id,
    CASE WHEN v_treasury_kind='cash' THEN 'cash' ELSE 'bank' END
  );
  IF COALESCE(v_r.advance_component,0)>0 THEN
    v_advance_code := public._require_route_code(v_r.organization_id,'refunds_payable');
  END IF;
  IF COALESCE(v_r.sales_return_component,0)>0 THEN
    v_sales_return_code := public._require_route_code(v_r.organization_id,'sales_returns');
  END IF;

  UPDATE public.refund_requests
  SET status='paid',paid_at=now(),treasury_account_id=_treasury_account_id,
      updated_at=now()
  WHERE id=_refund_id;

  UPDATE public.bank_accounts
  SET current_balance=COALESCE(current_balance,0)-v_r.amount,updated_at=now()
  WHERE id=_treasury_account_id;

  INSERT INTO public.bank_account_transactions (
    bank_account_id,transaction_type,amount,description,transaction_date,
    reference_number,related_invoice_id,organization_id,created_by
  ) VALUES (
    _treasury_account_id,'refund',v_r.amount,'Customer refund',CURRENT_DATE,
    _reference,v_r.invoice_id,v_r.organization_id,auth.uid()
  );

  IF v_r.advance_component>0 THEN
    INSERT INTO public.finance_transactions (
      organization_id,booking_id,reference_type,reference_id,account_code,
      party_type,party_id,direction,amount,currency,exchange_rate,amount_base,
      memo,created_by
    ) VALUES (
      v_r.organization_id,v_r.booking_id,'refund',v_r.id,v_advance_code,
      'customer',v_r.customer_id,'debit',v_r.advance_component,v_r.currency,
      v_r.exchange_rate,round(v_r.advance_component*v_r.exchange_rate,2),
      'Customer advance refunded',auth.uid()
    );
  END IF;
  IF v_r.sales_return_component>0 THEN
    INSERT INTO public.finance_transactions (
      organization_id,booking_id,reference_type,reference_id,account_code,
      party_type,party_id,direction,amount,currency,exchange_rate,amount_base,
      memo,created_by
    ) VALUES (
      v_r.organization_id,v_r.booking_id,'refund',v_r.id,v_sales_return_code,
      'customer',v_r.customer_id,'debit',v_r.sales_return_component,v_r.currency,
      v_r.exchange_rate,round(v_r.sales_return_component*v_r.exchange_rate,2),
      'Sales return refunded',auth.uid()
    );
  END IF;
  INSERT INTO public.finance_transactions (
    organization_id,booking_id,reference_type,reference_id,account_code,
    party_type,party_id,direction,amount,currency,exchange_rate,amount_base,
    memo,created_by
  ) VALUES (
    v_r.organization_id,v_r.booking_id,'refund',v_r.id,v_cash_code,
    'treasury',_treasury_account_id,'credit',v_r.amount,v_r.currency,
    v_r.exchange_rate,v_r.amount_base,'Refund disbursed',auth.uid()
  );

  IF v_r.booking_id IS NOT NULL THEN
    INSERT INTO public.booking_timeline_events (
      organization_id,booking_id,kind,actor_id,summary,payload
    ) VALUES (
      v_r.organization_id,v_r.booking_id,'refund_paid',auth.uid(),
      'تم صرف الاسترداد: '||v_r.amount||' '||v_r.currency,
      jsonb_build_object('refund_id',v_r.id,'reference',_reference)
    );
  END IF;
END;
$function$;