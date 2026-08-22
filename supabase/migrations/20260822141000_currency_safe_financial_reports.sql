-- Currency-safe financial reports. Every public report resolves exactly one
-- currency (EGP by default) and enforces organization membership.

BEGIN;

-- ---------------------------------------------------------------------------
-- Trial balance (posted ledger, one currency).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trial_balance(
  _org_id uuid, _end_date date DEFAULT NULL, _currency text DEFAULT 'EGP'
)
RETURNS TABLE(
  account_id uuid, account_code text, account_name text, account_name_ar text,
  account_type public.account_type, total_debit numeric, total_credit numeric,
  balance numeric, currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_currency text:=COALESCE(NULLIF(_currency,''),'EGP');
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH ledger AS (
    SELECT l.account_id,SUM(l.debit) AS debit,SUM(l.credit) AS credit
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
    WHERE e.organization_id=_org_id AND e.status='posted'
      AND e.currency=v_currency
      AND (_end_date IS NULL OR e.entry_date<=_end_date)
    GROUP BY l.account_id
  )
  SELECT a.id,a.account_code,a.account_name,a.account_name_ar,a.account_type,
         COALESCE(l.debit,0),COALESCE(l.credit,0),
         COALESCE(l.debit,0)-COALESCE(l.credit,0),v_currency
  FROM public.chart_of_accounts a
  LEFT JOIN ledger l ON l.account_id=a.id
  WHERE a.organization_id=_org_id AND a.is_active
  ORDER BY a.account_code;
END;
$$;

-- Keep the legacy two-argument signature safe: it is now EGP-only, never a
-- numeric sum of unrelated currencies.
CREATE OR REPLACE FUNCTION public.get_trial_balance(_org_id uuid,_end_date date DEFAULT NULL)
RETURNS TABLE(
  account_id uuid,account_code text,account_name text,account_name_ar text,
  account_type text,total_debit numeric,total_credit numeric,balance numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT t.account_id,t.account_code,t.account_name,t.account_name_ar,
         t.account_type::text,t.total_debit,t.total_credit,t.balance
  FROM public.get_trial_balance(_org_id,_end_date,'EGP') t;
$$;

-- ---------------------------------------------------------------------------
-- Income statement: VAT is a liability, discounts reduce revenue, and only
-- revenue/expense ledger accounts participate in profit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_income_statement(
  _org_id uuid,_start_date date,_end_date date,_currency text DEFAULT 'EGP'
)
RETURNS TABLE(
  account_type text,account_code text,account_name text,account_name_ar text,
  amount numeric,currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_currency text:=COALESCE(NULLIF(_currency,''),'EGP');
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _start_date>_end_date THEN RAISE EXCEPTION 'Start date must not be after end date'; END IF;
  RETURN QUERY
  SELECT a.account_type::text,a.account_code,a.account_name,a.account_name_ar,
         CASE WHEN a.account_type='revenue'
              THEN SUM(l.credit-l.debit)
              ELSE SUM(l.debit-l.credit) END AS amount,
         v_currency
  FROM public.journal_entries e
  JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE e.organization_id=_org_id AND e.status='posted'
    AND e.currency=v_currency AND e.entry_date BETWEEN _start_date AND _end_date
    AND a.account_type IN ('revenue','expense')
  GROUP BY a.account_type,a.account_code,a.account_name,a.account_name_ar
  HAVING abs(SUM(l.debit-l.credit))>0.001
  ORDER BY a.account_type DESC,a.account_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- Balance sheet: add current earnings because revenue/expense accounts are not
-- closed until fiscal-year close.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_balance_sheet(
  _org_id uuid,_as_of_date date DEFAULT NULL,_currency text DEFAULT 'EGP'
)
RETURNS TABLE(
  account_type public.account_type,account_code text,account_name text,
  account_name_ar text,balance numeric,currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_currency text:=COALESCE(NULLIF(_currency,''),'EGP');
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  WITH balances AS (
    SELECT a.account_type,a.account_code,a.account_name,a.account_name_ar,
           SUM(l.debit-l.credit) AS raw_balance
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
    JOIN public.chart_of_accounts a ON a.id=l.account_id
    WHERE e.organization_id=_org_id AND e.status='posted' AND e.currency=v_currency
      AND (_as_of_date IS NULL OR e.entry_date<=_as_of_date)
    GROUP BY a.account_type,a.account_code,a.account_name,a.account_name_ar
  ), current_earnings AS (
    SELECT COALESCE(SUM(CASE
      WHEN b2.account_type='revenue' THEN -b2.raw_balance
      WHEN b2.account_type='expense' THEN -b2.raw_balance
      ELSE 0 END),0) AS amount
    FROM balances b2
    WHERE b2.account_type IN ('revenue','expense')
  )
  SELECT b.account_type,b.account_code,b.account_name,b.account_name_ar,
         CASE WHEN b.account_type='asset' THEN b.raw_balance ELSE -b.raw_balance END,
         v_currency
  FROM balances b
  WHERE b.account_type IN ('asset','liability','equity') AND abs(b.raw_balance)>0.001
    AND b.account_code<>'3999'
  UNION ALL
  SELECT 'equity'::public.account_type,'3999','Current Earnings','أرباح الفترة الحالية',
         c.amount,v_currency
  FROM current_earnings c
  WHERE abs(c.amount)>0.001
  ORDER BY 1,2;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_balance_sheet(_org_id uuid,_as_of_date date DEFAULT NULL)
RETURNS TABLE(account_type text,account_code text,account_name text,account_name_ar text,balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT b.account_type::text,b.account_code,b.account_name,b.account_name_ar,b.balance
  FROM public.get_balance_sheet(_org_id,_as_of_date,'EGP') b;
$$;

-- ---------------------------------------------------------------------------
-- Cash flow: actual posted movements through cash/bank control accounts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_flow(
  _org_id uuid,_start_date date,_end_date date,_currency text DEFAULT 'EGP'
)
RETURNS TABLE(period_date date,inflows numeric,outflows numeric,net_flow numeric,currency text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_currency text:=COALESCE(NULLIF(_currency,''),'EGP');
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _start_date>_end_date THEN RAISE EXCEPTION 'Start date must not be after end date'; END IF;
  RETURN QUERY
  SELECT e.entry_date,
         SUM(CASE WHEN l.debit>0 THEN l.debit ELSE 0 END),
         SUM(CASE WHEN l.credit>0 THEN l.credit ELSE 0 END),
         SUM(l.debit-l.credit),v_currency
  FROM public.journal_entries e
  JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
  JOIN public.chart_of_accounts a ON a.id=l.account_id
  WHERE e.organization_id=_org_id AND e.status='posted' AND e.currency=v_currency
    AND e.entry_date BETWEEN _start_date AND _end_date
    AND a.account_code IN ('1000','1010')
    AND e.source_type IS DISTINCT FROM 'launch_opening_balance'
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow(_org uuid,_from date DEFAULT NULL,_to date DEFAULT NULL)
RETURNS TABLE(day date,incoming numeric,outgoing numeric,net numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT c.period_date,c.inflows,c.outflows,c.net_flow
  FROM public.get_cash_flow(
    _org,COALESCE(_from,DATE '1900-01-01'),COALESCE(_to,CURRENT_DATE),'EGP'
  ) c;
$$;

-- ---------------------------------------------------------------------------
-- Customer aging: no cross-currency sums.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_aging_by_currency(
  _org_id uuid,_as_of_date date DEFAULT NULL,_currency text DEFAULT 'EGP'
)
RETURNS TABLE(
  customer_id uuid,customer_name text,total_due numeric,current_due numeric,
  days_30 numeric,days_60 numeric,days_90 numeric,days_over_90 numeric,currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_cut date:=COALESCE(_as_of_date,CURRENT_DATE);
  v_currency text:=COALESCE(NULLIF(_currency,''),'EGP');
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT i.customer_id,COALESCE(c.name,i.customer_name,'غير معروف')::text,
         SUM(i.remaining_amount),
         SUM(CASE WHEN v_cut-COALESCE(i.due_date,i.issued_date,i.created_at::date)<=0 THEN i.remaining_amount ELSE 0 END),
         SUM(CASE WHEN v_cut-COALESCE(i.due_date,i.issued_date,i.created_at::date) BETWEEN 1 AND 30 THEN i.remaining_amount ELSE 0 END),
         SUM(CASE WHEN v_cut-COALESCE(i.due_date,i.issued_date,i.created_at::date) BETWEEN 31 AND 60 THEN i.remaining_amount ELSE 0 END),
         SUM(CASE WHEN v_cut-COALESCE(i.due_date,i.issued_date,i.created_at::date) BETWEEN 61 AND 90 THEN i.remaining_amount ELSE 0 END),
         SUM(CASE WHEN v_cut-COALESCE(i.due_date,i.issued_date,i.created_at::date)>90 THEN i.remaining_amount ELSE 0 END),
         v_currency
  FROM public.invoices i
  LEFT JOIN public.customers c ON c.id=i.customer_id
  WHERE i.organization_id=_org_id AND COALESCE(i.currency,'EGP')=v_currency
    AND COALESCE(i.remaining_amount,0)>0 AND COALESCE(i.status,'draft')<>'cancelled'
    AND COALESCE(i.issued_date,i.created_at::date)<=v_cut
  GROUP BY i.customer_id,COALESCE(c.name,i.customer_name,'غير معروف')
  ORDER BY SUM(i.remaining_amount) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_aging(_org_id uuid,_as_of_date date DEFAULT NULL)
RETURNS TABLE(
  customer_id uuid,customer_name text,total_due numeric,current_due numeric,
  days_30 numeric,days_60 numeric,days_90 numeric,days_over_90 numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT a.customer_id,a.customer_name,a.total_due,a.current_due,a.days_30,
         a.days_60,a.days_90,a.days_over_90
  FROM public.get_customer_aging_by_currency(_org_id,_as_of_date,'EGP') a;
$$;

-- Running balances restart for each currency.
CREATE OR REPLACE FUNCTION public.get_customer_ledger(
  _customer_id uuid,_from date DEFAULT NULL,_to date DEFAULT NULL
)
RETURNS TABLE(entry_date timestamptz,entry_type text,reference text,booking_id uuid,
  debit numeric,credit numeric,currency text,balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.customers WHERE id=_customer_id;
  IF v_org IS NULL OR NOT public.user_belongs_to_org(auth.uid(),v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  WITH events AS (
    SELECT i.issued_date::timestamptz AS d,'invoice'::text AS kind,i.invoice_number AS ref,
           i.booking_id,i.final_amount AS dr,0::numeric AS cr,COALESCE(i.currency,'EGP') AS ccy
    FROM public.invoices i WHERE i.customer_id=_customer_id AND COALESCE(i.status,'draft')<>'cancelled'
      AND (_from IS NULL OR i.issued_date>=_from) AND (_to IS NULL OR i.issued_date<=_to)
    UNION ALL
    SELECT p.payment_date::timestamptz,'payment',COALESCE(p.reference_number,'-'),p.booking_id,
           0::numeric,p.amount,p.currency
    FROM public.customer_payments p WHERE p.customer_id=_customer_id AND p.status='completed'
      AND (_from IS NULL OR p.payment_date>=_from) AND (_to IS NULL OR p.payment_date<=_to)
    UNION ALL
    SELECT r.paid_at,'refund','REFUND',r.booking_id,r.amount,0::numeric,r.currency
    FROM public.refund_requests r WHERE r.customer_id=_customer_id AND r.status='paid'
      AND (_from IS NULL OR r.paid_at::date>=_from) AND (_to IS NULL OR r.paid_at::date<=_to)
  )
  SELECT e.d,e.kind,e.ref,e.booking_id,e.dr,e.cr,e.ccy,
         SUM(e.dr-e.cr) OVER(PARTITION BY e.ccy ORDER BY e.d,e.kind,e.ref)
  FROM events e ORDER BY e.ccy,e.d,e.kind,e.ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_ledger(
  _supplier_id uuid,_from date DEFAULT NULL,_to date DEFAULT NULL
)
RETURNS TABLE(entry_date timestamptz,entry_type text,reference text,booking_id uuid,
  debit numeric,credit numeric,currency text,balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.suppliers WHERE id=_supplier_id;
  IF v_org IS NULL OR NOT public.user_belongs_to_org(auth.uid(),v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  WITH obligations AS (
    -- Prefer supplier invoices. Use a payment order only when no supplier invoice
    -- references it, preventing one liability from appearing twice.
    SELECT si.invoice_date::timestamptz AS d,'supplier_invoice'::text AS kind,
           si.invoice_number AS ref,si.booking_id,0::numeric AS dr,si.amount AS cr,si.currency AS ccy
    FROM public.supplier_invoices si
    WHERE si.supplier_id=_supplier_id AND si.status<>'cancelled'
      AND (_from IS NULL OR si.invoice_date>=_from) AND (_to IS NULL OR si.invoice_date<=_to)
    UNION ALL
    SELECT po.created_at,'payment_order',po.reference_number,po.booking_id,0::numeric,po.amount,po.currency
    FROM public.supplier_payment_orders po
    WHERE po.supplier_id=_supplier_id AND po.approval_status='approved'
      AND NOT EXISTS(SELECT 1 FROM public.supplier_invoices si WHERE si.payment_order_id=po.id AND si.status<>'cancelled')
      AND (_from IS NULL OR po.created_at::date>=_from) AND (_to IS NULL OR po.created_at::date<=_to)
  ), events AS (
    SELECT * FROM obligations
    UNION ALL
    SELECT p.payment_date::timestamptz,'payment',COALESCE(p.reference_number,'-'),p.booking_id,
           p.amount,0::numeric,COALESCE(p.currency,'EGP')
    FROM public.supplier_payments p WHERE p.supplier_id=_supplier_id AND p.status IN ('paid','completed')
      AND (_from IS NULL OR p.payment_date>=_from) AND (_to IS NULL OR p.payment_date<=_to)
  )
  SELECT e.d,e.kind,e.ref,e.booking_id,e.dr,e.cr,e.ccy,
         SUM(e.dr-e.cr) OVER(PARTITION BY e.ccy ORDER BY e.d,e.kind,e.ref)
  FROM events e ORDER BY e.ccy,e.d,e.kind,e.ref;
END;
$$;

-- ---------------------------------------------------------------------------
-- Machine-readable launch health used by the validation screen and smoke test.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_launch_health(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT jsonb_build_object(
    'booking_profit_mismatches',(SELECT COUNT(*) FROM public.bookings b WHERE b.organization_id=_org_id AND abs(COALESCE(b.profit,0)-(COALESCE(b.selling_price,0)-COALESCE(b.cost_price,0)))>0.01),
    'invoice_formula_mismatches',(SELECT COUNT(*) FROM public.invoices i WHERE i.organization_id=_org_id AND abs(COALESCE(i.final_amount,0)-(COALESCE(i.subtotal,0)-COALESCE(i.discount_amount,0)+COALESCE(i.vat_amount,0)))>0.01),
    'invoice_remaining_mismatches',(SELECT COUNT(*) FROM public.invoices i WHERE i.organization_id=_org_id AND abs(COALESCE(i.remaining_amount,0)-(COALESCE(i.final_amount,0)-COALESCE(i.total_paid_amount,0)))>0.01),
    'unbalanced_journal_headers',(SELECT COUNT(*) FROM public.journal_entries e WHERE e.organization_id=_org_id AND abs(e.total_debit-e.total_credit)>0.01),
    'journal_line_mismatches',(SELECT COUNT(*) FROM (
      SELECT e.id FROM public.journal_entries e LEFT JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
      WHERE e.organization_id=_org_id GROUP BY e.id,e.total_debit,e.total_credit
      HAVING abs(e.total_debit-COALESCE(SUM(l.debit),0))>0.01 OR abs(e.total_credit-COALESCE(SUM(l.credit),0))>0.01
    ) q),
    'confirmed_incomplete_bookings',(SELECT COUNT(*) FROM public.bookings b WHERE b.organization_id=_org_id AND b.status IN ('confirmed','completed') AND b.data_quality_status<>'ok'),
    'uninvoiced_priced_bookings',(SELECT COUNT(*) FROM public.bookings b WHERE b.organization_id=_org_id AND b.status IN ('confirmed','completed') AND b.selling_price>0 AND NOT EXISTS(SELECT 1 FROM public.invoices i WHERE i.booking_id=b.id AND COALESCE(i.status,'draft')<>'cancelled')),
    'unallocated_customer_receipts',(SELECT COALESCE(SUM(GREATEST(p.amount-COALESCE(a.allocated,0),0)),0) FROM public.customer_payments p LEFT JOIN (SELECT payment_id,SUM(amount) allocated FROM public.customer_payment_allocations GROUP BY payment_id) a ON a.payment_id=p.id WHERE p.organization_id=_org_id AND p.status='completed'),
    'supplier_payments_without_treasury',(SELECT COUNT(*) FROM public.supplier_payments p WHERE p.organization_id=_org_id AND p.status IN ('paid','completed') AND p.treasury_account_id IS NULL),
    'available_currencies',(SELECT COALESCE(jsonb_agg(x.currency ORDER BY x.currency),'[]'::jsonb) FROM (SELECT DISTINCT COALESCE(currency,'EGP') currency FROM public.journal_entries WHERE organization_id=_org_id) x),
    'checked_at',now()
  ) INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.backfill_journals(uuid);
CREATE OR REPLACE FUNCTION public.backfill_journals(_org_id uuid)
RETURNS TABLE(bookings_posted integer,invoices_posted integer,supplier_payments_posted integer,
  expenses_posted integer,customer_payments_posted integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE r record;b int:=0;i int:=0;s int:=0;e int:=0;c int:=0;
BEGIN
  IF NOT public.can_org_write(_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOR r IN SELECT id FROM public.bookings WHERE organization_id=_org_id LOOP
    IF public.post_booking_cost(r.id) IS NOT NULL THEN b:=b+1; END IF;
  END LOOP;
  FOR r IN SELECT id FROM public.invoices WHERE organization_id=_org_id LOOP
    IF public.post_invoice(r.id) IS NOT NULL THEN i:=i+1; END IF;
    PERFORM public.post_invoice_legacy_receipt(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.supplier_payments WHERE organization_id=_org_id LOOP
    IF public.post_supplier_payment(r.id) IS NOT NULL THEN s:=s+1; END IF;
  END LOOP;
  FOR r IN SELECT id FROM public.expense_transactions WHERE organization_id=_org_id LOOP
    IF public.post_expense_transaction(r.id) IS NOT NULL THEN e:=e+1; END IF;
  END LOOP;
  FOR r IN SELECT id FROM public.customer_payments WHERE organization_id=_org_id LOOP
    IF public.post_customer_payment(r.id) IS NOT NULL THEN c:=c+1; END IF;
  END LOOP;
  RETURN QUERY SELECT b,i,s,e,c;
END;
$$;

REVOKE ALL ON FUNCTION public.get_trial_balance(uuid,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_trial_balance(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_income_statement(uuid,date,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_balance_sheet(uuid,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_balance_sheet(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_cash_flow(uuid,date,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_cash_flow(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_aging_by_currency(uuid,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_aging(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_ledger(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_supplier_ledger(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_financial_launch_health(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.backfill_journals(uuid) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_income_statement(uuid,date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow(uuid,date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_aging_by_currency(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_aging(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_ledger(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_launch_health(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.backfill_journals(uuid) TO authenticated,service_role;

COMMIT;
