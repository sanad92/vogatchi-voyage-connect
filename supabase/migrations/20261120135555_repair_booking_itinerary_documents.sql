-- Hotel requests belong to the hotel service, including when the service is
-- linked to a trip. Restore organization ownership for older saved requests.
UPDATE public.booking_special_requests AS request
SET organization_id = hotel.organization_id
FROM public.hotel_bookings AS hotel
WHERE request.booking_id = hotel.id
  AND request.organization_id IS NULL
  AND hotel.organization_id IS NOT NULL;

CREATE POLICY booking_special_requests_matching_hotel
  ON public.booking_special_requests AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT FROM public.hotel_bookings AS hotel
    WHERE hotel.id = booking_special_requests.booking_id
      AND hotel.organization_id = booking_special_requests.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT FROM public.hotel_bookings AS hotel
    WHERE hotel.id = booking_special_requests.booking_id
      AND hotel.organization_id = booking_special_requests.organization_id
  ));

CREATE FUNCTION public.save_hotel_special_requests(
  _org uuid, _hotel uuid, _types uuid[], _custom text
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_custom text := nullif(btrim(_custom), '');
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.can_org_write(_org), false)
    OR NOT (coalesce(public.has_org_permission(_org, 'bookings_create'), false)
      OR coalesce(public.has_org_permission(_org, 'bookings_edit'), false)) THEN
    RAISE EXCEPTION 'hotel_requests_access_denied' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.hotel_bookings WHERE id = _hotel AND organization_id = _org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'hotel_requests_access_denied' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.booking_special_requests
  WHERE booking_id = _hotel AND organization_id = _org;

  INSERT INTO public.booking_special_requests (organization_id, booking_id, special_request_type_id)
  SELECT DISTINCT _org, _hotel, request_type FROM unnest(_types) AS request_type
  WHERE request_type IS NOT NULL;

  IF v_custom IS NOT NULL THEN
    INSERT INTO public.booking_special_requests (organization_id, booking_id, custom_request_text)
    VALUES (_org, _hotel, v_custom);
  END IF;
END;
$$;

CREATE FUNCTION public.create_hotel_booking_with_requests(
  _org uuid, _details jsonb, _types uuid[], _custom text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  details public.hotel_bookings%ROWTYPE := jsonb_populate_record(NULL::public.hotel_bookings, _details);
  saved_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.can_org_write(_org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'bookings_create'), false) THEN
    RAISE EXCEPTION 'hotel_requests_access_denied' USING ERRCODE = '42501';
  END IF;

  IF details.booking_id IS NOT NULL AND NOT EXISTS (
    SELECT FROM public.bookings AS parent
    WHERE parent.id = details.booking_id AND parent.organization_id = _org
      AND parent.status NOT IN ('cancelled', 'canceled') AND parent.workflow_stage::text <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'hotel_parent_access_denied' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.hotel_bookings (
    organization_id, booking_id, customer_id, customer_name, booking_agent_name, booking_agent_id,
    hotel_id, hotel_name, hotel_star_rating, destination_city, check_in_date, check_out_date,
    number_of_nights, number_of_rooms, room_type, room_view, number_of_adults, number_of_children,
    children_ages, meal_plan, booking_reference_supplier, cancellation_policy, supplier_id, supplier_name,
    cost_per_night, selling_price_per_night, additional_costs, vat_amount, vat_included, commission_amount,
    total_cost_customer, total_profit, currency, payment_method, paid_amount, remaining_amount,
    payment_due_date, status_id, booking_source, internal_notes, attachment_urls
  ) VALUES (
    _org, details.booking_id, details.customer_id, details.customer_name, details.booking_agent_name, details.booking_agent_id,
    details.hotel_id, details.hotel_name, details.hotel_star_rating, details.destination_city, details.check_in_date, details.check_out_date,
    details.number_of_nights, details.number_of_rooms, details.room_type, details.room_view, details.number_of_adults, details.number_of_children,
    details.children_ages, details.meal_plan, details.booking_reference_supplier, details.cancellation_policy, details.supplier_id, details.supplier_name,
    details.cost_per_night, details.selling_price_per_night, details.additional_costs, details.vat_amount, details.vat_included, details.commission_amount,
    details.total_cost_customer, details.total_profit, details.currency, details.payment_method, details.paid_amount, details.remaining_amount,
    details.payment_due_date, details.status_id, details.booking_source, details.internal_notes, details.attachment_urls
  ) RETURNING id INTO saved_id;

  PERFORM public.save_hotel_special_requests(_org, saved_id, _types, _custom);
  RETURN jsonb_build_object('id', saved_id, 'booking_id', details.booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_hotel_special_requests(uuid, uuid, uuid[], text),
  public.create_hotel_booking_with_requests(uuid, jsonb, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_hotel_special_requests(uuid, uuid, uuid[], text),
  public.create_hotel_booking_with_requests(uuid, jsonb, uuid[], text) TO authenticated;

-- Extend the existing operational projection to employees assigned to their
-- own booking. Financial terms and pending amendments remain private.
CREATE OR REPLACE FUNCTION public.get_trip_service_amendment_history(_booking uuid)
RETURNS TABLE (
  service_kind text, service_id uuid, service_source text, ticket_number text, operation text,
  start_date text, end_date text, new_ticket text, applied_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM public.bookings AS b
    JOIN public.organization_members AS member ON member.organization_id = b.organization_id
      AND member.user_id = auth.uid() AND member.is_active
    WHERE b.id = _booking
      AND EXISTS (
        SELECT FROM public._org_permission_state(b.organization_id, auth.uid(), 'bookings_view') AS permission
        WHERE permission.granted AND (permission.data_scope = 'organization'
          OR (permission.data_scope IN ('own', 'team', 'branch')
            AND operations_private.owns_booking(b.id, auth.uid())))
      )
  ) THEN
    RAISE EXCEPTION 'booking_itinerary_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT a.service_kind, a.service_id, a.service_source, a.ticket_number, a.terms->>'operation',
    a.terms->>'start_date', a.terms->>'end_date', a.terms->>'new_ticket', a.resolved_at
  FROM public.trip_service_amendments AS a
  JOIN public.bookings AS b ON b.id = a.booking_id AND b.organization_id = a.organization_id
  WHERE a.booking_id = _booking AND a.status = 'applied'
  ORDER BY a.resolved_at DESC, a.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_trip_service_amendment_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_service_amendment_history(uuid) TO authenticated;
