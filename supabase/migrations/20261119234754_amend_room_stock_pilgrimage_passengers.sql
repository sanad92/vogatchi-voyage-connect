CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.exchange_allotment_passenger(
  passenger public.pilgrims, destination public.pilgrimage_programs, request jsonb, new_price numeric
) RETURNS jsonb LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  source_booking public.bookings%ROWTYPE;
  source_reservation public.umrah_inventory_bookings%ROWTYPE;
  operation_id uuid := (request->>'id')::uuid;
  transfer_fee numeric := coalesce((request->>'fee')::numeric, 0);
  reason text := btrim(request->>'reason');
  room_category text := request->>'room_type';
  replacement_booking uuid := gen_random_uuid();
  replacement_passenger uuid;
  replacement_invoice uuid;
  refund_id uuid;
  credit numeric := 0;
  settlement uuid;
  same_program boolean := passenger.program_id = destination.id;
BEGIN
  -- This helper is called after the public operation has authorized the actor
  -- and locked both programs and the original passenger.
  PERFORM pilgrimage_inventory_private.require_availability_booking(passenger.organization_id);
  IF destination.status <> 'open'
     OR NOT private.pilgrimage_sales_ready(destination) THEN
    RAISE EXCEPTION 'pilgrimage_transfer_program_unavailable' USING ERRCODE = '22023';
  END IF;
  IF NOT coalesce(public.has_org_permission(passenger.organization_id, 'invoices_create'), false) THEN
    RAISE EXCEPTION 'umrah_unified_invoice_permission' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT source_reservation
  FROM public.umrah_inventory_bookings
  WHERE id = passenger.inventory_booking_id AND organization_id = passenger.organization_id
    AND program_id = passenger.program_id AND booking_id IS NOT NULL;
  SELECT * INTO STRICT source_booking
  FROM public.bookings
  WHERE id = source_reservation.booking_id AND organization_id = passenger.organization_id
    AND booking_type = destination.program_type AND customer_id = source_reservation.customer_id;

  IF destination.uses_room_inventory IS DISTINCT FROM (source_reservation.availability_sale_id IS NULL) THEN
    RAISE EXCEPTION 'pilgrimage_transfer_inventory_mode_mismatch' USING ERRCODE = '22023';
  END IF;
  IF destination.uses_room_inventory AND source_reservation.mode <> 'shared' THEN
    RAISE EXCEPTION 'pilgrimage_private_room_requires_group_amendment' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pilgrimage_operations (
    id, organization_id, program_id, pilgrim_id, action, reason, old_room_type, new_room_type,
    old_price, new_price, cancellation_fee, request, created_by, unified_exchange
  ) VALUES (
    operation_id, passenger.organization_id, passenger.program_id, passenger.id,
    request->>'action', reason, passenger.room_type, room_category,
    passenger.total_price, new_price, transfer_fee, request, actor, true
  );

  -- Both programs are already locked. Closing the old registration frees its seat
  -- and bed. Any failure to issue the replacement rolls back the financial and stock changes.
  UPDATE public.pilgrims SET status = 'cancelled', cancellation_fee = transfer_fee, cancelled_at = now()
    WHERE id = passenger.id AND organization_id = passenger.organization_id;

  IF destination.uses_room_inventory THEN
    PERFORM pilgrimage_inventory_private.create_with_staff(
      passenger.organization_id, destination.id, replacement_booking, source_booking.customer_id,
      room_category, 'shared', jsonb_build_array(jsonb_build_object(
        'full_name', passenger.full_name, 'gender', passenger.gender)), new_price, NULL
    );
    -- Preserve sales attribution while the replacement starts with unapproved costs.
    UPDATE pilgrimage_inventory_private.booking_staff target
    SET seller_employee_id = source.seller_employee_id, seller_name = source.seller_name
    FROM pilgrimage_inventory_private.booking_staff source
    WHERE target.booking_id = replacement_booking AND target.organization_id = passenger.organization_id
      AND source.booking_id = source_booking.id AND source.organization_id = target.organization_id;
  ELSE
    PERFORM pilgrimage_inventory_private.book_from_availability(
      passenger.organization_id, replacement_booking, destination.id, source_booking.customer_id, 'book',
      1, room_category, new_price, destination.currency, destination.departure_date, destination.return_date,
      ARRAY[passenger.full_name]
    );
  END IF;
  SELECT id INTO STRICT replacement_passenger
    FROM public.pilgrims WHERE inventory_booking_id = replacement_booking
      AND organization_id = passenger.organization_id;
  UPDATE public.pilgrimage_operations SET replacement_id = replacement_passenger,
    replacement_booking_id = replacement_booking WHERE id = operation_id;
  UPDATE public.pilgrims SET
    name_en = passenger.name_en, phone = passenger.phone,
    gender = CASE WHEN destination.uses_room_inventory THEN gender ELSE passenger.gender END,
    birth_date = passenger.birth_date, nationality = passenger.nationality,
    national_id = passenger.national_id, passport_number = passenger.passport_number,
    passport_expiry = passenger.passport_expiry, mahram_name = passenger.mahram_name,
    mahram_relation = passenger.mahram_relation, room_group = passenger.room_group, notes = passenger.notes,
    visa_status = CASE WHEN same_program THEN passenger.visa_status ELSE visa_status END,
    visa_number = CASE WHEN same_program THEN passenger.visa_number ELSE visa_number END,
    portal_barcode = CASE WHEN same_program THEN passenger.portal_barcode ELSE portal_barcode END,
    documents_complete = same_program AND coalesce(passenger.documents_complete, false),
    vaccination_done = same_program AND coalesce(passenger.vaccination_done, false)
  WHERE id = replacement_passenger AND organization_id = passenger.organization_id;

  SELECT o.refund_id INTO refund_id FROM public.pilgrimage_operations o WHERE o.id = operation_id;
  IF refund_id IS NOT NULL THEN
    SELECT id INTO STRICT replacement_invoice FROM public.invoices
      WHERE booking_id = replacement_booking AND organization_id = passenger.organization_id;
    SELECT least(r.amount, i.remaining_amount) INTO STRICT credit
    FROM public.refund_requests r JOIN public.invoices i ON i.id = replacement_invoice
    WHERE r.id = refund_id AND r.organization_id = passenger.organization_id;
    IF credit > 0 THEN
      settlement := refund_balance_private.settle(
        passenger.organization_id, gen_random_uuid(), refund_id, NULL, credit, NULL,
        replacement_invoice, NULL, 'تسوية تعديل مسافر · ' || operation_id::text
      );
    END IF;
  END IF;

  UPDATE public.pilgrimage_operations SET
    reapplied_settlement_id = settlement, reapplied_amount = credit
  WHERE id = operation_id;
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  SELECT passenger.organization_id, booking_id,
    CASE destination.program_type WHEN 'hajj' THEN 'hajj_passenger_amended' ELSE 'umrah_passenger_amended' END, actor,
    'تعديل تسجيل مسافر · ' || reason,
    jsonb_build_object('operation_id', operation_id, 'original_booking_id', source_booking.id,
      'replacement_booking_id', replacement_booking, 'reapplied_amount', credit)
  FROM unnest(ARRAY[source_booking.id, replacement_booking]) AS references_list(booking_id);

  RETURN jsonb_build_object('id', operation_id, 'refund_id', refund_id,
    'replacement_id', replacement_passenger, 'replacement_booking_id', replacement_booking);
