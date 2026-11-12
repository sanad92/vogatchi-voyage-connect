-- Isolated PostgreSQL 16 fixture. NEVER execute on hosted/cloud/live databases.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT nullif(pg_catalog.current_setting('test.user_id',true),'')::uuid $$;

CREATE TABLE public.organizations(id uuid PRIMARY KEY);
CREATE TABLE public.customers(id uuid PRIMARY KEY,organization_id uuid NOT NULL,name text NOT NULL);
CREATE TABLE public.suppliers(id uuid PRIMARY KEY,organization_id uuid NOT NULL,name text NOT NULL);
CREATE TABLE public.pilgrimage_programs(
  id uuid PRIMARY KEY,organization_id uuid NOT NULL,program_type text NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',status text NOT NULL DEFAULT 'open',capacity int NOT NULL DEFAULT 30
);
CREATE TABLE public.pilgrims(id uuid PRIMARY KEY,organization_id uuid NOT NULL,program_id uuid NOT NULL,status text NOT NULL DEFAULT 'registered');
CREATE FUNCTION public.user_belongs_to_org(u uuid, org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $$
SELECT (u IN ('00000000-0000-4000-8000-000000000011'::uuid,
              '00000000-0000-4000-8000-000000000012'::uuid)
        AND org='00000000-0000-4000-8000-000000000001'::uuid)
   OR (u='00000000-0000-4000-8000-000000000021'::uuid
       AND org='00000000-0000-4000-8000-000000000002'::uuid)
$$;
CREATE FUNCTION public.get_user_org_role(u uuid,org uuid)
RETURNS text LANGUAGE sql STABLE SET search_path=''
AS $$
SELECT CASE
 WHEN NOT public.user_belongs_to_org(u,org) THEN 'none'
 WHEN u='00000000-0000-4000-8000-000000000012'::uuid THEN 'viewer'
 ELSE 'manager' END
$$;

INSERT INTO public.organizations(id) VALUES
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.customers(id,organization_id,name) VALUES
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Test Buyer A'),
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','Test Buyer B');
INSERT INTO public.suppliers(id,organization_id,name) VALUES
  ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000001','Upstream A'),
  ('00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000002','Upstream B');
INSERT INTO public.pilgrimage_programs(id,organization_id,program_type,currency) VALUES
  ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','umrah','EGP'),
  ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000002','hajj','SAR');
INSERT INTO public.pilgrims(id,organization_id,program_id) VALUES
  ('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000201');

\i scripts/deploy-pilgrimage-sales-models.sql

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

INSERT INTO public.pilgrimage_agencies(id,organization_id,name,contact_name)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','Partner Agency A','Sales A');
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,program_id,buyer_customer_id,party_size,currency
) VALUES (
 '00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001',
 'umrah','group_seat','organizer','برنامج رمضان عائلي',
 '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101',2,'EGP');

DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    UPDATE public.pilgrimage_sales SET status='quoted'
    WHERE id='00000000-0000-4000-8000-000000000301';
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Quoted without price items'; END IF;
END $$;

INSERT INTO public.pilgrimage_sale_items
(id,organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell)
VALUES (
 '00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000301','program_seat','عمرة الغرفة الثنائية',
 'double',2,2000);

DO $$
BEGIN
  IF (SELECT line_sell FROM public.pilgrimage_sale_items
      WHERE id='00000000-0000-4000-8000-000000000501')<>4000
    THEN RAISE EXCEPTION 'Server-derived selling price incorrect'; END IF;
END $$;

INSERT INTO public.pilgrimage_sale_item_costs
(item_id,organization_id,unit_cost,supplier_id)
VALUES ('00000000-0000-4000-8000-000000000501',
 '00000000-0000-4000-8000-000000000001',1500,
 '00000000-0000-4000-8000-000000000111');

INSERT INTO public.pilgrimage_sale_travelers
(id,organization_id,sale_id,display_name)
VALUES
('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000301','Traveler One'),
('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000301','Traveler Two');

DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.pilgrimage_sale_travelers(organization_id,sale_id,display_name)
  VALUES('00000000-0000-4000-8000-000000000001',
         '00000000-0000-4000-8000-000000000301','Traveler Three');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Traveler count exceeded party_size'; END IF;
END $$;

UPDATE public.pilgrimage_sales SET status='quoted'
WHERE id='00000000-0000-4000-8000-000000000301';

DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrimage_sale_items SET unit_sell=1
  WHERE id='00000000-0000-4000-8000-000000000501';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Quoted item price changed'; END IF;
 denied:=false;
 BEGIN
  UPDATE public.pilgrimage_sale_item_costs SET unit_cost=1
  WHERE item_id='00000000-0000-4000-8000-000000000501';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Quoted supplier cost changed'; END IF;
 denied:=false;
 BEGIN
  UPDATE public.pilgrimage_sales SET party_size=9
  WHERE id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Quoted sale modified'; END IF;
END $$;

-- FIT does not require a pre-existing group program.
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,buyer_customer_id,party_size,currency
) VALUES (
 '00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001',
 'umrah','fit','organizer','عمرة خاصة للعائلة',
 '00000000-0000-4000-8000-000000000101',3,'USD');
INSERT INTO public.pilgrimage_sale_items
(id,organization_id,sale_id,item_kind,description,quantity,unit_sell)
VALUES
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000302','hotel','فندق مكة 5 ليال',1,1500),
('00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000302','flight','تذاكر 3 أشخاص',3,125.55);
DO $$
BEGIN
 IF (SELECT line_sell FROM public.pilgrimage_sale_items
 WHERE id='00000000-0000-4000-8000-000000000503')<>376.65 THEN
 RAISE EXCEPTION 'FIT item financial formula error'; END IF;
END $$;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.pilgrimage_sale_item_costs(item_id,organization_id,unit_cost,supplier_id)
  VALUES ('00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',800,
    '00000000-0000-4000-8000-000000000112');
 EXCEPTION WHEN foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Foreign company upstream supplier accepted'; END IF;
END $$;
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000302';

-- B2B company buys a group from the user's company acting as distributor.
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,program_id,buyer_agency_id,upstream_supplier_id,party_size,currency
) VALUES (
 '00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001',
 'umrah','b2b_group','distributor','وكالة شريكة 10 معتمرين',
 '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000401',
 '00000000-0000-4000-8000-000000000111',10,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 id,organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES (
 '00000000-0000-4000-8000-000000000504','00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000303','program_seat','برنامج شركة موزعة','quad',9,500);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrimage_sales SET status='quoted'
   WHERE id='00000000-0000-4000-8000-000000000303';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'B2B seat count discrepancy accepted'; END IF;
END $$;
UPDATE public.pilgrimage_sale_items SET quantity=10
WHERE id='00000000-0000-4000-8000-000000000504';
UPDATE public.pilgrimage_sales SET status='quoted'
WHERE id='00000000-0000-4000-8000-000000000303';

-- Link a previously registered original-program pilgrim; quota is not affected.
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,program_id,buyer_customer_id,party_size,currency
) VALUES (
 '00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000001',
 'umrah','group_seat','organizer','اختبار ربط مسافر مسجل',
 '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101',1,'EGP');
INSERT INTO public.pilgrimage_sale_travelers(
 organization_id,sale_id,pilgrim_id
) VALUES(
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000304',
 '00000000-0000-4000-8000-000000000211');

UPDATE public.pilgrimage_programs SET status='closed'
WHERE id='00000000-0000-4000-8000-000000000201';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
   UPDATE public.pilgrimage_sales SET status='quoted'
   WHERE id='00000000-0000-4000-8000-000000000304';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Quote issued on a closed group program'; END IF;
