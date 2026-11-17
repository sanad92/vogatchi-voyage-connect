ALTER TABLE public.bookings DROP CONSTRAINT bookings_booking_type_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('hotel','flight','car_rental','transport','umrah','hajj'));

CREATE UNIQUE INDEX invoices_one_pilgrimage_booking
  ON public.invoices (booking_id)
  WHERE booking_type IN ('umrah','hajj') AND booking_id IS NOT NULL;
DROP INDEX public.invoices_one_umrah_booking;

-- Extend the same direct booking path rather than duplicating inventory,
-- permission checks, invoice issuance, payment posting or cancellation credits.
DO $patch$
DECLARE
  target record;
  definition text;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('pilgrimage_inventory_private.configure(uuid,uuid,text,text,integer,jsonb)'::regprocedure,
      'program.program_type <> ''umrah''',
      'program.program_type NOT IN (''umrah'', ''hajj'')'),
    ('pilgrimage_inventory_private.create_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric)'::regprocedure,
      'program.program_type <> ''umrah''',
      'program.program_type NOT IN (''umrah'', ''hajj'')'),
    ('pilgrimage_inventory_private.create_unified_reference(uuid)'::regprocedure,
      'reservation.id, reservation.organization_id, ''UMR-'' || reservation.booking_number, ''umrah'',',
      'reservation.id, reservation.organization_id,
       (CASE program.program_type WHEN ''hajj'' THEN ''HAJ-'' ELSE ''UMR-'' END) || reservation.booking_number,
       program.program_type,'),
    ('public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure,
      'program.program_type <> ''umrah''',
      '(program.program_type <> ''umrah'' AND NOT (program.program_type = ''hajj'' AND program.uses_room_inventory))'),
    ('public.assign_umrah_rooming_group(uuid,uuid,uuid,text,uuid,boolean)'::regprocedure,
      'program.program_type <> ''umrah''',
      '(program.program_type <> ''umrah'' AND NOT (program.program_type = ''hajj'' AND program.uses_room_inventory))'),
    ('public.set_umrah_hotel_room_number(uuid,uuid,uuid,text)'::regprocedure,
      'AND program_type = ''umrah'' AND status',
      'AND (program_type = ''umrah'' OR (program_type = ''hajj'' AND uses_room_inventory)) AND status'),
    ('public._pilgrimage_pilgrim_integrity()'::regprocedure,
      'IF p.program_type=''umrah'' AND NEW.b2b_roster_entry_id IS NULL',
      'IF (p.program_type=''umrah'' OR OLD.inventory_booking_id IS NOT NULL) AND NEW.b2b_roster_entry_id IS NULL'),
    ('public.settle_booking_cancellation(uuid,text,jsonb,jsonb)'::regprocedure,
      'IF b.booking_type = ''umrah'' THEN',
      'IF b.booking_type IN (''umrah'', ''hajj'') THEN'),
    ('public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb)'::regprocedure,
      'IF b.booking_type = ''umrah'' THEN',
      'IF b.booking_type IN (''umrah'', ''hajj'') THEN'),
    ('pilgrimage_inventory_private.settle_cancelled_passenger()'::regprocedure,
      '''umrah_passenger_cancelled'', auth.uid()',
      'CASE b.booking_type WHEN ''hajj'' THEN ''hajj_passenger_cancelled'' ELSE ''umrah_passenger_cancelled'' END, auth.uid()')
  ) expressions(signature, old_text, new_text) LOOP
    SELECT pg_get_functiondef(target.signature) INTO definition;
    IF strpos(definition, target.old_text) = 0 THEN
      RAISE EXCEPTION 'Unexpected pilgrimage implementation for %', target.signature;
    END IF;
    EXECUTE replace(definition, target.old_text, target.new_text);
  END LOOP;

  SELECT pg_get_functiondef('pilgrimage_inventory_private.guard_unified_booking()'::regprocedure) INTO definition;
  IF strpos(definition, 'NEW.booking_type = ''umrah''') = 0
    OR strpos(definition, 'OLD.booking_type = ''umrah''') = 0
  THEN RAISE EXCEPTION 'Unexpected pilgrimage booking guard'; END IF;
  EXECUTE replace(replace(definition,
    'NEW.booking_type = ''umrah''', 'NEW.booking_type IN (''umrah'', ''hajj'')'),
    'OLD.booking_type = ''umrah''', 'OLD.booking_type IN (''umrah'', ''hajj'')');

  SELECT pg_get_functiondef('pilgrimage_inventory_private.guard_unified_invoice()'::regprocedure) INTO definition;
  IF strpos(definition, 'b.booking_type IS DISTINCT FROM ''umrah''') = 0
    OR strpos(definition, 'NEW.booking_type IS DISTINCT FROM ''umrah''') = 0
  THEN RAISE EXCEPTION 'Unexpected pilgrimage invoice guard'; END IF;
  definition := replace(definition,
    'b.booking_type IS DISTINCT FROM ''umrah''', '(b.booking_type IS NULL OR b.booking_type NOT IN (''umrah'', ''hajj''))');
  definition := replace(definition,
    'NEW.booking_type IS DISTINCT FROM ''umrah''', 'NEW.booking_type IS DISTINCT FROM b.booking_type');
  definition := replace(definition, 'OLD.booking_type = ''umrah''', 'OLD.booking_type IN (''umrah'', ''hajj'')');
  definition := replace(definition, 'NEW.booking_type = ''umrah''', 'NEW.booking_type IN (''umrah'', ''hajj'')');
  EXECUTE replace(definition, 'b.booking_type = ''umrah''', 'b.booking_type IN (''umrah'', ''hajj'')');

  SELECT pg_get_functiondef('pilgrimage_inventory_private.guard_unified_payment()'::regprocedure) INTO definition;
  IF strpos(definition, 'i.booking_type = ''umrah''') = 0
    OR strpos(definition, 'b.booking_type = ''umrah''') = 0
  THEN RAISE EXCEPTION 'Unexpected pilgrimage payment guard'; END IF;
  EXECUTE replace(replace(definition,
    'i.booking_type = ''umrah''', 'i.booking_type IN (''umrah'', ''hajj'')'),
    'b.booking_type = ''umrah''', 'b.booking_type IN (''umrah'', ''hajj'')');
END
$patch$;
