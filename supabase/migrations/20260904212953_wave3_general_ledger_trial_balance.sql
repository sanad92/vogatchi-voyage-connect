-- Wave 3: currency-safe, cost-center-aware General Ledger and Trial Balance.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_general_ledger_v2(
  _org_id uuid,
  _account_id uuid,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP',
  _cost_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  line_id uuid,
  entry_date date,
  entry_number text,
  description text,
  line_description text,
  source_type text,
  source_id uuid,
  booking_id uuid,
  reference_type text,
  reference_id uuid,
  cost_center_id uuid,
  cost_center_code text,
  cost_center_name text,
  debit numeric,
  credit numeric,
  movement numeric,
  opening_balance numeric,
  running_balance numeric,
  currency text,
  status text,
  is_locked boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_type public.account_type;
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
  v_opening numeric := 0;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _start_date IS NOT NULL AND _end_date IS NOT NULL AND _start_date > _end_date THEN
    RAISE EXCEPTION 'Start date must not be after end date';
  END IF;
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
  END IF;

  SELECT a.account_type INTO v_account_type
  FROM public.chart_of_accounts a
  WHERE a.id = _account_id AND a.organization_id = _org_id;
  IF v_account_type IS NULL THEN RETURN; END IF;

  IF _start_date IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE WHEN v_account_type IN ('asset', 'expense')
        THEN COALESCE(l.debit, 0) - COALESCE(l.credit, 0)
        ELSE COALESCE(l.credit, 0) - COALESCE(l.debit, 0)
      END
    ), 0)
    INTO v_opening
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE l.account_id = _account_id
      AND e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND e.entry_date < _start_date
      AND (_cost_center_id IS NULL OR l.cost_center_id = _cost_center_id);
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT
      e.id AS entry_id,
      l.id AS line_id,
      e.entry_date,
      e.entry_number,
      e.description,
      l.description AS line_description,
      e.source_type,
      e.source_id,
      e.booking_id,
      e.reference_type,
      e.reference_id,
      l.cost_center_id,
      cc.code AS cost_center_code,
      COALESCE(cc.name_ar, cc.name) AS cost_center_name,
      COALESCE(l.debit, 0) AS debit,
      COALESCE(l.credit, 0) AS credit,
      CASE WHEN v_account_type IN ('asset', 'expense')
        THEN COALESCE(l.debit, 0) - COALESCE(l.credit, 0)
        ELSE COALESCE(l.credit, 0) - COALESCE(l.debit, 0)
      END AS movement,
      e.currency,
      e.status,
      e.is_locked
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    LEFT JOIN public.cost_centers cc
      ON cc.id = l.cost_center_id AND cc.organization_id = e.organization_id
    WHERE l.account_id = _account_id
      AND e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND (_start_date IS NULL OR e.entry_date >= _start_date)
      AND (_end_date IS NULL OR e.entry_date <= _end_date)
      AND (_cost_center_id IS NULL OR l.cost_center_id = _cost_center_id)
  )
  SELECT
    m.entry_id, m.line_id, m.entry_date, m.entry_number,
    m.description, m.line_description, m.source_type, m.source_id,
    m.booking_id, m.reference_type, m.reference_id,
    m.cost_center_id, m.cost_center_code, m.cost_center_name,
    m.debit, m.credit, m.movement, v_opening,
    v_opening + SUM(m.movement) OVER (
      ORDER BY m.entry_date, m.entry_number, m.line_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    m.currency, m.status, m.is_locked
  FROM movements m
  ORDER BY m.entry_date, m.entry_number, m.line_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_general_ledger_v2(uuid,uuid,date,date,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_ledger_v2(uuid,uuid,date,date,text,uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_general_ledger_summary_v2(
  _org_id uuid,
  _account_id uuid,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP',
  _cost_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  opening_balance numeric,
  total_debit numeric,
  total_credit numeric,
  net_movement numeric,
  closing_balance numeric,
  transaction_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_type public.account_type;
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _start_date IS NOT NULL AND _end_date IS NOT NULL AND _start_date > _end_date THEN
    RAISE EXCEPTION 'Start date must not be after end date';
  END IF;
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
  END IF;
  SELECT a.account_type INTO v_account_type
  FROM public.chart_of_accounts a
  WHERE a.id = _account_id AND a.organization_id = _org_id;
  IF v_account_type IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT e.id, e.entry_date, COALESCE(l.debit, 0) AS debit, COALESCE(l.credit, 0) AS credit
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE l.account_id = _account_id
      AND e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND (_end_date IS NULL OR e.entry_date <= _end_date)
      AND (_cost_center_id IS NULL OR l.cost_center_id = _cost_center_id)
  ), totals AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN _start_date IS NOT NULL AND entry_date < _start_date
        THEN CASE WHEN v_account_type IN ('asset', 'expense')
          THEN debit - credit ELSE credit - debit END
        ELSE 0 END), 0) AS opening,
      COALESCE(SUM(CASE WHEN _start_date IS NULL OR entry_date >= _start_date THEN debit ELSE 0 END), 0) AS debit,
      COALESCE(SUM(CASE WHEN _start_date IS NULL OR entry_date >= _start_date THEN credit ELSE 0 END), 0) AS credit,
      COUNT(DISTINCT id) FILTER (WHERE _start_date IS NULL OR entry_date >= _start_date) AS entries
    FROM scoped
  )
  SELECT
    t.opening,
    t.debit,
    t.credit,
    CASE WHEN v_account_type IN ('asset', 'expense')
      THEN t.debit - t.credit ELSE t.credit - t.debit END,
    t.opening + CASE WHEN v_account_type IN ('asset', 'expense')
      THEN t.debit - t.credit ELSE t.credit - t.debit END,
    t.entries
  FROM totals t;
END;
$$;

REVOKE ALL ON FUNCTION public.get_general_ledger_summary_v2(uuid,uuid,date,date,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_ledger_summary_v2(uuid,uuid,date,date,text,uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_trial_balance_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP',
  _cost_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_name_ar text,
  account_type public.account_type,
  total_debit numeric,
  total_credit numeric,
  balance numeric,
  debit_balance numeric,
  credit_balance numeric,
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
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
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
      AND (_cost_center_id IS NULL OR l.cost_center_id = _cost_center_id)
    GROUP BY l.account_id
  ), balances AS (
    SELECT
      a.id,
      a.account_code,
      a.account_name,
      a.account_name_ar,
      a.account_type,
      COALESCE(l.total_debit, 0) AS total_debit,
      COALESCE(l.total_credit, 0) AS total_credit,
      COALESCE(l.total_debit, 0) - COALESCE(l.total_credit, 0) AS balance
    FROM public.chart_of_accounts a
    LEFT JOIN ledger l ON l.account_id = a.id
    WHERE a.organization_id = _org_id AND a.is_active
  )
  SELECT
    b.id, b.account_code, b.account_name, b.account_name_ar, b.account_type,
    b.total_debit, b.total_credit, b.balance,
    GREATEST(b.balance, 0), GREATEST(-b.balance, 0), v_currency
  FROM balances b
  ORDER BY b.account_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_trial_balance_v2(uuid,date,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_v2(uuid,date,text,uuid)
  TO authenticated, service_role;

COMMIT;
