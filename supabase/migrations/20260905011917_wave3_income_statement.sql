-- Wave 3: currency-safe, cost-center and booking-type aware income statement.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_income_statement_v2(
  _org_id uuid,
  _start_date date,
  _end_date date,
  _currency text DEFAULT 'EGP',
  _cost_center_id uuid DEFAULT NULL,
  _booking_type text DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_name_ar text,
  account_type public.account_type,
  section text,
  amount numeric,
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
  IF _cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.cost_centers cc
    WHERE cc.id = _cost_center_id
      AND cc.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Cost center does not belong to the organization';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.account_code,
    a.account_name,
    a.account_name_ar,
    a.account_type,
    CASE
      WHEN a.account_type = 'revenue' THEN 'revenue'
      WHEN a.account_code LIKE '5%' THEN 'cost_of_sales'
      ELSE 'operating_expense'
    END AS section,
    CASE
      WHEN a.account_type = 'revenue'
        THEN COALESCE(SUM(l.credit - l.debit), 0)
      ELSE COALESCE(SUM(l.debit - l.credit), 0)
    END AS amount,
    COUNT(DISTINCT e.id) AS entry_count,
    v_currency
  FROM public.chart_of_accounts a
  JOIN public.journal_entry_lines l ON l.account_id = a.id
  JOIN public.journal_entries e ON e.id = l.journal_entry_id
  LEFT JOIN public.bookings b
    ON b.id = e.booking_id
   AND b.organization_id = e.organization_id
  WHERE a.organization_id = _org_id
    AND a.is_active
    AND a.account_type IN ('revenue', 'expense')
    AND e.organization_id = _org_id
    AND e.status = 'posted'
    AND e.currency = v_currency
    AND e.entry_date BETWEEN _start_date AND _end_date
    AND (_cost_center_id IS NULL OR l.cost_center_id = _cost_center_id)
    AND (v_booking_type IS NULL OR lower(b.booking_type) = v_booking_type)
  GROUP BY
    a.id, a.account_code, a.account_name, a.account_name_ar, a.account_type
  HAVING ABS(
    CASE
      WHEN a.account_type = 'revenue' THEN SUM(l.credit - l.debit)
      ELSE SUM(l.debit - l.credit)
    END
  ) >= 0.005
  ORDER BY
    CASE
      WHEN a.account_type = 'revenue' THEN 1
      WHEN a.account_code LIKE '5%' THEN 2
      ELSE 3
    END,
    a.account_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_income_statement_v2(uuid,date,date,text,uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_income_statement_v2(uuid,date,date,text,uuid,text)
  TO authenticated, service_role;

COMMIT;
