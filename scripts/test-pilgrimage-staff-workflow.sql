-- Run with the complete migration chain. Everything in this test rolls back.
BEGIN;
INSERT INTO public.organizations(id,name,slug) VALUES
 ('797ab220-0000-4000-8000-000000000001','Staff verification','pilgrimage-staff-797ab220'),
 ('797ab220-0000-4000-8000-000000000002','Isolated verification','pilgrimage-staff-797ab221');
INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES
 ('797ab220-0000-4000-8000-000000000003','inventory-creator@example.invalid','{}',now()),
 ('797ab220-0000-4000-8000-000000000004','inventory-manager@example.invalid','{}',now()),
 ('797ab220-0000-4000-8000-000000000005','inventory-outsider@example.invalid','{}',now()),
 ('797ab220-0000-4000-8000-000000000006','inventory-coworker@example.invalid','{}',now());
INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES
 ('797ab220-0000-4000-8000-000000000001','797ab220-0000-4000-8000-000000000004','owner',true),
 ('797ab220-0000-4000-8000-000000000001','797ab220-0000-4000-8000-000000000003','agent',true),
 ('797ab220-0000-4000-8000-000000000002','797ab220-0000-4000-8000-000000000005','owner',true),
 ('797ab220-0000-4000-8000-000000000001','797ab220-0000-4000-8000-000000000006','agent',true);
INSERT INTO public.sop_department_members(organization_id,user_id,department) VALUES
 ('797ab220-0000-4000-8000-000000000001','797ab220-0000-4000-8000-000000000003','reservations'),
 ('797ab220-0000-4000-8000-000000000001','797ab220-0000-4000-8000-000000000003','finance');
INSERT INTO public.employees (id,organization_id,employee_code,full_name,email,is_active,commission_rate) VALUES
 ('797ab220-0000-4000-8000-000000000012','797ab220-0000-4000-8000-000000000001','QASALE220','QA sales','inventory-sales@example.invalid',true,5),
 ('797ab220-0000-4000-8000-000000000013','797ab220-0000-4000-8000-000000000002','QAOUT220','QA outsider','inventory-outsider@example.invalid',true,9);
UPDATE public.employees SET commission_rate=2.5
 WHERE organization_id='797ab220-0000-4000-8000-000000000001' AND email='inventory-creator@example.invalid';
INSERT INTO public.customers(id,organization_id,name,phone) VALUES
 ('797ab220-0000-4000-8000-000000000020','797ab220-0000-4000-8000-000000000001','Staff synthetic family','01000000025');
