-- Apply after deploy-pilgrimage-b2b-passengers.sql.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE FUNCTION private.pilgrimage_occupied_seats(
  _organization_id uuid, _program_id uuid, _at timestamptz, _exclude_sale_id uuid DEFAULT NULL
) RETURNS bigint LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT
    (SELECT count(*) FROM public.pilgrims g
      WHERE g.organization_id=_organization_id AND g.program_id=_program_id
        AND g.status<>'cancelled' AND g.b2b_roster_entry_id IS NULL)
    + (SELECT coalesce(sum(a.seat_count),0) FROM public.pilgrimage_seat_allocations a
      WHERE a.organization_id=_organization_id AND a.program_id=_program_id
        AND a.sale_id IS DISTINCT FROM _exclude_sale_id
        AND (a.status='allocated' OR (a.status='held' AND a.hold_expires_at>_at)));
$$;
REVOKE ALL ON FUNCTION private.pilgrimage_occupied_seats(uuid,uuid,timestamptz,uuid)
  FROM PUBLIC, anon, authenticated;

-- Preserve the existing quote and hold workflows and their locking order.
DO $patch$
DECLARE
  definition text;
  old_quote text := $old$SELECT count(*) INTO v_registered FROM public.pilgrims g
        WHERE g.program_id=NEW.program_id AND g.status<>'cancelled' AND g.b2b_roster_entry_id IS NULL;$old$;
  old_hold text := $old$SELECT count(*) INTO v_registered FROM public.pilgrims g
      WHERE g.program_id=p.id AND g.organization_id=p.organization_id
        AND g.status<>'cancelled' AND g.b2b_roster_entry_id IS NULL;
    SELECT coalesce(sum(x.seat_count),0) INTO v_other_allocated
      FROM public.pilgrimage_seat_allocations x
      WHERE x.program_id=p.id AND x.organization_id=p.organization_id
        AND x.sale_id<>s.id
        AND (x.status='allocated' OR
          (x.status='held' AND x.hold_expires_at>v_now));$old$;
BEGIN
  definition := pg_get_functiondef('public._pilgrimage_sale_guard()'::regprocedure);
  IF strpos(definition,old_quote)=0 THEN RAISE EXCEPTION 'Unexpected pilgrimage quote inventory definition'; END IF;
  EXECUTE replace(definition,old_quote,
    'v_registered := private.pilgrimage_occupied_seats(NEW.organization_id,NEW.program_id,clock_timestamp(),NEW.id);');

  definition := pg_get_functiondef('public.transition_pilgrimage_seat_allocation(uuid,text,integer)'::regprocedure);
  IF strpos(definition,old_hold)=0 THEN RAISE EXCEPTION 'Unexpected pilgrimage hold inventory definition'; END IF;
  definition := replace(definition,old_hold,
    'v_registered := private.pilgrimage_occupied_seats(p.organization_id,p.id,v_now,s.id);');
  definition := replace(definition,'  v_other_allocated bigint;','');
  EXECUTE replace(definition,'v_registered+v_other_allocated+s.party_size','v_registered+s.party_size');
END;
$patch$;

