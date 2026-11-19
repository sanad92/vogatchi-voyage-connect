CREATE FUNCTION pilgrimage_inventory_private.sync_passenger_receipt_treasury()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  treasury public.bank_accounts%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.pilgrim_id IS NOT NULL AND
     (TG_OP = 'DELETE' OR NEW.pilgrim_id IS NULL OR NEW.status IS DISTINCT FROM 'completed'
       OR NEW.treasury_account_id IS NULL)
  THEN
    DELETE FROM public.bank_account_transactions
    WHERE organization_id = OLD.organization_id AND source_type = 'customer_payment' AND source_id = OLD.id;
  END IF;
  IF TG_OP = 'DELETE' OR NEW.pilgrim_id IS NULL OR NEW.status IS DISTINCT FROM 'completed'
     OR NEW.treasury_account_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO treasury FROM public.bank_accounts
    WHERE id = NEW.treasury_account_id AND organization_id = NEW.organization_id;
  IF NOT FOUND OR treasury.is_active IS NOT TRUE OR treasury.currency IS DISTINCT FROM NEW.currency
     OR treasury.treasury_kind IS NULL OR NEW.payment_method IS NULL
     OR (treasury.treasury_kind = 'cash') IS DISTINCT FROM (NEW.payment_method = 'cash')
  THEN RAISE EXCEPTION 'pilgrimage_receipt_treasury_mismatch' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.bank_account_transactions AS movement (
    organization_id, bank_account_id, transaction_type, amount, currency, description,
    transaction_date, reference_number, related_invoice_id, created_by, source_type, source_id
  ) VALUES (
    NEW.organization_id, NEW.treasury_account_id, 'deposit', NEW.amount, NEW.currency,
    coalesce(nullif(NEW.notes, ''), 'تحصيل من مسافر'), NEW.payment_date, NEW.reference_number,
    NEW.invoice_id, auth.uid(), 'customer_payment', NEW.id
  )
  ON CONFLICT (organization_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
  DO UPDATE SET bank_account_id = excluded.bank_account_id, transaction_type = excluded.transaction_type,
    amount = excluded.amount, currency = excluded.currency,
    description = excluded.description, transaction_date = excluded.transaction_date,
    reference_number = excluded.reference_number, related_invoice_id = excluded.related_invoice_id
  WHERE (movement.bank_account_id, movement.transaction_type, movement.amount, movement.currency, movement.description,
         movement.transaction_date, movement.reference_number, movement.related_invoice_id)
    IS DISTINCT FROM (excluded.bank_account_id, excluded.transaction_type, excluded.amount, excluded.currency, excluded.description,
                     excluded.transaction_date, excluded.reference_number, excluded.related_invoice_id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.sync_passenger_receipt_treasury() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zz_pilgrimage_passenger_receipt_treasury
  AFTER INSERT OR UPDATE OF status, pilgrim_id, treasury_account_id, payment_method, amount, currency,
    payment_date, reference_number, notes, invoice_id OR DELETE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.sync_passenger_receipt_treasury();

ALTER TABLE public.umrah_inventory_bookings
  ADD COLUMN availability_sale_id uuid UNIQUE,
  DROP CONSTRAINT umrah_inventory_bookings_passenger_count_check,
  ADD CONSTRAINT pilgrimage_reservation_passenger_count_check CHECK (
    passenger_count BETWEEN 1 AND CASE WHEN availability_sale_id IS NULL THEN 45 ELSE 10000 END
  ),
  ADD CONSTRAINT pilgrimage_availability_sale_reference
    FOREIGN KEY (organization_id, availability_sale_id) REFERENCES public.pilgrimage_sales(organization_id, id);

CREATE FUNCTION pilgrimage_inventory_private.is_manual_allotment(_org uuid, _reservation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
RETURN EXISTS (
  SELECT FROM public.umrah_inventory_bookings
  WHERE id = _reservation AND organization_id = _org AND availability_sale_id IS NOT NULL
);
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.is_manual_allotment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pilgrimage_inventory_private.is_manual_allotment(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.guard_passenger()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  manual_allotment boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.inventory_booking_id IS NOT NULL AND current_user IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.inventory_booking_id IS NOT NULL THEN
      RAISE EXCEPTION 'umrah_inventory_cancel_from_operations' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.inventory_booking_id, NEW.inventory_passenger_no)
     IS DISTINCT FROM (OLD.inventory_booking_id, OLD.inventory_passenger_no)
  THEN RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501'; END IF;
  IF OLD.inventory_booking_id IS NULL THEN RETURN NEW; END IF;

  manual_allotment := pilgrimage_inventory_private.is_manual_allotment(OLD.organization_id, OLD.inventory_booking_id);
  IF (NEW.room_type, NEW.customer_id) IS DISTINCT FROM (OLD.room_type, OLD.customer_id)
     OR (NOT manual_allotment AND (
       NEW.gender, NEW.makkah_rooming_group_id, NEW.madinah_rooming_group_id, NEW.makkah_room, NEW.madinah_room
     ) IS DISTINCT FROM (
       OLD.gender, OLD.makkah_rooming_group_id, OLD.madinah_rooming_group_id, OLD.makkah_room, OLD.madinah_room
     ))
     OR (manual_allotment AND (NEW.organization_id, NEW.program_id, NEW.total_price)
       IS DISTINCT FROM (OLD.organization_id, OLD.program_id, OLD.total_price))
     OR (NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NOT EXISTS (
       SELECT 1 FROM public.pilgrimage_operations a WHERE a.pilgrim_id = OLD.id
         AND a.action = 'cancel' AND a.created_by = auth.uid() AND a.transaction_id = txid_current()
     ))
  THEN RAISE EXCEPTION 'umrah_inventory_room_change_required' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;

DO $update_functions$
DECLARE
  definition text;
  target record;
BEGIN
  -- Reuse the guards and conversion audit trail, keeping availability bookings
  -- on manual rooming groups and configured room-stock bookings on room inventory.
  FOR target IN SELECT * FROM (VALUES
    ('pilgrimage_operations_private.guard_umrah_rooming()'::regprocedure,
      'room_group.inventory_room IS DISTINCT FROM (NEW.inventory_booking_id IS NOT NULL)',
      'room_group.inventory_room IS DISTINCT FROM (NEW.inventory_booking_id IS NOT NULL AND
        NOT pilgrimage_inventory_private.is_manual_allotment(NEW.organization_id, NEW.inventory_booking_id))'),
    ('pilgrimage_inventory_private.guard_booked_passenger_edit()'::regprocedure,
      'PERFORM 1 FROM pilgrimage_inventory_private.booking_edit_requests r',
      'IF OLD.status NOT IN (''cancelled'',''traveled'',''completed'')
         AND pilgrimage_inventory_private.is_manual_allotment(OLD.organization_id, OLD.inventory_booking_id)
         AND coalesce(public.can_org_write(OLD.organization_id), false)
         AND coalesce(public.has_org_permission(OLD.organization_id, ''bookings_edit''), false)
      THEN RETURN NEW; END IF;
      PERFORM 1 FROM pilgrimage_inventory_private.booking_edit_requests r'),
    ('public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure,
      'net_paid := greatest(passenger.paid_amount',
      'IF action_name <> ''cancel'' AND pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id) THEN
        RAISE EXCEPTION ''umrah_use_booking_financial_operations'' USING ERRCODE = ''22023'';
      END IF;
      net_paid := greatest(passenger.paid_amount')
  ) hooks(signature, previous, replacement) LOOP
    SELECT pg_get_functiondef(target.signature) INTO definition;
    IF strpos(definition, target.previous) = 0 THEN
      RAISE EXCEPTION 'Unexpected pilgrimage implementation for %', target.signature;
    END IF;
    EXECUTE replace(definition, target.previous, target.replacement);
  END LOOP;

  SELECT pg_get_functiondef('public.convert_pilgrimage_retail_group(uuid)'::regprocedure) INTO definition;
  IF strpos(definition, '  traveler_row public.pilgrimage_sale_travelers%ROWTYPE;') = 0
     OR strpos(definition, '  FOR traveler_row IN SELECT') = 0
     OR strpos(definition, 'organization_id,program_id,customer_id,full_name,room_type,status,created_by') = 0
     OR strpos(definition, 'btrim(traveler_row.display_name),traveler_row.room_type,''registered'',actor') = 0
     OR strpos(definition, '  RETURN result_id;' || chr(10) || 'END;') = 0
  THEN RAISE EXCEPTION 'Unexpected retail group conversion implementation'; END IF;
  definition := replace(definition, '  traveler_row public.pilgrimage_sale_travelers%ROWTYPE;',
    '  traveler_row public.pilgrimage_sale_travelers%ROWTYPE;
       reservation_id uuid;
       passenger_no integer := 0;');
  definition := replace(definition, '  FOR traveler_row IN SELECT', '
  IF s.booked_from_availability AND p.program_type = ''umrah'' THEN
    PERFORM pilgrimage_inventory_private.require_availability_booking(s.organization_id);
    reservation_id := s.id;
    INSERT INTO public.umrah_inventory_bookings (
      id, organization_id, program_id, customer_id, room_type, mode,
      passenger_count, total_price, currency, request_fingerprint, created_by, availability_sale_id
    )
    SELECT s.id, s.organization_id, p.id, s.buyer_customer_id, min(i.room_type), ''shared'',
      s.party_size, sum(i.quantity * i.unit_sell), s.currency, s.id::text, actor, s.id
    FROM public.pilgrimage_sale_items i WHERE i.sale_id = s.id AND i.organization_id = s.organization_id;
  END IF;

  FOR traveler_row IN SELECT');
  definition := replace(definition, '    INSERT INTO public.pilgrims(', '
    passenger_no := passenger_no + 1;
    INSERT INTO public.pilgrims(');
  definition := replace(definition, 'organization_id,program_id,customer_id,full_name,room_type,status,created_by',
    'organization_id,program_id,customer_id,full_name,room_type,status,created_by,inventory_booking_id,inventory_passenger_no');
  definition := replace(definition, 'btrim(traveler_row.display_name),traveler_row.room_type,''registered'',actor',
    'btrim(traveler_row.display_name),traveler_row.room_type,''registered'',actor,reservation_id,
      CASE WHEN reservation_id IS NOT NULL THEN passenger_no END');
  definition := replace(definition, '  RETURN result_id;' || chr(10) || 'END;', '
  IF reservation_id IS NOT NULL THEN
    PERFORM pilgrimage_inventory_private.create_unified_reference(reservation_id);
    INSERT INTO pilgrimage_inventory_private.booking_staff (booking_id, organization_id, operations_user_id)
      VALUES (reservation_id, s.organization_id, actor) ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN result_id;
END;');
  EXECUTE definition;
END
$update_functions$;
