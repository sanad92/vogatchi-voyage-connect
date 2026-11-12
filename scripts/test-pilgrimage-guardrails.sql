-- Disposable PostgreSQL QA ONLY; creates synthetic tables. NEVER run on hosted production.
\set ON_ERROR_STOP on

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT nullif(pg_catalog.current_setting('test.user_id',true),'')::uuid $$;

CREATE TABLE public.organizations(id uuid PRIMARY KEY);
CREATE TABLE public.customers(id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES public.organizations(id));
CREATE TABLE public.pilgrimage_programs(
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES public.organizations(id),
 program_type text NOT NULL DEFAULT 'umrah',name text NOT NULL,capacity int NOT NULL DEFAULT 0,
 makkah_nights int NOT NULL DEFAULT 0,madinah_nights int NOT NULL DEFAULT 0,
 price_quad numeric NOT NULL DEFAULT 0,price_triple numeric NOT NULL DEFAULT 0,
 price_double numeric NOT NULL DEFAULT 0,price_single numeric NOT NULL DEFAULT 0,
 currency text NOT NULL DEFAULT 'EGP',status text NOT NULL DEFAULT 'open',
 departure_date date,return_date date
);
CREATE TABLE public.pilgrims(
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,program_id uuid NOT NULL,
 customer_id uuid,full_name text NOT NULL,status text NOT NULL DEFAULT 'registered',
 name_en text, national_id text, passport_number text, passport_expiry date,
 visa_status text NOT NULL DEFAULT 'not_started',
 documents_complete boolean NOT NULL DEFAULT false,
 makkah_room text, madinah_room text,
 room_type text NOT NULL DEFAULT 'quad',total_price numeric NOT NULL DEFAULT 0,
 paid_amount numeric NOT NULL DEFAULT 0,cancellation_fee numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.customer_payments(
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,pilgrim_id uuid,
 customer_id uuid,amount numeric NOT NULL,status text NOT NULL DEFAULT 'pending',
 currency text NOT NULL DEFAULT 'EGP'
);
CREATE TABLE public.pilgrimage_program_costs(
 program_id uuid PRIMARY KEY,organization_id uuid NOT NULL,cost_per_person numeric NOT NULL DEFAULT 0
);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pilgrims,public.pilgrimage_programs TO authenticated;

CREATE FUNCTION public.get_user_org_role(p_user uuid,p_org uuid)
RETURNS text LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT CASE WHEN p_user='00000000-0000-4000-8000-000000000011'::uuid THEN 'manager' ELSE 'agent' END $$;
CREATE FUNCTION public.can_process_org_payments(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT auth.uid() = '00000000-0000-4000-8000-000000000011'::uuid $$;

\i scripts/deploy-pilgrimage-guardrails.sql

INSERT INTO public.organizations VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.customers VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002');

DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    INSERT INTO public.pilgrimage_programs(id,organization_id,name,capacity,
       departure_date,return_date)
    VALUES('00000000-0000-4000-8000-000000000210',
           '00000000-0000-4000-8000-000000000001',
           'اختبار عكسي',2,'2027-03-01','2027-02-01');
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Backward dates accepted'; END IF;
END $$;

INSERT INTO public.pilgrimage_programs
(id,organization_id,name,capacity,price_quad,price_double,price_single,status,departure_date,return_date)
VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001',
 'برنامج تجريبي',2,1000,1800,2600,'open','2027-03-01','2027-03-10'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000002',
 'برنامج آخر',1,1000,1800,2600,'open','2027-03-01','2027-03-10');

INSERT INTO public.pilgrims(id,organization_id,program_id,customer_id,full_name,room_type,total_price,paid_amount)
VALUES ('00000000-0000-4000-8000-000000000301',
'00000000-0000-4000-8000-000000000001',
'00000000-0000-4000-8000-000000000201',
'00000000-0000-4000-8000-000000000101','Sample A','quad',1,99999);
DO $$
BEGIN
 IF (SELECT total_price FROM public.pilgrims WHERE id='00000000-0000-4000-8000-000000000301')<>1000
    OR (SELECT paid_amount FROM public.pilgrims WHERE id='00000000-0000-4000-8000-000000000301')<>0
 THEN RAISE EXCEPTION 'Server failed to overwrite forged price/paid amounts'; END IF;
END $$;

UPDATE public.pilgrims SET room_type='double'
 WHERE id='00000000-0000-4000-8000-000000000301';
DO $$
BEGIN
 IF (SELECT total_price FROM public.pilgrims WHERE id='00000000-0000-4000-8000-000000000301')<>1800
 THEN RAISE EXCEPTION 'Unpaid room category price was not updated'; END IF;
END $$;

INSERT INTO public.pilgrims(id,organization_id,program_id,customer_id,full_name,room_type)
VALUES ('00000000-0000-4000-8000-000000000302',
'00000000-0000-4000-8000-000000000001',
'00000000-0000-4000-8000-000000000201',
'00000000-0000-4000-8000-000000000101','Sample B','quad');

DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    INSERT INTO public.pilgrims(id,organization_id,program_id,customer_id,full_name,room_type)
    VALUES ('00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101','Sample C','quad');
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Over-capacity booking accepted'; END IF;

  denied:=false;
  BEGIN UPDATE public.pilgrimage_programs SET capacity=1
    WHERE id='00000000-0000-4000-8000-000000000201';
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Shrink capacity below registrations accepted'; END IF;

  denied:=false;
  BEGIN UPDATE public.pilgrimage_programs SET currency='SAR'
    WHERE id='00000000-0000-4000-8000-000000000201';
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Program currency edited after registration'; END IF;

  denied:=false;
  BEGIN UPDATE public.pilgrims SET total_price=5
    WHERE id='00000000-0000-4000-8000-000000000301';
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Direct pilgrim price edit accepted'; END IF;
END $$;

DO $$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
   INSERT INTO public.customer_payments(id,organization_id,pilgrim_id,customer_id,amount,status,currency)
   VALUES ('00000000-0000-4000-8000-000000000401',
   '00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000102',200,'completed','EGP');
  EXCEPTION WHEN foreign_key_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant payment accepted'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000011';
INSERT INTO public.customer_payments(id,organization_id,pilgrim_id,customer_id,amount,status,currency)
VALUES ('00000000-0000-4000-8000-000000000402',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000101',400,'completed','EGP');
UPDATE public.pilgrims SET paid_amount=99999
WHERE id='00000000-0000-4000-8000-000000000301';

DO $$
DECLARE denied boolean:=false;
BEGIN
 IF (SELECT paid_amount FROM public.pilgrims WHERE id='00000000-0000-4000-8000-000000000301')<>400
 THEN RAISE EXCEPTION 'Direct paid_amount modification not reconciled to payments'; END IF;
 BEGIN
  UPDATE public.pilgrims SET room_type='single'
   WHERE id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Room price changed after collection'; END IF;
 denied:=false;
 BEGIN
  INSERT INTO public.customer_payments(id,organization_id,pilgrim_id,customer_id,amount,status,currency)
  VALUES ('00000000-0000-4000-8000-000000000403',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000101',1500,'completed','EGP');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Payment exceeded remaining balance'; END IF;
END $$;

-- International traveler readiness must fail closed until documentation
-- is present. This tests the database trigger, not a statutory visa grant.
DO $
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrims SET status='ready'
   WHERE id='00000000-0000-4000-8000-000000000302';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Undocumented international traveler marked ready'; END IF;
END $;

UPDATE public.pilgrims SET name_en='SAMPLE B',
  passport_number='P12345',passport_expiry='2028-01-01',
  visa_status='issued',documents_complete=true, status='ready'
WHERE id='00000000-0000-4000-8000-000000000302';

-- Domestic route: identity, not a blanket international passport rule.
INSERT INTO public.pilgrimage_programs
(id,organization_id,name,capacity,price_quad,status,travel_scope,departure_date,return_date)
VALUES ('00000000-0000-4000-8000-000000000203',
'00000000-0000-4000-8000-000000000001',
'رحلة حج داخلية تجريبية',1,1200,'open','domestic','2027-03-01','2027-03-10');

INSERT INTO public.pilgrims(id,organization_id,program_id,customer_id,full_name,room_type)
VALUES ('00000000-0000-4000-8000-000000000304',
'00000000-0000-4000-8000-000000000001',
'00000000-0000-4000-8000-000000000203',
'00000000-0000-4000-8000-000000000101',
'Domestic Sample','quad');

DO $
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrims SET documents_complete=true,status='ready'
  WHERE id='00000000-0000-4000-8000-000000000304';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Domestic traveler without identity marked ready'; END IF;
END $;

UPDATE public.pilgrims SET national_id='TEST-IQAMA-123',
 documents_complete=true,visa_status='not_required',status='ready'
WHERE id='00000000-0000-4000-8000-000000000304';

SET test.user_id='00000000-0000-4000-8000-000000000099';
DO $
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrims SET status='cancelled',cancellation_fee=50
  WHERE id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Agent could cancel and set fee'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000011';
UPDATE public.pilgrims SET status='cancelled',cancellation_fee=100
 WHERE id='00000000-0000-4000-8000-000000000301';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.customer_payments(id,organization_id,pilgrim_id,customer_id,amount,status,currency)
  VALUES ('00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000101',100,'completed','EGP');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cancelled pilgrim accepted new collection'; END IF;
 denied:=false;
 BEGIN UPDATE public.pilgrims SET status='registered'
   WHERE id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cancelled pilgrim reopened'; END IF;
 denied:=false;
 BEGIN
  INSERT INTO public.pilgrimage_program_costs(program_id,organization_id)
  VALUES('00000000-0000-4000-8000-000000000201',
         '00000000-0000-4000-8000-000000000002');
 EXCEPTION WHEN foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant cost sheet accepted'; END IF;
END $$;

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrims','DELETE')
   OR has_table_privilege('authenticated','public.pilgrimage_programs','DELETE')
 THEN RAISE EXCEPTION 'Authenticated staff can hard-delete pilgrimage history'; END IF;
 IF has_function_privilege('anon','public._pilgrimage_pilgrim_integrity()','EXECUTE')
   OR has_function_privilege('authenticated','public._pilgrimage_payment_integrity()','EXECUTE')
 THEN RAISE EXCEPTION 'Trigger helper is callable from public API'; END IF;
END $$;
SELECT 'Pilgrimage capacity, tenant, payment and price guardrails passed' AS result;
