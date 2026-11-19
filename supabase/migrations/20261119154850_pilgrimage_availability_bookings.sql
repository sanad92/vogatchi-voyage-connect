ALTER TABLE public.pilgrimage_sales
  ADD COLUMN booked_from_availability boolean NOT NULL DEFAULT false;
ALTER TABLE public.pilgrimage_seat_allocations
  ADD COLUMN confirmed_sale_id uuid,
  ADD CONSTRAINT pilgrimage_confirmed_hold_released CHECK (confirmed_sale_id IS NULL OR status = 'released'),
  ADD CONSTRAINT pilgrimage_allocation_confirmed_sale_fk
    FOREIGN KEY (organization_id, confirmed_sale_id) REFERENCES public.pilgrimage_sales(organization_id, id);

CREATE FUNCTION pilgrimage_inventory_private.require_availability_booking(_organization_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization_id), false)
    OR coalesce(public.get_user_org_role(auth.uid(), _organization_id)::text, '') NOT IN ('owner', 'admin', 'manager')
    OR NOT coalesce(public.can_org_write(_organization_id), false)
    OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_create'), false) THEN
    RAISE EXCEPTION 'pilgrimage_availability_booking_denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.book_from_availability(
  _organization_id uuid, _request_id uuid, _program_id uuid, _customer_id uuid, _action text,
  _party_size integer, _room_type text, _expected_unit_price numeric, _expected_currency text,
  _departure_date date, _return_date date, _traveler_names text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  program public.pilgrimage_programs%ROWTYPE;
  sale public.pilgrimage_sales%ROWTYPE;
  tariff numeric;
