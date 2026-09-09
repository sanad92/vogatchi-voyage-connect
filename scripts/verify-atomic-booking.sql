-- Caller: BEGIN; set qa.booking_org/owner/agent; optionally candidate DDL;
-- run this file; ROLLBACK. Never COMMIT these fixtures or permission overrides.
CREATE TEMP TABLE qa_booking_results(name text,passed boolean);
GRANT SELECT,INSERT ON qa_booking_results TO authenticated;
CREATE FUNCTION pg_temp.booking_assert(label text,ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
INSERT INTO qa_booking_results VALUES(label,true); END $$;
CREATE TEMP TABLE qa_booking_context AS SELECT current_setting('qa.booking_org')::uuid AS org,
 (SELECT id FROM public.customers WHERE organization_id=current_setting('qa.booking_org')::uuid ORDER BY id LIMIT 1) AS customer,
 (SELECT id FROM public.suppliers WHERE organization_id=current_setting('qa.booking_org')::uuid AND is_active ORDER BY id LIMIT 1) AS supplier,
 gen_random_uuid() AS request_id,NULL::jsonb AS payload,NULL::uuid AS booking_id;
GRANT SELECT,UPDATE ON qa_booking_context TO authenticated;
UPDATE public.organization_settings SET currency='EGP',default_revenue_recognition_mode='principal_gross'
 WHERE organization_id=current_setting('qa.booking_org')::uuid;
CREATE FUNCTION pg_temp.booking_counts() RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('customers',(SELECT count(*) FROM public.customers),
  'bookings',(SELECT count(*) FROM public.bookings),'details',(SELECT count(*) FROM public.booking_hotel_details),
  'invoices',(SELECT count(*) FROM public.invoices),'orders',(SELECT count(*) FROM public.supplier_payment_orders),
  'supplier_invoices',(SELECT count(*) FROM public.supplier_invoices),'journals',(SELECT count(*) FROM public.journal_entries),
  'vouchers',(SELECT count(*) FROM public.booking_vouchers));
$$;
CREATE FUNCTION pg_temp.booking_fail_detail() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF current_setting('qa.booking_fail_detail',true)='on' THEN RAISE EXCEPTION 'QA late detail failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER qa_booking_fail_detail BEFORE INSERT ON public.booking_hotel_details
 FOR EACH ROW EXECUTE FUNCTION pg_temp.booking_fail_detail();
CREATE FUNCTION pg_temp.booking_fail_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF current_setting('qa.booking_fail_invoice',true)='on' THEN RAISE EXCEPTION 'QA invoice failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER qa_booking_fail_invoice BEFORE INSERT ON public.invoices
 FOR EACH ROW EXECUTE FUNCTION pg_temp.booking_fail_invoice();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.booking_owner'),true);
DO $$ <<qa>>
DECLARE c record; payload jsonb; result jsonb; replay jsonb; changed jsonb; before_counts jsonb;
 denied boolean; bid uuid; iid uuid; req uuid; kind text; table_name text; detail_name text; detail jsonb; n bigint;
BEGIN
 SELECT * INTO c FROM qa_booking_context;
 PERFORM pg_temp.booking_assert('fixture customer and active supplier exist',c.customer IS NOT NULL AND c.supplier IS NOT NULL);
 payload:=jsonb_build_object('booking_type','hotel','customer_id',c.customer,'customer_name','must not override canonical name',
  'supplier_id',c.supplier,'supplier_name','must not override canonical supplier','selling_price',1500,'cost_price',900,
  'currency','EGP','start_date',current_date+10,'end_date',current_date+12,
  'hotelDetails',jsonb_build_object('hotel_name','QA atomic booking hotel','rooms',2,'adults',3,'children',1,
    'children_ages','5','meal_plan','HB','nights',99,'booking_reference','QA-SUP-001'));
 result:=public.create_booking_atomic(c.org,c.request_id,payload); bid:=(result->>'id')::uuid; iid:=(result->>'invoice_id')::uuid;
 UPDATE qa_booking_context SET payload=qa.payload,booking_id=bid;
 PERFORM pg_temp.booking_assert('header and hotel details committed together',
  (SELECT count(*)=1 FROM public.bookings WHERE id=bid) AND
  (SELECT count(*)=1 AND bool_and(rooms=2 AND nights=2 AND selling_amount=1500 AND cost_amount=900)
    FROM public.booking_hotel_details WHERE booking_id=bid));
 PERFORM pg_temp.booking_assert('canonical names and profit are server controlled',
  (SELECT b.customer_name=cust.name AND b.supplier_name=s.name AND b.profit=600 AND b.base_selling_price=0 AND b.base_cost_price=0
    FROM public.bookings b JOIN public.customers cust ON cust.id=b.customer_id JOIN public.suppliers s ON s.id=b.supplier_id WHERE b.id=bid));
 PERFORM pg_temp.booking_assert('one consistent customer invoice and service line',
  (SELECT count(*)=1 AND bool_and(final_amount=1500 AND customer_id=c.customer AND currency='EGP') FROM public.invoices WHERE booking_id=bid)
  AND (SELECT sum(total_price)=1500 FROM public.invoice_items WHERE invoice_id=iid));
 PERFORM pg_temp.booking_assert('one supplier obligation and linked supplier invoice',
  (SELECT count(*)=1 AND sum(amount)=900 FROM public.supplier_payment_orders WHERE booking_id=bid)
  AND (SELECT count(*)=1 AND sum(amount)=900 FROM public.supplier_invoices WHERE booking_id=bid));
 PERFORM pg_temp.booking_assert('customer and supplier journals balance',
  (SELECT count(*)=1 AND sum(total_debit)=1500 AND sum(total_credit)=1500 FROM public.journal_entries WHERE source_type='invoice' AND source_id=iid)
  AND (SELECT count(*)=1 AND sum(total_debit)=900 AND sum(total_credit)=900 FROM public.journal_entries
    WHERE source_type='supplier_invoice' AND source_id IN(SELECT id FROM public.supplier_invoices WHERE booking_id=bid)));
 before_counts:=pg_temp.booking_counts(); replay:=public.create_booking_atomic(c.org,c.request_id,payload);
 PERFORM pg_temp.booking_assert('same request returns same booking without side effects',
  replay->>'id'=bid::text AND replay->>'invoice_id'=iid::text AND (replay->>'already_created')::boolean AND before_counts=pg_temp.booking_counts());
 denied:=false;
 BEGIN PERFORM public.create_booking_atomic(c.org,c.request_id,payload||'{"selling_price":1600}');
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('changed payload cannot reuse request id',denied AND before_counts=pg_temp.booking_counts());
 PERFORM public.sync_booking_financials(bid); PERFORM public.run_booking_automation(bid);
 PERFORM pg_temp.booking_assert('later financial sync does not double count base plus service',
  (SELECT selling_price=1500 AND cost_price=900 AND profit=600 FROM public.bookings WHERE id=bid)
  AND (SELECT count(*)=1 AND sum(amount)=900 FROM public.supplier_payment_orders WHERE booking_id=bid)
  AND (SELECT count(*)=1 AND sum(final_amount)=1500 FROM public.invoices WHERE booking_id=bid));

 FOREACH kind IN ARRAY ARRAY['flight','car_rental','transport'] LOOP
  IF kind='flight' THEN detail_name:='flightDetails'; table_name:='booking_flight_details'; detail:='{"airline":"QA Air","pnr":"QA-PNR","passengers_count":3,"is_round_trip":true}';
  ELSIF kind='car_rental' THEN detail_name:='carDetails'; table_name:='booking_car_details'; detail:='{"car_type":"QA Sedan","pickup_location":"QA Airport","daily_rate":750,"insurance_included":true}';
  ELSE detail_name:='transportDetails'; table_name:='booking_transport_details'; detail:='{"vehicle_type":"van","route":"QA Route","passengers":4}'; END IF;
  changed:=(payload-'hotelDetails')||jsonb_build_object('booking_type',kind,detail_name,detail);
  result:=public.create_booking_atomic(c.org,gen_random_uuid(),changed);
  EXECUTE format('SELECT count(*) FROM public.%I WHERE booking_id=$1 AND selling_amount=1500 AND cost_amount=900',table_name)
    INTO n USING (result->>'id')::uuid;
  PERFORM pg_temp.booking_assert(kind||' details saved atomically',n=1);
 END LOOP;

 changed:=(payload-'customer_id')||jsonb_build_object('customer_name','QA atomic rollback '||gen_random_uuid(),
  'customer_email','qa-booking-'||gen_random_uuid()||'@example.invalid');
 before_counts:=pg_temp.booking_counts(); req:=gen_random_uuid();
 PERFORM set_config('qa.booking_fail_detail','on',true); denied:=false;
 BEGIN PERFORM public.create_booking_atomic(c.org,req,changed);
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'QA late detail failure' THEN RAISE; END IF; denied:=true; END;
 PERFORM set_config('qa.booking_fail_detail','off',true);
 PERFORM pg_temp.booking_assert('late detail failure rolls back customer booking invoice supplier and journal',denied AND before_counts=pg_temp.booking_counts());
 result:=public.create_booking_atomic(c.org,req,changed);
 PERFORM pg_temp.booking_assert('failed request can be retried with same key',result->>'id' IS NOT NULL AND NOT(result->>'already_created')::boolean);

 before_counts:=pg_temp.booking_counts(); PERFORM set_config('qa.booking_fail_invoice','on',true); denied:=false;
 BEGIN PERFORM public.create_booking_atomic(c.org,gen_random_uuid(),payload); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM set_config('qa.booking_fail_invoice','off',true);
 PERFORM pg_temp.booking_assert('swallowed automation invoice failure aborts creation',denied AND before_counts=pg_temp.booking_counts());

 n:=0;
 FOREACH changed IN ARRAY ARRAY[
  payload-'hotelDetails',
  payload||'{"supplier_id":null}',
  payload||'{"cost_price":-1}',
  payload||'{"selling_price":"NaN"}',
  jsonb_set(payload,'{hotelDetails,rooms}','0'),
  jsonb_set(payload,'{hotelDetails,check_in}',to_jsonb((current_date+20)::text)),
  jsonb_set(payload,'{hotelDetails,booking_id}',to_jsonb(bid::text)),
  payload||jsonb_build_object('quote_id',gen_random_uuid()),
  payload||jsonb_build_object('customer_id',gen_random_uuid()),
  payload||jsonb_build_object('supplier_id',gen_random_uuid())] LOOP
  denied:=false;
  BEGIN PERFORM public.create_booking_atomic(c.org,gen_random_uuid(),changed); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  n:=n+1;
  PERFORM pg_temp.booking_assert((ARRAY['missing details rejected','positive cost without supplier rejected',
   'negative cost rejected','nonfinite selling price rejected','zero rooms rejected','conflicting service dates rejected',
   'detail booking-id injection rejected','quote conversion bypass rejected','unavailable customer rejected','unavailable supplier rejected'])[n],
   denied AND before_counts=pg_temp.booking_counts());
 END LOOP;
 denied:=false;
 BEGIN PERFORM public.create_booking_atomic(gen_random_uuid(),gen_random_uuid(),payload); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('foreign organization rejected',denied);
 result:=public.create_booking_atomic(c.org,gen_random_uuid(),payload||'{"cost_price":0,"supplier_id":null}');
 PERFORM pg_temp.booking_assert('zero-cost service has invoice without supplier debt',
  (SELECT count(*)=1 AND sum(final_amount)=1500 FROM public.invoices WHERE booking_id=(result->>'id')::uuid)
  AND NOT EXISTS(SELECT 1 FROM public.supplier_payment_orders WHERE booking_id=(result->>'id')::uuid));
END $$;
RESET ROLE;
INSERT INTO public.organization_permission_overrides(organization_id,user_id,permission_key,granted,data_scope)
 SELECT current_setting('qa.booking_org')::uuid,current_setting('qa.booking_agent')::uuid,k,true,'organization'
 FROM unnest(ARRAY['bookings_create','invoices_create','customers_view']) k
 ON CONFLICT(organization_id,user_id,permission_key) DO UPDATE SET granted=true,data_scope='organization';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.booking_agent'),true);
DO $$ DECLARE c record; denied boolean:=false; BEGIN
 SELECT * INTO c FROM qa_booking_context;
 BEGIN PERFORM public.create_booking_atomic(c.org,c.request_id,c.payload); EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('another employee cannot replay original request',denied);
END $$;
RESET ROLE;
UPDATE public.organization_permission_overrides SET granted=false,data_scope='none'
 WHERE organization_id=current_setting('qa.booking_org')::uuid AND user_id=current_setting('qa.booking_agent')::uuid AND permission_key='bookings_create';
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; denied boolean:=false; BEGIN
 SELECT * INTO c FROM qa_booking_context;
 BEGIN PERFORM public.create_booking_atomic(c.org,gen_random_uuid(),c.payload); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('explicit booking permission denial enforced by server',denied);
END $$;
RESET ROLE;
UPDATE public.organization_permission_overrides SET granted=true,data_scope='organization'
 WHERE organization_id=current_setting('qa.booking_org')::uuid AND user_id=current_setting('qa.booking_agent')::uuid AND permission_key='bookings_create';
UPDATE public.organization_permission_overrides SET granted=false,data_scope='none'
 WHERE organization_id=current_setting('qa.booking_org')::uuid AND user_id=current_setting('qa.booking_agent')::uuid AND permission_key='invoices_create';
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; denied boolean:=false; BEGIN
 SELECT * INTO c FROM qa_booking_context;
 BEGIN PERFORM public.create_booking_atomic(c.org,gen_random_uuid(),c.payload); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('invoice permission required before creating a booking',denied);
END $$;
RESET ROLE;
UPDATE public.organization_permission_overrides SET granted=true,data_scope='organization'
 WHERE organization_id=current_setting('qa.booking_org')::uuid AND user_id=current_setting('qa.booking_agent')::uuid AND permission_key='invoices_create';
UPDATE public.organization_members SET is_active=false
 WHERE organization_id=current_setting('qa.booking_org')::uuid AND user_id=current_setting('qa.booking_agent')::uuid;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; denied boolean:=false; BEGIN
 SELECT * INTO c FROM qa_booking_context;
 BEGIN PERFORM public.create_booking_atomic(c.org,gen_random_uuid(),c.payload); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM pg_temp.booking_assert('inactive membership cannot create a booking',denied);
END $$;
RESET ROLE;
SELECT jsonb_agg(to_jsonb(r)) AS booking_results FROM qa_booking_results r;
