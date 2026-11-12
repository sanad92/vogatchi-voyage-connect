-- Safar ERP Hajj/Umrah: atomic conversion of an internally allocated
-- RETAIL group-seat quote to existing program pilgrim registration rows.
--
-- STAGING ONLY. Depends on PR #41 (pilgrim integrity), PR #42 (sale quote),
-- PR #43 (shared capacity and seat allocations).
-- This is OPERATIONAL REGISTRATION, not invoice posting, supplier confirmation,
-- money received, visa issued, Umrah portal entry, or Hajj permit.
--
-- B2B and FIT deliberately fail closed: an agency's total contracted price
-- must not become false individual retail receivables.
BEGIN;

CREATE TABLE public.pilgrimage_retail_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sale_id uuid NOT NULL UNIQUE,
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id) ON DELETE RESTRICT,
  allocation_id uuid NOT NULL UNIQUE,
  registered_count integer NOT NULL CHECK (registered_count BETWEEN 1 AND 10000),
  converted_by uuid NOT NULL,
  converted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id),
  FOREIGN KEY (organization_id,sale_id)
    REFERENCES public.pilgrimage_sales(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,allocation_id)
    REFERENCES public.pilgrimage_seat_allocations(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_retail_conversions_org_idx
  ON public.pilgrimage_retail_conversions(organization_id,converted_at DESC);

CREATE TABLE public.pilgrimage_retail_conversion_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  conversion_id uuid NOT NULL,
  quote_traveler_id uuid NOT NULL UNIQUE
    REFERENCES public.pilgrimage_sale_travelers(id) ON DELETE RESTRICT,
  pilgrim_id uuid NOT NULL UNIQUE
    REFERENCES public.pilgrims(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,conversion_id)
    REFERENCES public.pilgrimage_retail_conversions(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_retail_conversion_travelers_parent_idx
  ON public.pilgrimage_retail_conversion_travelers(conversion_id);

REVOKE ALL ON public.pilgrimage_retail_conversions,
  public.pilgrimage_retail_conversion_travelers
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pilgrimage_retail_conversions,
  public.pilgrimage_retail_conversion_travelers TO authenticated;
GRANT ALL ON public.pilgrimage_retail_conversions,
  public.pilgrimage_retail_conversion_travelers TO service_role;
ALTER TABLE public.pilgrimage_retail_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_retail_conversion_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read converted retail group registrations"
  ON public.pilgrimage_retail_conversions FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "org read retail group registration links"
  ON public.pilgrimage_retail_conversion_travelers FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));

-- Preserve audit context: conversion is a transition of held inventory to
-- actual existing-program pilgrim rows, not a generic release.
ALTER TABLE public.pilgrimage_seat_allocation_events
  DROP CONSTRAINT pilgrimage_seat_allocation_events_action_check;
ALTER TABLE public.pilgrimage_seat_allocation_events
  ADD CONSTRAINT pilgrimage_seat_allocation_events_action_check
  CHECK (action IN ('held','allocated','released','reheld','converted'));

