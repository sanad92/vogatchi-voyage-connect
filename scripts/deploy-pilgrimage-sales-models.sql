-- Safar ERP / Hajj & Umrah commercial sales: Group seats / FIT / B2B groups.
-- STAGING/DISPOSABLE DATABASE ONLY. Do not execute on live Lovable Cloud until
-- real-session RLS, existing-schema trigger compatibility and rollback QA pass.
-- These are QUOTES, not reserved seats, issued visas, paid invoices or bookings.
BEGIN;

CREATE TABLE IF NOT EXISTS public.pilgrimage_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (char_length(btrim(name)) >= 2),
  contact_name text, phone text, email text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);
CREATE INDEX IF NOT EXISTS pilgrimage_agencies_org_name_idx
  ON public.pilgrimage_agencies (organization_id, name);

CREATE TABLE IF NOT EXISTS public.pilgrimage_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  program_type text NOT NULL CHECK (program_type IN ('hajj','umrah')),
  sale_model text NOT NULL CHECK (sale_model IN ('group_seat','fit','b2b_group')),
  fulfillment_role text NOT NULL CHECK (fulfillment_role IN ('organizer','distributor')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','quoted','cancelled')),
  name text NOT NULL CHECK (char_length(btrim(name)) >= 3),
  program_id uuid REFERENCES public.pilgrimage_programs(id) ON DELETE RESTRICT,
  buyer_customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
  buyer_agency_id uuid REFERENCES public.pilgrimage_agencies(id) ON DELETE RESTRICT,
  upstream_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  party_size int NOT NULL CHECK (party_size BETWEEN 1 AND 10000),
  currency text NOT NULL CHECK (currency IN ('EGP','SAR','USD','EUR')),
  departure_date date, return_date date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  CHECK (departure_date IS NULL OR return_date IS NULL OR departure_date<=return_date),
  CHECK (
    (sale_model='group_seat' AND program_id IS NOT NULL AND buyer_customer_id IS NOT NULL
      AND buyer_agency_id IS NULL)
    OR (sale_model='fit' AND program_id IS NULL AND buyer_customer_id IS NOT NULL
      AND buyer_agency_id IS NULL)
    OR (sale_model='b2b_group' AND buyer_customer_id IS NULL AND buyer_agency_id IS NOT NULL)
  ),
  CHECK (
    (fulfillment_role='distributor' AND upstream_supplier_id IS NOT NULL)
    OR (fulfillment_role='organizer' AND upstream_supplier_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS pilgrimage_sales_org_status_idx
  ON public.pilgrimage_sales(organization_id,program_type,status,created_at DESC);
CREATE INDEX IF NOT EXISTS pilgrimage_sales_program_idx
  ON public.pilgrimage_sales(program_id) WHERE program_id IS NOT NULL;

-- Selling prices are visible to authorized organization users. Supplier costs
-- are stored separately to prevent exposure through SELECT * on sale items.
CREATE TABLE IF NOT EXISTS public.pilgrimage_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  item_kind text NOT NULL CHECK (item_kind IN
    ('program_seat','hotel','flight','transfer','visa_service','guide','other')),
  description text NOT NULL CHECK (char_length(btrim(description)) >= 2),
  room_type text CHECK (room_type IN ('single','double','triple','quad')),
  quantity numeric(12,2) NOT NULL CHECK (quantity>0),
  unit_sell numeric(14,2) NOT NULL CHECK (unit_sell>=0),
  line_sell numeric(16,2) GENERATED ALWAYS AS (round(quantity*unit_sell,2)) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id),
  FOREIGN KEY (organization_id,sale_id)
    REFERENCES public.pilgrimage_sales(organization_id,id) ON DELETE RESTRICT,
  CHECK ((item_kind='program_seat' AND room_type IS NOT NULL
    AND quantity=trunc(quantity)) OR (item_kind<>'program_seat' AND room_type IS NULL))
);
CREATE INDEX IF NOT EXISTS pilgrimage_sale_items_sale_idx
  ON public.pilgrimage_sale_items(sale_id);

CREATE TABLE IF NOT EXISTS public.pilgrimage_sale_item_costs (
  item_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost>=0),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  cost_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,item_id)
    REFERENCES public.pilgrimage_sale_items(organization_id,id) ON DELETE RESTRICT
);

-- A traveler list is a QUOTE manifest. It does not consume inventory.
-- Existing pilgrims are linked, not duplicated, when sourced from a program.
CREATE TABLE IF NOT EXISTS public.pilgrimage_sale_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
  pilgrim_id uuid REFERENCES public.pilgrims(id) ON DELETE RESTRICT,
  display_name text,
  room_type text CHECK (room_type IN ('single','double','triple','quad')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,sale_id)
    REFERENCES public.pilgrimage_sales(organization_id,id) ON DELETE RESTRICT,
  CHECK (customer_id IS NOT NULL OR pilgrim_id IS NOT NULL
    OR char_length(btrim(coalesce(display_name,'')))>=2)
);
CREATE INDEX IF NOT EXISTS pilgrimage_sale_travelers_sale_idx
  ON public.pilgrimage_sale_travelers(sale_id);
