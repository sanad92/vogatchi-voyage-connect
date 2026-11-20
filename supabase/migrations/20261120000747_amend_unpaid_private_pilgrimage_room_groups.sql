CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.amend_private_group(
  _organization_id uuid, _booking_id uuid, _id uuid, _target_program_id uuid,
  _room_type text, _expected_total numeric, _reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  source_reservation public.umrah_inventory_bookings%ROWTYPE;
  source_program public.pilgrimage_programs%ROWTYPE;
  destination public.pilgrimage_programs%ROWTYPE;
  source_booking public.bookings%ROWTYPE;
  invoice public.invoices%ROWTYPE;
  prior public.pilgrimage_operations%ROWTYPE;
  reason text := btrim(coalesce(_reason, ''));
  action_name text;
  operation_request jsonb;
  travelers jsonb;
  party_size integer;
  old_total numeric;
  linked_count integer;
  original_passenger uuid;
  same_departure boolean;
  preview jsonb;
BEGIN
  PERFORM pilgrimage_inventory_private.require_availability_booking(_organization_id);
  IF NOT coalesce(public.has_org_permission(_organization_id, 'bookings_edit'), false)
    OR NOT coalesce(public.has_org_permission(_organization_id, 'invoices_create'), false)
    OR NOT coalesce(trip_amendment_private.can_settle_cancellation(_organization_id), false)
  THEN RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501'; END IF;
  IF _id IS NULL OR _booking_id IS NULL OR _target_program_id IS NULL
    OR pilgrimage_inventory_private.room_size(_room_type) IS NULL
    OR NOT coalesce(_expected_total > 0 AND _expected_total < 1000000000000
      AND _expected_total = round(_expected_total, 2), false)
    OR char_length(reason) NOT BETWEEN 3 AND 500
  THEN RAISE EXCEPTION 'pilgrimage_invalid_operation' USING ERRCODE = '22023'; END IF;

  SELECT * INTO source_reservation FROM public.umrah_inventory_bookings
  WHERE booking_id = _booking_id AND organization_id = _organization_id
    AND mode = 'private' AND availability_sale_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501'; END IF;

  -- Serialize source and destination against creation, amendments and stock changes.
  PERFORM 1 FROM public.pilgrimage_programs
    WHERE organization_id = _organization_id AND id IN (source_reservation.program_id, _target_program_id)
    ORDER BY id FOR UPDATE;
  operation_request := jsonb_build_object('scope', 'private_room_group', 'group_operation_id', _id,
    'source_booking_id', _booking_id, 'target_program_id', _target_program_id,
    'room_type', _room_type, 'expected_total', _expected_total, 'reason', reason);
  SELECT * INTO prior FROM public.pilgrimage_operations WHERE id = _id;
  IF FOUND THEN
    IF prior.organization_id IS DISTINCT FROM _organization_id OR prior.created_by IS DISTINCT FROM actor
      OR prior.request IS DISTINCT FROM operation_request OR prior.replacement_booking_id IS DISTINCT FROM _id
    THEN RAISE EXCEPTION 'pilgrimage_operation_id_used' USING ERRCODE = '22023'; END IF;
    RETURN jsonb_build_object('id', _id, 'replacement_booking_id', prior.replacement_booking_id,
      'passenger_count', source_reservation.passenger_count);
  END IF;

  SELECT * INTO STRICT source_program FROM public.pilgrimage_programs
    WHERE organization_id = _organization_id AND id = source_reservation.program_id;
  SELECT * INTO destination FROM public.pilgrimage_programs
    WHERE organization_id = _organization_id AND id = _target_program_id;
  same_departure := _target_program_id = source_program.id;
  IF NOT FOUND OR NOT source_program.uses_room_inventory OR NOT destination.uses_room_inventory
    OR source_program.status NOT IN ('open', 'full') OR coalesce(source_program.departure_date, '-infinity'::date) < current_date
    OR destination.status <> 'open' OR NOT private.pilgrimage_sales_ready(destination)
    OR destination.program_type IS DISTINCT FROM source_program.program_type
    OR destination.travel_scope IS DISTINCT FROM source_program.travel_scope
    OR destination.currency IS DISTINCT FROM source_reservation.currency
    OR (same_departure AND _room_type = source_reservation.room_type)
  THEN RAISE EXCEPTION 'pilgrimage_transfer_program_unavailable' USING ERRCODE = '22023'; END IF;

  SELECT * INTO source_booking FROM public.bookings
    WHERE id = _booking_id AND organization_id = _organization_id
      AND booking_type = source_program.program_type AND booking_type IN ('umrah', 'hajj')
      AND customer_id = source_reservation.customer_id AND currency = source_reservation.currency
      AND status = 'confirmed' AND NOT is_demo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023'; END IF;
  SELECT * INTO STRICT invoice FROM public.invoices
    WHERE booking_id = _booking_id AND organization_id = _organization_id FOR UPDATE;
  preview := trip_amendment_private.cancellation_preview(source_booking);
  IF invoice.total_paid_amount IS DISTINCT FROM 0::numeric OR invoice.remaining_amount IS DISTINCT FROM _expected_total
    OR invoice.final_amount IS DISTINCT FROM _expected_total OR preview->>'blocked_reason' IS NOT NULL
    OR jsonb_array_length(preview->'invoices') IS DISTINCT FROM 1
    OR trip_amendment_private.supplier_cancellation_preview(source_booking) IS DISTINCT FROM '[]'::jsonb
    OR EXISTS (SELECT FROM public.customer_payments p
      WHERE p.organization_id = _organization_id AND (p.booking_id = _booking_id OR p.invoice_id = invoice.id)
        AND p.status IN ('pending', 'completed'))
  THEN RAISE EXCEPTION 'pilgrimage_private_group_finance_review_required' USING ERRCODE = '22023'; END IF;

  PERFORM 1 FROM public.pilgrims WHERE inventory_booking_id = source_reservation.id
    AND organization_id = _organization_id AND program_id = source_program.id
    ORDER BY inventory_passenger_no FOR UPDATE;
  SELECT count(*), sum(total_price), jsonb_agg(jsonb_build_object('full_name', full_name, 'gender', gender)
    ORDER BY inventory_passenger_no)
    INTO party_size, old_total, travelers
  FROM public.pilgrims
  WHERE inventory_booking_id = source_reservation.id AND organization_id = _organization_id
    AND program_id = source_program.id AND b2b_roster_entry_id IS NULL
    AND inventory_passenger_no BETWEEN 1 AND source_reservation.passenger_count
    AND status NOT IN ('cancelled', 'traveled', 'completed') AND gender IN ('male', 'female');
  IF party_size IS DISTINCT FROM source_reservation.passenger_count OR old_total IS DISTINCT FROM _expected_total
    OR source_booking.selling_price IS DISTINCT FROM _expected_total
    OR source_reservation.total_price IS DISTINCT FROM _expected_total
  THEN RAISE EXCEPTION 'pilgrimage_private_group_roster_changed' USING ERRCODE = '22023'; END IF;

  action_name := CASE WHEN same_departure THEN 'room_category' ELSE 'transfer' END;
  INSERT INTO public.pilgrimage_operations (
    id, organization_id, program_id, pilgrim_id, action, reason, old_room_type, new_room_type,
    old_price, new_price, cancellation_fee, request, created_by, unified_exchange
  )
  SELECT CASE WHEN p.inventory_passenger_no = 1 THEN _id ELSE gen_random_uuid() END,
    _organization_id, source_program.id, p.id, action_name, reason, p.room_type, _room_type,
    p.total_price, p.total_price, 0, operation_request, actor, true
  FROM public.pilgrims p WHERE p.inventory_booking_id = source_reservation.id AND p.organization_id = _organization_id;

  -- One statement per traveler lets the cancellation trigger count the
  -- remaining group correctly and close the original booking exactly once.
  -- The allocator then prices the whole party again. A rejection rolls back the
  -- cancellation credits and room releases.
  FOR original_passenger IN SELECT p.id FROM public.pilgrims p
    WHERE p.inventory_booking_id = source_reservation.id AND p.organization_id = _organization_id
      AND p.inventory_passenger_no BETWEEN 1 AND source_reservation.passenger_count
    ORDER BY p.inventory_passenger_no
  LOOP
    UPDATE public.pilgrims SET status = 'cancelled', cancellation_fee = 0, cancelled_at = now()
      WHERE id = original_passenger AND organization_id = _organization_id;
  END LOOP;
  IF EXISTS (SELECT FROM public.pilgrimage_operations o WHERE o.organization_id = _organization_id
      AND o.transaction_id = txid_current() AND o.request = operation_request AND o.refund_id IS NOT NULL)
  THEN RAISE EXCEPTION 'pilgrimage_private_group_finance_review_required' USING ERRCODE = '22023'; END IF;

  PERFORM pilgrimage_inventory_private.create_with_staff(_organization_id, destination.id, _id,
    source_reservation.customer_id, _room_type, 'private', travelers, _expected_total, NULL);
  UPDATE pilgrimage_inventory_private.booking_staff target
    SET seller_employee_id = source.seller_employee_id, seller_name = source.seller_name
    FROM pilgrimage_inventory_private.booking_staff source
    WHERE target.booking_id = _id AND target.organization_id = _organization_id
      AND source.booking_id = _booking_id AND source.organization_id = target.organization_id;

  UPDATE public.pilgrimage_operations o
    SET replacement_id = target.id, replacement_booking_id = _id, new_price = target.total_price
  FROM public.pilgrims source, public.pilgrims target
  WHERE o.organization_id = _organization_id AND o.transaction_id = txid_current() AND o.request = operation_request
    AND source.id = o.pilgrim_id AND source.organization_id = _organization_id
    AND target.inventory_booking_id = _id AND target.organization_id = _organization_id
    AND target.inventory_passenger_no = source.inventory_passenger_no;
  GET DIAGNOSTICS linked_count = ROW_COUNT;
  IF linked_count <> party_size THEN RAISE EXCEPTION 'pilgrimage_private_group_roster_changed' USING ERRCODE = '22023'; END IF;

  UPDATE public.pilgrims target SET
    name_en = source.name_en, phone = source.phone, birth_date = source.birth_date,
    nationality = source.nationality, national_id = source.national_id, passport_number = source.passport_number,
    passport_expiry = source.passport_expiry, mahram_name = source.mahram_name, mahram_relation = source.mahram_relation,
    room_group = source.room_group, notes = source.notes,
    visa_status = CASE WHEN same_departure THEN source.visa_status ELSE target.visa_status END,
    visa_number = CASE WHEN same_departure THEN source.visa_number ELSE target.visa_number END,
    portal_barcode = CASE WHEN same_departure THEN source.portal_barcode ELSE target.portal_barcode END,
    documents_complete = same_departure AND coalesce(source.documents_complete, false),
    vaccination_done = same_departure AND coalesce(source.vaccination_done, false)
  FROM public.pilgrimage_operations o JOIN public.pilgrims source ON source.id = o.pilgrim_id
  WHERE o.organization_id = _organization_id AND o.transaction_id = txid_current() AND o.request = operation_request
    AND target.id = o.replacement_id AND target.inventory_booking_id = _id AND target.organization_id = _organization_id;

  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  SELECT _organization_id, booking_id, 'pilgrimage_private_group_amended', actor,
    'تعديل حجز غرفة خاصة · ' || reason,
    jsonb_build_object('operation_id', _id, 'source_booking_id', _booking_id, 'replacement_booking_id', _id,
      'passenger_count', party_size)
  FROM unnest(ARRAY[_booking_id, _id]) AS references_list(booking_id);

  RETURN jsonb_build_object('id', _id, 'replacement_booking_id', _id, 'passenger_count', party_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.amend_pilgrimage_private_group(
  _organization_id uuid, _booking_id uuid, _id uuid, _target_program_id uuid,
  _room_type text, _expected_total numeric, _reason text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$
  SELECT pilgrimage_inventory_private.amend_private_group(
    _organization_id, _booking_id, _id, _target_program_id, _room_type, _expected_total, _reason
  );
$$;

REVOKE ALL ON FUNCTION public.amend_pilgrimage_private_group(uuid,uuid,uuid,uuid,text,numeric,text),
  pilgrimage_inventory_private.amend_private_group(uuid,uuid,uuid,uuid,text,numeric,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.amend_pilgrimage_private_group(uuid,uuid,uuid,uuid,text,numeric,text),
  pilgrimage_inventory_private.amend_private_group(uuid,uuid,uuid,uuid,text,numeric,text) TO authenticated;