END $$;
UPDATE public.pilgrimage_programs SET status='open',capacity=1
WHERE id='00000000-0000-4000-8000-000000000201';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
   UPDATE public.pilgrimage_sales SET status='quoted'
   WHERE id='00000000-0000-4000-8000-000000000304';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Group quote ignored no available seats'; END IF;
END $$;
UPDATE public.pilgrimage_programs SET capacity=30
WHERE id='00000000-0000-4000-8000-000000000201';

DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrimage_sales SET buyer_customer_id='00000000-0000-4000-8000-000000000102'
    WHERE id='00000000-0000-4000-8000-000000000304';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Foreign company buyer customer linked'; END IF;

END $$;

-- Copy an issued quote as a new draft without mutating its source or
-- reusing item IDs. The original quoted terms remain an audit reference.
DO $$
DECLARE
  new_id uuid;
  cost_count int;
BEGIN
  new_id:=public.clone_pilgrimage_sale('00000000-0000-4000-8000-000000000301');
  IF new_id IS NULL OR new_id='00000000-0000-4000-8000-000000000301'
    OR (SELECT status FROM public.pilgrimage_sales WHERE id=new_id)<>'draft'
    OR (SELECT supersedes_sale_id FROM public.pilgrimage_sales WHERE id=new_id)
        <>'00000000-0000-4000-8000-000000000301'::uuid
    OR (SELECT count(*) FROM public.pilgrimage_sale_items WHERE sale_id=new_id)<>1
    OR (SELECT count(*) FROM public.pilgrimage_sale_travelers WHERE sale_id=new_id)<>2
  THEN RAISE EXCEPTION 'Quote revision clone missing source or travelers'; END IF;
  SELECT count(*) INTO cost_count
   FROM public.pilgrimage_sale_item_costs c
   JOIN public.pilgrimage_sale_items i ON i.id=c.item_id
   WHERE i.sale_id=new_id AND c.unit_cost=1500;
  IF cost_count<>1 THEN RAISE EXCEPTION 'Quote revision lost confidential supplier cost'; END IF;
  IF (SELECT status FROM public.pilgrimage_sales
      WHERE id='00000000-0000-4000-8000-000000000301')<>'quoted'
  THEN RAISE EXCEPTION 'Quote revision altered original'; END IF;
END $$;

-- An organization's viewer sees selling prices but NOT confidential cost.
SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.pilgrimage_sales)<>5
    OR (SELECT count(*) FROM public.pilgrimage_sale_items)<>5
    OR (SELECT count(*) FROM public.pilgrimage_sale_item_costs)<>0 THEN
    RAISE EXCEPTION 'Viewer RLS sales/cost partition failed'; END IF;
 BEGIN
  INSERT INTO public.pilgrimage_agencies(organization_id,name)
  VALUES ('00000000-0000-4000-8000-000000000001','Unauthorized agency');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Viewer created agency'; END IF;
 denied:=false;
 BEGIN
   PERFORM public.clone_pilgrimage_sale('00000000-0000-4000-8000-000000000301');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Viewer cloned a confidential quote'; END IF;
END $$;

-- Another tenant cannot see or mutate company A quotes, partners or travelers.
SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.pilgrimage_sales)<>0
    OR (SELECT count(*) FROM public.pilgrimage_agencies)<>0
    OR (SELECT count(*) FROM public.pilgrimage_sale_travelers)<>0
    OR (SELECT count(*) FROM public.pilgrimage_sale_item_costs)<>0 THEN
    RAISE EXCEPTION 'Cross-tenant quote rows visible'; END IF;
END $$;

SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM 1 FROM public.pilgrimage_sales;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Anonymous quote read allowed'; END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrimage_sales','DELETE')
    OR has_table_privilege('authenticated','public.pilgrimage_sale_item_costs','DELETE')
    OR has_function_privilege('authenticated','public._pilgrimage_sale_guard()','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected commercial quote privileged access'; END IF;
END $$;
SELECT 'Hajj Umrah group-seat FIT B2B sales model: all isolated contracts passed' AS result;