CREATE UNIQUE INDEX IF NOT EXISTS pilgrimage_sale_travelers_customer_once
  ON public.pilgrimage_sale_travelers(sale_id,customer_id)
  WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pilgrimage_sale_travelers_pilgrim_once
  ON public.pilgrimage_sale_travelers(sale_id,pilgrim_id)
  WHERE pilgrim_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.pilgrimage_agencies,
  public.pilgrimage_sales, public.pilgrimage_sale_items,
  public.pilgrimage_sale_item_costs, public.pilgrimage_sale_travelers TO authenticated;
GRANT DELETE ON public.pilgrimage_sale_items,public.pilgrimage_sale_travelers TO authenticated;
GRANT ALL ON public.pilgrimage_agencies, public.pilgrimage_sales,
  public.pilgrimage_sale_items, public.pilgrimage_sale_item_costs,
  public.pilgrimage_sale_travelers TO service_role;
REVOKE ALL ON public.pilgrimage_agencies, public.pilgrimage_sales,
  public.pilgrimage_sale_items, public.pilgrimage_sale_item_costs,
  public.pilgrimage_sale_travelers FROM anon, PUBLIC;

ALTER TABLE public.pilgrimage_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_sale_item_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_sale_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read agencies" ON public.pilgrimage_agencies FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers insert agencies" ON public.pilgrimage_agencies FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers update agencies" ON public.pilgrimage_agencies FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));

CREATE POLICY "org read sale quotes" ON public.pilgrimage_sales FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers insert sale quotes" ON public.pilgrimage_sales FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers update sale quotes" ON public.pilgrimage_sales FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));

CREATE POLICY "org read sale items" ON public.pilgrimage_sale_items FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers insert sale items" ON public.pilgrimage_sale_items FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers update sale items" ON public.pilgrimage_sale_items FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers delete draft items" ON public.pilgrimage_sale_items FOR DELETE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));

CREATE POLICY "managers read internal sale costs" ON public.pilgrimage_sale_item_costs FOR SELECT TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers insert internal sale costs" ON public.pilgrimage_sale_item_costs FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers update internal sale costs" ON public.pilgrimage_sale_item_costs FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));

CREATE POLICY "org read sale travelers" ON public.pilgrimage_sale_travelers FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers insert sale travelers" ON public.pilgrimage_sale_travelers FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers update sale travelers" ON public.pilgrimage_sale_travelers FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'))
  WITH CHECK (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));
CREATE POLICY "managers delete draft travelers" ON public.pilgrimage_sale_travelers FOR DELETE TO authenticated
  USING (public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager'));

CREATE OR REPLACE FUNCTION public._pilgrimage_sale_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  pg public.pilgrimage_programs%ROWTYPE;
  v_lines int;
  v_total numeric;
  v_seats numeric;
BEGIN
  IF TG_OP='INSERT' AND NEW.status<>'draft' THEN
    RAISE EXCEPTION 'sale_starts_as_draft' USING ERRCODE='22023';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'sale_identity_immutable' USING ERRCODE='42501'; END IF;
    IF OLD.status='cancelled' OR
       (OLD.status='quoted' AND (NEW.status NOT IN ('quoted','cancelled')
         OR (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM
            (to_jsonb(OLD) - 'status' - 'updated_at'))) THEN
      RAISE EXCEPTION 'quoted_sale_immutable_create_revision' USING ERRCODE='42501';
    END IF;
    IF OLD.status='draft' AND NEW.status NOT IN ('draft','quoted','cancelled') THEN
      RAISE EXCEPTION 'invalid_sale_transition' USING ERRCODE='22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.pilgrimage_sale_travelers t
       WHERE t.sale_id=OLD.id HAVING count(*)>NEW.party_size) THEN
      RAISE EXCEPTION 'party_size_less_than_travelers' USING ERRCODE='22023';
    END IF;
  END IF;
  IF NEW.program_id IS NOT NULL THEN
    SELECT * INTO pg FROM public.pilgrimage_programs
       WHERE id=NEW.program_id AND organization_id=NEW.organization_id;
    IF NOT FOUND OR pg.program_type<>NEW.program_type OR pg.currency<>NEW.currency THEN
      RAISE EXCEPTION 'sale_program_org_type_or_currency_mismatch' USING ERRCODE='23503'; END IF;
  END IF;
  IF NEW.buyer_customer_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.customers c
     WHERE c.id=NEW.buyer_customer_id AND c.organization_id=NEW.organization_id) THEN
    RAISE EXCEPTION 'sale_customer_org_mismatch' USING ERRCODE='23503'; END IF;
  IF NEW.buyer_agency_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.pilgrimage_agencies a
     WHERE a.id=NEW.buyer_agency_id AND a.organization_id=NEW.organization_id) THEN
    RAISE EXCEPTION 'sale_buyer_agency_org_mismatch' USING ERRCODE='23503'; END IF;
  IF NEW.upstream_supplier_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.suppliers s
     WHERE s.id=NEW.upstream_supplier_id AND s.organization_id=NEW.organization_id) THEN
    RAISE EXCEPTION 'sale_upstream_org_mismatch' USING ERRCODE='23503'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='draft' AND NEW.status='quoted' THEN
    SELECT count(*),coalesce(sum(line_sell),0),
      coalesce(sum(quantity) FILTER (WHERE item_kind='program_seat'),0)
    INTO v_lines,v_total,v_seats
    FROM public.pilgrimage_sale_items WHERE sale_id=NEW.id;
    IF v_lines=0 OR v_total<=0 THEN
      RAISE EXCEPTION 'quote_requires_priced_services' USING ERRCODE='22023'; END IF;
    IF NEW.program_id IS NOT NULL AND
       NEW.sale_model IN ('group_seat','b2b_group') AND v_seats<>NEW.party_size THEN
      RAISE EXCEPTION 'program_quote_seat_quantity_mismatch' USING ERRCODE='22023'; END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public._pilgrimage_sale_child_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  s public.pilgrimage_sales%ROWTYPE;
  v_sale_id uuid;
  v_org_id uuid;
  v_count int;
  v_item_org uuid;
  v_traveler_org uuid;
  v_traveler_program uuid;