CREATE FUNCTION private.pilgrimage_room_price(p public.pilgrimage_programs, _room_type text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE _room_type WHEN 'single' THEN p.price_single WHEN 'double' THEN p.price_double
    WHEN 'triple' THEN p.price_triple WHEN 'quad' THEN p.price_quad END;
$$;
REVOKE ALL ON FUNCTION private.pilgrimage_room_price(public.pilgrimage_programs,text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.search_pilgrimage_availability(
  _organization_id uuid, _program_type text DEFAULT NULL, _departure_from date DEFAULT NULL,
  _departure_to date DEFAULT NULL, _party_size integer DEFAULT 1, _room_type text DEFAULT 'quad',
  _program_id uuid DEFAULT NULL
) RETURNS TABLE (
  program_id uuid, program_name text, program_type text, departure_date date, return_date date,
  makkah_hotel text, madinah_hotel text, currency text, unit_price numeric, available_seats bigint,
  program_status text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(),_organization_id),false)
    OR NOT coalesce(public.has_org_permission(_organization_id,'bookings_view'),false) THEN
    RAISE EXCEPTION 'pilgrimage_search_denied' USING ERRCODE='42501';
  END IF;
  IF (_program_type IS NOT NULL AND _program_type NOT IN ('hajj','umrah'))
    OR _room_type IS NULL OR _room_type NOT IN ('single','double','triple','quad')
    OR _party_size IS NULL OR _party_size NOT BETWEEN 1 AND 10000
    OR _departure_from > _departure_to THEN
    RAISE EXCEPTION 'pilgrimage_search_invalid_filters' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
    SELECT p.id, p.name, p.program_type, p.departure_date, p.return_date,
      p.makkah_hotel, p.madinah_hotel, p.currency, offer.price, offer.seats, p.status
    FROM public.pilgrimage_programs p
    CROSS JOIN LATERAL (
      SELECT private.pilgrimage_room_price(p,_room_type) AS price,
        CASE WHEN p.capacity>0 THEN greatest(0,p.capacity-private.pilgrimage_occupied_seats(
          p.organization_id,p.id,statement_timestamp())) END AS seats
    ) offer
    WHERE p.organization_id=_organization_id AND (
      (_program_id IS NOT NULL AND p.id=_program_id) OR
      (_program_id IS NULL AND p.status='open' AND p.departure_date>=current_date
        AND (_program_type IS NULL OR p.program_type=_program_type)
        AND (_departure_from IS NULL OR p.departure_date>=_departure_from)
        AND (_departure_to IS NULL OR p.departure_date<=_departure_to)
        AND offer.price>0 AND (offer.seats IS NULL OR offer.seats>=_party_size))
    )
    ORDER BY p.departure_date NULLS LAST,p.name,p.id;
END;
$$;

CREATE FUNCTION public.create_pilgrimage_quote_from_availability(
  _organization_id uuid, _request_id uuid, _program_id uuid, _customer_id uuid,
  _party_size integer, _room_type text, _expected_unit_price numeric, _expected_currency text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  p public.pilgrimage_programs%ROWTYPE;
  q public.pilgrimage_sales%ROWTYPE;
  price numeric;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.user_belongs_to_org(actor,_organization_id),false)
    OR NOT coalesce(public.can_org_write(_organization_id),false)
    OR NOT coalesce(public.has_org_permission(_organization_id,'bookings_view'),false)
    OR NOT coalesce(public.has_org_permission(_organization_id,'customers_view'),false)
    OR NOT coalesce(public.has_org_permission(_organization_id,'quotes_create'),false) THEN
    RAISE EXCEPTION 'pilgrimage_quote_creation_denied' USING ERRCODE='42501';
  END IF;
  IF _request_id IS NULL OR _program_id IS NULL OR _customer_id IS NULL OR _party_size IS NULL
    OR _party_size NOT BETWEEN 1 AND 10000 OR _room_type IS NULL
    OR _room_type NOT IN ('single','double','triple','quad') THEN
    RAISE EXCEPTION 'pilgrimage_quote_invalid_selection' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,0));
  SELECT * INTO q FROM public.pilgrimage_sales WHERE id=_request_id AND organization_id=_organization_id;
  IF FOUND THEN
    IF q.created_by=actor AND q.sale_model='group_seat' AND q.program_id=_program_id
      AND q.buyer_customer_id=_customer_id AND q.party_size=_party_size AND q.currency=_expected_currency
      AND EXISTS (SELECT 1 FROM public.pilgrimage_sale_items i WHERE i.sale_id=q.id AND i.organization_id=q.organization_id
        AND i.item_kind='program_seat' AND i.room_type=_room_type AND i.quantity=_party_size
        AND i.unit_sell=_expected_unit_price) THEN RETURN q.id; END IF;
    RAISE EXCEPTION 'pilgrimage_quote_request_already_used' USING ERRCODE='22023';
  END IF;
  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id=_program_id AND organization_id=_organization_id FOR UPDATE;
  IF NOT FOUND OR p.status<>'open' OR p.departure_date IS NULL OR p.departure_date<current_date THEN
    RAISE EXCEPTION 'pilgrimage_quote_program_unavailable' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.customers c WHERE c.id=_customer_id
    AND c.organization_id=_organization_id AND c.archived_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilgrimage_quote_customer_unavailable' USING ERRCODE='22023';
  END IF;
  price := private.pilgrimage_room_price(p,_room_type);
  IF price IS NULL OR price<=0 OR price IS DISTINCT FROM _expected_unit_price
    OR p.currency IS DISTINCT FROM _expected_currency THEN
    RAISE EXCEPTION 'pilgrimage_quote_price_changed' USING ERRCODE='22023';
  END IF;
  IF p.capacity>0 AND private.pilgrimage_occupied_seats(p.organization_id,p.id,clock_timestamp())+_party_size>p.capacity THEN
    RAISE EXCEPTION 'insufficient_unallocated_program_seats' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.pilgrimage_sales (id,organization_id,program_type,sale_model,fulfillment_role,name,
    program_id,buyer_customer_id,party_size,currency,departure_date,return_date,created_by)
  VALUES (_request_id,p.organization_id,p.program_type,'group_seat','organizer',p.name,
    p.id,_customer_id,_party_size,p.currency,p.departure_date,p.return_date,actor);
  INSERT INTO public.pilgrimage_sale_items (organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell)
  VALUES (p.organization_id,_request_id,'program_seat',p.name,_room_type,_party_size,price);
  RETURN _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.search_pilgrimage_availability(uuid,text,date,date,integer,text,uuid),
  public.create_pilgrimage_quote_from_availability(uuid,uuid,uuid,uuid,integer,text,numeric,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_pilgrimage_availability(uuid,text,date,date,integer,text,uuid),
  public.create_pilgrimage_quote_from_availability(uuid,uuid,uuid,uuid,integer,text,numeric,text)
  TO authenticated;

COMMIT;
