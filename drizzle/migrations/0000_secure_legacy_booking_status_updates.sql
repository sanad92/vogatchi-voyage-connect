CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_booking_type text DEFAULT 'hotel', p_status_id uuid DEFAULT NULL, p_new_status_id uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $function$
DECLARE
  v_status_id uuid := COALESCE(p_status_id,p_new_status_id);
  v_table text;
  v_org uuid;
  v_status text;
  v_permission text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_table := CASE p_booking_type WHEN 'hotel' THEN 'hotel_bookings' WHEN 'flight' THEN 'flight_bookings' WHEN 'transport' THEN 'transport_bookings' WHEN 'car_rental' THEN 'car_rentals' ELSE NULL END;
  IF v_table IS NULL THEN RAISE EXCEPTION 'Unsupported booking type'; END IF;
  SELECT lower(name) INTO v_status FROM public.booking_statuses WHERE id=v_status_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Booking status not found'; END IF;
  EXECUTE format('SELECT organization_id FROM public.%I WHERE id=$1 FOR UPDATE',v_table) INTO v_org USING p_booking_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Booking not found or not accessible'; END IF;
  v_permission := CASE WHEN v_status IN ('cancelled','canceled','refunded') THEN 'bookings_cancel' WHEN v_status='confirmed' THEN 'bookings_confirm' ELSE 'bookings_edit' END;
  IF NOT COALESCE(public.can_org_write(v_org),false) OR NOT COALESCE(public.has_org_permission(v_org,v_permission),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  EXECUTE format('UPDATE public.%I SET status_id=$1,updated_at=now() WHERE id=$2 AND organization_id=$3',v_table) USING v_status_id,p_booking_id,v_org;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'Booking status was not updated'; END IF;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.update_booking_status(uuid,text,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid,text,uuid,uuid,text) TO authenticated,service_role;