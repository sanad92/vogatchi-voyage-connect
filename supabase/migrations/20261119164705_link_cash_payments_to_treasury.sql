-- Use the selected treasury kind for the receipt and link the movement to its payment.
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
  v_treasury_kind text;
  v_booking_currency text;
  v_cash_code text;
  v_ar_code text;
  v_advance_code text;
BEGIN
  IF _amount IS NULL OR NOT (_amount > 0 AND _amount < 'Infinity'::numeric)
     OR NOT (COALESCE(_exchange_rate,0) > 0 AND _exchange_rate < 'Infinity'::numeric) THEN
    RAISE EXCEPTION 'Payment amount and exchange rate must be positive';
  END IF;

  IF _invoice_id IS NOT NULL THEN
    SELECT organization_id,booking_id,customer_id,final_amount,total_paid_amount
      INTO v_org,v_booking,v_customer,v_final,v_paid
    FROM public.invoices WHERE id=_invoice_id FOR UPDATE;
    IF v_org IS NULL OR (_booking_id IS NOT NULL AND v_booking IS DISTINCT FROM _booking_id) THEN
      RAISE EXCEPTION 'Invoice not found for this booking';
    END IF;
    IF COALESCE((SELECT currency FROM public.invoices WHERE id=_invoice_id),'EGP')<>_currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency';
    END IF;
    v_allocate := LEAST(_amount,GREATEST(COALESCE(v_final,0)-COALESCE(v_paid,0)-trip_amendment_private.invoice_credit(_invoice_id),0));
  ELSIF v_booking IS NOT NULL THEN
    SELECT organization_id, customer_id, COALESCE(currency,'EGP') INTO v_org,v_customer,v_booking_currency
    FROM public.bookings WHERE id=v_booking;
    IF v_org IS NOT NULL AND v_booking_currency IS DISTINCT FROM _currency THEN
      RAISE EXCEPTION 'Payment currency must match booking currency';
    END IF;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Organization could not be resolved'; END IF;
  IF NOT COALESCE(public.can_process_org_payments(v_org), false) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF _treasury_account_id IS NOT NULL THEN
    SELECT currency, treasury_kind INTO v_treasury_currency, v_treasury_kind FROM public.bank_accounts
    WHERE id=_treasury_account_id AND organization_id=v_org AND is_active;
    IF v_treasury_currency IS NULL THEN RAISE EXCEPTION 'Treasury account not found'; END IF;
    IF v_treasury_currency<>_currency THEN RAISE EXCEPTION 'Treasury currency must match payment currency'; END IF;
  ELSIF COALESCE(_method,'cash')<>'cash' THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash payments';
  END IF;

  IF _client_ref IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('customer-payment:' || v_org::text || ':' || _client_ref, 0));
    SELECT id INTO v_payment_id FROM public.customer_payments
    WHERE organization_id=v_org AND client_ref=_client_ref;
    IF v_payment_id IS NOT NULL THEN RETURN v_payment_id; END IF;
  END IF;

  v_cash_code := public._require_route_code(
    v_org,
    CASE WHEN COALESCE(v_treasury_kind, _method, 'cash') = 'cash' THEN 'cash' ELSE 'bank' END
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
    NULL; -- The completed-payment trigger refreshes the invoice.
  END IF;

  IF _treasury_account_id IS NOT NULL THEN
    -- Treasury balance is maintained solely by trg_bank_balance_update
    INSERT INTO public.bank_account_transactions(
      bank_account_id,transaction_type,amount,description,transaction_date,
      reference_number,related_invoice_id,organization_id,created_by,currency,source_type,source_id
    ) VALUES (
      _treasury_account_id,'deposit',_amount,COALESCE(_notes,'Customer payment'),
      _payment_date,_reference,_invoice_id,v_org,auth.uid(),_currency,'customer_payment',v_payment_id
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

-- Retain a cash expense's selected account, and post its withdrawal in the same transaction as the journal.
CREATE OR REPLACE FUNCTION public.normalize_expense_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bank_currency text;
  v_treasury_kind text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND (
    OLD.status, OLD.organization_id, OLD.amount, OLD.currency, OLD.transaction_date,
    OLD.payment_date, OLD.payment_method, OLD.bank_account_id
  ) IS DISTINCT FROM (
    NEW.status, NEW.organization_id, NEW.amount, NEW.currency, NEW.transaction_date,
    NEW.payment_date, NEW.payment_method, NEW.bank_account_id
  ) THEN
    RAISE EXCEPTION 'A paid expense requires an explicit reversal';
  END IF;
  NEW.amount := COALESCE(NEW.amount, 0);
  NEW.currency := upper(COALESCE(NULLIF(NEW.currency, ''), 'EGP'));
  IF NOT (NEW.amount > 0 AND NEW.amount < 'Infinity'::numeric) THEN
    RAISE EXCEPTION 'Expense amount must be positive';
  END IF;
  IF NEW.status = 'paid' THEN
    IF COALESCE(NEW.payment_method, '') = '' THEN
      RAISE EXCEPTION 'Payment method is required before paying expense';
    END IF;
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid' THEN
      IF auth.uid() IS NOT NULL AND (
        NOT COALESCE(public.user_belongs_to_org(auth.uid(), NEW.organization_id), false)
        OR NOT COALESCE(public.can_org_write(NEW.organization_id), false)
        OR NOT COALESCE(public.has_org_permission(NEW.organization_id, 'expenses_approve'), false)
      ) THEN
        RAISE EXCEPTION 'Not authorized to pay this expense' USING ERRCODE = '42501';
      END IF;
      IF NEW.bank_account_id IS NULL THEN
        RAISE EXCEPTION 'Select a treasury account before paying the expense';
      END IF;
    END IF;
    IF NEW.bank_account_id IS NOT NULL THEN
      SELECT COALESCE(currency, 'EGP'), treasury_kind INTO v_bank_currency, v_treasury_kind
      FROM public.bank_accounts
      WHERE id = NEW.bank_account_id AND organization_id = NEW.organization_id AND is_active;
      IF NOT FOUND OR v_bank_currency IS DISTINCT FROM NEW.currency THEN
        RAISE EXCEPTION 'Expense treasury is missing, inactive, or uses another currency';
      END IF;
      IF NEW.payment_method = 'cash' AND v_treasury_kind IS DISTINCT FROM 'cash' THEN
        RAISE EXCEPTION 'Select a cash account for a cash expense';
      END IF;
    END IF;
    NEW.payment_date := COALESCE(NEW.payment_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_operating_bank_outflow(_source_type text, _source_id uuid, _org_id uuid, _payment_method text, _bank_account_id uuid, _amount numeric, _currency text, _transaction_date date, _description text, _is_paid boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing uuid;
  v_existing_account uuid;
  v_existing_amount numeric;
  v_bank_currency text;
  v_treasury_kind text;
  v_current_balance numeric;
  v_is_cash_expense boolean := _source_type = 'expense_payment' AND _payment_method = 'cash' AND _bank_account_id IS NOT NULL;
BEGIN
  SELECT id, bank_account_id, amount INTO v_existing, v_existing_account, v_existing_amount
  FROM public.bank_account_transactions
  WHERE organization_id = _org_id
    AND source_type = _source_type
    AND source_id = _source_id;

  IF NOT COALESCE(_is_paid, false) OR (COALESCE(_payment_method, '') = 'cash' AND NOT COALESCE(v_is_cash_expense, false)) THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.bank_account_transactions WHERE id = v_existing;
    END IF;
    RETURN NULL;
  END IF;

  IF _bank_account_id IS NULL THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash payment';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Treasury outflow amount must be positive';
  END IF;

  SELECT COALESCE(currency, 'EGP'), treasury_kind, COALESCE(current_balance, 0)
    INTO v_bank_currency, v_treasury_kind, v_current_balance
  FROM public.bank_accounts
  WHERE id = _bank_account_id
    AND organization_id = _org_id
    AND is_active
  FOR NO KEY UPDATE;

  IF NOT FOUND OR v_bank_currency IS DISTINCT FROM COALESCE(_currency, 'EGP') THEN
    RAISE EXCEPTION 'Treasury account is missing, inactive, or uses another currency';
  END IF;

  IF v_is_cash_expense THEN
    IF v_treasury_kind IS DISTINCT FROM 'cash' THEN
      RAISE EXCEPTION 'Select a cash account for a cash expense';
    END IF;
    IF v_current_balance = 'NaN'::numeric OR v_current_balance +
       (CASE WHEN v_existing_account = _bank_account_id THEN v_existing_amount ELSE 0 END) < _amount THEN
      RAISE EXCEPTION 'Cash treasury has insufficient balance';
    END IF;
  END IF;

  INSERT INTO public.bank_account_transactions (
    bank_account_id, transaction_type, amount, description, transaction_date,
    reference_number, created_by, organization_id, source_type, source_id, currency
  ) VALUES (
    _bank_account_id, 'withdrawal', _amount, _description,
    COALESCE(_transaction_date, CURRENT_DATE),
    upper(replace(_source_type, '_', '-')) || '-' || _source_id,
    auth.uid(), _org_id, _source_type, _source_id, COALESCE(_currency, 'EGP')
  )
  ON CONFLICT (organization_id, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL
  DO UPDATE SET
    bank_account_id = EXCLUDED.bank_account_id,
    transaction_type = EXCLUDED.transaction_type,
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    transaction_date = EXCLUDED.transaction_date,
    currency = EXCLUDED.currency
  RETURNING id INTO v_existing;

  RETURN v_existing;
END;
$function$;

CREATE FUNCTION public.pay_operating_expense(_expense uuid, _account uuid, _payment_date date)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_expense public.expense_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_expense FROM public.expense_transactions WHERE id = _expense FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL
    OR NOT COALESCE(public.user_belongs_to_org(auth.uid(), v_expense.organization_id), false)
    OR NOT COALESCE(public.can_org_write(v_expense.organization_id), false)
    OR NOT COALESCE(public.has_org_permission(v_expense.organization_id, 'expenses_approve'), false) THEN
    RAISE EXCEPTION 'Not authorized to pay this expense' USING ERRCODE = '42501';
  END IF;
  IF _account IS NULL OR _payment_date IS NULL OR NOT isfinite(_payment_date) OR _payment_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Select a treasury account and a valid payment date';
  END IF;
  IF v_expense.status = 'paid' AND v_expense.bank_account_id = _account AND v_expense.payment_date = _payment_date THEN
    RETURN _expense;
  END IF;
  IF v_expense.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Only approved expenses can be paid';
  END IF;
  UPDATE public.expense_transactions
  SET status = 'paid', bank_account_id = _account, payment_date = _payment_date
  WHERE id = _expense AND organization_id = v_expense.organization_id;
  RETURN _expense;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_operating_expense(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_operating_expense(uuid, uuid, date) TO authenticated;
REVOKE ALL ON FUNCTION public.normalize_expense_financials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_operating_bank_outflow(text, uuid, uuid, text, uuid, numeric, text, date, text, boolean) FROM PUBLIC, anon, authenticated;
