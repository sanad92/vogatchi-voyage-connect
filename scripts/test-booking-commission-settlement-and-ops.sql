-- Verifies protected booking finances, commission cash registration and the Operations Center. Every test row rolls back.
BEGIN;
INSERT INTO public.organizations(id,name,slug) VALUES
 ('797ab230-0000-4000-8000-000000000001','Unified workflow QA','unified-staff-797ab230'),
 ('797ab230-0000-4000-8000-000000000002','Isolated workflow QA','unified-staff-797ab231');
INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES
 ('797ab230-0000-4000-8000-000000000003','unified-creator@example.invalid','{}',now()),
 ('797ab230-0000-4000-8000-000000000004','unified-manager@example.invalid','{}',now()),
 ('797ab230-0000-4000-8000-000000000005','unified-outsider@example.invalid','{}',now()),
 ('797ab230-0000-4000-8000-000000000006','unified-coworker@example.invalid','{}',now()),
 ('797ab230-0000-4000-8000-000000000007','unified-reviewer@example.invalid','{}',now());
INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000004','owner',true),
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000003','agent',true),
 ('797ab230-0000-4000-8000-000000000002','797ab230-0000-4000-8000-000000000005','owner',true),
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000006','agent',true),
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000007','admin',true);
INSERT INTO public.sop_department_members(organization_id,user_id,department) VALUES
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000003','reservations'),
 ('797ab230-0000-4000-8000-000000000001','797ab230-0000-4000-8000-000000000003','finance');
INSERT INTO public.employees(id,organization_id,employee_code,full_name,is_active,commission_rate) VALUES
 ('797ab230-0000-4000-8000-000000000012','797ab230-0000-4000-8000-000000000001','QASALE230','QA sales owner',true,5),
 ('797ab230-0000-4000-8000-000000000013','797ab230-0000-4000-8000-000000000002','QAOUT230','QA outside sales',true,12);
UPDATE public.employees SET commission_rate=2.5
 WHERE organization_id='797ab230-0000-4000-8000-000000000001' AND email='unified-creator@example.invalid';
INSERT INTO public.customers(id,organization_id,name,phone) VALUES
 ('797ab230-0000-4000-8000-000000000020','797ab230-0000-4000-8000-000000000001','Unified QA customer','01000000025');
INSERT INTO public.suppliers(id,organization_id,name,is_active) VALUES
 ('797ab230-0000-4000-8000-000000000021','797ab230-0000-4000-8000-000000000001','Unified QA supplier',true);
