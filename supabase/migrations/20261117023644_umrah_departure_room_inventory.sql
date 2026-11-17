ALTER TABLE public.pilgrimage_programs
  ADD COLUMN uses_room_inventory boolean NOT NULL DEFAULT false,
  ADD COLUMN inventory_private_prices jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.umrah_rooming_groups
  ADD COLUMN inventory_room boolean NOT NULL DEFAULT false,
  DROP CONSTRAINT umrah_rooming_groups_gender_check,
  ADD CONSTRAINT umrah_rooming_groups_gender_check
    CHECK (gender IN ('male', 'female') OR (gender = 'family' AND inventory_room));

CREATE TABLE public.umrah_inventory_bookings (
  id uuid PRIMARY KEY,
  booking_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  room_type text NOT NULL CHECK (room_type IN ('single', 'double', 'triple', 'quad')),
  mode text NOT NULL CHECK (mode IN ('shared', 'private')),
  passenger_count integer NOT NULL CHECK (passenger_count BETWEEN 1 AND 45),
  total_price numeric(14, 2) NOT NULL CHECK (total_price > 0),
  currency text NOT NULL,
  request_fingerprint text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX umrah_inventory_bookings_program_idx
  ON public.umrah_inventory_bookings (organization_id, program_id);
ALTER TABLE public.umrah_inventory_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umrah_inventory_bookings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.umrah_inventory_bookings TO authenticated;
CREATE POLICY umrah_inventory_bookings_read ON public.umrah_inventory_bookings
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org((SELECT auth.uid()), organization_id)
    AND public.has_org_permission(organization_id, 'bookings_view'));

ALTER TABLE public.pilgrims
  ADD COLUMN inventory_booking_id uuid REFERENCES public.umrah_inventory_bookings(id),
  ADD COLUMN inventory_passenger_no integer CHECK (inventory_passenger_no > 0),
  ADD CONSTRAINT pilgrims_inventory_booking_passenger
    UNIQUE (inventory_booking_id, inventory_passenger_no);

CREATE SCHEMA pilgrimage_inventory_private;
REVOKE ALL ON SCHEMA pilgrimage_inventory_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA pilgrimage_inventory_private TO authenticated;

