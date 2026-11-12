-- Disposable PostgreSQL 16 end-to-end fixture:
-- PR #41 real program/pilgrim guards -> PR #42 commercial quote -> PR #43
-- internal seats -> PR #44 retail registration transfer.
-- Never run against a live/customer/hosted database.
\set ON_ERROR_STOP on
\i scripts/test-pilgrimage-guardrails.sql
-- Restore the production pilgrims.id identity default omitted by the narrow PR #41 fixture.
ALTER TABLE public.pilgrims ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE TABLE public.suppliers(
  id uuid PRIMARY KEY,organization_id uuid NOT NULL,name text NOT NULL
);
INSERT INTO public.suppliers VALUES
 ('00000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-000000000001','Supplier A'),
 ('00000000-0000-4000-8000-000000000112',
  '00000000-0000-4000-8000-000000000002','Supplier B');
ALTER TABLE public.pilgrims ADD COLUMN created_by uuid DEFAULT auth.uid();
CREATE FUNCTION public.user_belongs_to_org(u uuid,org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $$
 SELECT
   (org='00000000-0000-4000-8000-000000000001'::uuid AND
    u IN ('00000000-0000-4000-8000-000000000011'::uuid,
          '00000000-0000-4000-8000-000000000012'::uuid))
  OR
   (org='00000000-0000-4000-8000-000000000002'::uuid
    AND u='00000000-0000-4000-8000-000000000021'::uuid)
$$;
\i scripts/deploy-pilgrimage-sales-models.sql
\i scripts/deploy-pilgrimage-seat-allocations.sql
\i scripts/deploy-pilgrimage-retail-registration.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrimage_retail_conversions','INSERT')
 OR has_table_privilege('authenticated','public.pilgrimage_retail_conversion_travelers','INSERT')
 OR has_table_privilege('authenticated','public.pilgrimage_retail_conversions','UPDATE')
 OR has_function_privilege('anon','public.convert_pilgrimage_retail_group(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Direct retail conversion write or anonymous RPC unexpectedly granted'; END IF;
END $$;

UPDATE public.pilgrimage_programs SET capacity=3
  WHERE id='00000000-0000-4000-8000-000000000201';

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,name,
 program_id,buyer_customer_id,party_size,currency
) VALUES(
 '00000000-0000-4000-8000-000000000401',
 '00000000-0000-4000-8000-000000000001','umrah','group_seat',
 'organizer','تسجيل مقعدين تجزئة',
 '00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000101',2,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000401',
 'program_seat','مقاعد غرف ثنائية','double',2,1800);
INSERT INTO public.pilgrimage_sale_travelers(
 organization_id,sale_id,display_name,room_type
) VALUES
 ('00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000401',
  'Traveler Alpha','double'),
 ('00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000401',
  'Traveler Beta','double');
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000401';

SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000401','hold',120);
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000401','allocate',120);

DO $$
DECLARE denied boolean:=false;
BEGIN
 -- User has not proven to the ERP that a real visa, room, or flight is
 -- confirmed. No financial document or supplier side effects are allowed.
 IF (SELECT count(*) FROM public.pilgrimage_seat_allocations
    WHERE sale_id='00000000-0000-4000-8000-000000000401'
      AND status='allocated')<>1 THEN
   RAISE EXCEPTION 'Pre-conversion internal allocation is missing'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000401');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Agent converted registered seats'; END IF;
END $$;
SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_retail_conversions) THEN
   RAISE EXCEPTION 'Other company sees conversion history'; END IF;
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000401');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Other company converted retail group'; END IF;
END $$;
SET test.user_id='00000000-0000-4000-8000-000000000011';

