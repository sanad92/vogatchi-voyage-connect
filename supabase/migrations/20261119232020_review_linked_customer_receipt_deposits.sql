CREATE OR REPLACE FUNCTION public.list_treasury_deposit_review(_org uuid, _offset integer DEFAULT 0)
RETURNS TABLE (
  movement_id uuid,
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
    ) OR NOT EXISTS (
      -- Restricted B2B payments also require company-wide invoice access.
      SELECT 1 FROM public._org_permission_state(_org, auth.uid(), 'invoices_view') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'treasury_receipt_review_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.id, m.source_id, m.transaction_date, m.amount, coalesce(m.currency, a.currency),
    m.reference_number, a.account_name, b.id, b.booking_number, i.id, i.invoice_number,
    CASE
      WHEN p.id IS NULL THEN 'receipt_missing'
      WHEN p.status IS DISTINCT FROM 'completed' OR p.is_demo IS TRUE THEN 'receipt_not_current'
      ELSE 'deposit_mismatch'
    END
  FROM public.bank_account_transactions m
  LEFT JOIN public.bank_accounts a ON a.id = m.bank_account_id AND a.organization_id = _org
  LEFT JOIN public.customer_payments p ON p.id = m.source_id AND p.organization_id = _org
  LEFT JOIN public.invoices i ON i.id = coalesce(p.invoice_id, m.related_invoice_id) AND i.organization_id = _org
  LEFT JOIN public.bookings b ON b.id = coalesce(p.booking_id, i.booking_id) AND b.organization_id = _org
  WHERE m.organization_id = _org AND m.source_type = 'customer_payment'
    AND m.transaction_type IN ('deposit', 'credit', 'income')
    AND (
      p.id IS NULL OR p.status IS DISTINCT FROM 'completed' OR p.is_demo IS TRUE
      OR p.treasury_account_id IS DISTINCT FROM m.bank_account_id
      OR p.payment_date IS DISTINCT FROM m.transaction_date
      OR p.amount IS DISTINCT FROM m.amount
      OR p.currency IS DISTINCT FROM coalesce(m.currency, a.currency)
    )
  ORDER BY m.transaction_date DESC, m.id DESC
  LIMIT 51 OFFSET greatest(coalesce(_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_treasury_deposit_review(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_treasury_deposit_review(uuid, integer) TO authenticated;
