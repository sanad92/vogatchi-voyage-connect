-- Caller: BEGIN; candidate deployment SQL; set qa.quote_org/owner/agent; this file; ROLLBACK.
CREATE TEMP TABLE qa_quote_results(name text,passed boolean);
GRANT SELECT,INSERT ON qa_quote_results TO authenticated;
CREATE FUNCTION pg_temp.quote_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
INSERT INTO qa_quote_results VALUES(label,true); END $$;
CREATE FUNCTION pg_temp.quote_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.description='QA forced fail' THEN RAISE EXCEPTION 'QA forced item failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER qa_quote_fail BEFORE INSERT ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION pg_temp.quote_fail_item();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.quote_owner'),true);
DO $$
DECLARE payload jsonb; result jsonb; retry jsonb; key uuid:=gen_random_uuid();
org uuid:=current_setting('qa.quote_org')::uuid; before_count bigint; denied boolean;
BEGIN
 payload:='{"customer_name":"QA atomic quote","status":"draft","number_of_travelers":2,"discount_amount":20,"vat_rate":14,"subtotal":999999,"total_amount":999999,"items":[{"item_type":"hotel","description":"QA hotel","quantity":2,"cost_price":80,"selling_price":110,"total_cost":1,"total_selling":1}]}'::jsonb;
 result:=public.create_quote_atomic(org,key,payload);
 PERFORM pg_temp.quote_assert('server computes totals, ignores supplied totals',
   (result->>'subtotal')::numeric=220 AND (result->>'total_cost')::numeric=160
   AND (result->>'vat_amount')::numeric=28 AND (result->>'total_amount')::numeric=228
   AND (result->>'total_profit')::numeric=40);
 PERFORM pg_temp.quote_assert('items and quote committed together',
   (SELECT count(*)=1 AND sum(total_selling)=220 FROM public.quote_items WHERE quote_id=(result->>'id')::uuid));
 retry:=public.create_quote_atomic(org,key,payload);
 PERFORM pg_temp.quote_assert('retry returns same quote',retry->>'id'=result->>'id');
 denied:=false;
 BEGIN PERFORM public.create_quote_atomic(org,key,payload||'{"notes":"changed"}'::jsonb);
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.quote_assert('reused key cannot change payload',denied);
 SELECT count(*) INTO before_count FROM public.quotes WHERE organization_id=org;
 payload:=jsonb_set(payload,'{items}',(payload->'items')||'[{"item_type":"flight","description":"QA forced fail","quantity":1,"cost_price":10,"selling_price":20}]'::jsonb);
 denied:=false;
 BEGIN PERFORM public.create_quote_atomic(org,gen_random_uuid(),payload);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'QA forced item failure' THEN RAISE; END IF; denied:=true; END;
 PERFORM pg_temp.quote_assert('late database failure rolls back header and items',denied
   AND (SELECT count(*) FROM public.quotes WHERE organization_id=org)=before_count
   AND NOT EXISTS(SELECT 1 FROM public.quote_items WHERE description='QA forced fail'));
 payload:=jsonb_set(payload,'{items,1,selling_price}','"NaN"'::jsonb);
 denied:=false;
 BEGIN PERFORM public.create_quote_atomic(org,gen_random_uuid(),payload);
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.quote_assert('nonfinite later item rejected without partial save',denied
   AND (SELECT count(*) FROM public.quotes WHERE organization_id=org)=before_count);
 payload:=jsonb_set(payload,'{items}',jsonb_build_array(payload->'items'->0));
 payload:=payload||jsonb_build_object('customer_id',gen_random_uuid());
 denied:=false;
 BEGIN PERFORM public.create_quote_atomic(org,gen_random_uuid(),payload);
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.quote_assert('foreign or missing customer rejected',denied);
END $$;
RESET ROLE;
INSERT INTO public.organization_permission_overrides(organization_id,user_id,permission_key,granted,data_scope)
VALUES(current_setting('qa.quote_org')::uuid,current_setting('qa.quote_agent')::uuid,'quotes_create',false,'none')
ON CONFLICT(organization_id,user_id,permission_key) DO UPDATE SET granted=false,data_scope='none';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.quote_agent'),true);
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN PERFORM public.create_quote_atomic(current_setting('qa.quote_org')::uuid,gen_random_uuid(),'{}');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.quote_assert('explicit company permission denial',denied);
END $$;
RESET ROLE;
SELECT jsonb_agg(to_jsonb(r)) AS results FROM qa_quote_results r;