CREATE OR REPLACE FUNCTION public.convert_pilgrimage_retail_group(_sale_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  actor uuid:=auth.uid();
  s public.pilgrimage_sales%ROWTYPE;
  p public.pilgrimage_programs%ROWTYPE;
  a public.pilgrimage_seat_allocations%ROWTYPE;
  t public.pilgrimage_sale_travelers%ROWTYPE;
  item public.pilgrimage_sale_items%ROWTYPE;
  result_id uuid;
  new_pilgrim_id uuid;
  v_count bigint;
  v_item_count bigint;
  v_other_seats bigint;
  v_registered bigint;
  v_tariff numeric;
  v_time timestamptz;
BEGIN
  IF actor IS NULL OR _sale_id IS NULL THEN
    RAISE EXCEPTION 'authenticated_manager_required' USING ERRCODE='42501';
  END IF;

  -- Quote -> Program -> Allocation lock order exactly matches PR #43.
  SELECT * INTO s FROM public.pilgrimage_sales
    WHERE id=_sale_id AND public.user_belongs_to_org(actor,organization_id)
    FOR UPDATE;
  IF NOT FOUND OR public.get_user_org_role(actor,s.organization_id)::text
      NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'quote_not_found_or_not_authorized' USING ERRCODE='42501';
  END IF;
  SELECT c.id INTO result_id FROM public.pilgrimage_retail_conversions c
    WHERE c.sale_id=s.id AND c.organization_id=s.organization_id;
  IF FOUND THEN RETURN result_id; END IF; -- Safe retry after committed conversion.

  IF s.status<>'quoted' OR s.sale_model<>'group_seat' OR
     s.program_id IS NULL OR s.buyer_customer_id IS NULL THEN
    RAISE EXCEPTION 'only_issued_retail_group_quotes_can_convert'
      USING ERRCODE='22023';
  END IF;

  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id=s.program_id AND organization_id=s.organization_id FOR UPDATE;
  IF NOT FOUND OR p.status<>'open' OR p.program_type<>s.program_type OR
     p.currency<>s.currency THEN
    RAISE EXCEPTION 'program_not_open_or_mismatched' USING ERRCODE='22023';
  END IF;

  SELECT * INTO a FROM public.pilgrimage_seat_allocations
    WHERE sale_id=s.id AND organization_id=s.organization_id FOR UPDATE;
  IF NOT FOUND OR a.status<>'allocated' OR
     a.program_id<>p.id OR a.seat_count<>s.party_size THEN
    RAISE EXCEPTION 'confirmed_internal_seat_allocation_required'
      USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id=s.buyer_customer_id AND c.organization_id=s.organization_id
  ) THEN
    RAISE EXCEPTION 'buyer_customer_org_mismatch' USING ERRCODE='23503';
  END IF;

  SELECT count(*) INTO v_count FROM public.pilgrimage_sale_travelers t
    WHERE t.sale_id=s.id AND t.organization_id=s.organization_id;
  IF v_count<>s.party_size THEN
    RAISE EXCEPTION 'complete_named_traveler_manifest_required'
      USING ERRCODE='22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pilgrimage_sale_travelers t
    WHERE t.sale_id=s.id AND
      (t.pilgrim_id IS NOT NULL OR
       length(btrim(coalesce(t.display_name,'')))<3 OR
       t.room_type NOT IN ('quad','triple','double','single') OR
       t.room_type IS NULL)
  ) THEN
    RAISE EXCEPTION 'names_rooms_or_existing_pilgrims_require_review'
      USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pilgrimage_sale_travelers t
    JOIN public.customers c ON c.id=t.customer_id
    WHERE t.sale_id=s.id AND
      (t.customer_id IS NOT NULL AND c.organization_id<>s.organization_id)
  ) THEN
    RAISE EXCEPTION 'traveler_customer_org_mismatch' USING ERRCODE='23503';
  END IF;

  SELECT count(*) INTO v_item_count FROM public.pilgrimage_sale_items i
    WHERE i.sale_id=s.id AND i.organization_id=s.organization_id;
  IF v_item_count=0 OR EXISTS (
    SELECT 1 FROM public.pilgrimage_sale_items i
    WHERE i.sale_id=s.id AND
      (i.item_kind<>'program_seat' OR
       i.unit_sell IS DISTINCT FROM CASE i.room_type
         WHEN 'quad' THEN p.price_quad
         WHEN 'triple' THEN p.price_triple
         WHEN 'double' THEN p.price_double
         WHEN 'single' THEN p.price_single
         ELSE NULL END)
  ) THEN
    RAISE EXCEPTION 'retail_program_tariff_mismatch_or_extra_services'
      USING ERRCODE='22023';
  END IF;

  -- Match every room's number of travelers to its exact priced seats;
  -- no room-kind substitutes, bulk contract discounts, or missing names.
  IF EXISTS (
    SELECT room_type,
      sum(seats) AS item_seats,sum(travelers) AS manifest_seats
    FROM (
      SELECT i.room_type, sum(i.quantity)::int AS seats, 0 AS travelers
      FROM public.pilgrimage_sale_items i
      WHERE i.sale_id=s.id GROUP BY i.room_type
      UNION ALL
      SELECT t.room_type,0 AS seats,count(*)::int AS travelers
      FROM public.pilgrimage_sale_travelers t
      WHERE t.sale_id=s.id GROUP BY t.room_type
    ) combined
    GROUP BY room_type
    HAVING sum(seats)<>sum(travelers)
  ) THEN
    RAISE EXCEPTION 'room_count_does_not_match_priced_seats'
      USING ERRCODE='22023';
  END IF;

  SELECT count(*) INTO v_registered FROM public.pilgrims g
    WHERE g.program_id=p.id AND g.organization_id=p.organization_id
      AND g.status<>'cancelled';
  SELECT coalesce(sum(x.seat_count),0) INTO v_other_seats
    FROM public.pilgrimage_seat_allocations x
    WHERE x.organization_id=p.organization_id AND x.program_id=p.id
      AND x.id<>a.id AND
      (x.status='allocated' OR
        (x.status='held' AND x.hold_expires_at>clock_timestamp()));
  IF p.capacity>0 AND v_registered+v_other_seats+s.party_size>p.capacity THEN
    RAISE EXCEPTION 'program_no_longer_has_registered_capacity'
      USING ERRCODE='22023';
  END IF;

  -- Capacity transfer happens within ONE transaction and under the
  -- program row lock: release this specific allocation FIRST, then insert
  -- its pilgrims. Other sessions cannot grab the seats in between.
  v_time:=clock_timestamp();
  UPDATE public.pilgrimage_seat_allocations SET
    status='released',hold_expires_at=NULL,allocated_at=NULL,
    released_at=v_time,updated_at=v_time,updated_by=actor
  WHERE id=a.id AND organization_id=s.organization_id;
  INSERT INTO public.pilgrimage_retail_conversions(
    organization_id,sale_id,program_id,allocation_id,
    registered_count,converted_by
  ) VALUES(
    s.organization_id,s.id,p.id,a.id,s.party_size,actor
  ) RETURNING id INTO result_id;

  FOR t IN SELECT * FROM public.pilgrimage_sale_travelers x
    WHERE x.sale_id=s.id AND x.organization_id=s.organization_id ORDER BY x.id
  LOOP
    INSERT INTO public.pilgrims(
      organization_id,program_id,customer_id,full_name,room_type,status,created_by
    ) VALUES(
      s.organization_id,p.id,coalesce(t.customer_id,s.buyer_customer_id),
      btrim(t.display_name),t.room_type,'registered',actor
    ) RETURNING id INTO new_pilgrim_id;
    INSERT INTO public.pilgrimage_retail_conversion_travelers(
      organization_id,conversion_id,quote_traveler_id,pilgrim_id
    ) VALUES (s.organization_id,result_id,t.id,new_pilgrim_id);
  END LOOP;

  INSERT INTO public.pilgrimage_seat_allocation_events(
    organization_id,allocation_id,action,actor_id,seat_count
  ) VALUES(s.organization_id,a.id,'converted',actor,s.party_size);

  RETURN result_id;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.convert_pilgrimage_retail_group(uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_pilgrimage_retail_group(uuid)
  TO authenticated;

-- No other inventory RPC may re-hold converted seats for the same sale.
CREATE OR REPLACE FUNCTION public._pilgrimage_retail_conversion_allocation_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
  IF NEW.status IN ('held','allocated') AND EXISTS (
    SELECT 1 FROM public.pilgrimage_retail_conversions c
    WHERE c.sale_id=NEW.sale_id AND c.organization_id=NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'already_converted_registration_cannot_rehold'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER z_pilgrimage_retail_conversion_allocation_guard
  BEFORE INSERT OR UPDATE ON public.pilgrimage_seat_allocations
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_retail_conversion_allocation_guard();

-- A converted quote is the audit basis of created pilgrim rows.
-- Cancelling it must use a distinct approved cancellation/refund workflow.
CREATE OR REPLACE FUNCTION public._pilgrimage_retail_conversion_sale_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
  IF NEW.status='cancelled' AND OLD.status<>'cancelled' AND EXISTS(
    SELECT 1 FROM public.pilgrimage_retail_conversions c
    WHERE c.sale_id=OLD.id AND c.organization_id=OLD.organization_id
  ) THEN RAISE EXCEPTION 'registered_sale_requires_managed_cancellation'
    USING ERRCODE='22023'; END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER z_pilgrimage_retail_conversion_sale_guard
  BEFORE UPDATE OF status ON public.pilgrimage_sales
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_retail_conversion_sale_guard();

REVOKE EXECUTE ON FUNCTION public._pilgrimage_retail_conversion_allocation_guard()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_retail_conversion_sale_guard()
  FROM PUBLIC,anon,authenticated;

COMMIT;
