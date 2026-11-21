-- X01 #149: dated customer cancellation credits in aging snapshots.
-- Requires #147 wallet settlement migration; never run directly in production.
-- Supplier cancellation evidence requires a separately verified supplier source.
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
  IF NOT COALESCE(public._can_read_org_finance(_org_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH eligible_invoices AS (
    SELECT i.*
    FROM public.invoices i
    WHERE i.organization_id = _org_id
      AND upper(i.currency) = v_currency
      AND (_customer_id IS NULL OR i.customer_id = _customer_id)
      AND COALESCE(i.issued_date, i.created_at::date) <= v_as_of
      AND (
        COALESCE(lower(i.status), '') NOT IN ('cancelled', 'canceled', 'void', 'draft')
        OR (
          lower(i.status) IN ('cancelled', 'canceled')
          AND EXISTS (
            SELECT 1 FROM public.journal_entries original
            WHERE original.organization_id = i.organization_id
              AND original.source_type = 'invoice' AND original.source_id = i.id
              AND original.status = 'posted' AND original.entry_date <= v_as_of
          )
          AND EXISTS (
            SELECT 1 FROM public.booking_cancellation_invoice_credits c
            JOIN public.journal_entries j
              ON j.source_id = c.id AND j.source_type = 'booking_cancellation_invoice_credit'
              AND j.organization_id = i.organization_id AND j.booking_id = i.booking_id
              AND j.currency = v_currency AND j.status = 'posted' AND j.is_locked
              AND j.total_debit = c.amount AND j.total_credit = c.amount
            WHERE c.invoice_id = i.id AND c.booking_id = i.booking_id
              AND c.amount > 0
          )
        )
      )
  ), cancellation_credits AS (
    SELECT c.invoice_id,
      COALESCE(SUM(c.amount) FILTER (WHERE j.entry_date <= v_as_of), 0) AS credited_as_of,
      COALESCE(SUM(c.amount), 0) AS credited_all_dates
    FROM eligible_invoices i
    JOIN public.booking_cancellation_invoice_credits c
      ON c.invoice_id = i.id AND c.booking_id = i.booking_id
    JOIN public.journal_entries j
      ON j.source_id = c.id
      AND j.source_type = 'booking_cancellation_invoice_credit'
      AND j.organization_id = i.organization_id
      AND j.booking_id = i.booking_id
      AND j.currency = v_currency
      AND j.status = 'posted' AND j.is_locked
      AND j.total_debit = c.amount AND j.total_credit = c.amount
    WHERE c.amount > 0
    GROUP BY c.invoice_id
  ), settlement_events AS MATERIALIZED (
    SELECT s.*
    FROM eligible_invoices i
    JOIN refund_balance_private.invoice_settlement_events s
      ON s.invoice_id = i.id AND s.organization_id = i.organization_id
  ), settlement_totals AS (
    SELECT
      s.invoice_id,
      COALESCE(SUM(s.amount) FILTER (
        WHERE s.currency = v_currency AND s.posted_date <= v_as_of
      ), 0) AS settled_as_of,
      COALESCE(SUM(s.amount) FILTER (WHERE s.currency = v_currency), 0) AS recorded_amount,
      bool_or(s.currency <> v_currency) AS has_currency_mismatch
    FROM settlement_events s
    GROUP BY s.invoice_id
  ), allocation_totals AS (
    SELECT
      a.invoice_id,
      COUNT(*) AS allocation_count,
      COALESCE(SUM(a.amount) FILTER (
        WHERE COALESCE(p.payment_date, a.created_at::date) <= v_as_of
          AND p.status = 'completed'
          AND upper(p.currency) = v_currency AND wallet_source.id IS NULL
      ), 0) AS allocated_as_of,
      COALESCE(SUM(a.amount) FILTER (
        WHERE p.status = 'completed' AND upper(p.currency) = v_currency AND wallet_source.id IS NULL
      ), 0) AS allocated_all_dates
    FROM eligible_invoices i
    JOIN public.customer_payment_allocations a
      ON a.invoice_id = i.id AND a.organization_id = i.organization_id
    JOIN public.customer_payments p
      ON p.id = a.payment_id AND p.organization_id = i.organization_id
    -- The wallet journal is authoritative if a payment record explicitly
    -- shares its source UUID. Keep the allocation in the count so a duplicate
    -- cannot come back through the legacy paid-cache fallback.
    LEFT JOIN settlement_events wallet_source
      ON wallet_source.invoice_id = i.id AND wallet_source.id = p.id
    GROUP BY a.invoice_id
  ), legacy_receipts AS (
    SELECT i.id AS invoice_id,
      SUM(j.total_debit) FILTER (WHERE j.status = 'posted' AND j.entry_date <= v_as_of) AS paid_as_of,
      SUM(j.total_debit) AS recorded_amount
    FROM eligible_invoices i
    JOIN public.journal_entries j
      ON j.organization_id = i.organization_id
      AND j.source_type = 'legacy_invoice_receipt'
      AND j.source_id = i.id
      AND upper(j.currency) = v_currency
    GROUP BY i.id
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
      COALESCE(a.allocated_as_of, 0) + COALESCE(s.settled_as_of, 0) + COALESCE(l.paid_as_of, 0) + COALESCE(cc.credited_as_of, 0)
        + CASE
            WHEN v_as_of >= CURRENT_DATE AND COALESCE(a.allocation_count, 0) = 0
              AND NOT COALESCE(s.has_currency_mismatch, false)
            THEN GREATEST(COALESCE(i.total_paid_amount, 0) - COALESCE(s.recorded_amount, 0) - COALESCE(l.recorded_amount, 0), 0)
            ELSE 0
          END AS paid_as_of,
      i.booking_id,
      i.booking_type,
      upper(i.currency) AS currency,
      v_as_of < CURRENT_DATE
        AND (COALESCE(i.total_paid_amount, 0) >
          COALESCE(a.allocated_all_dates, 0) + COALESCE(s.recorded_amount, 0) + COALESCE(l.recorded_amount, 0)
          -- The legacy receipt writer dates imported receipts to invoice issue.
          OR COALESCE(l.recorded_amount, 0) > 0) AS is_historical_estimate,
      i.due_date IS NULL
        OR i.due_date < DATE '2000-01-01'
        OR i.due_date > DATE '2100-12-31' AS is_date_corrected
    FROM eligible_invoices i
    LEFT JOIN public.customers c
      ON c.id = i.customer_id
     AND c.organization_id = i.organization_id
    LEFT JOIN allocation_totals a ON a.invoice_id = i.id
    LEFT JOIN settlement_totals s ON s.invoice_id = i.id
    LEFT JOIN legacy_receipts l ON l.invoice_id = i.id
    LEFT JOIN cancellation_credits cc ON cc.invoice_id = i.id
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


COMMIT;
