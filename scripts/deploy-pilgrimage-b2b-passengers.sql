-- Apply after the B2B settlement schema.
BEGIN;

ALTER TABLE public.pilgrims
  ADD COLUMN b2b_roster_entry_id uuid UNIQUE,
  ADD CONSTRAINT pilgrims_b2b_roster_entry_fk
    FOREIGN KEY (organization_id, b2b_roster_entry_id)
    REFERENCES public.pilgrimage_b2b_roster_entries (organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT pilgrims_b2b_operational_only
    CHECK (b2b_roster_entry_id IS NULL OR
      (customer_id IS NULL AND total_price = 0 AND paid_amount = 0 AND cancellation_fee = 0));

-- The agreement retains its full allocation. Its operational passengers must
-- not count again when other sales or retail registrations check capacity.
DO $patch$
DECLARE
  signature regprocedure;
  definition text;
  registered_filter text := 'g.status<>''cancelled'';';
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public._pilgrimage_sale_guard()'::regprocedure,
    'public.transition_pilgrimage_seat_allocation(uuid,text,integer)'::regprocedure,
    'public._pilgrimage_held_inventory_registration_guard()'::regprocedure,
    'public._pilgrimage_held_inventory_program_guard()'::regprocedure,
    'public.convert_pilgrimage_retail_group(uuid)'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(signature);
    IF strpos(definition, registered_filter) = 0 THEN
      RAISE EXCEPTION 'Unexpected pilgrimage capacity definition: %', signature;
    END IF;
    IF signature = 'public._pilgrimage_held_inventory_registration_guard()'::regprocedure THEN
      IF strpos(definition, 'IF NEW.status=''cancelled'' THEN') = 0 THEN
        RAISE EXCEPTION 'Unexpected inventory registration guard';
      END IF;
      definition := replace(definition, 'IF NEW.status=''cancelled'' THEN',
        'IF NEW.b2b_roster_entry_id IS NOT NULL OR NEW.status=''cancelled'' THEN');
    END IF;
    EXECUTE replace(definition, registered_filter,
      'g.status<>''cancelled'' AND g.b2b_roster_entry_id IS NULL;');
  END LOOP;

  definition := pg_get_functiondef('public._pilgrimage_sale_child_guard()'::regprocedure);
  IF strpos(definition, 'FROM public.pilgrims g WHERE g.id=NEW.pilgrim_id;') = 0 THEN
    RAISE EXCEPTION 'Unexpected quotation traveler definition';
  END IF;
  EXECUTE replace(definition, 'FROM public.pilgrims g WHERE g.id=NEW.pilgrim_id;',
    'FROM public.pilgrims g WHERE g.id=NEW.pilgrim_id AND g.b2b_roster_entry_id IS NULL;');

  definition := pg_get_functiondef('public._pilgrimage_pilgrim_integrity()'::regprocedure);
  IF strpos(definition, 'IF v_price<=0 THEN') = 0
    OR strpos(definition, 'IF p.status <> ''open'' OR') = 0
    OR strpos(definition, 'AND auth.uid() IS NOT NULL') = 0
    OR strpos(definition, 'NEW.total_price:=v_price;') = 0 THEN
    RAISE EXCEPTION 'Unexpected pilgrim pricing definition';
  END IF;
  definition := replace(definition, 'IF v_price<=0 THEN',
    'IF v_price<=0 AND NEW.b2b_roster_entry_id IS NULL THEN');
  definition := replace(definition, 'IF p.status <> ''open'' OR',
    'IF (p.status <> ''open'' AND NOT (p.status = ''full'' AND NEW.b2b_roster_entry_id IS NOT NULL)) OR');
  definition := replace(definition, 'AND auth.uid() IS NOT NULL',
    'AND NEW.b2b_roster_entry_id IS NULL AND auth.uid() IS NOT NULL');
  EXECUTE replace(definition, 'NEW.total_price:=v_price;',
    'NEW.total_price:=CASE WHEN NEW.b2b_roster_entry_id IS NULL THEN v_price ELSE 0 END;');

  definition := pg_get_functiondef('public._pilgrimage_payment_integrity()'::regprocedure);
  IF strpos(definition, 'SELECT * INTO p FROM public.pilgrimage_programs WHERE id=g.program_id;') = 0 THEN
    RAISE EXCEPTION 'Unexpected pilgrim payment definition';
  END IF;
  EXECUTE replace(definition, 'SELECT * INTO p FROM public.pilgrimage_programs WHERE id=g.program_id;',
    'IF g.b2b_roster_entry_id IS NOT NULL THEN
      RAISE EXCEPTION ''b2b_passenger_payments_use_agency_invoice'' USING ERRCODE=''42501'';
    END IF;
    SELECT * INTO p FROM public.pilgrimage_programs WHERE id=g.program_id;');
END;
$patch$;

CREATE POLICY pilgrimage_b2b_passenger_insert ON public.pilgrims AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (b2b_roster_entry_id IS NULL);

CREATE FUNCTION public._guard_pilgrimage_b2b_passenger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF NEW.b2b_roster_entry_id IS DISTINCT FROM OLD.b2b_roster_entry_id THEN
    RAISE EXCEPTION 'pilgrimage_b2b_passenger_link_is_immutable' USING ERRCODE='42501';
  END IF;
  IF NEW.b2b_roster_entry_id IS NOT NULL AND NEW.status='cancelled' AND OLD.status<>'cancelled'
    AND (OLD.status IN ('traveled','completed') OR NOT EXISTS (
      SELECT 1 FROM public.pilgrimage_b2b_roster_entries e
      JOIN public.pilgrimage_b2b_agreements b ON b.id=e.agreement_id AND b.organization_id=e.organization_id
      WHERE e.id=OLD.b2b_roster_entry_id AND e.organization_id=OLD.organization_id
        AND (e.status='removed' OR b.status='voided')
    )) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_passenger_requires_roster_or_agreement_cancellation'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER pilgrimage_b2b_passenger_guard
  BEFORE UPDATE ON public.pilgrims FOR EACH ROW
  EXECUTE FUNCTION public._guard_pilgrimage_b2b_passenger();

CREATE FUNCTION public._close_pilgrimage_b2b_passengers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'pilgrimage_b2b_roster_entries' THEN
    IF auth.uid() IS NOT NULL AND NOT coalesce(public.can_org_write(NEW.organization_id),false)
      AND EXISTS (SELECT 1 FROM public.pilgrims WHERE organization_id=NEW.organization_id
        AND b2b_roster_entry_id=NEW.id AND status<>'cancelled')
    THEN RAISE EXCEPTION 'pilgrimage_b2b_passenger_registration_denied' USING ERRCODE='42501'; END IF;
    UPDATE public.pilgrims SET status='cancelled'
      WHERE organization_id=NEW.organization_id AND b2b_roster_entry_id=NEW.id AND status<>'cancelled';
  ELSE
    UPDATE public.pilgrims g SET status='cancelled'
      FROM public.pilgrimage_b2b_roster_entries e
      WHERE g.b2b_roster_entry_id=e.id AND g.organization_id=NEW.organization_id
        AND e.organization_id=NEW.organization_id AND e.agreement_id=NEW.id AND g.status<>'cancelled';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER pilgrimage_b2b_roster_close_passenger
  AFTER UPDATE OF status ON public.pilgrimage_b2b_roster_entries FOR EACH ROW
  WHEN (OLD.status='active' AND NEW.status='removed')
  EXECUTE FUNCTION public._close_pilgrimage_b2b_passengers();
CREATE TRIGGER pilgrimage_b2b_agreement_close_passengers
  AFTER UPDATE OF status ON public.pilgrimage_b2b_agreements FOR EACH ROW
  WHEN (OLD.status='approved_internal' AND NEW.status='voided')
  EXECUTE FUNCTION public._close_pilgrimage_b2b_passengers();

CREATE FUNCTION public.register_pilgrimage_b2b_passenger(
  _entry_id uuid, _room_type text, _gender text DEFAULT NULL,
  _makkah_room text DEFAULT NULL, _madinah_room text DEFAULT NULL, _bus_number text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  actor uuid := auth.uid();
  e public.pilgrimage_b2b_roster_entries%ROWTYPE;
  b public.pilgrimage_b2b_agreements%ROWTYPE;
  s public.pilgrimage_sales%ROWTYPE;
  p public.pilgrimage_programs%ROWTYPE;
  a public.pilgrimage_seat_allocations%ROWTYPE;
  registered_id uuid;
BEGIN
  SELECT * INTO e FROM public.pilgrimage_b2b_roster_entries
    WHERE id=_entry_id AND public.user_belongs_to_org(actor,organization_id);
  IF actor IS NULL OR e.id IS NULL OR NOT coalesce(public.can_org_write(e.organization_id),false)
    OR coalesce(public.get_user_org_role(actor,e.organization_id)::text,'') NOT IN ('owner','admin','manager')
  THEN RAISE EXCEPTION 'pilgrimage_b2b_passenger_registration_denied' USING ERRCODE='42501'; END IF;

  -- Same order as agreement approval and financial cancellation.
  SELECT sale.* INTO STRICT s FROM public.pilgrimage_sales sale
    JOIN public.pilgrimage_b2b_agreements agreement ON agreement.sale_id=sale.id
      AND agreement.organization_id=sale.organization_id
    WHERE agreement.id=e.agreement_id AND sale.organization_id=e.organization_id FOR UPDATE OF sale;
  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id=s.program_id AND organization_id=e.organization_id FOR UPDATE;
  SELECT * INTO a FROM public.pilgrimage_seat_allocations
    WHERE sale_id=s.id AND organization_id=e.organization_id FOR UPDATE;
  SELECT * INTO STRICT b FROM public.pilgrimage_b2b_agreements
    WHERE id=e.agreement_id AND organization_id=e.organization_id FOR UPDATE;
  SELECT * INTO STRICT e FROM public.pilgrimage_b2b_roster_entries
    WHERE id=_entry_id AND organization_id=b.organization_id FOR UPDATE;

  IF e.status<>'active' OR b.status<>'approved_internal' THEN
    RAISE EXCEPTION 'pilgrimage_b2b_passenger_requires_active_roster' USING ERRCODE='22023';
  END IF;
  SELECT id INTO registered_id FROM public.pilgrims
    WHERE organization_id=e.organization_id AND b2b_roster_entry_id=e.id;
  IF FOUND THEN
    IF EXISTS (SELECT 1 FROM public.pilgrims WHERE id=registered_id
      AND (room_type,gender,makkah_room,madinah_room,bus_number) IS NOT DISTINCT FROM
        (_room_type,_gender,nullif(btrim(_makkah_room),''),nullif(btrim(_madinah_room),''),
         nullif(btrim(_bus_number),''))) THEN RETURN registered_id; END IF;
    RAISE EXCEPTION 'pilgrimage_b2b_passenger_already_registered' USING ERRCODE='22023';
  END IF;

  IF s.status<>'quoted' OR s.sale_model<>'b2b_group' OR p.id IS NULL OR p.status NOT IN ('open','full')
    OR a.id IS NULL OR a.program_id<>p.id OR a.status<>'allocated' OR a.seat_count<>s.party_size
    OR EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations
      WHERE agreement_id=b.id AND status='requested')
  THEN RAISE EXCEPTION 'pilgrimage_b2b_passenger_requires_open_allocated_program' USING ERRCODE='22023'; END IF;
  IF _room_type IS NULL OR _room_type NOT IN ('quad','triple','double','single')
    OR (_gender IS NOT NULL AND _gender NOT IN ('male','female'))
    OR greatest(char_length(_makkah_room),char_length(_madinah_room),char_length(_bus_number)) > 80
  THEN RAISE EXCEPTION 'pilgrimage_b2b_passenger_invalid_room_or_bus' USING ERRCODE='22023'; END IF;

  INSERT INTO public.pilgrims (organization_id, program_id, b2b_roster_entry_id,
    full_name, room_type, gender, makkah_room, madinah_room, bus_number, created_by)
  VALUES (e.organization_id,p.id,e.id,e.display_name,_room_type,_gender,
    nullif(btrim(_makkah_room),''),nullif(btrim(_madinah_room),''),
    nullif(btrim(_bus_number),''),actor)
  RETURNING id INTO registered_id;
  RETURN registered_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public._guard_pilgrimage_b2b_passenger(),
  public._close_pilgrimage_b2b_passengers(),
  public.register_pilgrimage_b2b_passenger(uuid,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_pilgrimage_b2b_passenger(uuid,text,text,text,text,text)
  TO authenticated;

COMMIT;