DO $$
DECLARE result_id uuid; repeat_id uuid;
BEGIN
 result_id:=public.convert_pilgrimage_retail_group(
   '00000000-0000-4000-8000-000000000401');
 repeat_id:=public.convert_pilgrimage_retail_group(
   '00000000-0000-4000-8000-000000000401');
 IF result_id IS DISTINCT FROM repeat_id THEN
   RAISE EXCEPTION 'Retry created a second conversion'; END IF;
 IF (SELECT count(*) FROM public.pilgrimage_retail_conversions
      WHERE sale_id='00000000-0000-4000-8000-000000000401')<>1 OR
    (SELECT count(*) FROM public.pilgrimage_retail_conversion_travelers
      WHERE conversion_id=result_id)<>2 THEN
   RAISE EXCEPTION 'Conversion created incomplete group traveler records'; END IF;

 IF (SELECT count(*) FROM public.pilgrims
      WHERE program_id='00000000-0000-4000-8000-000000000201'
        AND status<>'cancelled')<>3 THEN
   RAISE EXCEPTION 'Internal allocation was not transferred to actual pilgrims'; END IF;
 IF (SELECT count(*) FROM public.pilgrims g
     JOIN public.pilgrimage_retail_conversion_travelers l ON l.pilgrim_id=g.id
     WHERE l.conversion_id=result_id AND g.organization_id=
      '00000000-0000-4000-8000-000000000001'::uuid
       AND g.customer_id='00000000-0000-4000-8000-000000000101'::uuid
       AND g.total_price=1800 AND g.paid_amount=0
       AND g.status='registered' AND g.room_type='double')<>2 THEN
   RAISE EXCEPTION 'Incorrect retail tariff, customer or settlement state'; END IF;
 IF (SELECT status FROM public.pilgrimage_seat_allocations
      WHERE sale_id='00000000-0000-4000-8000-000000000401')<>'released' THEN
   RAISE EXCEPTION 'Converted inventory allocation remains active'; END IF;
 IF (SELECT count(*) FROM public.pilgrimage_seat_allocation_events e
      JOIN public.pilgrimage_seat_allocations a ON a.id=e.allocation_id
      WHERE a.sale_id='00000000-0000-4000-8000-000000000401'
      AND e.action='converted')<>1 THEN
   RAISE EXCEPTION 'Conversion audit not recorded exactly once'; END IF;
END $$;

DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000401','hold',60);
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Converted group seats were re-held'; END IF;
 blocked:=false;
 BEGIN
  UPDATE public.pilgrimage_sales SET status='cancelled'
   WHERE id='00000000-0000-4000-8000-000000000401';
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Converted contract cancelled without managed reversal'; END IF;
END $$;

-- Invalid traveler details -> no partial row creation or release.
RESET ROLE;
INSERT INTO public.pilgrimage_programs(
 id,organization_id,name,capacity,price_double,currency,status
) VALUES(
 '00000000-0000-4000-8000-000000000212',
 '00000000-0000-4000-8000-000000000001',
 'برنامج آخر',2,1800,'EGP','open');
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,name,
 program_id,buyer_customer_id,party_size,currency
) VALUES(
 '00000000-0000-4000-8000-000000000402',
 '00000000-0000-4000-8000-000000000001','umrah','group_seat',
 'organizer','تسجيل ناقص الاسم',
 '00000000-0000-4000-8000-000000000212',
 '00000000-0000-4000-8000-000000000101',1,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000402',
 'program_seat','مقعد تجزئة','double',1,1800);
INSERT INTO public.pilgrimage_sale_travelers(
 organization_id,sale_id,display_name,room_type
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000402','X',NULL);
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000402';
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000402','hold',120);
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000402','allocate',120);
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000402');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Incomplete traveler data accepted'; END IF;
 IF (SELECT status FROM public.pilgrimage_seat_allocations
    WHERE sale_id='00000000-0000-4000-8000-000000000402')<>'allocated'
 OR EXISTS(SELECT 1 FROM public.pilgrimage_retail_conversions
    WHERE sale_id='00000000-0000-4000-8000-000000000402')
 THEN RAISE EXCEPTION 'Failed conversion partially released seats'; END IF;
END $$;

-- Agency group sales remain on the separate financial/accounting route.
INSERT INTO public.pilgrimage_agencies(
 id,organization_id,name
) VALUES(
 '00000000-0000-4000-8000-000000000411',
 '00000000-0000-4000-8000-000000000001','Agency Partner A');
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,name,
 program_id,buyer_agency_id,party_size,currency
) VALUES(
 '00000000-0000-4000-8000-000000000403',
 '00000000-0000-4000-8000-000000000001','umrah','b2b_group',
 'organizer','شركة سياحة عمرة',
 '00000000-0000-4000-8000-000000000212',
 '00000000-0000-4000-8000-000000000411',1,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000403',
 'program_seat','عقد شركة','double',1,1500);
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000403';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000403');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'B2B contract was misclassified as retail debtor'; END IF;
END $$;

-- No unauthenticated conversion and no externally issued visa is invented.
SET test.user_id='';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000401');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Missing JWT subject reused conversion'; END IF;
END $$;
SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.convert_pilgrimage_retail_group(
    '00000000-0000-4000-8000-000000000401');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Anon conversion RPC callable'; END IF;
END $$;
RESET ROLE;
SELECT 'Retail group conversion, pricing, audit, idempotency, incomplete roster and B2B no-go passed' AS result;
