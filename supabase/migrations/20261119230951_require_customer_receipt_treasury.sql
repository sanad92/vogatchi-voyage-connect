-- Post each customer receipt to a compatible treasury and balance its base-currency allocation.
CREATE OR REPLACE FUNCTION public.record_customer_payment(_invoice_id uuid, _amount numeric, _currency text DEFAULT 'EGP'::text, _exchange_rate numeric DEFAULT 1, _method text DEFAULT 'cash'::text, _treasury_account_id uuid DEFAULT NULL::uuid, _payment_date date DEFAULT CURRENT_DATE, _reference text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _client_ref text DEFAULT NULL::text, _booking_id uuid DEFAULT NULL::uuid, _customer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_org uuid;
  v_payment_id uuid;
  v_booking uuid := _booking_id;
  v_customer uuid := _customer_id;
  v_final numeric := 0;
  v_paid numeric := 0;
  v_allocate numeric := 0;
  v_allocate_base numeric;
  v_base numeric;
  v_treasury_currency text;
  v_treasury_kind text;
  v_booking_currency text;
  v_invoice_currency text;
  v_invoice_status text;
  v_method text := COALESCE(_method, 'cash');
  v_cash_code text;
  v_ar_code text;
  v_advance_code text;
BEGIN
  IF _amount IS NULL OR NOT (_amount > 0 AND _amount < 'Infinity'::numeric)
     OR NOT (COALESCE(_exchange_rate,0) > 0 AND _exchange_rate < 'Infinity'::numeric) THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;

  IF _invoice_id IS NOT NULL THEN
    SELECT organization_id,booking_id,customer_id,final_amount,total_paid_amount,currency,status
      INTO v_org,v_booking,v_customer,v_final,v_paid,v_invoice_currency,v_invoice_status
    FROM public.invoices WHERE id=_invoice_id FOR UPDATE;
    IF v_org IS NULL OR (_booking_id IS NOT NULL AND v_booking IS DISTINCT FROM _booking_id) THEN
      RAISE EXCEPTION 'Invoice not found for this booking';
    END IF;
  ELSIF v_booking IS NOT NULL THEN
    SELECT organization_id, customer_id, COALESCE(currency,'EGP') INTO v_org,v_customer,v_booking_currency
    FROM public.bookings WHERE id=v_booking;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Organization could not be resolved'; END IF;
  IF NOT COALESCE(public.can_process_org_payments(v_org), false) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF _client_ref IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('customer-payment:' || v_org::text || ':' || _client_ref, 0));
    SELECT id INTO v_payment_id FROM public.customer_payments
    WHERE organization_id=v_org AND client_ref=_client_ref;
    IF v_payment_id IS NOT NULL THEN RETURN v_payment_id; END IF;
  END IF;

  IF _amount <> ROUND(_amount, 2) OR _exchange_rate <> ROUND(_exchange_rate, 6) THEN
    RAISE EXCEPTION 'Payment amount and exchange rate exceed supported precision';
  END IF;

  IF _invoice_id IS NOT NULL THEN
    IF COALESCE(v_invoice_currency, 'EGP') IS DISTINCT FROM _currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency';
    END IF;
    v_allocate := LEAST(_amount, GREATEST(COALESCE(v_final, 0) - COALESCE(v_paid, 0)
      - trip_amendment_private.invoice_credit(_invoice_id), 0));
    IF LOWER(COALESCE(v_invoice_status, 'draft')) IN ('draft', 'void', 'cancelled', 'canceled', 'paid')
       OR v_allocate <= 0 THEN
      RAISE EXCEPTION 'Select an open invoice or record an explicit customer advance';
    END IF;
  ELSIF v_booking_currency IS DISTINCT FROM _currency THEN
    RAISE EXCEPTION 'Payment currency must match booking currency';
  END IF;

  IF _treasury_account_id IS NULL THEN RAISE EXCEPTION 'A treasury account is required'; END IF;
  SELECT currency, treasury_kind INTO v_treasury_currency, v_treasury_kind FROM public.bank_accounts
  WHERE id = _treasury_account_id AND organization_id = v_org AND is_active
  FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Treasury account not found'; END IF;
  IF v_treasury_currency IS DISTINCT FROM _currency THEN
    RAISE EXCEPTION 'Treasury currency must match payment currency';
  END IF;
  IF NOT COALESCE(CASE v_method
    WHEN 'cash' THEN v_treasury_kind = 'cash'
    WHEN 'bank_transfer' THEN v_treasury_kind = 'bank'
    WHEN 'cheque' THEN v_treasury_kind = 'bank'
    WHEN 'card' THEN v_treasury_kind IN ('bank', 'card', 'gateway')
    WHEN 'wallet' THEN v_treasury_kind IN ('bank', 'wallet', 'gateway')
    WHEN 'other' THEN v_treasury_kind IN ('bank', 'card', 'wallet', 'gateway')
    ELSE false
  END, false) THEN
    RAISE EXCEPTION 'Treasury account does not match payment method';
  END IF;

  v_cash_code := public._require_route_code(
    v_org,
    CASE WHEN v_treasury_kind = 'cash' THEN 'cash' ELSE 'bank' END
  );
  IF v_allocate>0 THEN
    v_ar_code := public._require_route_code(v_org,'accounts_receivable');
  END IF;
  IF _amount-v_allocate>0 THEN
    v_advance_code := public._require_route_code(v_org,'refunds_payable');
  END IF;

  v_base := round(_amount*_exchange_rate,2);
  v_allocate_base := round(v_allocate*_exchange_rate,2);
  INSERT INTO public.customer_payments (
    organization_id,booking_id,customer_id,invoice_id,treasury_account_id,
    amount,currency,exchange_rate,amount_base,payment_method,reference_number,
    payment_date,notes,status,client_ref,created_by
  ) VALUES (
    v_org,v_booking,v_customer,_invoice_id,_treasury_account_id,
    _amount,_currency,_exchange_rate,v_base,v_method,_reference,
    _payment_date,_notes,'pending',_client_ref,auth.uid()
  ) RETURNING id INTO v_payment_id;

  IF _invoice_id IS NOT NULL AND v_allocate>0 THEN
    INSERT INTO public.customer_payment_allocations(
      organization_id,payment_id,invoice_id,amount,amount_base
    ) VALUES (v_org,v_payment_id,_invoice_id,v_allocate,v_allocate_base);
  END IF;

  -- Treasury balance is maintained solely by trg_bank_balance_update.
  INSERT INTO public.bank_account_transactions(
    bank_account_id,transaction_type,amount,description,transaction_date,
    reference_number,related_invoice_id,organization_id,created_by,currency,source_type,source_id
  ) VALUES (
    _treasury_account_id,'deposit',_amount,COALESCE(_notes,'Customer payment'),
    _payment_date,_reference,_invoice_id,v_org,auth.uid(),_currency,'customer_payment',v_payment_id
  );

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
      'credit',v_allocate,_currency,_exchange_rate,v_allocate_base,'Accounts receivable reduction',auth.uid());
  END IF;
  IF _amount-v_allocate>0 THEN
    INSERT INTO public.finance_transactions(
      organization_id,booking_id,reference_type,reference_id,account_code,
      party_type,party_id,direction,amount,currency,exchange_rate,amount_base,memo,created_by
    ) VALUES (v_org,v_booking,'customer_payment',v_payment_id,v_advance_code,'customer',v_customer,
      'credit',_amount-v_allocate,_currency,_exchange_rate,v_base-v_allocate_base,'Customer advance',auth.uid());
  END IF;

  UPDATE public.customer_payments SET status='completed' WHERE id=v_payment_id;
  RETURN v_payment_id;
END;
$function$;