INSERT INTO public.bank_accounts(id,organization_id,account_name,bank_name,account_number,is_active,treasury_kind,currency,current_balance)
 VALUES ('797ab230-0000-4000-8000-000000000031','797ab230-0000-4000-8000-000000000001','QA bank','QA bank','QA-230',true,'bank','EGP',10000);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 org uuid := '797ab230-0000-4000-8000-000000000001';
 creator uuid := '797ab230-0000-4000-8000-000000000003';
 manager uuid := '797ab230-0000-4000-8000-000000000004';
 outsider uuid := '797ab230-0000-4000-8000-000000000005';
 coworker uuid := '797ab230-0000-4000-8000-000000000006';
 seller uuid := '797ab230-0000-4000-8000-000000000012';
 foreign_seller uuid := '797ab230-0000-4000-8000-000000000013';
 customer uuid := '797ab230-0000-4000-8000-000000000020';
 supplier uuid := '797ab230-0000-4000-8000-000000000021';
 op_employee uuid;
 salesperson_commission uuid;
 treasury uuid := '797ab230-0000-4000-8000-000000000031';
 reviewer uuid := '797ab230-0000-4000-8000-000000000007';
 payout uuid := gen_random_uuid();
 supplemental uuid := gen_random_uuid();
 recovery uuid := gen_random_uuid();
 owner_request uuid;
 operations_task uuid := gen_random_uuid();
 timing_egypt date := (now() AT TIME ZONE 'Africa/Cairo')::date;
 dashboard jsonb;
 prior_balance numeric;
 new_balance numeric;
 booking uuid;
 hotel uuid;
 direct_car uuid;
 quote uuid;
 conversion uuid;
 service_change uuid := gen_random_uuid();
 service uuid;
 invoice uuid;
 terms jsonb;
 request uuid;
 kind text;
 details jsonb;
 form jsonb := jsonb_build_object('customer_id',customer,'supplier_id',supplier,'currency','EGP',
   'selling_price',52000,'cost_price',32000,'start_date',current_date+12,'end_date',current_date+15);
 result jsonb;
 attr jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.booking_commission_policy(org,true,true);
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 SELECT id INTO STRICT op_employee FROM public.employees WHERE organization_id=org AND email='unified-creator@example.invalid';

 FOREACH kind IN ARRAY ARRAY['hotel','flight','transport','car_rental'] LOOP
   details := CASE kind
     WHEN 'hotel' THEN '{"hotelDetails":{"hotel_name":"QA hotel","rooms":2}}'
     WHEN 'flight' THEN '{"flightDetails":{"airline":"QA airline","pnr":"QATEST","passengers_count":1}}'
     WHEN 'transport' THEN '{"transportDetails":{"vehicle_type":"van","route":"QA route"}}'
     ELSE '{"carDetails":{"car_type":"sedan","pickup_location":"QA city"}}' END;
   request:=gen_random_uuid();
   result:=public.create_booking_atomic(org,request,form||details||jsonb_build_object('booking_type',kind,
     'employee_id',CASE WHEN kind='car_rental' THEN NULL ELSE seller END));
   booking:=(result->>'id')::uuid;
   IF booking IS NULL OR (SELECT count(*) FROM public.invoices WHERE booking_id=booking)<>1 THEN
     RAISE EXCEPTION 'Missing single invoice for %',kind;
   END IF;
   attr:=public.get_booking_staff(booking);
   IF attr->>'sales_name' IS DISTINCT FROM (CASE WHEN kind='car_rental' THEN NULL ELSE 'QA sales owner' END)
     OR NOT (attr->>'can_request')::boolean OR (attr->>'can_edit')::boolean THEN
     RAISE EXCEPTION 'Incorrect staff or edit state for %',kind;
   END IF;
   IF kind='hotel' THEN hotel:=booking; END IF;
   IF kind='car_rental' THEN direct_car:=booking; END IF;
 END LOOP;

 BEGIN
   PERFORM public.save_booking_edit_notes(hotel,'Unauthorized booking note');
   RAISE EXCEPTION 'Saved notes while locked';
 EXCEPTION WHEN insufficient_privilege THEN
   IF SQLERRM<>'booking_edit_approval_required' THEN RAISE; END IF;
 END;
 BEGIN
   UPDATE public.booking_hotel_details SET hotel_name='Unauthorized hotel' WHERE booking_id=hotel;
   IF FOUND THEN RAISE EXCEPTION 'Changed hotel details while locked'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 request:=public.change_booking_edit_request(hotel,'request',NULL,'Correct trip information');
 BEGIN
   PERFORM public.change_booking_edit_request(hotel,'approve',request,NULL);
   RAISE EXCEPTION 'Operations account approved its own request';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 BEGIN
   PERFORM public.get_booking_staff(hotel);
   RAISE EXCEPTION 'Cross-tenant access to staff';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.change_booking_edit_request(hotel,'approve',request,NULL);
 PERFORM public.advance_workflow(hotel,'confirmed',NULL);
 PERFORM public.advance_workflow(direct_car,'confirmed',NULL);
 PERFORM public.approve_booking_commission_cost(hotel,32000);
 PERFORM public.approve_booking_commission_cost(hotel,32000);
 PERFORM public.approve_booking_commission_cost(direct_car,32000);
 IF (SELECT count(*) FROM public.list_booking_workflow_commissions(org) WHERE booking_id=hotel)<>2
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=hotel AND employee_id=seller) IS DISTINCT FROM 1000::numeric
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=hotel AND employee_id=op_employee) IS DISTINCT FROM 500::numeric
   OR (SELECT count(*) FROM public.employee_commissions WHERE booking_id=direct_car)<>1
   OR EXISTS(SELECT FROM public.calculate_employee_bookings_profit(seller,current_date,current_date+30,'EGP') WHERE booking_id=hotel)
 THEN RAISE EXCEPTION 'Incorrect commission or legacy duplicate'; END IF;
 BEGIN
   PERFORM public.create_booking_commission(seller,hotel,NULL);
   RAISE EXCEPTION 'Manual commission duplicated the new workflow';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 SELECT id INTO STRICT salesperson_commission FROM public.employee_commissions WHERE booking_id=hotel AND employee_id=seller;
 SELECT current_balance INTO STRICT prior_balance FROM public.bank_accounts WHERE id=treasury;
 BEGIN
   UPDATE public.employee_commissions SET payment_status='paid',payment_date=current_date WHERE id=salesperson_commission;
   RAISE EXCEPTION 'Managed status was writable outside settlement';
 EXCEPTION WHEN insufficient_privilege THEN
   IF SQLERRM<>'commission_settlement_rpc_required' THEN RAISE; END IF;
 END;
 PERFORM public.settle_booking_commission(salesperson_commission,payout,treasury,1000,1,'QA-commission-first');
 PERFORM public.settle_booking_commission(salesperson_commission,payout,treasury,1000,1,'QA-commission-first');
 SELECT current_balance INTO STRICT new_balance FROM public.bank_accounts WHERE id=treasury;
 IF prior_balance-new_balance IS DISTINCT FROM 1000::numeric
   OR (SELECT count(*) FROM public.journal_entries WHERE source_type='commission_payment' AND source_id=payout AND is_locked)<>1
   OR (SELECT count(*) FROM public.bank_account_transactions WHERE source_type='commission_payment' AND source_id=payout)<>1
 THEN RAISE EXCEPTION 'Commission did not post exactly one treasury movement and journal'; END IF;
 owner_request:=public.change_booking_edit_request(hotel,'request',NULL,'Check notes as manager');
 BEGIN
   PERFORM public.change_booking_edit_request(hotel,'approve',owner_request,NULL);
   RAISE EXCEPTION 'A manager bypassed another available reviewer';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',reviewer::text,true);
 PERFORM public.change_booking_edit_request(hotel,'approve',owner_request,NULL);
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.save_booking_edit_notes(hotel,'Notes after another manager approved');
 PERFORM public.change_booking_edit_request(hotel,'close',owner_request,NULL);
 PERFORM set_config('request.jwt.claim.sub',coworker::text,true);
 BEGIN
   PERFORM public.save_booking_edit_notes(hotel,'Coworker attempted edit');
   RAISE EXCEPTION 'Different operator used the approval';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 PERFORM public.save_booking_edit_notes(hotel,'Approved note');
 SELECT id INTO STRICT invoice FROM public.invoices WHERE booking_id=hotel;
 PERFORM public.record_customer_payment(invoice,10000,'EGP',1,'cash',NULL,current_date,NULL,NULL,
   'qa-financial-approval-10k',hotel,customer);
 BEGIN
   UPDATE public.bookings SET selling_price=50000 WHERE id=hotel;
   RAISE EXCEPTION 'Edit approval was enough to rewrite a financial amount';
 EXCEPTION WHEN insufficient_privilege THEN
   IF SQLERRM<>'booking_financial_amendment_required' THEN RAISE; END IF;
 END;
 IF (SELECT selling_price FROM public.bookings WHERE id=hotel) IS DISTINCT FROM 52000::numeric
   OR (SELECT final_amount FROM public.invoices WHERE id=invoice) IS DISTINCT FROM 52000::numeric
   OR (SELECT total_paid_amount FROM public.invoices WHERE id=invoice) IS DISTINCT FROM 10000::numeric
 THEN RAISE EXCEPTION 'Blocked write left a booking or invoice out of balance'; END IF;
 IF (SELECT notes FROM public.bookings WHERE id=hotel) IS DISTINCT FROM 'Approved note' THEN
   RAISE EXCEPTION 'Approved employee could not edit';
 END IF;
 SELECT id INTO STRICT service FROM public.booking_hotel_details WHERE booking_id=hotel;
 SELECT id INTO STRICT invoice FROM public.invoices WHERE booking_id=hotel;
 terms:=jsonb_build_object('operation','change','rule','repriced','start_date',current_date+13,'end_date',current_date+16,
   'policy','Customer approved change and additional price','customer_currency','EGP','customer_invoice_id',invoice,
   'cancel_value',0,'customer_fee',0,'fare_delta',2000,'supplier_currency','EGP',
   'supplier_fee',0,'supplier_fare_delta',0,'supplier_wallet',0);
 PERFORM public.create_trip_service_amendment(service_change,hotel,'hotel','detail',service,NULL,terms);
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.resolve_trip_service_amendment(service_change,true,'Customer QA approval','Supplier QA approval',NULL,NULL);
 IF (SELECT commission_amount FROM public.employee_commissions WHERE id=salesperson_commission) IS DISTINCT FROM 1000::numeric
   OR (SELECT signed_balance FROM public.get_booking_commission_statement(org) WHERE id=salesperson_commission) IS DISTINCT FROM 100::numeric
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=hotel AND employee_id=op_employee AND workflow_managed)
      IS DISTINCT FROM 550::numeric THEN RAISE EXCEPTION 'Paid adjustment or pending rate is wrong'; END IF;
 PERFORM public.settle_booking_commission(salesperson_commission,supplemental,treasury,100,1,'QA-commission-difference');
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 service_change:=gen_random_uuid();
 terms:=terms||jsonb_build_object('fare_delta',-2000,'start_date',current_date+14,'end_date',current_date+17);
 PERFORM public.create_trip_service_amendment(service_change,hotel,'hotel','detail',service,NULL,terms);
 -- Model a second HTTP transaction without committing the disposable fixture.
 EXECUTE 'RESET ROLE';
 UPDATE public.trip_service_amendments SET requested_at=clock_timestamp() WHERE id=service_change;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.resolve_trip_service_amendment(service_change,true,'Customer adjustment QA','Supplier adjustment QA',NULL,2000);
 IF (SELECT signed_balance FROM public.get_booking_commission_statement(org) WHERE id=salesperson_commission) IS DISTINCT FROM -100::numeric
 THEN RAISE EXCEPTION 'Paid adjustment should now be recoverable'; END IF;
 PERFORM public.settle_booking_commission(salesperson_commission,recovery,treasury,-100,1,'QA-commission-recovered');
 IF (SELECT signed_balance FROM public.get_booking_commission_statement(org) WHERE id=salesperson_commission) IS DISTINCT FROM 0::numeric
   OR (SELECT current_balance FROM public.bank_accounts WHERE id=treasury) IS DISTINCT FROM (prior_balance-1000)
   OR NOT EXISTS(SELECT FROM public.bank_account_transactions WHERE source_id=recovery AND transaction_type='deposit')
 THEN RAISE EXCEPTION 'Recovery did not settle the difference correctly'; END IF;
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 PERFORM public.change_booking_edit_request(hotel,'close',request,NULL);
 BEGIN
   PERFORM public.save_booking_edit_notes(hotel,'Reopened incorrectly');
   RAISE EXCEPTION 'Closed request still allowed editing';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 INSERT INTO public.booking_tasks(id,organization_id,booking_id,title,status,due_at,assignee_id,created_by)
 VALUES (operations_task,org,hotel,'QA operations task','open',
   (timing_egypt::timestamp + interval '15 minutes') AT TIME ZONE 'Africa/Cairo',creator,creator);
 owner_request:=public.change_booking_edit_request(direct_car,'request',NULL,'Operations queue visibility test');
 dashboard:=public.get_ops_command_center_for_org(org,NULL);
 IF (dashboard->>'edit_requests')::integer<1
   OR NOT EXISTS(SELECT FROM public.list_operations_queue(org,'edit_requests',20,0) req WHERE req.id=owner_request AND req.kind='edit_request')
 THEN RAISE EXCEPTION 'Pending approval did not reach operations'; END IF;
 IF (dashboard->>'date')::date IS DISTINCT FROM timing_egypt OR (dashboard->>'today_tasks')::int<1
   OR NOT EXISTS(SELECT FROM public.list_operations_queue(org,'today',20,0) WHERE id=operations_task AND can_act)
 THEN RAISE EXCEPTION 'Egypt day task disagrees between dashboard and queue'; END IF;
 PERFORM public.update_operations_task(org,operations_task,'waiting','supplier');
 IF NOT EXISTS(SELECT FROM public.list_operations_queue(org,'waiting_supplier',20,0) WHERE id=operations_task)
 THEN RAISE EXCEPTION 'Structured supplier waiting was ignored'; END IF;
 PERFORM set_config('request.jwt.claim.sub',coworker::text,true);
 IF (public.get_ops_command_center_for_org(org,NULL)->'finance') IS DISTINCT FROM 'null'::jsonb
 THEN RAISE EXCEPTION 'Booking viewer was given organization finance data'; END IF;
 BEGIN
   PERFORM public.update_operations_task(org,operations_task,'complete',NULL);
   RAISE EXCEPTION 'Task updated by unrelated coworker';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 BEGIN
   PERFORM public.get_ops_command_center_for_org(org,NULL);
   RAISE EXCEPTION 'Operations dashboard leaked between organizations';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 PERFORM public.update_operations_task(org,operations_task,'complete',NULL);
 PERFORM public.update_operations_task(org,operations_task,'complete',NULL);
 IF NOT EXISTS(SELECT FROM public.list_operations_queue(org,'completed_today',20,0) WHERE id=operations_task)
   OR EXISTS(SELECT FROM public.list_operations_queue(org,'today',20,0) WHERE id=operations_task)
 THEN RAISE EXCEPTION 'Completed task did not move to the correct queue'; END IF;

 result:=public.create_quote_atomic(org,gen_random_uuid(),jsonb_build_object('customer_id',customer,
   'travel_date',current_date+12,'return_date',current_date+15,'status','draft','discount_amount',0,'vat_rate',0,
   'items',jsonb_build_array(jsonb_build_object('item_type','hotel','description','Unified QA quote hotel',
     'supplier_id',supplier,'quantity',1,'cost_price',32000,'selling_price',52000))));
 quote:=(result->>'id')::uuid;
 BEGIN
   PERFORM public.convert_quote_atomic(org,quote,foreign_seller);
   RAISE EXCEPTION 'A foreign salesperson was accepted on quote conversion';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 result:=public.convert_quote_atomic(org,quote,seller);
 conversion:=(result->>'booking_id')::uuid;
 IF (public.get_booking_staff(conversion)->>'sales_name') IS DISTINCT FROM 'QA sales owner'
   OR (SELECT count(*) FROM public.invoices WHERE booking_id=conversion)<>1
   OR (public.convert_quote_atomic(org,quote,seller)->>'booking_id')::uuid IS DISTINCT FROM conversion THEN
   RAISE EXCEPTION 'Quote conversion lost attribution or duplicated finance';
 END IF;
END;
$test$;
SELECT 'financial edit blocked, separate manager review, atomic payout and recovery, isolated operations queue and Egypt day verified' AS result;
ROLLBACK;
