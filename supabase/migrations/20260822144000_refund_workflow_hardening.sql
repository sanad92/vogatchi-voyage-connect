BEGIN;

-- Split every refund into the part that returns an unused customer advance and
-- the part that is a genuine sales return.  This keeps revenue, liabilities,
-- and cash correct instead of treating every refund as an A/R movement.
ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS advance_component numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_return_component numeric NOT NULL DEFAULT 0;

ALTER TABLE public.refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_component_amounts_check;
ALTER TABLE public.refund_requests
  ADD CONSTRAINT refund_requests_component_amounts_check
  CHECK (
    advance_component >= 0
    AND sales_return_component >= 0
    AND abs((advance_component + sales_return_component) - amount) <= 0.01
  ) NOT VALID;

-- There are no historical refund rows at launch.  Keep this defensive update
-- so the migration is also safe on an environment that received a row between
-- audit and deployment.
UPDATE public.refund_requests
SET sales_return_component = amount,
    advance_component = 0
WHERE abs((advance_component + sales_return_component) - amount) > 0.01;

ALTER TABLE public.refund_requests
  VALIDATE CONSTRAINT refund_requests_component_amounts_check;

CREATE OR REPLACE FUNCTION public._can_manage_refunds(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id=_org_id
      AND om.user_id=auth.uid()
      AND om.is_active
      AND om.role::text IN ('owner','manager')
  ) OR public.is_platform_admin(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.create_refund_request(
  _booking_id uuid,
  _amount numeric,
  _currency text DEFAULT 'EGP',
  _exchange_rate numeric DEFAULT 1,
  _source_payment_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_org uuid;
  v_customer uuid;
  v_booking_currency text;
  v_invoice_id uuid;
  v_id uuid;
  v_base numeric;
  v_currency text := upper(trim(COALESCE(_currency,'EGP')));
  v_customer_payments numeric := 0;
  v_invoice_paid numeric := 0;
  v_paid_total numeric := 0;
  v_prior_refunds numeric := 0;
  v_unallocated_advances numeric := 0;
  v_prior_advance_refunds numeric := 0;
  v_advance_component numeric := 0;
  v_sales_return_component numeric := 0;
  v_source_amount numeric;
  v_source_currency text;
  v_source_booking uuid;
  v_source_unallocated numeric := 0;
  v_source_refunded numeric := 0;
BEGIN
  IF _amount IS NULL OR _amount<=0 OR COALESCE(_exchange_rate,0)<=0 THEN
    RAISE EXCEPTION 'Refund amount and exchange rate must be positive';
  END IF;
  IF v_currency NOT IN ('EGP','USD') THEN
    RAISE EXCEPTION 'Unsupported refund currency';
  END IF;

  SELECT organization_id,customer_id,upper(COALESCE(currency,'EGP'))
    INTO v_org,v_customer,v_booking_currency
  FROM public.bookings
  WHERE id=_booking_id
  FOR UPDATE;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT public.can_org_write(v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_booking_currency<>v_currency THEN
    RAISE EXCEPTION 'Refund currency must match booking currency';
  END IF;

  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE organization_id=v_org AND booking_id=_booking_id
    AND upper(COALESCE(currency,'EGP'))=v_currency
  ORDER BY issued_date DESC NULLS LAST,created_at DESC
  LIMIT 1;

  SELECT COALESCE(SUM(cp.amount),0)
    INTO v_customer_payments
  FROM public.customer_payments cp
  WHERE cp.organization_id=v_org
    AND cp.booking_id=_booking_id
    AND cp.status='completed'
    AND upper(COALESCE(cp.currency,'EGP'))=v_currency;

  SELECT COALESCE(SUM(LEAST(COALESCE(i.total_paid_amount,0),COALESCE(i.final_amount,0))),0)
    INTO v_invoice_paid
  FROM public.invoices i
  WHERE i.organization_id=v_org
    AND i.booking_id=_booking_id
    AND upper(COALESCE(i.currency,'EGP'))=v_currency;

  -- Imported invoice receipts and newer customer-payment rows can describe the
  -- same cash.  GREATEST avoids counting that cash twice.
  v_paid_total := GREATEST(v_customer_payments,v_invoice_paid);

  SELECT COALESCE(SUM(r.amount),0),COALESCE(SUM(r.advance_component),0)
    INTO v_prior_refunds,v_prior_advance_refunds
  FROM public.refund_requests r
  WHERE r.organization_id=v_org
    AND r.booking_id=_booking_id
    AND r.currency=v_currency
    AND r.status IN ('requested','approved','paid');

  IF _amount > v_paid_total-v_prior_refunds+0.01 THEN
    RAISE EXCEPTION 'Refund exceeds available paid amount (%)',
      GREATEST(v_paid_total-v_prior_refunds,0);
  END IF;

  SELECT COALESCE(SUM(GREATEST(
           cp.amount-COALESCE((
             SELECT SUM(a.amount)
             FROM public.customer_payment_allocations a
             WHERE a.payment_id=cp.id
           ),0),0)),0)
    INTO v_unallocated_advances
  FROM public.customer_payments cp
  WHERE cp.organization_id=v_org
    AND cp.booking_id=_booking_id
    AND cp.status='completed'
    AND upper(COALESCE(cp.currency,'EGP'))=v_currency;

  v_unallocated_advances := GREATEST(v_unallocated_advances-v_prior_advance_refunds,0);

  IF _source_payment_id IS NOT NULL THEN
    SELECT cp.amount,upper(COALESCE(cp.currency,'EGP')),cp.booking_id,
           GREATEST(cp.amount-COALESCE(SUM(a.amount),0),0)
      INTO v_source_amount,v_source_currency,v_source_booking,v_source_unallocated
    FROM public.customer_payments cp
    LEFT JOIN public.customer_payment_allocations a ON a.payment_id=cp.id
    WHERE cp.id=_source_payment_id
      AND cp.organization_id=v_org
      AND cp.status='completed'
    GROUP BY cp.id,cp.amount,cp.currency,cp.booking_id;
    IF v_source_amount IS NULL OR v_source_booking IS DISTINCT FROM _booking_id THEN
      RAISE EXCEPTION 'Source payment is invalid for this booking';
    END IF;
    IF v_source_currency<>v_currency THEN
      RAISE EXCEPTION 'Source payment currency does not match refund currency';
    END IF;
    SELECT COALESCE(SUM(amount),0) INTO v_source_refunded
    FROM public.refund_requests
    WHERE source_payment_id=_source_payment_id
      AND status IN ('requested','approved','paid');
    IF _amount > v_source_amount-v_source_refunded+0.01 THEN
      RAISE EXCEPTION 'Refund exceeds source payment balance (%)',
        GREATEST(v_source_amount-v_source_refunded,0);
    END IF;
    v_unallocated_advances := LEAST(
      v_unallocated_advances,
      GREATEST(v_source_unallocated-v_source_refunded,0)
    );
  END IF;

  v_advance_component := LEAST(_amount,v_unallocated_advances);
  v_sales_return_component := _amount-v_advance_component;
  v_base := round(_amount*_exchange_rate,2);

  INSERT INTO public.refund_requests (
    organization_id,booking_id,customer_id,invoice_id,source_payment_id,
    amount,currency,exchange_rate,amount_base,advance_component,
    sales_return_component,reason,requested_by,status
  ) VALUES (
    v_org,_booking_id,v_customer,v_invoice_id,_source_payment_id,
    _amount,v_currency,_exchange_rate,v_base,v_advance_component,
    v_sales_return_component,_reason,auth.uid(),'requested'
  ) RETURNING id INTO v_id;

  INSERT INTO public.booking_timeline_events (
    organization_id,booking_id,kind,actor_id,summary,payload
  ) VALUES (
    v_org,_booking_id,'refund_requested',auth.uid(),
    'طلب استرداد: '||_amount||' '||v_currency,
    jsonb_build_object(
      'refund_id',v_id,
      'advance_component',v_advance_component,
      'sales_return_component',v_sales_return_component,
      'reason',COALESCE(_reason,'')
    )
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_refund_request(
  _refund_id uuid,
  _approve boolean DEFAULT true,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_org uuid;
  v_booking uuid;
  v_status text;
BEGIN
  SELECT organization_id,booking_id,status
    INTO v_org,v_booking,v_status
  FROM public.refund_requests
  WHERE id=_refund_id
  FOR UPDATE;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Refund not found'; END IF;
  IF NOT public._can_manage_refunds(v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_status<>'requested' THEN RAISE EXCEPTION 'Only requested refunds can be reviewed'; END IF;
  IF NOT _approve AND nullif(trim(COALESCE(_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  UPDATE public.refund_requests
  SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      approved_by=auth.uid(),approved_at=now(),
      rejection_reason=CASE WHEN NOT _approve THEN trim(_reason) END,
      updated_at=now()
  WHERE id=_refund_id;

  IF v_booking IS NOT NULL THEN
    INSERT INTO public.booking_timeline_events (
      organization_id,booking_id,kind,actor_id,summary,payload
    ) VALUES (
      v_org,v_booking,
      CASE WHEN _approve THEN 'refund_approved' ELSE 'refund_rejected' END,
      auth.uid(),
      CASE WHEN _approve THEN 'تمت الموافقة على طلب الاسترداد' ELSE 'تم رفض طلب الاسترداد' END,
      jsonb_build_object('reason',COALESCE(_reason,''))
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_customer_refund(_refund_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  r public.refund_requests%ROWTYPE;
  v_je uuid;
  v_cash uuid;
  v_advance uuid;
  v_returns uuid;
  v_treasury_kind text;
  v_treasury_currency text;
  v_line integer := 1;
BEGIN
  SELECT * INTO r FROM public.refund_requests WHERE id=_refund_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_je
  FROM public.journal_entries
  WHERE organization_id=r.organization_id
    AND source_type='customer_refund'
    AND source_id=r.id;

  IF r.status<>'paid' OR r.amount<=0 THEN
    IF v_je IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked
    ) THEN
      DELETE FROM public.journal_entries WHERE id=v_je;
    END IF;
    RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked
  ) THEN RETURN v_je; END IF;

  SELECT treasury_kind,upper(COALESCE(currency,'EGP'))
    INTO v_treasury_kind,v_treasury_currency
  FROM public.bank_accounts
  WHERE id=r.treasury_account_id
    AND organization_id=r.organization_id
    AND is_active;
  IF v_treasury_kind IS NULL OR v_treasury_currency<>r.currency THEN
    RAISE EXCEPTION 'Refund treasury is missing, inactive, or uses another currency';
  END IF;

  v_cash:=public._resolve_account(
    r.organization_id,
    CASE WHEN v_treasury_kind='cash' THEN '1000' ELSE '1010' END
  );
  v_advance:=public._resolve_account(r.organization_id,'2050');
  v_returns:=public._resolve_account(r.organization_id,'4050');
  IF v_cash IS NULL OR v_advance IS NULL OR v_returns IS NULL THEN
    RAISE EXCEPTION 'Missing cash, customer-advance, or sales-return account';
  END IF;

  DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id,entry_number,entry_date,reference_type,reference_id,
    description,total_debit,total_credit,status,currency,source_type,source_id,
    booking_id,functional_currency,fx_rate,posted_at,auto_generated
  ) VALUES (
    r.organization_id,public._next_entry_number(r.organization_id),
    COALESCE(r.paid_at::date,CURRENT_DATE),'customer_refund',r.id,
    'Customer refund',r.amount,r.amount,'posted',r.currency,
    'customer_refund',r.id,r.booking_id,r.currency,r.exchange_rate,now(),true
  ) RETURNING id INTO v_je;

  IF r.advance_component>0 THEN
    INSERT INTO public.journal_entry_lines(
      journal_entry_id,account_id,debit,credit,description,line_order
    ) VALUES (
      v_je,v_advance,r.advance_component,0,'رد دفعة مقدمة للعميل',v_line
    );
    v_line:=v_line+1;
  END IF;
  IF r.sales_return_component>0 THEN
    INSERT INTO public.journal_entry_lines(
      journal_entry_id,account_id,debit,credit,description,line_order
    ) VALUES (
      v_je,v_returns,r.sales_return_component,0,'مردود مبيعات للعميل',v_line
    );
    v_line:=v_line+1;
  END IF;
  INSERT INTO public.journal_entry_lines(
    journal_entry_id,account_id,debit,credit,description,line_order
  ) VALUES (v_je,v_cash,0,r.amount,'صرف الاسترداد',v_line);
  RETURN v_je;
END;
$$;

CREATE OR REPLACE FUNCTION public._trg_post_customer_refund()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  PERFORM public.post_customer_refund(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_customer_refund ON public.refund_requests;
CREATE TRIGGER trg_post_customer_refund
AFTER INSERT OR UPDATE OF status,amount,currency,exchange_rate,
  treasury_account_id,advance_component,sales_return_component
ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public._trg_post_customer_refund();

CREATE OR REPLACE FUNCTION public.pay_refund_request(
  _refund_id uuid,
  _treasury_account_id uuid,
  _reference text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_r public.refund_requests%ROWTYPE;
  v_treasury_kind text;
  v_treasury_currency text;
  v_current_balance numeric;
  v_cash_code text;
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
  v_cash_code:=CASE WHEN v_treasury_kind='cash' THEN '1000' ELSE '1010' END;

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
      v_r.organization_id,v_r.booking_id,'refund',v_r.id,'2050',
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
      v_r.organization_id,v_r.booking_id,'refund',v_r.id,'4050',
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
$$;

REVOKE ALL ON FUNCTION public._can_manage_refunds(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.post_customer_refund(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public._trg_post_customer_refund() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._can_manage_refunds(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_customer_refund(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._trg_post_customer_refund() TO service_role;

REVOKE ALL ON FUNCTION public.create_refund_request(uuid,numeric,text,numeric,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.approve_refund_request(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.pay_refund_request(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_refund_request(uuid,numeric,text,numeric,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_refund_request(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_refund_request(uuid,uuid,text) TO authenticated;

COMMIT;