END;
$$;
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.exchange_allotment_passenger(
  public.pilgrims, public.pilgrimage_programs, jsonb, numeric) FROM PUBLIC, anon, authenticated;

DO $patch$
DECLARE
  definition text;
  signature regprocedure;
  anchor text;
BEGIN
  signature := 'public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure;
  SELECT pg_get_functiondef(signature) INTO definition;
  anchor := 'IF action_name <> ''cancel'' AND pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id) THEN';
  IF strpos(definition, 'OR (program.uses_room_inventory AND passenger.inventory_booking_id IS NOT NULL)) THEN') = 0 THEN
    IF strpos(definition, anchor) = 0 THEN
      RAISE EXCEPTION 'Missing unified passenger exchange route';
    END IF;
    EXECUTE replace(definition, anchor,
      'IF action_name <> ''cancel'' AND (pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id)
        OR (program.uses_room_inventory AND passenger.inventory_booking_id IS NOT NULL)) THEN
      IF (program.uses_room_inventory OR destination.uses_room_inventory)
         AND NOT coalesce(public.has_org_permission(_organization_id, ''bookings_cancel''), false) THEN
        RAISE EXCEPTION ''pilgrimage_operation_denied'' USING ERRCODE = ''42501'';
      END IF;');
  END IF;

  signature := 'pilgrimage_inventory_private.guard_booked_passenger_edit()'::regprocedure;
  SELECT pg_get_functiondef(signature) INTO definition;
  anchor := 'PERFORM 1 FROM pilgrimage_inventory_private.booking_edit_requests r';
  IF strpos(definition, 'WHERE o.replacement_id = NEW.id AND o.replacement_booking_id = booking_uuid') = 0 THEN
    IF strpos(definition, anchor) = 0 THEN
      RAISE EXCEPTION 'Missing approved passenger edit route';
    END IF;
    EXECUTE replace(definition, anchor, '
  -- Copy the original registration details to the distinct replacement in the
  -- exchange transaction. The allocator alone sets its gender and room groups.
  IF NEW.status = ''registered'' AND EXISTS (
    SELECT FROM public.pilgrimage_operations o
    WHERE o.replacement_id = NEW.id AND o.replacement_booking_id = booking_uuid
      AND o.organization_id = NEW.organization_id AND o.unified_exchange
      AND o.created_by = auth.uid() AND o.transaction_id = txid_current()
  ) AND (
    to_jsonb(NEW) - ARRAY[''updated_at'', ''paid_amount'', ''name_en'', ''phone'', ''birth_date'', ''nationality'',
      ''national_id'', ''passport_number'', ''passport_expiry'', ''mahram_name'', ''mahram_relation'',
      ''room_group'', ''notes'', ''visa_status'', ''visa_number'', ''portal_barcode'', ''documents_complete'', ''vaccination_done'']
    =
    to_jsonb(OLD) - ARRAY[''updated_at'', ''paid_amount'', ''name_en'', ''phone'', ''birth_date'', ''nationality'',
      ''national_id'', ''passport_number'', ''passport_expiry'', ''mahram_name'', ''mahram_relation'',
      ''room_group'', ''notes'', ''visa_status'', ''visa_number'', ''portal_barcode'', ''documents_complete'', ''vaccination_done'']
  ) THEN RETURN NEW; END IF;
  ' || anchor);
  END IF;
END
$patch$;
