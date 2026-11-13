BEGIN;

CREATE TABLE public.umrah_rooming_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id),
  city text NOT NULL CHECK (city IN ('makkah', 'madinah')),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  room_type text NOT NULL CHECK (room_type IN ('single', 'double', 'triple', 'quad')),
  group_number integer NOT NULL CHECK (group_number > 0),
  hotel_room_number text CHECK (char_length(hotel_room_number) BETWEEN 1 AND 50),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, city, gender, room_type, group_number)
);
CREATE UNIQUE INDEX umrah_rooming_hotel_number
  ON public.umrah_rooming_groups (program_id, city, lower(hotel_room_number))
  WHERE hotel_room_number IS NOT NULL;

ALTER TABLE public.umrah_rooming_groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umrah_rooming_groups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.umrah_rooming_groups TO authenticated;
GRANT ALL ON public.umrah_rooming_groups TO service_role;
CREATE POLICY umrah_rooming_groups_read ON public.umrah_rooming_groups FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.has_org_permission(organization_id, 'bookings_view'));

ALTER TABLE public.pilgrims
  ADD COLUMN makkah_rooming_group_id uuid REFERENCES public.umrah_rooming_groups(id),
  ADD COLUMN madinah_rooming_group_id uuid REFERENCES public.umrah_rooming_groups(id);
CREATE INDEX pilgrims_makkah_rooming_group_idx ON public.pilgrims (makkah_rooming_group_id)
  WHERE makkah_rooming_group_id IS NOT NULL;
CREATE INDEX pilgrims_madinah_rooming_group_idx ON public.pilgrims (madinah_rooming_group_id)
  WHERE madinah_rooming_group_id IS NOT NULL;