CREATE FUNCTION pilgrimage_inventory_private.room_size(_type text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE _type WHEN 'single' THEN 1 WHEN 'double' THEN 2
    WHEN 'triple' THEN 3 WHEN 'quad' THEN 4 END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.configure(
  _organization_id uuid, _program_id uuid, _city text, _room_type text,
  _quantity integer, _private_rule jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  program public.pilgrimage_programs%ROWTYPE;
  room_capacity integer := pilgrimage_inventory_private.room_size(_room_type);
  first_number integer;
  price numeric;
  occupancy integer;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.can_org_write(_organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_edit'), false)
     OR coalesce(public.get_user_org_role(actor, _organization_id)::text, '') NOT IN ('owner', 'admin', 'manager')
  THEN RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501'; END IF;

  SELECT * INTO program FROM public.pilgrimage_programs
    WHERE id = _program_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND OR program.program_type <> 'umrah' OR program.status NOT IN ('draft', 'open', 'full')
    OR program.capacity <= 0 OR (program.makkah_nights <= 0 AND program.madinah_nights <= 0)
  THEN RAISE EXCEPTION 'umrah_inventory_program_unavailable' USING ERRCODE = '22023'; END IF;

  IF room_capacity IS NULL OR _quantity IS NULL OR _quantity NOT BETWEEN 0 AND 150
    OR (_quantity = 0 AND _private_rule IS NULL)
    OR (_quantity > 0 AND (_city IS NULL OR _city NOT IN ('makkah', 'madinah')
       OR (_city = 'makkah' AND program.makkah_nights <= 0)
       OR (_city = 'madinah' AND program.madinah_nights <= 0)))
  THEN RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023'; END IF;

  IF NOT program.uses_room_inventory AND (
    _quantity = 0 OR EXISTS (
      SELECT 1 FROM public.pilgrims g WHERE g.program_id = _program_id AND g.status <> 'cancelled'
    ) OR EXISTS (
      SELECT 1 FROM public.pilgrimage_sales s WHERE s.program_id = _program_id AND s.status = 'quoted'
    ) OR EXISTS (
      SELECT 1 FROM public.pilgrimage_seat_allocations x WHERE x.program_id = _program_id
        AND (x.status = 'allocated' OR (x.status = 'held' AND x.hold_expires_at > clock_timestamp()))
    )
  ) THEN RAISE EXCEPTION 'umrah_inventory_existing_sales' USING ERRCODE = '22023'; END IF;

  IF _private_rule IS NOT NULL THEN
    IF _private_rule->>'method' = 'supplement' THEN
      IF jsonb_typeof(_private_rule->'per_empty_bed') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023';
      END IF;
      price := (_private_rule->>'per_empty_bed')::numeric;
      IF price < 0 OR price >= 1000000000 OR price <> round(price, 2) THEN
        RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023';
      END IF;
    ELSIF _private_rule->>'method' = 'fixed' THEN
      FOR occupancy IN 1..room_capacity LOOP
        IF jsonb_typeof(_private_rule->'per_person'->(occupancy::text)) IS DISTINCT FROM 'number' THEN
          RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023';
        END IF;
        price := (_private_rule->'per_person'->>(occupancy::text))::numeric;
        IF price <= 0 OR price >= 1000000000 OR price <> round(price, 2) THEN
          RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023';
        END IF;
      END LOOP;
    ELSE
      RAISE EXCEPTION 'umrah_inventory_invalid_configuration' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF _quantity > 0 THEN
    -- Matches existing manual group creation's lock order.
    PERFORM pg_advisory_xact_lock(hashtextextended('pilgrimage-room:' || _program_id, 0));
    SELECT coalesce(max(group_number), 0) + 1 INTO first_number
      FROM public.umrah_rooming_groups WHERE program_id = _program_id
        AND city = _city AND room_type = _room_type;
    INSERT INTO public.umrah_rooming_groups
      (organization_id, program_id, city, gender, room_type, group_number, created_by, inventory_room)
    SELECT _organization_id, _program_id, _city, 'family', _room_type, n, actor, true
      FROM generate_series(first_number, first_number + _quantity - 1) n;
  END IF;

  UPDATE public.pilgrimage_programs SET uses_room_inventory = true,
    inventory_private_prices = CASE WHEN _private_rule IS NULL THEN inventory_private_prices
      ELSE jsonb_set(inventory_private_prices, ARRAY[_room_type], _private_rule, true) END
    WHERE id = _program_id;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.create_booking(
  _organization_id uuid, _program_id uuid, _id uuid, _customer_id uuid,
  _room_type text, _mode text, _passengers jsonb, _expected_total numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  program public.pilgrimage_programs%ROWTYPE;
  prior public.umrah_inventory_bookings%ROWTYPE;
  capacity_per_room integer := pilgrimage_inventory_private.room_size(_room_type);
  passenger_count integer;
  city_name text;
  traveler jsonb;
  traveler_no integer := 0;
  shared_price numeric;
  price_rule jsonb;
  price numeric;
  selected_room uuid;
  room_ids uuid[];
  makkah_ids uuid[] := '{}';
  madinah_ids uuid[] := '{}';
  private_room uuid;
  traveler_gender text;
  fingerprint text;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.user_belongs_to_org(actor, _organization_id), false)
     OR NOT coalesce(public.can_org_write(_organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_view'), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_create'), false)
  THEN RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501'; END IF;
  IF _id IS NULL OR capacity_per_room IS NULL OR _mode IS NULL OR _mode NOT IN ('shared', 'private')
     OR jsonb_typeof(_passengers) IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'umrah_inventory_invalid_booking' USING ERRCODE = '22023'; END IF;
  passenger_count := jsonb_array_length(_passengers);
  IF passenger_count NOT BETWEEN 1 AND 45 OR (_mode = 'private' AND passenger_count > capacity_per_room)
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(_passengers) v
      WHERE coalesce(char_length(btrim(v->>'full_name')), 0) NOT BETWEEN 3 AND 160
        OR coalesce(v->>'gender', '') NOT IN ('male', 'female')
    )
  THEN RAISE EXCEPTION 'umrah_inventory_invalid_booking' USING ERRCODE = '22023'; END IF;

  -- The same parent lock as seat holds, retail registration and operations.
  SELECT * INTO program FROM public.pilgrimage_programs
    WHERE id = _program_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND OR program.program_type <> 'umrah' OR NOT program.uses_room_inventory THEN
    RAISE EXCEPTION 'umrah_inventory_program_unavailable' USING ERRCODE = '22023';
  END IF;
  fingerprint := encode(sha256(convert_to(_passengers::text, 'UTF8')), 'hex');
  SELECT * INTO prior FROM public.umrah_inventory_bookings WHERE id = _id;
  IF FOUND THEN
    IF prior.organization_id = _organization_id AND prior.program_id = _program_id
      AND prior.created_by = actor AND prior.customer_id = _customer_id
      AND prior.room_type = _room_type AND prior.mode = _mode
      AND prior.passenger_count = passenger_count AND prior.total_price = _expected_total
      AND prior.request_fingerprint = fingerprint
    THEN RETURN prior.id; END IF;
    RAISE EXCEPTION 'umrah_inventory_invalid_booking' USING ERRCODE = '22023';
  END IF;
  IF program.status <> 'open' OR NOT private.pilgrimage_sales_ready(program) THEN
    RAISE EXCEPTION 'pilgrimage_sales_confirmation_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT FROM public.customers WHERE id = _customer_id AND organization_id = _organization_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'umrah_inventory_invalid_customer' USING ERRCODE = '23503';
  END IF;
  IF passenger_count + (SELECT count(*) FROM public.pilgrims g
     WHERE g.program_id = _program_id AND g.status <> 'cancelled') > program.capacity
  THEN RAISE EXCEPTION 'umrah_inventory_air_seats_exhausted' USING ERRCODE = '22023'; END IF;

  shared_price := private.pilgrimage_room_price(program, _room_type);
  IF shared_price IS NULL OR shared_price <= 0 THEN
    RAISE EXCEPTION 'registration_requires_room_price' USING ERRCODE = '22023';
  END IF;
  price := round(shared_price * passenger_count, 2);
  IF _mode = 'private' THEN
    price_rule := program.inventory_private_prices->_room_type;
    CASE price_rule->>'method'
      WHEN 'fixed' THEN price := (price_rule->'per_person'->>(passenger_count::text))::numeric * passenger_count;
      WHEN 'supplement' THEN price := price + (price_rule->>'per_empty_bed')::numeric * (capacity_per_room - passenger_count);
      ELSE price := NULL;
    END CASE;
    IF price IS NULL OR price <= 0 THEN
      RAISE EXCEPTION 'umrah_inventory_private_price_required' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF price IS DISTINCT FROM _expected_total THEN
    RAISE EXCEPTION 'umrah_inventory_price_changed' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.umrah_inventory_bookings (
    id, organization_id, program_id, customer_id, room_type, mode, passenger_count, total_price, currency, request_fingerprint, created_by
  ) VALUES (
    _id, _organization_id, _program_id, _customer_id, _room_type, _mode, passenger_count, price, program.currency, fingerprint, actor
  );

  FOREACH city_name IN ARRAY ARRAY['makkah', 'madinah'] LOOP
    IF (city_name = 'makkah' AND program.makkah_nights <= 0)
      OR (city_name = 'madinah' AND program.madinah_nights <= 0) THEN CONTINUE; END IF;
    room_ids := '{}';
    private_room := NULL;
    FOR traveler IN SELECT value FROM jsonb_array_elements(_passengers) LOOP
      traveler_gender := traveler->>'gender';
      IF private_room IS NOT NULL THEN
        room_ids := array_append(room_ids, private_room);
        CONTINUE;
      END IF;

      SELECT rooms.id INTO selected_room
      FROM public.umrah_rooming_groups rooms
      CROSS JOIN LATERAL (
        SELECT count(*)::integer AS used FROM public.pilgrims g
        WHERE g.status <> 'cancelled' AND (
          (city_name = 'makkah' AND g.makkah_rooming_group_id = rooms.id) OR
          (city_name = 'madinah' AND g.madinah_rooming_group_id = rooms.id)
        )
      ) occupancy
      CROSS JOIN LATERAL (
        SELECT count(*)::integer AS used FROM unnest(room_ids) a(id) WHERE a.id = rooms.id
      ) pending
      WHERE rooms.program_id = _program_id AND rooms.organization_id = _organization_id
        AND rooms.city = city_name AND rooms.room_type = _room_type AND rooms.inventory_room
        AND (occupancy.used + pending.used = 0 OR (
          _mode = 'shared' AND rooms.gender = traveler_gender AND occupancy.used + pending.used < capacity_per_room
        ))
      ORDER BY occupancy.used + pending.used DESC, rooms.group_number
      LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'umrah_inventory_rooms_exhausted' USING ERRCODE = '22023', DETAIL = city_name;
      END IF;

      IF _mode = 'private' THEN private_room := selected_room; END IF;
      UPDATE public.umrah_rooming_groups SET gender = CASE WHEN _mode = 'private' THEN 'family' ELSE traveler_gender END
        WHERE id = selected_room;
      room_ids := array_append(room_ids, selected_room);
    END LOOP;
    IF city_name = 'makkah' THEN makkah_ids := room_ids; ELSE madinah_ids := room_ids; END IF;
  END LOOP;

  FOR traveler IN SELECT value FROM jsonb_array_elements(_passengers) LOOP
    traveler_no := traveler_no + 1;
    INSERT INTO public.pilgrims (
      organization_id, program_id, customer_id, full_name, gender, room_type, status, created_by,
      inventory_booking_id, inventory_passenger_no, makkah_rooming_group_id, madinah_rooming_group_id
    ) VALUES (
      _organization_id, _program_id, _customer_id, btrim(traveler->>'full_name'), traveler->>'gender', _room_type, 'registered', actor,
      _id, traveler_no, makkah_ids[traveler_no], madinah_ids[traveler_no]
    );
  END LOOP;
  RETURN _id;
END;
$$;

CREATE FUNCTION public.configure_umrah_room_inventory(
  _organization_id uuid, _program_id uuid, _city text, _room_type text, _quantity integer, _private_rule jsonb
) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.configure(_organization_id, _program_id, _city, _room_type, _quantity, _private_rule); $$;

CREATE FUNCTION public.create_umrah_inventory_booking(
  _organization_id uuid, _program_id uuid, _id uuid, _customer_id uuid,
  _room_type text, _mode text, _passengers jsonb, _expected_total numeric
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.create_booking(_organization_id, _program_id, _id, _customer_id, _room_type, _mode, _passengers, _expected_total); $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilgrimage_inventory_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.configure_umrah_room_inventory(uuid,uuid,text,text,integer,jsonb),
  public.create_umrah_inventory_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pilgrimage_inventory_private.configure(uuid,uuid,text,text,integer,jsonb),
  pilgrimage_inventory_private.create_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric),
  public.configure_umrah_room_inventory(uuid,uuid,text,text,integer,jsonb),
  public.create_umrah_inventory_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric) TO authenticated;

CREATE FUNCTION pilgrimage_inventory_private.guard_program()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  -- The configuration RPC validates the initial inventory and private tariffs.
  IF current_user IN ('authenticated', 'anon') AND (
    (TG_OP = 'INSERT' AND (NEW.uses_room_inventory OR NEW.inventory_private_prices <> '{}'::jsonb))
    OR (TG_OP = 'UPDATE' AND (NEW.uses_room_inventory, NEW.inventory_private_prices)
      IS DISTINCT FROM (OLD.uses_room_inventory, OLD.inventory_private_prices))
  ) THEN RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.uses_room_inventory AND (
    NEW.capacity <= 0 OR (NEW.makkah_hotel, NEW.madinah_hotel, NEW.makkah_nights, NEW.madinah_nights)
     IS DISTINCT FROM (OLD.makkah_hotel, OLD.madinah_hotel, OLD.makkah_nights, OLD.madinah_nights)
  ) THEN RAISE EXCEPTION 'umrah_inventory_hotel_change_requires_reallocation' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER a_umrah_inventory_program_guard
  BEFORE INSERT OR UPDATE ON public.pilgrimage_programs FOR EACH ROW
  EXECUTE FUNCTION pilgrimage_inventory_private.guard_program();

CREATE FUNCTION pilgrimage_inventory_private.guard_passenger()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
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

  IF OLD.inventory_booking_id IS NOT NULL AND (
    (NEW.room_type, NEW.gender, NEW.customer_id, NEW.makkah_rooming_group_id,
     NEW.madinah_rooming_group_id, NEW.makkah_room, NEW.madinah_room)
    IS DISTINCT FROM
    (OLD.room_type, OLD.gender, OLD.customer_id, OLD.makkah_rooming_group_id,
     OLD.madinah_rooming_group_id, OLD.makkah_room, OLD.madinah_room)
    OR (NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NOT EXISTS (
      SELECT 1 FROM public.pilgrimage_operations a WHERE a.pilgrim_id = OLD.id
        AND a.action = 'cancel' AND a.created_by = auth.uid() AND a.transaction_id = txid_current()
    ))
  ) THEN RAISE EXCEPTION 'umrah_inventory_room_change_required' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER a_umrah_inventory_passenger_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.pilgrims FOR EACH ROW
  EXECUTE FUNCTION pilgrimage_inventory_private.guard_passenger();

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.guard_program(),
  pilgrimage_inventory_private.guard_passenger() FROM PUBLIC, anon, authenticated;

DO $patch$
DECLARE
  definition text;
  needle text;
BEGIN
  -- Keep the passenger price and pennies fixed from the authorized sale.
  SELECT pg_get_functiondef('public._pilgrimage_pilgrim_integrity()'::regprocedure) INTO definition;
  needle := 'NEW.total_price:=CASE WHEN NEW.b2b_roster_entry_id IS NULL THEN v_price ELSE 0 END;';
  IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected pilgrim price guard'; END IF;
  EXECUTE replace(definition, needle, 'IF TG_OP = ''INSERT'' AND NEW.inventory_booking_id IS NOT NULL THEN
    SELECT trunc(b.total_price / b.passenger_count, 2)
      + CASE WHEN NEW.inventory_passenger_no = b.passenger_count
          THEN b.total_price - trunc(b.total_price / b.passenger_count, 2) * b.passenger_count ELSE 0 END
      INTO STRICT NEW.total_price
      FROM public.umrah_inventory_bookings b
      WHERE b.id = NEW.inventory_booking_id AND b.organization_id = NEW.organization_id
        AND b.program_id = NEW.program_id AND b.room_type = NEW.room_type
        AND NEW.inventory_passenger_no BETWEEN 1 AND b.passenger_count;
  ELSE ' || needle || ' END IF;');

  SELECT pg_get_functiondef('pilgrimage_operations_private.guard_umrah_rooming()'::regprocedure) INTO definition;
  needle := 'IF auth.uid() IS NOT NULL AND NOT coalesce(public.has_org_permission(NEW.organization_id, ''bookings_edit''), false) THEN';
  IF strpos(definition, needle) = 0 OR strpos(definition, 'IF NEW.gender IS DISTINCT FROM room_group.gender THEN') = 0
     OR strpos(definition, 'IF NOT FOUND THEN RAISE EXCEPTION ''umrah_rooming_group_mismatch''') = 0
  THEN RAISE EXCEPTION 'Unexpected room group guard'; END IF;
  definition := replace(definition, needle, 'IF NOT (TG_OP = ''INSERT'' AND NEW.inventory_booking_id IS NOT NULL)
    AND auth.uid() IS NOT NULL AND NOT coalesce(public.has_org_permission(NEW.organization_id, ''bookings_edit''), false) THEN');
  definition := replace(definition, 'IF NEW.gender IS DISTINCT FROM room_group.gender THEN',
    'IF room_group.inventory_room IS DISTINCT FROM (NEW.inventory_booking_id IS NOT NULL) THEN
      RAISE EXCEPTION ''umrah_inventory_booking_required'' USING ERRCODE = ''22023'';
    END IF;
    IF room_group.gender <> ''family'' AND NEW.gender IS DISTINCT FROM room_group.gender THEN');
  EXECUTE definition;

  SELECT pg_get_functiondef('private.guard_pilgrimage_sales_inventory()'::regprocedure) INTO definition;
  needle := 'IF linked_sale IS NOT NULL THEN';
  IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected pilgrimage sale stock guard'; END IF;
  EXECUTE replace(definition, needle, 'IF p.uses_room_inventory THEN
    IF TG_TABLE_NAME <> ''pilgrims'' THEN
      RAISE EXCEPTION ''umrah_inventory_booking_required'' USING ERRCODE = ''22023'';
    ELSIF NEW.inventory_booking_id IS NULL THEN
      RAISE EXCEPTION ''umrah_inventory_booking_required'' USING ERRCODE = ''22023'';
    END IF;
  END IF;
  ' || needle);

  SELECT pg_get_functiondef('public.search_pilgrimage_availability(uuid,text,date,date,integer,text,uuid)'::regprocedure) INTO definition;
  needle := 'WHERE p.organization_id=_organization_id AND (';
  IF strpos(definition, needle) = 0 THEN RAISE EXCEPTION 'Unexpected legacy pilgrimage availability search'; END IF;
  EXECUTE replace(definition, needle, 'WHERE p.organization_id=_organization_id AND NOT p.uses_room_inventory AND (');
END;
$patch$;

CREATE FUNCTION public.get_umrah_room_inventory(_organization_id uuid, _program_id uuid)
RETURNS TABLE(city text, room_type text, contracted integer, empty_rooms integer, male_beds integer, female_beds integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT r.city, r.room_type, count(*)::integer,
    count(*) FILTER (WHERE occupancy.used = 0)::integer,
    coalesce(sum(r.capacity - occupancy.used) FILTER (WHERE r.gender = 'male' AND occupancy.used > 0), 0)::integer,
    coalesce(sum(r.capacity - occupancy.used) FILTER (WHERE r.gender = 'female' AND occupancy.used > 0), 0)::integer
  FROM (
    SELECT g.*, CASE g.room_type WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 4 END AS capacity
    FROM public.umrah_rooming_groups g
    WHERE g.organization_id = _organization_id AND g.program_id = _program_id AND g.inventory_room
  ) r
  CROSS JOIN LATERAL (
    SELECT count(*)::integer AS used FROM public.pilgrims g
    WHERE g.organization_id = _organization_id AND g.program_id = _program_id AND g.status <> 'cancelled'
      AND ((r.city = 'makkah' AND g.makkah_rooming_group_id = r.id) OR
           (r.city = 'madinah' AND g.madinah_rooming_group_id = r.id))
  ) occupancy
  GROUP BY r.city, r.room_type
  ORDER BY r.city, r.room_type;
$$;
REVOKE ALL ON FUNCTION public.get_umrah_room_inventory(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_umrah_room_inventory(uuid,uuid) TO authenticated;
