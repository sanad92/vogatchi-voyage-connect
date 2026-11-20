CREATE OR REPLACE FUNCTION public.list_legacy_supplier_cash_payout_review(_org uuid, _offset integer DEFAULT 0)
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
  supplier_name text,
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
    RAISE EXCEPTION 'treasury_supplier_cash_review_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, coalesce(p.paid_date, p.payment_date)::date, p.amount::numeric, p.currency::text,
    p.reference_number::text, NULL::text, b.id, b.booking_number::text,
    NULL::uuid, NULL::text, s.name::text, 'supplier_cash_treasury_missing'::text
  FROM public.supplier_payments p
  LEFT JOIN public.bookings b ON b.id = p.booking_id AND b.organization_id = p.organization_id
  LEFT JOIN public.suppliers s ON s.id = p.supplier_id AND s.organization_id = p.organization_id
  WHERE p.organization_id = _org
    AND p.status IN ('paid', 'completed')
    AND p.payment_method = 'cash'
    AND p.treasury_account_id IS NULL
    AND p.amount > 0
  ORDER BY coalesce(p.paid_date, p.payment_date) DESC NULLS LAST, p.id DESC
  LIMIT 51 OFFSET greatest(coalesce(_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_legacy_supplier_cash_payout_review(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_legacy_supplier_cash_payout_review(uuid, integer) TO authenticated;