CREATE FUNCTION pilgrimage_operations_private.guard_umrah_rooming()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  city_name text;
  group_id uuid;
  previous_id uuid;
  current_room text;
  room_group public.umrah_rooming_groups%ROWTYPE;
  occupants integer;
  room_capacity integer;
  program_status text;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.makkah_rooming_group_id IS NOT NULL AND nullif(btrim(NEW.makkah_room), '') IS NOT NULL
    OR NEW.madinah_rooming_group_id IS NOT NULL AND nullif(btrim(NEW.madinah_room), '') IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR NEW.room_type IS NOT DISTINCT FROM OLD.room_type THEN
      RAISE EXCEPTION 'umrah_rooming_choose_one' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.room_type IS DISTINCT FROM OLD.room_type THEN
    NEW.makkah_rooming_group_id := NULL;
    NEW.madinah_rooming_group_id := NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.makkah_rooming_group_id, NEW.madinah_rooming_group_id, NEW.gender)
    IS NOT DISTINCT FROM (OLD.makkah_rooming_group_id, OLD.madinah_rooming_group_id, OLD.gender)
    AND OLD.status <> 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.makkah_rooming_group_id IS NULL AND OLD.madinah_rooming_group_id IS NULL
    AND NEW.makkah_rooming_group_id IS NULL AND NEW.madinah_rooming_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT coalesce(public.has_org_permission(NEW.organization_id, 'bookings_edit'), false) THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('traveled', 'completed') THEN
    RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pilgrimage-room:' || NEW.program_id, 0));
  SELECT p.status INTO program_status FROM public.pilgrimage_programs p
  WHERE p.id = NEW.program_id AND p.organization_id = NEW.organization_id;
  IF program_status IN ('departed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
  END IF;
  IF NEW.makkah_rooming_group_id IS NULL AND NEW.madinah_rooming_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  room_capacity := CASE NEW.room_type WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'quad' THEN 4 END;
  FOREACH city_name IN ARRAY ARRAY['makkah', 'madinah'] LOOP
    group_id := CASE city_name WHEN 'makkah' THEN NEW.makkah_rooming_group_id ELSE NEW.madinah_rooming_group_id END;
    IF group_id IS NULL THEN CONTINUE; END IF;
    previous_id := NULL;
    IF TG_OP = 'UPDATE' THEN
      previous_id := CASE city_name WHEN 'makkah' THEN OLD.makkah_rooming_group_id ELSE OLD.madinah_rooming_group_id END;
      IF group_id IS NOT DISTINCT FROM previous_id AND NEW.gender IS NOT DISTINCT FROM OLD.gender
        AND OLD.status <> 'cancelled' THEN CONTINUE; END IF;
    END IF;
    SELECT * INTO room_group FROM public.umrah_rooming_groups g
    WHERE g.id = group_id AND g.organization_id = NEW.organization_id AND g.program_id = NEW.program_id AND g.city = city_name;
    IF NOT FOUND THEN RAISE EXCEPTION 'umrah_rooming_group_mismatch' USING ERRCODE = '22023'; END IF;
    IF NEW.gender IS DISTINCT FROM room_group.gender THEN
      RAISE EXCEPTION 'umrah_rooming_gender_mismatch' USING ERRCODE = '22023';
    END IF;
    IF NEW.room_type IS DISTINCT FROM room_group.room_type THEN
      RAISE EXCEPTION 'room_category_conflict' USING ERRCODE = '22023';
    END IF;
    IF city_name = 'makkah' THEN
      SELECT count(*) INTO occupants FROM public.pilgrims p
      WHERE p.makkah_rooming_group_id = group_id AND p.status <> 'cancelled' AND p.id IS DISTINCT FROM NEW.id;
    ELSE
      SELECT count(*) INTO occupants FROM public.pilgrims p
      WHERE p.madinah_rooming_group_id = group_id AND p.status <> 'cancelled' AND p.id IS DISTINCT FROM NEW.id;
    END IF;
    IF occupants >= room_capacity THEN RAISE EXCEPTION 'room_capacity_exceeded' USING ERRCODE = '22023'; END IF;
    current_room := CASE city_name WHEN 'makkah' THEN NEW.makkah_room ELSE NEW.madinah_room END;
    IF nullif(btrim(current_room), '') IS NOT NULL THEN
      RAISE EXCEPTION 'umrah_rooming_choose_one' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION pilgrimage_operations_private.guard_umrah_rooming() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER yy_umrah_rooming_guard BEFORE INSERT OR UPDATE OF makkah_rooming_group_id, madinah_rooming_group_id, makkah_room, madinah_room, room_type, gender, status
ON public.pilgrims FOR EACH ROW EXECUTE FUNCTION pilgrimage_operations_private.guard_umrah_rooming();

DO $patch$
DECLARE
  definition text;
  before_count text := 'SELECT count(*), coalesce(bool_or(g.room_type <> NEW.room_type), false),';
BEGIN
  SELECT pg_get_functiondef('public._pilgrimage_pilgrim_integrity()'::regprocedure) INTO definition;
  IF strpos(definition, 'p.makkah_nights>0 AND nullif') = 0 OR strpos(definition, 'p.madinah_nights>0 AND nullif') = 0 THEN
    RAISE EXCEPTION 'Unexpected pilgrimage readiness guard';
  END IF;
  EXECUTE replace(replace(definition,
    'p.makkah_nights>0 AND nullif', 'p.makkah_nights>0 AND NEW.makkah_rooming_group_id IS NULL AND nullif'),
    'p.madinah_nights>0 AND nullif', 'p.madinah_nights>0 AND NEW.madinah_rooming_group_id IS NULL AND nullif');
  SELECT pg_get_functiondef('pilgrimage_operations_private.guard_room()'::regprocedure) INTO definition;
  IF strpos(definition, before_count) = 0 THEN RAISE EXCEPTION 'Unexpected pilgrimage hotel room guard'; END IF;
  definition := replace(replace(replace(replace(definition,
    'city text;', 'hotel_city text;'), 'FOREACH city IN', 'FOREACH hotel_city IN'),
    'CASE city WHEN', 'CASE hotel_city WHEN'), 'IF city =', 'IF hotel_city =');
  EXECUTE replace(definition, before_count, 'IF EXISTS (
      SELECT FROM public.umrah_rooming_groups g
      WHERE g.program_id=NEW.program_id AND g.organization_id=NEW.organization_id AND g.city=hotel_city
        AND lower(g.hotel_room_number)=lower(room)
    ) THEN RAISE EXCEPTION ''umrah_hotel_room_in_use'' USING ERRCODE=''23505''; END IF;
    ' || before_count);
END $patch$;

CREATE FUNCTION public.assign_umrah_rooming_group(
  _organization_id uuid, _program_id uuid, _pilgrim_id uuid, _city text, _group_id uuid DEFAULT NULL,
  _new_group boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  passenger public.pilgrims%ROWTYPE;
  program public.pilgrimage_programs%ROWTYPE;
  target_group uuid := _group_id;
  next_number integer;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization_id), false)
     OR NOT coalesce(public.can_org_write(_organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_edit'), false) THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;
  IF _city IS NULL OR _city NOT IN ('makkah', 'madinah') OR _new_group IS NULL OR (_new_group AND _group_id IS NULL) THEN
    RAISE EXCEPTION 'umrah_rooming_group_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO program FROM public.pilgrimage_programs
  WHERE id = _program_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND OR program.program_type <> 'umrah' OR program.status IN ('departed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO passenger FROM public.pilgrims
  WHERE id = _pilgrim_id AND organization_id = _organization_id AND program_id = _program_id FOR UPDATE;
  IF NOT FOUND OR passenger.status IN ('cancelled', 'traveled', 'completed') THEN
    RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
  END IF;
  IF passenger.gender IS NULL AND (_new_group OR _group_id IS NOT NULL) THEN
    RAISE EXCEPTION 'umrah_rooming_gender_required' USING ERRCODE = '22023';
  END IF;
  IF _new_group AND NOT EXISTS (SELECT FROM public.umrah_rooming_groups WHERE id = _group_id) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('pilgrimage-room:' || _program_id, 0));
    SELECT coalesce(max(group_number), 0) + 1 INTO next_number FROM public.umrah_rooming_groups
    WHERE program_id = _program_id AND city = _city AND gender = passenger.gender AND room_type = passenger.room_type;
    INSERT INTO public.umrah_rooming_groups (id, organization_id, program_id, city, gender, room_type, group_number, created_by)
    VALUES (_group_id, _organization_id, _program_id, _city, passenger.gender, passenger.room_type, next_number, auth.uid())
    RETURNING id INTO target_group;
  END IF;

  IF _city = 'makkah' THEN
    UPDATE public.pilgrims SET makkah_rooming_group_id = target_group, makkah_room = NULL,
      status = CASE WHEN target_group IS NULL AND status = 'ready' THEN 'registered' ELSE status END
    WHERE id = passenger.id;
  ELSE
    UPDATE public.pilgrims SET madinah_rooming_group_id = target_group, madinah_room = NULL,
      status = CASE WHEN target_group IS NULL AND status = 'ready' THEN 'registered' ELSE status END
    WHERE id = passenger.id;
  END IF;
  RETURN target_group;
END;
$$;

CREATE FUNCTION public.set_umrah_hotel_room_number(
  _organization_id uuid, _program_id uuid, _group_id uuid, _hotel_room_number text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  room_number text := nullif(btrim(_hotel_room_number), '');
  room_group public.umrah_rooming_groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization_id), false)
     OR NOT coalesce(public.can_org_write(_organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_edit'), false) THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;
  IF char_length(room_number) > 50 THEN RAISE EXCEPTION 'room_identifier_too_long' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.pilgrimage_programs
  WHERE id = _program_id AND organization_id = _organization_id
    AND program_type = 'umrah' AND status NOT IN ('departed', 'completed', 'cancelled') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023'; END IF;
  SELECT * INTO room_group FROM public.umrah_rooming_groups
  WHERE id = _group_id AND program_id = _program_id AND organization_id = _organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'umrah_rooming_group_mismatch' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pilgrimage-room:' || _program_id, 0));
  IF room_number IS NOT NULL AND EXISTS (
    SELECT FROM public.pilgrims p WHERE p.program_id = _program_id AND p.organization_id = _organization_id
      AND p.status <> 'cancelled'
      AND lower(btrim(CASE room_group.city WHEN 'makkah' THEN p.makkah_room ELSE p.madinah_room END)) = lower(room_number)
  ) THEN RAISE EXCEPTION 'umrah_hotel_room_in_use' USING ERRCODE = '23505'; END IF;
  UPDATE public.umrah_rooming_groups SET hotel_room_number = room_number WHERE id = room_group.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_umrah_rooming_group(uuid, uuid, uuid, text, uuid, boolean),
  public.set_umrah_hotel_room_number(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_umrah_rooming_group(uuid, uuid, uuid, text, uuid, boolean),
  public.set_umrah_hotel_room_number(uuid, uuid, uuid, text) TO authenticated;

COMMIT;