BEGIN
  PERFORM pilgrimage_inventory_private.require_availability_booking(_organization_id);
  IF NOT coalesce(public.has_org_permission(_organization_id, 'customers_view'), false)
    OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_view'), false) THEN
    RAISE EXCEPTION 'pilgrimage_availability_booking_denied' USING ERRCODE = '42501';
  END IF;
  IF _request_id IS NULL OR _program_id IS NULL OR _customer_id IS NULL
     OR coalesce(_action, '') NOT IN ('hold', 'book')
     OR coalesce(_room_type, '') NOT IN ('quad', 'triple', 'double', 'single')
     OR NOT coalesce(_party_size BETWEEN 1 AND 10000, false)
     OR (_action = 'hold' AND coalesce(cardinality(_traveler_names), 0) <> 0)
     OR (_action = 'book' AND (coalesce(cardinality(_traveler_names), 0) <> _party_size
       OR EXISTS (SELECT 1 FROM unnest(_traveler_names) n WHERE NOT coalesce(length(btrim(n)) BETWEEN 3 AND 200, false)))) THEN
    RAISE EXCEPTION 'pilgrimage_booking_invalid_selection' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text, 0));
  SELECT * INTO sale FROM public.pilgrimage_sales
    WHERE id = _request_id AND organization_id = _organization_id;
  IF FOUND THEN
    IF sale.booked_from_availability AND sale.created_by = actor AND sale.program_id = _program_id
      AND sale.buyer_customer_id = _customer_id AND sale.party_size = _party_size AND sale.currency = _expected_currency
      AND sale.departure_date IS NOT DISTINCT FROM _departure_date AND sale.return_date IS NOT DISTINCT FROM _return_date
      AND EXISTS (SELECT 1 FROM public.pilgrimage_sale_items i WHERE i.sale_id = sale.id
        AND i.organization_id = _organization_id AND i.item_kind = 'program_seat'
        AND i.room_type = _room_type AND i.unit_sell = _expected_unit_price)
      AND (SELECT array_agg(t.display_name ORDER BY t.display_name) FROM public.pilgrimage_sale_travelers t
        WHERE t.sale_id = sale.id AND t.organization_id = _organization_id)
        IS NOT DISTINCT FROM (SELECT array_agg(btrim(n) ORDER BY btrim(n)) FROM unnest(_traveler_names) n)
      AND (_action = 'hold' OR EXISTS (SELECT 1 FROM public.pilgrimage_retail_conversions c
        WHERE c.sale_id = sale.id AND c.organization_id = _organization_id)) THEN
      RETURN sale.id;
    END IF;
    RAISE EXCEPTION 'pilgrimage_booking_request_already_used' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO program FROM public.pilgrimage_programs
    WHERE id = _program_id AND organization_id = _organization_id FOR UPDATE;
  IF NOT FOUND OR program.status <> 'open' OR program.uses_room_inventory
    OR NOT private.pilgrimage_sales_ready(program)
    OR program.departure_date IS DISTINCT FROM _departure_date
    OR program.return_date IS DISTINCT FROM _return_date THEN
    RAISE EXCEPTION 'pilgrimage_booking_program_unavailable' USING ERRCODE = '22023';
  END IF;
  tariff := private.pilgrimage_room_price(program, _room_type);
  IF coalesce(tariff, 0) <= 0 OR tariff IS DISTINCT FROM _expected_unit_price
    OR program.currency IS DISTINCT FROM _expected_currency THEN
    RAISE EXCEPTION 'pilgrimage_booking_price_changed' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.customers WHERE id = _customer_id
    AND organization_id = _organization_id AND archived_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilgrimage_booking_customer_unavailable' USING ERRCODE = '22023';
  END IF;

  -- Reuse the seat-allocation and registration records. The intermediate sale state
  -- is part of this transaction and cannot be observed as a draft by other requests.
  INSERT INTO public.pilgrimage_sales (id, organization_id, program_type, sale_model, fulfillment_role,
    name, program_id, buyer_customer_id, party_size, currency, departure_date, return_date,
    created_by, booked_from_availability)
  VALUES (_request_id, _organization_id, program.program_type, 'group_seat', 'organizer',
    program.name, program.id, _customer_id, _party_size, program.currency, program.departure_date,
    program.return_date, actor, true);
  INSERT INTO public.pilgrimage_sale_items
    (organization_id, sale_id, item_kind, description, room_type, quantity, unit_sell)
  VALUES (_organization_id, _request_id, 'program_seat', program.name, _room_type, _party_size, tariff);
  INSERT INTO public.pilgrimage_sale_travelers (organization_id, sale_id, display_name, room_type)
    SELECT _organization_id, _request_id, btrim(n), _room_type FROM unnest(_traveler_names) n;
  UPDATE public.pilgrimage_sales SET status = 'quoted' WHERE id = _request_id AND organization_id = _organization_id;

  PERFORM public.transition_pilgrimage_seat_allocation(_request_id, 'hold', 120);
  IF _action = 'book' THEN
    PERFORM public.transition_pilgrimage_seat_allocation(_request_id, 'allocate', 120);
    PERFORM public.convert_pilgrimage_retail_group(_request_id);
  END IF;
  RETURN _request_id;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.confirm_availability_hold(
  _organization_id uuid, _sale_id uuid, _traveler_names text[]
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  sale public.pilgrimage_sales%ROWTYPE;
  allocation public.pilgrimage_seat_allocations%ROWTYPE;
  item public.pilgrimage_sale_items%ROWTYPE;
  booking uuid;
BEGIN
  PERFORM pilgrimage_inventory_private.require_availability_booking(_organization_id);
  SELECT * INTO sale FROM public.pilgrimage_sales WHERE id = _sale_id AND organization_id = _organization_id
    AND booked_from_availability AND status = 'quoted' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilgrimage_booking_hold_unavailable' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO allocation FROM public.pilgrimage_seat_allocations
    WHERE organization_id = _organization_id AND sale_id = _sale_id;
  IF allocation.confirmed_sale_id IS NOT NULL THEN RETURN allocation.confirmed_sale_id; END IF;
  IF NOT FOUND OR allocation.status <> 'held' THEN
    RAISE EXCEPTION 'active_unexpired_hold_required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO STRICT item FROM public.pilgrimage_sale_items
    WHERE organization_id = _organization_id AND sale_id = _sale_id AND item_kind = 'program_seat';

  -- Lock the program through the same allocation path, then convert the held
  -- inventory to a named booking before the transaction releases that lock.
  PERFORM public.transition_pilgrimage_seat_allocation(_sale_id, 'allocate', 120);
  PERFORM public.transition_pilgrimage_seat_allocation(_sale_id, 'release', 120);
  booking := pilgrimage_inventory_private.book_from_availability(
    _organization_id, gen_random_uuid(), sale.program_id, sale.buyer_customer_id, 'book',
    sale.party_size, item.room_type, item.unit_sell, sale.currency,
    sale.departure_date, sale.return_date, _traveler_names
  );
  UPDATE public.pilgrimage_seat_allocations SET confirmed_sale_id = booking
    WHERE id = allocation.id AND organization_id = _organization_id;
  RETURN booking;
END;
$$;

CREATE FUNCTION public.book_pilgrimage_from_availability(
  _organization_id uuid, _request_id uuid, _program_id uuid, _customer_id uuid, _action text,
  _party_size integer, _room_type text, _expected_unit_price numeric, _expected_currency text,
  _departure_date date, _return_date date, _traveler_names text[]
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN pilgrimage_inventory_private.book_from_availability(
  _organization_id, _request_id, _program_id, _customer_id, _action, _party_size, _room_type,
  _expected_unit_price, _expected_currency, _departure_date, _return_date, _traveler_names);

CREATE FUNCTION public.confirm_pilgrimage_availability_hold(_organization_id uuid, _sale_id uuid, _traveler_names text[])
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN pilgrimage_inventory_private.confirm_availability_hold(_organization_id, _sale_id, _traveler_names);

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.require_availability_booking(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION
  pilgrimage_inventory_private.book_from_availability(uuid, uuid, uuid, uuid, text, integer, text, numeric, text, date, date, text[]),
  pilgrimage_inventory_private.confirm_availability_hold(uuid, uuid, text[]),
  public.book_pilgrimage_from_availability(uuid, uuid, uuid, uuid, text, integer, text, numeric, text, date, date, text[]),
  public.confirm_pilgrimage_availability_hold(uuid, uuid, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  pilgrimage_inventory_private.book_from_availability(uuid, uuid, uuid, uuid, text, integer, text, numeric, text, date, date, text[]),
  pilgrimage_inventory_private.confirm_availability_hold(uuid, uuid, text[]),
  public.book_pilgrimage_from_availability(uuid, uuid, uuid, uuid, text, integer, text, numeric, text, date, date, text[]),
  public.confirm_pilgrimage_availability_hold(uuid, uuid, text[])
  TO authenticated;
