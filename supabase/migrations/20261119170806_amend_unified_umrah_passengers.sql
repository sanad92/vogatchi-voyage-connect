ALTER TABLE public.pilgrimage_operations
  ADD COLUMN unified_exchange boolean NOT NULL DEFAULT false,
  ADD COLUMN replacement_booking_id uuid REFERENCES public.bookings(id),
  ADD COLUMN reapplied_settlement_id uuid UNIQUE REFERENCES public.refund_balance_settlements(id),
  ADD COLUMN reapplied_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (reapplied_amount >= 0);

CREATE INDEX pilgrimage_operations_replacement_idx ON public.pilgrimage_operations(replacement_id)
  WHERE replacement_id IS NOT NULL;

CREATE FUNCTION pilgrimage_inventory_private.exchange_allotment_passenger(
  passenger public.pilgrims, destination public.pilgrimage_programs, request jsonb, new_price numeric
) RETURNS jsonb LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  source_booking public.bookings%ROWTYPE;
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
  IF destination.uses_room_inventory OR destination.status <> 'open'
     OR NOT private.pilgrimage_sales_ready(destination) THEN
    RAISE EXCEPTION 'pilgrimage_transfer_program_unavailable' USING ERRCODE = '22023';
  END IF;
  IF NOT coalesce(public.has_org_permission(passenger.organization_id, 'invoices_create'), false) THEN
    RAISE EXCEPTION 'umrah_unified_invoice_permission' USING ERRCODE = '42501';
  END IF;
  SELECT b.* INTO STRICT source_booking
  FROM public.umrah_inventory_bookings r
  JOIN public.bookings b ON b.id = r.booking_id AND b.organization_id = r.organization_id
  WHERE r.id = passenger.inventory_booking_id AND r.organization_id = passenger.organization_id
    AND r.availability_sale_id IS NOT NULL AND b.booking_type = 'umrah';

  INSERT INTO public.pilgrimage_operations (
    id, organization_id, program_id, pilgrim_id, action, reason, old_room_type, new_room_type,
    old_price, new_price, cancellation_fee, request, created_by, unified_exchange
  ) VALUES (
    operation_id, passenger.organization_id, passenger.program_id, passenger.id,
    request->>'action', reason, passenger.room_type, room_category,
    passenger.total_price, new_price, transfer_fee, request, actor, true
  );

  -- Closing the old registration first frees its allotment seat. The
  -- replacement, invoice and payment allocation commit with that same change.
  UPDATE public.pilgrims SET status = 'cancelled', cancellation_fee = transfer_fee, cancelled_at = now()
    WHERE id = passenger.id AND organization_id = passenger.organization_id;

  PERFORM pilgrimage_inventory_private.book_from_availability(
    passenger.organization_id, replacement_booking, destination.id, source_booking.customer_id, 'book',
    1, room_category, new_price, destination.currency, destination.departure_date, destination.return_date,
    ARRAY[passenger.full_name]
  );
  SELECT id INTO STRICT replacement_passenger
    FROM public.pilgrims WHERE inventory_booking_id = replacement_booking
      AND organization_id = passenger.organization_id;
  UPDATE public.pilgrims SET
    name_en = passenger.name_en, phone = passenger.phone, gender = passenger.gender,
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
    replacement_id = replacement_passenger, replacement_booking_id = replacement_booking,
    reapplied_settlement_id = settlement, reapplied_amount = credit
  WHERE id = operation_id;
  INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
  SELECT passenger.organization_id, booking_id, 'umrah_passenger_amended', actor,
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
  target record;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('public._pilgrimage_pilgrim_integrity()'::regprocedure,
      'AND a.action IN (''cancel'',''transfer'') AND a.created_by',
      'AND (a.action IN (''cancel'',''transfer'') OR a.unified_exchange) AND a.created_by'),
    ('pilgrimage_inventory_private.guard_passenger()'::regprocedure,
      'AND a.action = ''cancel'' AND a.created_by', 'AND (a.action = ''cancel'' OR a.unified_exchange) AND a.created_by'),
    ('pilgrimage_inventory_private.guard_booked_passenger_edit()'::regprocedure,
      'AND o.action=''cancel''', 'AND (o.action=''cancel'' OR o.unified_exchange)'),
    ('pilgrimage_inventory_private.settle_cancelled_passenger()'::regprocedure,
      'AND a.action = ''cancel''', 'AND (a.action = ''cancel'' OR a.unified_exchange)'),
    ('public.create_refund_request(uuid,numeric,text,numeric,uuid,text)'::regprocedure,
      '(SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements WHERE invoice_id = i.id)',
      '(SELECT coalesce(sum(s.amount), 0) FROM public.refund_balance_settlements s
        WHERE s.invoice_id = i.id AND s.organization_id = i.organization_id
          AND NOT EXISTS (
            SELECT FROM public.pilgrimage_operations previous
            WHERE previous.reapplied_settlement_id = s.id AND previous.organization_id = i.organization_id
              AND previous.replacement_booking_id = i.booking_id
              AND EXISTS (
                SELECT FROM public.pilgrimage_operations current_operation
                WHERE current_operation.pilgrim_id = previous.replacement_id
                  AND current_operation.organization_id = previous.organization_id
                  AND (current_operation.action = ''cancel'' OR current_operation.unified_exchange)
                  AND current_operation.created_by = auth.uid()
                  AND current_operation.transaction_id = txid_current()
              )
          ))'),
    ('trip_amendment_private.cancellation_preview(public.bookings)'::regprocedure,
      'JOIN public.invoices i ON i.id = s.invoice_id AND i.organization_id = s.organization_id
        WHERE i.booking_id = b.id',
      'JOIN public.invoices i ON i.id = s.invoice_id AND i.organization_id = s.organization_id
        WHERE NOT EXISTS (SELECT FROM public.pilgrimage_operations o
          WHERE o.reapplied_settlement_id = s.id AND o.organization_id = s.organization_id
            AND o.replacement_booking_id = b.id)
          AND i.booking_id = b.id')
  ) patches(signature, previous, replacement) LOOP
    SELECT pg_get_functiondef(target.signature) INTO definition;
    IF strpos(definition, target.previous) = 0 THEN
      RAISE EXCEPTION 'Unexpected pilgrimage implementation for %', target.signature;
    END IF;
    EXECUTE replace(definition, target.previous, target.replacement);
  END LOOP;

  SELECT pg_get_functiondef('pilgrimage_inventory_private.settle_cancelled_passenger()'::regprocedure) INTO definition;
  IF strpos(definition, 'WHEN count(DISTINCT cp.exchange_rate) = 1 THEN min(cp.exchange_rate) END') = 0
     OR strpos(definition, 'WHERE al.invoice_id = invoice.id AND al.organization_id = b.organization_id;') = 0 THEN
    RAISE EXCEPTION 'Unexpected pilgrimage refund exchange-rate calculation';
  END IF;
  definition := replace(definition,
    'WHEN count(DISTINCT cp.exchange_rate) = 1 THEN min(cp.exchange_rate) END
      INTO exchange_rate FROM public.customer_payment_allocations al
      JOIN public.customer_payments cp ON cp.id = al.payment_id AND cp.status = ''completed''
      WHERE al.invoice_id = invoice.id AND al.organization_id = b.organization_id;',
    'WHEN count(DISTINCT paid.fx_rate) = 1 THEN min(paid.fx_rate) END
      INTO exchange_rate FROM (
        SELECT cp.exchange_rate AS fx_rate FROM public.customer_payment_allocations al
        JOIN public.customer_payments cp ON cp.id = al.payment_id AND cp.status = ''completed''
        WHERE al.invoice_id = invoice.id AND al.organization_id = b.organization_id
        UNION ALL
        SELECT r.exchange_rate AS fx_rate FROM public.refund_balance_settlements s
        JOIN public.refund_requests r ON r.id = s.customer_refund_id AND r.organization_id = s.organization_id
        JOIN public.pilgrimage_operations o ON o.reapplied_settlement_id = s.id AND o.organization_id = s.organization_id
        WHERE s.invoice_id = invoice.id AND s.organization_id = b.organization_id AND o.replacement_booking_id = b.id
      ) paid;');
  IF strpos(definition, 'paid.fx_rate') = 0 THEN RAISE EXCEPTION 'Missing pilgrimage refund rate patch'; END IF;
  EXECUTE definition;

  SELECT pg_get_functiondef('public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure) INTO definition;
  IF strpos(definition, 'RAISE EXCEPTION ''umrah_use_booking_financial_operations''') = 0
     OR strpos(definition, '    refund_amount := greatest(net_paid') = 0 THEN
    RAISE EXCEPTION 'Unexpected pilgrimage operations implementation';
  END IF;
  definition := replace(definition,
    'IF action_name <> ''cancel'' AND pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id) THEN
        RAISE EXCEPTION ''umrah_use_booking_financial_operations'' USING ERRCODE = ''22023'';
      END IF;',
    '');
  IF strpos(definition, 'RAISE EXCEPTION ''umrah_use_booking_financial_operations''') > 0 THEN
    RAISE EXCEPTION 'Missing pilgrimage exchange patch';
  END IF;
  definition := replace(definition, '    refund_amount := greatest(net_paid', '
    IF action_name <> ''cancel'' AND pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id) THEN
      result := result || pilgrimage_inventory_private.exchange_allotment_passenger(passenger, destination, request, new_price);
      CONTINUE;
    END IF;
    refund_amount := greatest(net_paid');
  definition := replace(definition, '''replacement_id'', operation.replacement_id);',
    '''replacement_id'', operation.replacement_id, ''replacement_booking_id'', operation.replacement_booking_id);');
  EXECUTE definition;
END
$patch$;
