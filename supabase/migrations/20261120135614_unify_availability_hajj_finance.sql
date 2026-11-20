DO $patch$
DECLARE
  definition text;
  signature regprocedure;
  anchor text;
BEGIN
  -- General availability for both services uses the existing atomic conversion,
  -- booking, invoice and receivable path. Older conversions are left in place.
  signature := 'public.convert_pilgrimage_retail_group(uuid)'::regprocedure;
  SELECT pg_get_functiondef(signature) INTO definition;
  anchor := 'IF s.booked_from_availability AND p.program_type = ''umrah'' THEN';
  IF strpos(definition, anchor) = 0 THEN
    RAISE EXCEPTION 'Missing availability finance conversion in %', signature;
  END IF;
  EXECUTE replace(definition, anchor,
    'IF s.booked_from_availability AND p.program_type IN (''umrah'', ''hajj'') THEN');

  -- General Hajj keeps its manual room numbers and legacy registrations. Only
  -- linked availability passengers need the invoice-aware cancellation path.
  signature := 'public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure;
  SELECT pg_get_functiondef(signature) INTO definition;
  anchor := '(program.program_type <> ''umrah'' AND NOT (program.program_type = ''hajj'' AND program.uses_room_inventory))';
  IF strpos(definition, anchor) = 0 THEN
    RAISE EXCEPTION 'Missing departure type guard in %', signature;
  END IF;
  definition := replace(definition, anchor, 'program.program_type NOT IN (''umrah'', ''hajj'')');
  anchor := '    net_paid := greatest(passenger.paid_amount';
  IF strpos(definition, anchor) = 0 THEN
    RAISE EXCEPTION 'Missing post-selection guard in %', signature;
  END IF;
  EXECUTE replace(definition, anchor, '    IF program.program_type = ''hajj'' AND NOT program.uses_room_inventory AND (
      action_name <> ''cancel'' OR NOT pilgrimage_inventory_private.is_manual_allotment(
        passenger.organization_id, passenger.inventory_booking_id)
    ) THEN
      RAISE EXCEPTION ''pilgrimage_operation_denied'' USING ERRCODE = ''42501'';
    END IF;
' || anchor);
END
$patch$;
