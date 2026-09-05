-- Wave 3: currency-safe balance sheet with current earnings and account drill-down.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_balance_sheet_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP'
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_name_ar text,
  account_type public.account_type,
  balance numeric,
  is_current_earnings boolean,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH ledger AS (
    SELECT
      l.account_id,
      SUM(COALESCE(l.debit, 0)) AS total_debit,
      SUM(COALESCE(l.credit, 0)) AS total_credit
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND (_as_of_date IS NULL OR e.entry_date <= _as_of_date)
    GROUP BY l.account_id
  ), current_earnings AS (
    SELECT COALESCE(SUM(l.total_credit - l.total_debit), 0) AS amount
    FROM ledger l
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    WHERE a.organization_id = _org_id
      AND a.account_type IN ('revenue', 'expense')
  ), balance_accounts AS (
    SELECT
      a.id,
      a.account_code,
      a.account_name,
      a.account_name_ar,
      a.account_type,
      CASE
        WHEN a.account_type = 'asset'
          THEN COALESCE(l.total_debit, 0) - COALESCE(l.total_credit, 0)
        ELSE COALESCE(l.total_credit, 0) - COALESCE(l.total_debit, 0)
      END AS balance
    FROM public.chart_of_accounts a
    LEFT JOIN ledger l ON l.account_id = a.id
    WHERE a.organization_id = _org_id
      AND a.is_active
      AND a.account_type IN ('asset', 'liability', 'equity')
      AND a.account_code <> '3999'
  )
  SELECT
    b.id, b.account_code, b.account_name, b.account_name_ar,
    b.account_type, b.balance, false, v_currency
  FROM balance_accounts b
  WHERE ABS(b.balance) >= 0.005

  UNION ALL

  SELECT
    a.id, a.account_code, a.account_name, a.account_name_ar,
    a.account_type, c.amount, true, v_currency
  FROM current_earnings c
  JOIN public.chart_of_accounts a
    ON a.organization_id = _org_id
   AND a.account_code = '3999'
   AND a.account_type = 'equity'
  WHERE ABS(c.amount) >= 0.005

  ORDER BY 5, 2;
END;
$$;

REVOKE ALL ON FUNCTION public.get_balance_sheet_v2(uuid,date,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet_v2(uuid,date,text)
  TO authenticated, service_role;

COMMIT;
