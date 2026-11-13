ALTER TABLE public.pilgrimage_programs
  ADD COLUMN sales_confirmed_at timestamptz,
  ALTER COLUMN status SET DEFAULT 'draft';

CREATE FUNCTION private.pilgrimage_sales_ready(p public.pilgrimage_programs)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT p.sales_confirmed_at IS NOT NULL
    AND p.departure_date IS NOT NULL AND p.departure_date >= current_date
    AND p.return_date IS NOT NULL AND p.return_date >= p.departure_date
    AND p.capacity > 0
    AND greatest(p.price_quad, p.price_triple, p.price_double, p.price_single) > 0;
$$;
REVOKE ALL ON FUNCTION private.pilgrimage_sales_ready(public.pilgrimage_programs)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.guard_pilgrimage_sales_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.sales_confirmed_at IS NOT NULL THEN NEW.sales_confirmed_at := statement_timestamp(); END IF;
  ELSIF NEW.sales_confirmed_at IS DISTINCT FROM OLD.sales_confirmed_at THEN
    IF NEW.sales_confirmed_at IS NOT NULL THEN NEW.sales_confirmed_at := statement_timestamp(); END IF;
  ELSIF (NEW.departure_date, NEW.return_date, NEW.capacity, NEW.currency,
         NEW.price_quad, NEW.price_triple, NEW.price_double, NEW.price_single)
        IS DISTINCT FROM
        (OLD.departure_date, OLD.return_date, OLD.capacity, OLD.currency,
         OLD.price_quad, OLD.price_triple, OLD.price_double, OLD.price_single) THEN
    NEW.sales_confirmed_at := NULL;
  END IF;

  IF ((NEW.sales_confirmed_at IS NOT NULL AND
         (TG_OP = 'INSERT' OR NEW.sales_confirmed_at IS DISTINCT FROM OLD.sales_confirmed_at))
       OR (NEW.status = 'open' AND (TG_OP = 'INSERT' OR OLD.status <> 'open')))
     AND NOT private.pilgrimage_sales_ready(NEW) THEN
    RAISE EXCEPTION 'pilgrimage_sales_confirmation_required' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pilgrimage_sales_confirmation
  BEFORE INSERT OR UPDATE ON public.pilgrimage_programs
  FOR EACH ROW EXECUTE FUNCTION private.guard_pilgrimage_sales_confirmation();

CREATE FUNCTION private.guard_pilgrimage_sales_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  p public.pilgrimage_programs%ROWTYPE;
  target_program uuid;
  linked_sale uuid;
  quote_dates date[];
BEGIN
  IF TG_TABLE_NAME = 'pilgrimage_sales' THEN
    IF NEW.program_id IS NULL OR NEW.status <> 'quoted' OR OLD.status = 'quoted' THEN RETURN NEW; END IF;
    target_program := NEW.program_id;
    linked_sale := NEW.id;
    quote_dates := ARRAY[NEW.departure_date, NEW.return_date];
  ELSIF TG_TABLE_NAME = 'pilgrimage_b2b_agreements' THEN
    IF NEW.status <> 'approved_internal' OR OLD.status = 'approved_internal' THEN RETURN NEW; END IF;
    linked_sale := NEW.sale_id;
    SELECT program_id, ARRAY[departure_date, return_date] INTO target_program, quote_dates
      FROM public.pilgrimage_sales WHERE id = linked_sale AND organization_id = NEW.organization_id;
    IF target_program IS NULL THEN RETURN NEW; END IF;
  ELSE
    IF NEW.status = 'cancelled' OR NEW.status = 'released' THEN RETURN NEW; END IF;
    target_program := NEW.program_id;
    IF TG_TABLE_NAME = 'pilgrimage_seat_allocations' THEN
      linked_sale := NEW.sale_id;
      SELECT ARRAY[departure_date, return_date] INTO quote_dates FROM public.pilgrimage_sales
        WHERE id = linked_sale AND organization_id = NEW.organization_id;
    END IF;
  END IF;

  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id = target_program AND organization_id = NEW.organization_id FOR UPDATE;
  IF NOT FOUND OR NOT private.pilgrimage_sales_ready(p)
     OR (p.status <> 'open' AND NOT (TG_TABLE_NAME = 'pilgrims' AND p.status = 'full')) THEN
    RAISE EXCEPTION 'pilgrimage_sales_confirmation_required' USING ERRCODE = '22023';
  END IF;

  IF linked_sale IS NOT NULL THEN
    IF quote_dates IS DISTINCT FROM ARRAY[p.departure_date, p.return_date] THEN
      RAISE EXCEPTION 'pilgrimage_quote_dates_changed' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.pilgrimage_sale_items i
      WHERE i.sale_id = linked_sale AND i.organization_id = NEW.organization_id AND i.item_kind = 'program_seat'
        AND (coalesce(private.pilgrimage_room_price(p, i.room_type), 0) <= 0 OR i.unit_sell <= 0)
    ) THEN
      RAISE EXCEPTION 'pilgrimage_quote_room_price_required' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_pilgrimage_sales_confirmation(), private.guard_pilgrimage_sales_inventory()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER pilgrimage_sales_inventory BEFORE UPDATE OF status ON public.pilgrimage_sales
  FOR EACH ROW EXECUTE FUNCTION private.guard_pilgrimage_sales_inventory();
CREATE TRIGGER pilgrimage_sales_inventory BEFORE INSERT ON public.pilgrims
  FOR EACH ROW EXECUTE FUNCTION private.guard_pilgrimage_sales_inventory();
CREATE TRIGGER pilgrimage_sales_inventory BEFORE INSERT OR UPDATE OF status, hold_expires_at
  ON public.pilgrimage_seat_allocations
  FOR EACH ROW EXECUTE FUNCTION private.guard_pilgrimage_sales_inventory();
CREATE TRIGGER pilgrimage_sales_inventory BEFORE UPDATE OF status ON public.pilgrimage_b2b_agreements
  FOR EACH ROW EXECUTE FUNCTION private.guard_pilgrimage_sales_inventory();

CREATE OR REPLACE FUNCTION public.search_pilgrimage_availability(
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
      p.makkah_hotel, p.madinah_hotel, p.currency,
      CASE WHEN offer.ready THEN offer.price END,
      CASE WHEN offer.ready THEN offer.seats END,
      CASE WHEN p.status='open' AND NOT offer.ready THEN 'closed' ELSE p.status END
    FROM public.pilgrimage_programs p
    CROSS JOIN LATERAL (
      SELECT private.pilgrimage_sales_ready(p) AS ready,
        private.pilgrimage_room_price(p,_room_type) AS price,
        CASE WHEN p.capacity>0 THEN greatest(0,p.capacity-private.pilgrimage_occupied_seats(
          p.organization_id,p.id,statement_timestamp())) END AS seats
    ) offer
    WHERE p.organization_id=_organization_id AND (
      (_program_id IS NOT NULL AND p.id=_program_id) OR
      (_program_id IS NULL AND p.status='open' AND offer.ready
        AND (_program_type IS NULL OR p.program_type=_program_type)
        AND (_departure_from IS NULL OR p.departure_date>=_departure_from)
        AND (_departure_to IS NULL OR p.departure_date<=_departure_to)
        AND offer.price>0 AND offer.seats>=_party_size)
    )
    ORDER BY p.departure_date NULLS LAST,p.name,p.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pilgrimage_quote_from_availability(
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
  IF NOT FOUND OR p.status<>'open' OR NOT private.pilgrimage_sales_ready(p) THEN
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