BEGIN
  IF TG_OP='DELETE' THEN
    v_sale_id:=OLD.sale_id; v_org_id:=OLD.organization_id;
  ELSE
    v_sale_id:=NEW.sale_id; v_org_id:=NEW.organization_id;
  END IF;
  SELECT * INTO s FROM public.pilgrimage_sales
    WHERE id=v_sale_id AND organization_id=v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'sale_child_org_mismatch' USING ERRCODE='23503'; END IF;
  IF s.status<>'draft' THEN
    RAISE EXCEPTION 'quoted_sale_child_immutable' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND
     (NEW.id IS DISTINCT FROM OLD.id OR NEW.sale_id IS DISTINCT FROM OLD.sale_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    RAISE EXCEPTION 'sale_child_identity_immutable' USING ERRCODE='42501'; END IF;
  IF TG_TABLE_NAME='pilgrimage_sale_travelers' AND TG_OP<>'DELETE' THEN
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM public.customers c WHERE c.id=NEW.customer_id
       AND c.organization_id=NEW.organization_id) THEN
      RAISE EXCEPTION 'traveler_customer_org_mismatch' USING ERRCODE='23503'; END IF;
    IF NEW.pilgrim_id IS NOT NULL THEN
      SELECT g.organization_id,g.program_id INTO v_traveler_org,v_traveler_program
      FROM public.pilgrims g WHERE g.id=NEW.pilgrim_id;
      IF v_traveler_org IS DISTINCT FROM NEW.organization_id
         OR s.program_id IS NULL OR v_traveler_program<>s.program_id THEN
        RAISE EXCEPTION 'traveler_pilgrim_org_or_program_mismatch'
         USING ERRCODE='23503'; END IF;
    END IF;
    SELECT count(*) INTO v_count FROM public.pilgrimage_sale_travelers
      WHERE sale_id=NEW.sale_id AND (TG_OP='INSERT' OR id<>OLD.id);
    IF v_count>=s.party_size THEN
      RAISE EXCEPTION 'sale_traveler_limit_reached' USING ERRCODE='22023'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public._pilgrimage_sale_cost_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  s public.pilgrimage_sales%ROWTYPE;
  i public.pilgrimage_sale_items%ROWTYPE;
BEGIN
  SELECT * INTO i FROM public.pilgrimage_sale_items
     WHERE id=NEW.item_id AND organization_id=NEW.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'cost_item_org_mismatch' USING ERRCODE='23503'; END IF;
  SELECT * INTO s FROM public.pilgrimage_sales
     WHERE id=i.sale_id AND organization_id=i.organization_id FOR UPDATE;
  IF s.status<>'draft' THEN RAISE EXCEPTION 'quoted_sale_cost_immutable' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND
    (NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    RAISE EXCEPTION 'cost_identity_immutable' USING ERRCODE='42501'; END IF;
  IF NEW.supplier_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.suppliers p
      WHERE p.id=NEW.supplier_id AND p.organization_id=NEW.organization_id) THEN
    RAISE EXCEPTION 'cost_supplier_org_mismatch' USING ERRCODE='23503'; END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER pilgrimage_sale_guard BEFORE INSERT OR UPDATE
  ON public.pilgrimage_sales FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_sale_guard();
CREATE TRIGGER pilgrimage_sale_item_guard BEFORE INSERT OR UPDATE OR DELETE
  ON public.pilgrimage_sale_items FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_sale_child_guard();
CREATE TRIGGER pilgrimage_sale_traveler_guard BEFORE INSERT OR UPDATE OR DELETE
  ON public.pilgrimage_sale_travelers FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_sale_child_guard();
CREATE TRIGGER pilgrimage_sale_cost_guard BEFORE INSERT OR UPDATE
  ON public.pilgrimage_sale_item_costs FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_sale_cost_guard();

REVOKE EXECUTE ON FUNCTION public._pilgrimage_sale_guard() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_sale_child_guard() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_sale_cost_guard() FROM PUBLIC,anon,authenticated;
COMMIT;
