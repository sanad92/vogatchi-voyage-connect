
CREATE OR REPLACE FUNCTION public.reconcile_bookings_for_org(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoices_created int := 0;
  v_payments_created int := 0;
BEGIN
  IF NOT (public.user_belongs_to_org(auth.uid(), _org_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'غير مصرح لك بتسوية هذه المؤسسة';
  END IF;

  WITH ins AS (
    INSERT INTO public.invoices (
      invoice_number, booking_id, booking_type, customer_id, customer_name,
      currency, subtotal, vat_rate, vat_amount, discount_amount,
      final_amount, total_paid_amount, remaining_amount,
      status, payment_status, issued_date, due_date, organization_id, notes
    )
    SELECT
      'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(b.id::text, 1, 8),
      b.id, b.booking_type, b.customer_id, b.customer_name,
      COALESCE(b.currency,'EGP'),
      COALESCE(b.selling_price,0), 0, 0, 0,
      COALESCE(b.selling_price,0), COALESCE(b.selling_price,0), 0,
      'paid', 'paid',
      COALESCE(b.start_date, b.created_at::date, CURRENT_DATE),
      COALESCE(b.start_date, b.created_at::date, CURRENT_DATE),
      b.organization_id,
      'تسوية تلقائية - مدفوعة'
    FROM public.bookings b
    WHERE b.organization_id = _org_id
      AND COALESCE(b.selling_price,0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.booking_id = b.id)
    RETURNING 1
  )
  SELECT count(*) INTO v_invoices_created FROM ins;

  WITH ins AS (
    INSERT INTO public.supplier_payments (
      supplier_id, amount, currency, payment_date, paid_date,
      payment_method, reference_number, booking_id, booking_type,
      notes, status, amount_in_egp, exchange_rate
    )
    SELECT
      b.supplier_id, COALESCE(b.cost_price,0), COALESCE(b.currency,'EGP'),
      COALESCE(b.start_date, b.created_at::date, CURRENT_DATE),
      COALESCE(b.start_date, b.created_at::date, CURRENT_DATE),
      'cash',
      'SP-' || substr(b.id::text, 1, 8),
      b.id, b.booking_type,
      'تسوية تلقائية',
      'paid',
      COALESCE(b.cost_price,0), 1
    FROM public.bookings b
    WHERE b.organization_id = _org_id
      AND b.supplier_id IS NOT NULL
      AND COALESCE(b.cost_price,0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.supplier_payments sp WHERE sp.booking_id = b.id)
    RETURNING 1
  )
  SELECT count(*) INTO v_payments_created FROM ins;

  RETURN jsonb_build_object(
    'success', true,
    'invoices_created', v_invoices_created,
    'payments_created', v_payments_created
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_bookings_for_org(uuid) TO authenticated;
