
-- Drop legacy signatures if they exist
DROP FUNCTION IF EXISTS public.get_trial_balance(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_trial_balance(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_income_statement(uuid, date, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_income_statement(uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_balance_sheet(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_balance_sheet(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_cash_flow(uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_customer_aging(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_customer_aging(uuid) CASCADE;
DROP FUNCTION IF EXISTS public._can_read_org_finance(uuid) CASCADE;

-- Access helper
CREATE FUNCTION public._can_read_org_finance(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
$$;

-- 1) TRIAL BALANCE
CREATE FUNCTION public.get_trial_balance(_org_id uuid, _end_date date DEFAULT NULL)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_name_ar text,
  account_type text,
  total_debit numeric,
  total_credit numeric,
  balance numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _cut date := COALESCE(_end_date, CURRENT_DATE);
DECLARE _cash numeric; _ar numeric; _ap numeric; _rev numeric; _cogs numeric; _opex numeric;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RETURN; END IF;

  SELECT COALESCE(SUM(current_balance),0) INTO _cash
    FROM public.bank_accounts WHERE organization_id=_org_id AND COALESCE(is_active,true);
  SELECT COALESCE(SUM(COALESCE(remaining_amount, final_amount - COALESCE(total_paid_amount,0))),0) INTO _ar
    FROM public.invoices WHERE organization_id=_org_id AND COALESCE(issued_date, created_at::date) <= _cut;
  SELECT GREATEST(
    COALESCE((SELECT SUM(cost_price) FROM public.bookings WHERE organization_id=_org_id AND supplier_id IS NOT NULL AND COALESCE(start_date, created_at::date) <= _cut),0)
    - COALESCE((SELECT SUM(amount) FROM public.supplier_payments WHERE organization_id=_org_id AND COALESCE(paid_date, payment_date) <= _cut AND status IN ('paid','completed')),0),
    0) INTO _ap;
  SELECT COALESCE(SUM(final_amount),0) INTO _rev
    FROM public.invoices WHERE organization_id=_org_id AND COALESCE(issued_date, created_at::date) <= _cut;
  SELECT COALESCE(SUM(cost_price),0) INTO _cogs
    FROM public.bookings WHERE organization_id=_org_id AND COALESCE(start_date, created_at::date) <= _cut;
  SELECT COALESCE(SUM(amount),0) INTO _opex
    FROM public.expense_transactions WHERE organization_id=_org_id AND transaction_date <= _cut AND status IN ('approved','paid');

  RETURN QUERY VALUES
    (gen_random_uuid(), '1000'::text, 'Cash & Bank'::text,         'النقدية والبنوك'::text, 'asset'::text,     _cash, 0::numeric, _cash),
    (gen_random_uuid(), '1100',       'Accounts Receivable',       'ذمم مدينة',            'asset',           _ar,   0::numeric, _ar),
    (gen_random_uuid(), '2000',       'Accounts Payable',          'ذمم دائنة',            'liability',       0::numeric, _ap, -1 * _ap),
    (gen_random_uuid(), '4000',       'Revenue',                   'إيرادات',              'revenue',         0::numeric, _rev, -1 * _rev),
    (gen_random_uuid(), '5000',       'Cost of Sales',             'تكلفة المبيعات',       'expense',         _cogs, 0::numeric, _cogs),
    (gen_random_uuid(), '5100',       'Operating Expenses',        'مصروفات تشغيلية',      'expense',         _opex, 0::numeric, _opex);
END; $$;

-- 2) INCOME STATEMENT
CREATE FUNCTION public.get_income_statement(
  _org_id uuid, _start_date date, _end_date date, _currency text DEFAULT NULL
)
RETURNS TABLE (
  account_type text,
  account_code text,
  account_name text,
  account_name_ar text,
  amount numeric,
  currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'revenue'::text, '4000'::text, 'Revenue'::text, 'إيرادات'::text,
         COALESCE(SUM(i.final_amount),0)::numeric,
         COALESCE(i.currency,'EGP')::text
  FROM public.invoices i
  WHERE i.organization_id = _org_id
    AND COALESCE(i.issued_date, i.created_at::date) BETWEEN _start_date AND _end_date
    AND (_currency IS NULL OR i.currency = _currency)
  GROUP BY COALESCE(i.currency,'EGP')

  UNION ALL
  SELECT 'expense', '5000', 'Cost of Sales', 'تكلفة المبيعات',
         COALESCE(SUM(b.cost_price),0)::numeric,
         COALESCE(b.currency,'EGP')::text
  FROM public.bookings b
  WHERE b.organization_id = _org_id
    AND COALESCE(b.start_date, b.created_at::date) BETWEEN _start_date AND _end_date
    AND (_currency IS NULL OR b.currency = _currency)
  GROUP BY COALESCE(b.currency,'EGP')

  UNION ALL
  SELECT 'expense', '5100', 'Operating Expenses', 'مصروفات تشغيلية',
         COALESCE(SUM(e.amount),0)::numeric,
         COALESCE(e.currency,'EGP')::text
  FROM public.expense_transactions e
  WHERE e.organization_id = _org_id
    AND e.transaction_date BETWEEN _start_date AND _end_date
    AND e.status IN ('approved','paid')
    AND (_currency IS NULL OR e.currency = _currency)
  GROUP BY COALESCE(e.currency,'EGP');
END; $$;

-- 3) BALANCE SHEET
CREATE FUNCTION public.get_balance_sheet(_org_id uuid, _as_of_date date DEFAULT NULL)
RETURNS TABLE (
  account_type text,
  account_code text,
  account_name text,
  account_name_ar text,
  balance numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _cut date := COALESCE(_as_of_date, CURRENT_DATE);
DECLARE _cash numeric; _ar numeric; _ap numeric; _rev numeric; _cogs numeric; _opex numeric;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RETURN; END IF;

  SELECT COALESCE(SUM(current_balance),0) INTO _cash
    FROM public.bank_accounts WHERE organization_id=_org_id AND COALESCE(is_active,true);
  SELECT COALESCE(SUM(COALESCE(remaining_amount, final_amount - COALESCE(total_paid_amount,0))),0) INTO _ar
    FROM public.invoices WHERE organization_id=_org_id AND COALESCE(issued_date, created_at::date) <= _cut;
  SELECT GREATEST(
    COALESCE((SELECT SUM(cost_price) FROM public.bookings WHERE organization_id=_org_id AND supplier_id IS NOT NULL AND COALESCE(start_date, created_at::date) <= _cut),0)
    - COALESCE((SELECT SUM(amount) FROM public.supplier_payments WHERE organization_id=_org_id AND COALESCE(paid_date, payment_date) <= _cut AND status IN ('paid','completed')),0),
    0) INTO _ap;
  SELECT COALESCE(SUM(final_amount),0) INTO _rev
    FROM public.invoices WHERE organization_id=_org_id AND COALESCE(issued_date, created_at::date) <= _cut;
  SELECT COALESCE(SUM(cost_price),0) INTO _cogs
    FROM public.bookings WHERE organization_id=_org_id AND COALESCE(start_date, created_at::date) <= _cut;
  SELECT COALESCE(SUM(amount),0) INTO _opex
    FROM public.expense_transactions WHERE organization_id=_org_id AND transaction_date <= _cut AND status IN ('approved','paid');

  RETURN QUERY VALUES
    ('asset'::text,     '1000'::text, 'Cash & Bank'::text,         'النقدية والبنوك'::text, _cash),
    ('asset',           '1100',       'Accounts Receivable',       'ذمم مدينة',             _ar),
    ('liability',       '2000',       'Accounts Payable',          'ذمم دائنة',             _ap),
    ('equity',          '3000',       'Retained Earnings',         'أرباح محتجزة',          (_rev - _cogs - _opex));
END; $$;

-- 4) CASH FLOW
CREATE FUNCTION public.get_cash_flow(_org_id uuid, _start_date date, _end_date date)
RETURNS TABLE (
  period_date date,
  inflows numeric,
  outflows numeric,
  net_flow numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RETURN; END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(_start_date, _end_date, interval '1 day')::date AS d
  ),
  inflow AS (
    SELECT COALESCE(issued_date, created_at::date) AS d, SUM(COALESCE(total_paid_amount,0))::numeric AS amt
    FROM public.invoices
    WHERE organization_id=_org_id AND COALESCE(issued_date, created_at::date) BETWEEN _start_date AND _end_date
    GROUP BY 1
  ),
  outflow_all AS (
    SELECT COALESCE(paid_date, payment_date) AS d, SUM(amount)::numeric AS amt
    FROM public.supplier_payments
    WHERE organization_id=_org_id AND COALESCE(paid_date, payment_date) BETWEEN _start_date AND _end_date
      AND status IN ('paid','completed')
    GROUP BY 1
    UNION ALL
    SELECT transaction_date AS d, SUM(amount)::numeric AS amt
    FROM public.expense_transactions
    WHERE organization_id=_org_id AND transaction_date BETWEEN _start_date AND _end_date
      AND status IN ('approved','paid')
    GROUP BY 1
  ),
  agg_out AS (SELECT d, SUM(amt)::numeric AS amt FROM outflow_all GROUP BY d)
  SELECT days.d,
         COALESCE(inflow.amt,0)::numeric,
         COALESCE(agg_out.amt,0)::numeric,
         (COALESCE(inflow.amt,0) - COALESCE(agg_out.amt,0))::numeric
  FROM days
  LEFT JOIN inflow  ON inflow.d  = days.d
  LEFT JOIN agg_out ON agg_out.d = days.d
  ORDER BY days.d;
END; $$;

-- 5) CUSTOMER AGING
CREATE FUNCTION public.get_customer_aging(_org_id uuid, _as_of_date date DEFAULT NULL)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  total_due numeric,
  current_due numeric,
  days_30 numeric,
  days_60 numeric,
  days_90 numeric,
  days_over_90 numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _cut date := COALESCE(_as_of_date, CURRENT_DATE);
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    i.customer_id,
    COALESCE(c.name, i.customer_name, 'غير معروف')::text,
    SUM(COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)))::numeric,
    SUM(CASE WHEN _cut - COALESCE(i.due_date, i.issued_date, i.created_at::date) <= 0
             THEN COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) ELSE 0 END)::numeric,
    SUM(CASE WHEN _cut - COALESCE(i.due_date, i.issued_date, i.created_at::date) BETWEEN 1 AND 30
             THEN COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) ELSE 0 END)::numeric,
    SUM(CASE WHEN _cut - COALESCE(i.due_date, i.issued_date, i.created_at::date) BETWEEN 31 AND 60
             THEN COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) ELSE 0 END)::numeric,
    SUM(CASE WHEN _cut - COALESCE(i.due_date, i.issued_date, i.created_at::date) BETWEEN 61 AND 90
             THEN COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) ELSE 0 END)::numeric,
    SUM(CASE WHEN _cut - COALESCE(i.due_date, i.issued_date, i.created_at::date) > 90
             THEN COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) ELSE 0 END)::numeric
  FROM public.invoices i
  LEFT JOIN public.customers c ON c.id = i.customer_id
  WHERE i.organization_id = _org_id
    AND COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0)) > 0
  GROUP BY i.customer_id, COALESCE(c.name, i.customer_name, 'غير معروف')
  ORDER BY SUM(COALESCE(i.remaining_amount, i.final_amount - COALESCE(i.total_paid_amount,0))) DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public._can_read_org_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_income_statement(uuid, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_aging(uuid, date) TO authenticated;
