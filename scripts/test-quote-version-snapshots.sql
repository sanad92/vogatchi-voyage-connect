-- Isolated PostgreSQL 16 test; NEVER run on user/production database.
\set ON_ERROR_STOP on

DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT NULLIF(pg_catalog.current_setting('test.user_id',true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.organization_members(
 organization_id uuid NOT NULL, user_id uuid NOT NULL, role text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(organization_id,user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_own ON public.organization_members FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE FUNCTION public.has_org_permission(p_org uuid,p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS (
 SELECT 1 FROM public.organization_members m
 WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND m.is_active
   AND (p_permission IN ('quotes_view','quotes_edit')
     OR (p_permission='financial_view' AND m.role IN ('owner','manager')))
 )
$$;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid,text) TO authenticated;

CREATE TABLE public.quotes(
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 quote_number text NOT NULL,
 status text NOT NULL DEFAULT 'draft',
 customer_id uuid,
 customer_name text,
 destination text,
 travel_date date,
 return_date date,
 number_of_travelers integer,
 currency text,
 subtotal numeric,
 discount_amount numeric,
 vat_rate numeric,
 vat_amount numeric,
 total_amount numeric,
 total_cost numeric,
 total_profit numeric,
 valid_until date,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quote_items(
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 quote_id uuid NOT NULL REFERENCES public.quotes(id),
 item_type text,
 description text,
 quantity integer,
 supplier_id uuid,
 cost_price numeric,
 selling_price numeric,
 total_cost numeric,
 total_selling numeric,
 sort_order integer NOT NULL DEFAULT 0,
 details jsonb
);

\i scripts/deploy-quote-version-snapshots.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.quote_version_snapshots','INSERT')
    OR has_table_privilege('authenticated','public.quote_version_snapshots','UPDATE')
    OR has_table_privilege('authenticated','public.quote_version_snapshots','DELETE')
    OR NOT has_table_privilege('authenticated','public.quote_version_snapshots','SELECT')
    OR has_function_privilege('anon','public.capture_quote_version_snapshot(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Snapshot table grants unsafe'; END IF;
END $$;

INSERT INTO public.organization_members VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','owner',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','agent',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013','manager',false),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000021','owner',true);
INSERT INTO public.quotes(id,organization_id,quote_number,customer_name,destination,number_of_travelers,currency,subtotal,discount_amount,vat_rate,vat_amount,total_amount,total_cost,total_profit)
VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',
  'QT-TEST-01','Customer A','Osaka',4,'USD',1000,100,0,0,900,600,300),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002',
  'QT-TEST-02','Customer B','Paris',2,'EUR',700,0,0,0,700,500,200),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001',
  'QT-EMPTY','Customer A','Cairo',1,'EGP',0,0,0,0,0,0,0);

INSERT INTO public.quote_items(id,organization_id,quote_id,item_type,description,quantity,cost_price,selling_price,total_cost,total_selling,sort_order,details)
VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','hotel','Osaka 4 nights',1,400,600,400,600,0,
  '{"hotel":"Osaka Example"}'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','flight','Outbound air',1,200,400,200,400,1,
  '{"flight":"TEST-123"}'),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000102','hotel','Paris stay',1,500,700,500,700,0,'{}');

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

DO $$
DECLARE first jsonb; replay jsonb; denied boolean:=false;
BEGIN
 first:=public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000101');
 IF first->>'version_number'<>'1' OR first->>'unchanged'<>'false' THEN
 RAISE EXCEPTION 'First version capture failed: %',first; END IF;
 replay:=public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000101');
 IF replay->>'version_number'<>'1' OR replay->>'unchanged'<>'true'
  OR replay->>'id'<>first->>'id'
 THEN RAISE EXCEPTION 'Duplicate snapshot was created: %',replay; END IF;

 BEGIN
  PERFORM public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000102');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Owner A captured quote from organization B'; END IF;

 denied:=false;
 BEGIN
  PERFORM public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000103');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Empty quote archived without line items'; END IF;
END $$;

-- Direct snapshot mutation must not be permitted.
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN UPDATE public.quote_version_snapshots SET version_number=99;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Browser rewrote immutable version'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.quote_version_snapshots)<>0 THEN
 RAISE EXCEPTION 'Agent can view internal cost snapshots without financial_view'; END IF;
 BEGIN
  PERFORM public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000101');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Agent captured cost archive without financial_view'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.quote_version_snapshots)<>0 THEN
 RAISE EXCEPTION 'Owner B viewed owner A history'; END IF;
 BEGIN
  PERFORM public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000101');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-org capture allowed'; END IF;
END $$;

RESET ROLE;

-- Simulate an edited quote and an edited item. Historical snapshot must remain unchanged.
UPDATE public.quotes SET total_amount=975,total_profit=375,updated_at=now()+interval '1 second'
WHERE id='00000000-0000-4000-8000-000000000101';
UPDATE public.quote_items SET selling_price=475,total_selling=475
WHERE id='00000000-0000-4000-8000-000000000202';

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
DO $$
DECLARE result jsonb;
BEGIN
 result:=public.capture_quote_version_snapshot('00000000-0000-4000-8000-000000000101');
 IF result->>'version_number'<>'2' OR result->>'unchanged'<>'false' THEN
  RAISE EXCEPTION 'Second version capture failed: %',result; END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
 IF (SELECT count(*) FROM public.quote_version_snapshots)<>2 THEN
  RAISE EXCEPTION 'Expected exactly two immutable versions'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.quote_version_snapshots
  WHERE version_number=1 AND (quote_snapshot->>'total_amount')::numeric=900
    AND (items_snapshot->1->>'total_selling')::numeric=400
 ) OR NOT EXISTS(
  SELECT 1 FROM public.quote_version_snapshots
  WHERE version_number=2 AND (quote_snapshot->>'total_amount')::numeric=975
    AND (items_snapshot->1->>'total_selling')::numeric=475
 ) THEN RAISE EXCEPTION 'Immutable old/new quote contents were not preserved'; END IF;
 IF (SELECT count(*) FROM public.quote_items WHERE quote_id='00000000-0000-4000-8000-000000000101')<>2
 THEN RAISE EXCEPTION 'Original quote items were modified by snapshot tool'; END IF;
END $$;

SELECT 'Quote version snapshot isolation and history tests passed' AS result;