INSERT INTO public.pilgrimage_programs(
 id,organization_id,program_type,name,capacity,departure_date,return_date,makkah_hotel,madinah_hotel,
 makkah_nights,madinah_nights,price_quad,price_double,price_triple,status,sales_confirmed_at
) VALUES (
 '797ab220-0000-4000-8000-000000000021','797ab220-0000-4000-8000-000000000001',
 coalesce(nullif(current_setting('test.pilgrimage_booking_type',true),''),'hajj'),'Staff verification',
 20,current_date+30,current_date+37,'Test Mecca','Test Madinah',4,3,26000,30000,28000,'open',now()
);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 org uuid := '797ab220-0000-4000-8000-000000000001';
 creator uuid := '797ab220-0000-4000-8000-000000000003';
 manager uuid := '797ab220-0000-4000-8000-000000000004';
 outsider uuid := '797ab220-0000-4000-8000-000000000005';
 coworker uuid := '797ab220-0000-4000-8000-000000000006';
 operations_employee uuid;
 seller uuid := '797ab220-0000-4000-8000-000000000012';
 foreign_employee uuid := '797ab220-0000-4000-8000-000000000013';
 buyer uuid := '797ab220-0000-4000-8000-000000000020';
 program uuid := '797ab220-0000-4000-8000-000000000021';
 family uuid := '797ab220-0000-4000-8000-000000000022';
 corporate uuid := '797ab220-0000-4000-8000-000000000023';
 sales_only uuid := '797ab220-0000-4000-8000-000000000024';
 people jsonb := '[{"full_name":"QA traveler Sam","gender":"male"},{"full_name":"QA traveler Andre","gender":"male"}]';
 individual jsonb := '[{"full_name":"QA traveler Clare","gender":"female"}]';
 edit_request uuid;
 first_traveler uuid;
 second_traveler uuid;
 staff jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.configure_umrah_room_inventory(org,program,'makkah','quad',6,NULL);
 PERFORM public.configure_umrah_room_inventory(org,program,'madinah','quad',6,NULL);
 PERFORM public.pilgrimage_commission_policy(org,true,true);
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 SELECT id INTO STRICT operations_employee FROM public.employees
   WHERE organization_id=org AND email='inventory-creator@example.invalid';
 IF NOT EXISTS(SELECT 1 FROM public.list_pilgrimage_sales_staff(org) WHERE id=seller)
   OR EXISTS(SELECT 1 FROM public.list_pilgrimage_sales_staff(org) WHERE id=foreign_employee)
 THEN RAISE EXCEPTION 'Local employee list missed its employee or exposed another company'; END IF;
 BEGIN
   PERFORM public.create_pilgrimage_inventory_booking(org,program,family,buyer,'quad','shared',people,52000,foreign_employee);
   RAISE EXCEPTION 'Cross-tenant salesperson accepted';
 EXCEPTION WHEN invalid_parameter_value THEN
   IF SQLERRM <> 'pilgrimage_invalid_sales_employee' THEN RAISE; END IF;
 END;
 PERFORM public.create_pilgrimage_inventory_booking(org,program,family,buyer,'quad','shared',people,52000,seller);
 PERFORM public.create_pilgrimage_inventory_booking(org,program,family,buyer,'quad','shared',people,52000,seller);
 IF (SELECT count(*) FROM public.invoices WHERE booking_id=family)<>1 THEN RAISE EXCEPTION 'Retry duplicated invoice'; END IF;
 BEGIN
   PERFORM public.create_pilgrimage_inventory_booking(org,program,family,buyer,'quad','shared',people,52000,NULL);
   RAISE EXCEPTION 'Retry changed sale attribution';
 EXCEPTION WHEN invalid_parameter_value THEN
   IF SQLERRM <> 'pilgrimage_booking_staff_mismatch' THEN RAISE; END IF;
 END;
 PERFORM public.create_umrah_inventory_booking(org,program,corporate,buyer,'quad','shared',individual,26000);
 staff:=public.get_pilgrimage_booking_staff(family);
 IF staff->>'sales_name'<>'QA sales' OR NOT (staff->>'can_request')::boolean OR (staff->>'can_edit')::boolean
   OR (public.get_pilgrimage_booking_staff(corporate)->>'sales_name') IS NOT NULL
 THEN RAISE EXCEPTION 'Wrong sale or operations attribution'; END IF;
 SELECT id INTO first_traveler FROM public.pilgrims WHERE inventory_booking_id=family AND inventory_passenger_no=1;
 SELECT id INTO second_traveler FROM public.pilgrims WHERE inventory_booking_id=family AND inventory_passenger_no=2;
 BEGIN
   UPDATE public.pilgrims SET full_name='Unauthorized edit' WHERE id=first_traveler;
   RAISE EXCEPTION 'Operations edited a locked booking';
 EXCEPTION WHEN insufficient_privilege THEN
   IF SQLERRM <> 'pilgrimage_booking_edit_locked' THEN RAISE; END IF;
 END;
 BEGIN
   UPDATE public.employees SET commission_rate=80 WHERE id=operations_employee;
   RAISE EXCEPTION 'Staff changed their own commission rate';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 edit_request:=public.change_pilgrimage_edit_request(family,'request',NULL,'Correct passenger passport spelling');
 BEGIN
   PERFORM public.change_pilgrimage_edit_request(family,'approve',edit_request,NULL);
   RAISE EXCEPTION 'Agent approved a request';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   PERFORM public.approve_pilgrimage_booking_cost(family,32000);
   RAISE EXCEPTION 'Agent approved a cost';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 BEGIN
   PERFORM public.get_pilgrimage_booking_staff(family);
   RAISE EXCEPTION 'Outside-company user read staffing';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.change_pilgrimage_edit_request(family,'approve',edit_request,NULL);
 PERFORM public.approve_pilgrimage_booking_cost(family,32000);
 PERFORM public.approve_pilgrimage_booking_cost(family,32000);
 IF (SELECT count(*) FROM public.employee_commissions WHERE booking_id=family AND payment_status='pending')<>2
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=family AND employee_id=seller)<>1000
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=family AND employee_id=operations_employee)<>500
 THEN RAISE EXCEPTION 'Expected 5%% and 2.5%% of 20000 with no duplicate accrual'; END IF;
 IF EXISTS(SELECT FROM public.validate_employee_commissions(seller))
   OR (SELECT cost_price FROM public.bookings WHERE id=family)<>0
   OR (SELECT count(*) FROM public.list_pilgrimage_booking_commissions(org) WHERE booking_id=family)<>2
 THEN RAISE EXCEPTION 'Commission cost contaminated supplier costs or failed financial validation'; END IF;
 PERFORM public.approve_pilgrimage_booking_cost(corporate,20000);
 IF (SELECT count(*) FROM public.employee_commissions WHERE booking_id=corporate)<>1
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=corporate AND employee_id=operations_employee)<>150
 THEN RAISE EXCEPTION 'Company-direct sale did not preserve operations-only eligibility'; END IF;
 PERFORM public.pilgrimage_commission_policy(org,true,false);
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 PERFORM public.create_pilgrimage_inventory_booking(org,program,sales_only,buyer,'quad','shared',people,52000,seller);
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.approve_pilgrimage_booking_cost(sales_only,42000);
 IF (SELECT count(*) FROM public.employee_commissions WHERE booking_id=sales_only)<>1
   OR (SELECT commission_amount FROM public.employee_commissions WHERE booking_id=sales_only AND employee_id=seller)<>500
 THEN RAISE EXCEPTION 'Sales-only policy created an incorrect accrual'; END IF;
 PERFORM set_config('request.jwt.claim.sub',coworker::text,true);
 BEGIN
   UPDATE public.pilgrims SET full_name='Unauthorized coworker' WHERE id=first_traveler;
   RAISE EXCEPTION 'Another coworker used the approval';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   IF EXISTS (SELECT 1 FROM public.list_pilgrimage_booking_commissions(org)) THEN
     RAISE EXCEPTION 'Coworker could read managed commissions';
   END IF;
   UPDATE public.employee_commissions SET commission_amount=5000 WHERE booking_id=family;
   IF FOUND THEN RAISE EXCEPTION 'Coworker edited accrual directly'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',creator::text,true);
 UPDATE public.pilgrims SET full_name='Approved edit' WHERE id=first_traveler;
 IF (SELECT full_name FROM public.pilgrims WHERE id=first_traveler)<>'Approved edit'
 THEN RAISE EXCEPTION 'An approved creator could not edit'; END IF;
 PERFORM public.change_pilgrimage_edit_request(family,'close',edit_request,NULL);
 BEGIN
   UPDATE public.pilgrims SET full_name='Unapproved again' WHERE id=first_traveler;
   RAISE EXCEPTION 'Closed approval remained writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 PERFORM public.apply_pilgrimage_operations(org,program,jsonb_build_array(jsonb_build_object(
   'id',gen_random_uuid(),'pilgrim_id',second_traveler,'action','cancel','reason','Test cancelled traveler','fee',0,
   'expected_room_type','quad','expected_price',26000,'expected_net_paid',0)));
 IF (SELECT count(*) FROM public.employee_commissions WHERE booking_id=family AND payment_status='cancelled')<>2
   OR (SELECT selling_price FROM public.bookings WHERE id=family)<>26000
 THEN RAISE EXCEPTION 'Cancellation did not reprice unearned commissions'; END IF;
END;
$test$;
SELECT 'staff attribution, company-direct sale, role policy, 5%/2.5% accrual, tenant boundaries, and edit lock verified' AS result;
ROLLBACK;
