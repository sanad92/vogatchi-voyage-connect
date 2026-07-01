
CREATE OR REPLACE FUNCTION public.find_duplicate_customers(_org_id uuid)
RETURNS TABLE(normalized_phone text, customer_count bigint, customer_ids uuid[], names text[], emails text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') AS normalized_phone,
         count(*)::bigint,
         array_agg(id ORDER BY created_at),
         array_agg(coalesce(name, '') ORDER BY created_at),
         array_agg(coalesce(email, '') ORDER BY created_at)
  FROM public.customers
  WHERE organization_id = _org_id
    AND phone IS NOT NULL AND btrim(phone) <> ''
    AND length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) >= 6
  GROUP BY 1
  HAVING count(*) > 1
$$;
REVOKE ALL ON FUNCTION public.find_duplicate_customers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_duplicate_customers(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.merge_customers(_org_id uuid, _keep_id uuid, _merge_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_bookings int := 0; v_invoices int := 0; v_deleted int := 0;
BEGIN
  IF NOT (public.is_platform_admin(auth.uid())
       OR public.get_user_org_role(auth.uid(), _org_id) IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'غير مصرح لك بدمج العملاء';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id=_keep_id AND organization_id=_org_id) THEN
    RAISE EXCEPTION 'العميل الأساسي غير موجود في المؤسسة';
  END IF;
  UPDATE public.bookings SET customer_id=_keep_id, updated_at=now()
   WHERE organization_id=_org_id AND customer_id=ANY(_merge_ids) AND customer_id<>_keep_id;
  GET DIAGNOSTICS v_bookings = ROW_COUNT;
  UPDATE public.invoices SET customer_id=_keep_id, updated_at=now()
   WHERE organization_id=_org_id AND customer_id=ANY(_merge_ids) AND customer_id<>_keep_id;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;
  UPDATE public.quotes SET customer_id=_keep_id, updated_at=now()
   WHERE organization_id=_org_id AND customer_id=ANY(_merge_ids) AND customer_id<>_keep_id;
  DELETE FROM public.customers
   WHERE organization_id=_org_id AND id=ANY(_merge_ids) AND id<>_keep_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('success',true,'kept_customer_id',_keep_id,
    'bookings_moved',v_bookings,'invoices_moved',v_invoices,'customers_deleted',v_deleted);
END $$;
REVOKE ALL ON FUNCTION public.merge_customers(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_customers(uuid, uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_data_quality_details(_org_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'summary', public.get_incomplete_records(_org_id),
    'bookings_no_price', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, booking_number, booking_type, currency, created_at FROM public.bookings
      WHERE organization_id=_org_id AND (selling_price IS NULL OR selling_price=0)
      ORDER BY created_at DESC LIMIT 50) t),
    'bookings_no_supplier', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, booking_number, booking_type, currency, created_at FROM public.bookings
      WHERE organization_id=_org_id AND supplier_id IS NULL
      ORDER BY created_at DESC LIMIT 50) t),
    'bookings_negative_profit', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, booking_number, booking_type, selling_price, cost_price, profit, currency FROM public.bookings
      WHERE organization_id=_org_id AND COALESCE(profit,0)<0
      ORDER BY profit ASC LIMIT 50) t),
    'customers_no_email', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, name, phone FROM public.customers
      WHERE organization_id=_org_id AND (email IS NULL OR btrim(email)='')
      ORDER BY created_at DESC LIMIT 50) t),
    'unpaid_invoices', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT id, invoice_number, customer_name, final_amount, total_paid_amount, currency, status, due_date
      FROM public.invoices WHERE organization_id=_org_id AND status<>'paid'
      ORDER BY due_date NULLS LAST LIMIT 50) t)
  )
$$;
REVOKE ALL ON FUNCTION public.get_data_quality_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_data_quality_details(uuid) TO authenticated;

COMMENT ON TABLE public.hotel_bookings IS 'DEPRECATED — use bookings + booking_hotel_details.';
COMMENT ON TABLE public.flight_bookings IS 'DEPRECATED — use bookings + booking_flight_details.';
COMMENT ON TABLE public.transport_bookings IS 'DEPRECATED — use bookings + booking_transport_details.';
COMMENT ON TABLE public.car_rentals IS 'DEPRECATED — use bookings + booking_car_details.';
