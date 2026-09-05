-- Wave 3: auditable direct-method cash flow statement reconciled to posted
-- Cash and Bank control-account movements, without mixing currencies.

BEGIN;

CREATE OR REPLACE FUNCTION public._cash_flow_category(
  _source_type text,
  _reference_type text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN lower(COALESCE(_source_type, _reference_type, '')) IN
      ('customer_payment', 'legacy_invoice_receipt')
      THEN 'customer_collection'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) IN
      ('supplier_payment', 'legacy_supplier_settlement')
      THEN 'supplier_payment'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) IN
      ('expense', 'expense_payment', 'rent_payment', 'salary_payment',
       'commission_payment', 'commission_period_payment', 'tax_payment')
      THEN 'operating_expense'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) LIKE '%refund%'
      THEN 'refund'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) ~
      '(capital|equity|loan|borrow|dividend|financ)'
      THEN 'financing'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) ~
      '(asset_purchase|asset_sale|investment|investing)'
      THEN 'investing'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) = 'launch_opening_balance'
      THEN 'opening_adjustment'
    WHEN lower(COALESCE(_source_type, _reference_type, '')) LIKE '%transfer%'
      THEN 'internal_transfer'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_v2(
  _org_id uuid,
  _start_date date,
  _end_date date,
  _currency text DEFAULT 'EGP',
  _cash_account_id uuid DEFAULT NULL,
  _cost_center_id uuid DEFAULT NULL,
  _booking_type text DEFAULT NULL
)
RETURNS TABLE (
  period_date date,
  opening_balance numeric,
  inflows numeric,
  outflows numeric,
  net_flow numeric,
  closing_balance numeric,
  operating_inflows numeric,
  operating_outflows numeric,
  investing_inflows numeric,
  investing_outflows numeric,
  financing_inflows numeric,
  financing_outflows numeric,
  other_inflows numeric,
  other_outflows numeric,
  entry_count bigint,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
  v_booking_type text := lower(NULLIF(trim(_booking_type), ''));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _start_date IS NULL OR _end_date IS NULL THEN
    RAISE EXCEPTION 'Start date and end date are required';
  END IF;
  IF _start_date > _end_date THEN
    RAISE EXCEPTION 'Start date must not be after end date';
  END IF;
  IF _cash_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = _cash_account_id
      AND a.organization_id = _org_id
      AND a.account_code IN ('1000', '1010')
  ) THEN
    RAISE EXCEPTION 'Cash account does not belong to the organization';
  END IF;
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
  END IF;

  RETURN QUERY
  WITH cash_entries AS (
    SELECT
      e.id,
      e.entry_date,
      public._cash_flow_category(e.source_type, e.reference_type) AS flow_category,
      SUM(l.debit - l.credit)::numeric AS cash_change
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN public.bookings b
      ON b.id = e.booking_id AND b.organization_id = e.organization_id
    WHERE e.organization_id = _org_id
      AND e.status = 'posted'
      AND upper(e.currency) = v_currency
      AND e.entry_date <= _end_date
      AND a.organization_id = _org_id
      AND a.account_code IN ('1000', '1010')
      AND (_cash_account_id IS NULL OR a.id = _cash_account_id)
      AND (
        _cost_center_id IS NULL OR EXISTS (
          SELECT 1 FROM public.journal_entry_lines cl
          WHERE cl.journal_entry_id = e.id AND cl.cost_center_id = _cost_center_id
        )
      )
      AND (v_booking_type IS NULL OR lower(b.booking_type) = v_booking_type)
    GROUP BY e.id, e.entry_date, e.source_type, e.reference_type
  ), opening AS (
    SELECT COALESCE(SUM(ce.cash_change), 0)::numeric AS amount
    FROM cash_entries ce
    WHERE ce.entry_date < _start_date
  ), daily AS (
    SELECT
      ce.entry_date,
      SUM(GREATEST(ce.cash_change, 0))::numeric AS inflows,
      SUM(GREATEST(-ce.cash_change, 0))::numeric AS outflows,
      SUM(ce.cash_change)::numeric AS net_flow,
      SUM(CASE WHEN ce.flow_category IN
                    ('customer_collection', 'supplier_payment', 'operating_expense', 'refund')
               THEN GREATEST(ce.cash_change, 0) ELSE 0 END)::numeric AS operating_inflows,
      SUM(CASE WHEN ce.flow_category IN ('supplier_payment', 'operating_expense', 'refund')
               THEN GREATEST(-ce.cash_change, 0) ELSE 0 END)::numeric AS operating_outflows,
      SUM(CASE WHEN ce.flow_category = 'investing'
               THEN GREATEST(ce.cash_change, 0) ELSE 0 END)::numeric AS investing_inflows,
      SUM(CASE WHEN ce.flow_category = 'investing'
               THEN GREATEST(-ce.cash_change, 0) ELSE 0 END)::numeric AS investing_outflows,
      SUM(CASE WHEN ce.flow_category = 'financing'
               THEN GREATEST(ce.cash_change, 0) ELSE 0 END)::numeric AS financing_inflows,
      SUM(CASE WHEN ce.flow_category = 'financing'
               THEN GREATEST(-ce.cash_change, 0) ELSE 0 END)::numeric AS financing_outflows,
      SUM(CASE WHEN ce.flow_category NOT IN
                    ('customer_collection', 'supplier_payment', 'operating_expense',
                     'refund', 'investing', 'financing')
               THEN GREATEST(ce.cash_change, 0) ELSE 0 END)::numeric AS other_inflows,
      SUM(CASE WHEN ce.flow_category NOT IN
                    ('customer_collection', 'supplier_payment', 'operating_expense',
                     'refund', 'investing', 'financing')
               THEN GREATEST(-ce.cash_change, 0) ELSE 0 END)::numeric AS other_outflows,
      COUNT(*) FILTER (WHERE ABS(ce.cash_change) >= 0.005)::bigint AS entry_count
    FROM cash_entries ce
    WHERE ce.entry_date BETWEEN _start_date AND _end_date
      AND ABS(ce.cash_change) >= 0.005
    GROUP BY ce.entry_date
  ), calendar AS (
    SELECT gs::date AS period_date
    FROM generate_series(
      _start_date::timestamp,
      _end_date::timestamp,
      interval '1 day'
    ) gs
  ), series AS (
    SELECT
      c.period_date,
      COALESCE(d.inflows, 0)::numeric AS inflows,
      COALESCE(d.outflows, 0)::numeric AS outflows,
      COALESCE(d.net_flow, 0)::numeric AS net_flow,
      COALESCE(d.operating_inflows, 0)::numeric AS operating_inflows,
      COALESCE(d.operating_outflows, 0)::numeric AS operating_outflows,
      COALESCE(d.investing_inflows, 0)::numeric AS investing_inflows,
      COALESCE(d.investing_outflows, 0)::numeric AS investing_outflows,
      COALESCE(d.financing_inflows, 0)::numeric AS financing_inflows,
      COALESCE(d.financing_outflows, 0)::numeric AS financing_outflows,
      COALESCE(d.other_inflows, 0)::numeric AS other_inflows,
      COALESCE(d.other_outflows, 0)::numeric AS other_outflows,
      COALESCE(d.entry_count, 0)::bigint AS entry_count
    FROM calendar c
    LEFT JOIN daily d ON d.entry_date = c.period_date
  )
  SELECT
    s.period_date,
    o.amount + COALESCE(SUM(s.net_flow) OVER (
      ORDER BY s.period_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS opening_balance,
    s.inflows,
    s.outflows,
    s.net_flow,
    o.amount + SUM(s.net_flow) OVER (ORDER BY s.period_date) AS closing_balance,
    s.operating_inflows,
    s.operating_outflows,
    s.investing_inflows,
    s.investing_outflows,
    s.financing_inflows,
    s.financing_outflows,
    s.other_inflows,
    s.other_outflows,
    s.entry_count,
    v_currency
  FROM series s
  CROSS JOIN opening o
  ORDER BY s.period_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_details_v2(
  _org_id uuid,
  _start_date date,
  _end_date date,
  _currency text DEFAULT 'EGP',
  _cash_account_id uuid DEFAULT NULL,
  _cost_center_id uuid DEFAULT NULL,
  _booking_type text DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  entry_number text,
  entry_date date,
  description text,
  source_type text,
  source_id uuid,
  booking_id uuid,
  booking_number text,
  flow_category text,
  cash_accounts text,
  cost_centers text,
  inflow numeric,
  outflow numeric,
  net_flow numeric,
  currency text,
  is_locked boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
  v_booking_type text := lower(NULLIF(trim(_booking_type), ''));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _start_date IS NULL OR _end_date IS NULL OR _start_date > _end_date THEN
    RAISE EXCEPTION 'A valid date range is required';
  END IF;
  IF _cash_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = _cash_account_id
      AND a.organization_id = _org_id
      AND a.account_code IN ('1000', '1010')
  ) THEN
    RAISE EXCEPTION 'Cash account does not belong to the organization';
  END IF;
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
  END IF;

  RETURN QUERY
  WITH entry_cash AS (
    SELECT
      e.id,
      e.entry_number,
      e.entry_date,
      e.description,
      e.source_type,
      e.reference_type,
      e.source_id,
      e.reference_id,
      e.booking_id,
      b.booking_number,
      e.is_locked,
      string_agg(DISTINCT COALESCE(a.account_name_ar, a.account_name), '، '
                 ORDER BY COALESCE(a.account_name_ar, a.account_name)) AS cash_accounts,
      SUM(l.debit - l.credit)::numeric AS cash_change
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN public.bookings b
      ON b.id = e.booking_id AND b.organization_id = e.organization_id
    WHERE e.organization_id = _org_id
      AND e.status = 'posted'
      AND upper(e.currency) = v_currency
      AND e.entry_date BETWEEN _start_date AND _end_date
      AND a.organization_id = _org_id
      AND a.account_code IN ('1000', '1010')
      AND (_cash_account_id IS NULL OR a.id = _cash_account_id)
      AND (
        _cost_center_id IS NULL OR EXISTS (
          SELECT 1 FROM public.journal_entry_lines cl
          WHERE cl.journal_entry_id = e.id AND cl.cost_center_id = _cost_center_id
        )
      )
      AND (v_booking_type IS NULL OR lower(b.booking_type) = v_booking_type)
    GROUP BY
      e.id, e.entry_number, e.entry_date, e.description, e.source_type,
      e.reference_type, e.source_id, e.reference_id, e.booking_id,
      b.booking_number, e.is_locked
  )
  SELECT
    ec.id,
    ec.entry_number,
    ec.entry_date,
    ec.description,
    COALESCE(ec.source_type, ec.reference_type),
    COALESCE(ec.source_id, ec.reference_id),
    ec.booking_id,
    ec.booking_number,
    public._cash_flow_category(ec.source_type, ec.reference_type),
    ec.cash_accounts,
    COALESCE((
      SELECT string_agg(DISTINCT COALESCE(cc.name_ar, cc.name), '، '
                        ORDER BY COALESCE(cc.name_ar, cc.name))
      FROM public.journal_entry_lines jl
      JOIN public.cost_centers cc ON cc.id = jl.cost_center_id
      WHERE jl.journal_entry_id = ec.id
    ), ''),
    GREATEST(ec.cash_change, 0),
    GREATEST(-ec.cash_change, 0),
    ec.cash_change,
    v_currency,
    ec.is_locked
  FROM entry_cash ec
  WHERE ABS(ec.cash_change) >= 0.005
  ORDER BY ec.entry_date, ec.entry_number, ec.id;
END;
$$;

REVOKE ALL ON FUNCTION public._cash_flow_category(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_cash_flow_v2(uuid,date,date,text,uuid,uuid,text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_cash_flow_details_v2(uuid,date,date,text,uuid,uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_v2(uuid,date,date,text,uuid,uuid,text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_details_v2(uuid,date,date,text,uuid,uuid,text)
  TO authenticated, service_role;

COMMIT;
