CREATE OR REPLACE FUNCTION public.preview_booking_financial_gaps(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_missing_invoices bigint;
  v_missing_supplier_payments bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public._org_permission_state(_org_id, auth.uid(), 'financial_edit') permission
    WHERE permission.granted AND permission.data_scope = 'organization'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بمراجعة تسويات هذه المؤسسة' USING ERRCODE = '42501';
  END IF;

  SELECT
    count(*) FILTER (
      WHERE b.selling_price > 0 AND NOT EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.booking_id = b.id AND i.organization_id = b.organization_id
      )
    ),
    count(*) FILTER (
      WHERE b.cost_price > 0 AND b.supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.supplier_payments p
        WHERE p.booking_id = b.id AND p.organization_id = b.organization_id
      )
    )
  INTO v_missing_invoices, v_missing_supplier_payments
  FROM public.bookings b
  WHERE b.organization_id = _org_id;

  RETURN jsonb_build_object(
    'bookings_missing_invoice', v_missing_invoices,
    'bookings_missing_supplier_payment', v_missing_supplier_payments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_booking_financial_gaps(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_booking_financial_gaps(uuid) TO authenticated;

-- Retired clients can no longer create inferred invoice or supplier payments.
CREATE OR REPLACE FUNCTION public.reconcile_bookings_for_org(_org_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT public.preview_booking_financial_gaps(_org_id) || jsonb_build_object(
    'success', true, 'mode', 'preview', 'invoices_created', 0, 'payments_created', 0
  );
$$;

REVOKE ALL ON FUNCTION public.reconcile_bookings_for_org(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_bookings_for_org(uuid) TO authenticated;
