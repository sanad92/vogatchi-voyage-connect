CREATE INDEX bank_transactions_legacy_receipt_review_idx ON public.bank_account_transactions
  (organization_id, bank_account_id, transaction_date, reference_number, amount)
  WHERE source_type IS NULL AND source_id IS NULL AND transaction_type IN ('deposit', 'credit', 'income');

CREATE FUNCTION public.list_treasury_receipt_review(_org uuid, _offset integer DEFAULT 0)
RETURNS TABLE (
  payment_id uuid,
  payment_date date,
  amount numeric,
  currency text,
  reference_number text,
  account_name text,
  booking_id uuid,
  booking_number text,
  invoice_id uuid,
  invoice_number text,
  reason text
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _org), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_org, auth.uid(), 'financial_view') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'treasury_receipt_review_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH receipts AS (
    SELECT p.*,
      count(*) OVER (PARTITION BY p.treasury_account_id, p.payment_date, p.currency,
        p.amount, p.reference_number, p.invoice_id) AS same_receipt_count
    FROM public.customer_payments p
    WHERE p.organization_id = _org AND p.status = 'completed' AND p.is_demo IS NOT TRUE
      AND (p.treasury_account_id IS NOT NULL OR p.payment_method = 'cash')
  )
  SELECT p.id, p.payment_date, p.amount, p.currency, p.reference_number, a.account_name, b.id, b.booking_number,
    i.id, i.invoice_number,
    CASE WHEN p.treasury_account_id IS NULL THEN 'account_missing' ELSE 'deposit_unmatched' END
  FROM receipts p
  LEFT JOIN public.bank_accounts a ON a.id = p.treasury_account_id AND a.organization_id = _org
  LEFT JOIN public.invoices i ON i.id = p.invoice_id AND i.organization_id = _org
  LEFT JOIN public.bookings b ON b.id = coalesce(p.booking_id, i.booking_id) AND b.organization_id = _org
  WHERE p.treasury_account_id IS NULL OR (
    -- New entries carry the receipt UUID.
    NOT EXISTS (
      SELECT 1 FROM public.bank_account_transactions m
      WHERE m.organization_id = _org AND m.source_type = 'customer_payment' AND m.source_id = p.id
        AND m.bank_account_id = p.treasury_account_id AND m.transaction_type IN ('deposit', 'credit', 'income')
        AND m.transaction_date = p.payment_date AND m.amount = p.amount
        AND coalesce(m.currency, a.currency) = p.currency
    )
    AND NOT (
      -- A historical reference qualifies only when it identifies a unique pair.
      p.same_receipt_count = 1 AND nullif(btrim(p.reference_number), '') IS NOT NULL
      AND (SELECT count(*) FROM public.bank_account_transactions m
        WHERE m.organization_id = _org AND m.bank_account_id = p.treasury_account_id
          AND m.source_type IS NULL AND m.source_id IS NULL AND m.transaction_type IN ('deposit', 'credit', 'income')
          AND m.transaction_date = p.payment_date AND m.amount = p.amount AND m.reference_number = p.reference_number
          AND m.related_invoice_id IS NOT DISTINCT FROM p.invoice_id AND coalesce(m.currency, a.currency) = p.currency
      ) = 1
    )
  )
  ORDER BY p.payment_date DESC, p.id DESC
  LIMIT 51 OFFSET greatest(coalesce(_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_treasury_receipt_review(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_treasury_receipt_review(uuid, integer) TO authenticated;
