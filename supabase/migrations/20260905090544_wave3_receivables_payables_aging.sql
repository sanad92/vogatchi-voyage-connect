-- Wave 3: auditable customer and supplier aging with ledger reconciliation.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_customer_aging_details_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP',
  _customer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  customer_id uuid,
  customer_name text,
  issued_date date,
  due_date date,
  original_amount numeric,
  paid_as_of numeric,
  outstanding_amount numeric,
  days_overdue integer,
  aging_bucket text,
  booking_id uuid,
  booking_type text,
  currency text,
  is_historical_estimate boolean,
  is_date_corrected boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_as_of date := COALESCE(_as_of_date, CURRENT_DATE);
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH allocation_totals AS (
    SELECT
      a.invoice_id,
      COUNT(*) AS allocation_count,
      COALESCE(SUM(a.amount) FILTER (
        WHERE COALESCE(p.payment_date, a.created_at::date) <= v_as_of
          AND COALESCE(lower(p.status), '') NOT IN ('cancelled', 'canceled', 'void', 'rejected', 'draft')
      ), 0) AS allocated_as_of
    FROM public.customer_payment_allocations a
    JOIN public.customer_payments p
      ON p.id = a.payment_id
     AND p.organization_id = a.organization_id
    WHERE a.organization_id = _org_id
    GROUP BY a.invoice_id
  ), prepared AS (
    SELECT
      i.id,
      i.invoice_number,
      i.customer_id,
      COALESCE(NULLIF(i.customer_name, ''), c.name, 'عميل غير محدد') AS customer_name,
      COALESCE(i.issued_date, i.created_at::date) AS issued_date,
      CASE
        WHEN i.due_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31' THEN i.due_date
        ELSE COALESCE(i.issued_date, i.created_at::date)
      END AS effective_due_date,
      COALESCE(i.final_amount, 0) AS original_amount,
      CASE
        WHEN COALESCE(a.allocation_count, 0) > 0 THEN COALESCE(a.allocated_as_of, 0)
        WHEN v_as_of >= CURRENT_DATE THEN COALESCE(i.total_paid_amount, 0)
        ELSE 0
      END AS paid_as_of,
      i.booking_id,
      i.booking_type,
      upper(i.currency) AS currency,
      v_as_of < CURRENT_DATE
        AND COALESCE(a.allocation_count, 0) = 0
        AND COALESCE(i.total_paid_amount, 0) > 0 AS is_historical_estimate,
      i.due_date IS NULL
        OR i.due_date < DATE '2000-01-01'
        OR i.due_date > DATE '2100-12-31' AS is_date_corrected
    FROM public.invoices i
    LEFT JOIN public.customers c
      ON c.id = i.customer_id
     AND c.organization_id = i.organization_id
    LEFT JOIN allocation_totals a ON a.invoice_id = i.id
    WHERE i.organization_id = _org_id
      AND upper(i.currency) = v_currency
      AND (_customer_id IS NULL OR i.customer_id = _customer_id)
      AND COALESCE(i.issued_date, i.created_at::date) <= v_as_of
      AND COALESCE(lower(i.status), '') NOT IN ('cancelled', 'canceled', 'void', 'draft')
  ), outstanding AS (
    SELECT p.*, GREATEST(p.original_amount - p.paid_as_of, 0) AS remaining
    FROM prepared p
  )
  SELECT
    o.id,
    o.invoice_number,
    o.customer_id,
    o.customer_name,
    o.issued_date,
    o.effective_due_date,
    o.original_amount,
    o.paid_as_of,
    o.remaining,
    GREATEST(v_as_of - o.effective_due_date, 0),
    CASE
      WHEN v_as_of <= o.effective_due_date THEN 'current'
      WHEN v_as_of - o.effective_due_date <= 30 THEN '1-30'
      WHEN v_as_of - o.effective_due_date <= 60 THEN '31-60'
      WHEN v_as_of - o.effective_due_date <= 90 THEN '61-90'
      ELSE 'over-90'
    END,
    o.booking_id,
    o.booking_type,
    o.currency,
    o.is_historical_estimate,
    o.is_date_corrected
  FROM outstanding o
  WHERE o.remaining >= 0.005
  ORDER BY o.effective_due_date, o.invoice_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_aging_details_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP',
  _supplier_id uuid DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  supplier_id uuid,
  supplier_name text,
  issued_date date,
  due_date date,
  original_amount numeric,
  paid_as_of numeric,
  outstanding_amount numeric,
  days_overdue integer,
  aging_bucket text,
  booking_id uuid,
  currency text,
  is_historical_estimate boolean,
  is_date_corrected boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_as_of date := COALESCE(_as_of_date, CURRENT_DATE);
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH allocation_totals AS (
    SELECT
      a.supplier_invoice_id,
      COUNT(*) AS allocation_count,
      COALESCE(SUM(a.amount) FILTER (
        WHERE COALESCE(p.payment_date, p.paid_date, a.created_at::date) <= v_as_of
          AND COALESCE(lower(p.status), '') NOT IN ('cancelled', 'canceled', 'void', 'rejected', 'draft')
      ), 0) AS allocated_as_of
    FROM public.supplier_payment_allocations a
    JOIN public.supplier_payments p
      ON p.id = a.supplier_payment_id
     AND p.organization_id = a.organization_id
    WHERE a.organization_id = _org_id
      AND a.supplier_invoice_id IS NOT NULL
    GROUP BY a.supplier_invoice_id
  ), prepared AS (
    SELECT
      i.id,
      i.invoice_number,
      i.supplier_id,
      COALESCE(NULLIF(s.name, ''), 'مورد غير محدد') AS supplier_name,
      COALESCE(i.invoice_date, i.created_at::date) AS issued_date,
      CASE
        WHEN i.due_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31' THEN i.due_date
        ELSE COALESCE(i.invoice_date, i.created_at::date)
      END AS effective_due_date,
      COALESCE(i.amount, 0) AS original_amount,
      CASE
        WHEN COALESCE(a.allocation_count, 0) > 0 THEN COALESCE(a.allocated_as_of, 0)
        WHEN v_as_of >= CURRENT_DATE THEN COALESCE(i.amount_paid, 0)
        ELSE 0
      END AS paid_as_of,
      i.booking_id,
      upper(i.currency) AS currency,
      v_as_of < CURRENT_DATE
        AND COALESCE(a.allocation_count, 0) = 0
        AND COALESCE(i.amount_paid, 0) > 0 AS is_historical_estimate,
      i.due_date IS NULL
        OR i.due_date < DATE '2000-01-01'
        OR i.due_date > DATE '2100-12-31' AS is_date_corrected
    FROM public.supplier_invoices i
    LEFT JOIN public.suppliers s
      ON s.id = i.supplier_id
     AND s.organization_id = i.organization_id
    LEFT JOIN allocation_totals a ON a.supplier_invoice_id = i.id
    WHERE i.organization_id = _org_id
      AND upper(i.currency) = v_currency
      AND (_supplier_id IS NULL OR i.supplier_id = _supplier_id)
      AND COALESCE(i.invoice_date, i.created_at::date) <= v_as_of
      AND COALESCE(lower(i.status), '') NOT IN ('cancelled', 'canceled', 'void', 'draft')
  ), outstanding AS (
    SELECT p.*, GREATEST(p.original_amount - p.paid_as_of, 0) AS remaining
    FROM prepared p
  )
  SELECT
    o.id,
    o.invoice_number,
    o.supplier_id,
    o.supplier_name,
    o.issued_date,
    o.effective_due_date,
    o.original_amount,
    o.paid_as_of,
    o.remaining,
    GREATEST(v_as_of - o.effective_due_date, 0),
    CASE
      WHEN v_as_of <= o.effective_due_date THEN 'current'
      WHEN v_as_of - o.effective_due_date <= 30 THEN '1-30'
      WHEN v_as_of - o.effective_due_date <= 60 THEN '31-60'
      WHEN v_as_of - o.effective_due_date <= 90 THEN '61-90'
      ELSE 'over-90'
    END,
    o.booking_id,
    o.currency,
    o.is_historical_estimate,
    o.is_date_corrected
  FROM outstanding o
  WHERE o.remaining >= 0.005
  ORDER BY o.effective_due_date, o.invoice_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_aging_control_totals_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP'
)
RETURNS TABLE (
  entity_type text,
  aging_total numeric,
  control_balance numeric,
  difference numeric,
  historical_estimate_count integer,
  corrected_date_count integer,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_as_of date := COALESCE(_as_of_date, CURRENT_DATE);
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH ledger AS (
    SELECT
      a.account_code,
      COALESCE(SUM(l.debit), 0) AS debit,
      COALESCE(SUM(l.credit), 0) AS credit
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    WHERE e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND e.entry_date <= v_as_of
      AND a.organization_id = _org_id
      AND a.account_code IN ('1100', '2000')
    GROUP BY a.account_code
  ), customer_totals AS (
    SELECT
      COALESCE(SUM(d.outstanding_amount), 0) AS aging_total,
      COUNT(*) FILTER (WHERE d.is_historical_estimate)::integer AS estimate_count,
      COUNT(*) FILTER (WHERE d.is_date_corrected)::integer AS corrected_count
    FROM public.get_customer_aging_details_v2(_org_id, v_as_of, v_currency, NULL) d
  ), supplier_totals AS (
    SELECT
      COALESCE(SUM(d.outstanding_amount), 0) AS aging_total,
      COUNT(*) FILTER (WHERE d.is_historical_estimate)::integer AS estimate_count,
      COUNT(*) FILTER (WHERE d.is_date_corrected)::integer AS corrected_count
    FROM public.get_supplier_aging_details_v2(_org_id, v_as_of, v_currency, NULL) d
  ), controls AS (
    SELECT
      COALESCE(MAX(debit - credit) FILTER (WHERE account_code = '1100'), 0) AS customer_control,
      COALESCE(MAX(credit - debit) FILTER (WHERE account_code = '2000'), 0) AS supplier_control
    FROM ledger
  )
  SELECT 'customer', c.aging_total, x.customer_control,
         c.aging_total - x.customer_control, c.estimate_count, c.corrected_count, v_currency
  FROM customer_totals c CROSS JOIN controls x
  UNION ALL
  SELECT 'supplier', s.aging_total, x.supplier_control,
         s.aging_total - x.supplier_control, s.estimate_count, s.corrected_count, v_currency
  FROM supplier_totals s CROSS JOIN controls x;
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_aging_details_v2(uuid,date,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_supplier_aging_details_v2(uuid,date,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_aging_control_totals_v2(uuid,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_aging_details_v2(uuid,date,text,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_supplier_aging_details_v2(uuid,date,text,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_aging_control_totals_v2(uuid,date,text) TO authenticated, service_role;

COMMIT;
