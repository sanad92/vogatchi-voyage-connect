-- Run against a disposable copy of the production migration chain; all fixtures roll back.
-- Set test.pilgrimage_booking_type to hajj to exercise the same workflow for Hajj.
BEGIN;
INSERT INTO public.organizations(id,name,slug) VALUES
 ('791ba310-0a00-4000-8000-000000000001','Inventory verification','inventory-qa-791ba310'),
 ('791ba310-0a00-4000-8000-000000000002','Inventory verification isolated','inventory-qa-791ba311');
INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES
 ('791ba310-0a00-4000-8000-000000000003','inventory-qa@example.invalid','{}',now()),
 ('791ba310-0a00-4000-8000-000000000004','inventory-qa-other@example.invalid','{}',now());
INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES
 ('791ba310-0a00-4000-8000-000000000001','791ba310-0a00-4000-8000-000000000003','owner',true),
 ('791ba310-0a00-4000-8000-000000000002','791ba310-0a00-4000-8000-000000000004','owner',true);
INSERT INTO public.customers(id,organization_id,name,phone) VALUES
 ('791ba310-0a00-4000-8000-000000000005','791ba310-0a00-4000-8000-000000000001','Synthetic family','01000000031'),
 ('791ba310-0a00-4000-8000-000000000009','791ba310-0a00-4000-8000-000000000002','Synthetic other customer','01000000032');
INSERT INTO public.pilgrimage_programs(
 id,organization_id,program_type,name,capacity,departure_date,return_date,makkah_hotel,madinah_hotel,
 makkah_nights,madinah_nights,price_quad,price_double,price_triple,status,sales_confirmed_at
) VALUES (
 '791ba310-0a00-4000-8000-000000000006','791ba310-0a00-4000-8000-000000000001',
 coalesce(nullif(current_setting('test.pilgrimage_booking_type', true), ''), 'umrah'),'Inventory verification',
 45,current_date+30,current_date+37,'Test Mecca','Test Madinah',4,3,26000,30000,28000,'open',now()
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','791ba310-0a00-4000-8000-000000000003',true);

DO $test$
DECLARE
  org uuid := '791ba310-0a00-4000-8000-000000000001';
  program_id uuid := '791ba310-0a00-4000-8000-000000000006';
  customer_id uuid := '791ba310-0a00-4000-8000-000000000005';
  solo_id uuid := '791ba310-0a00-4000-8000-000000000007';
  family_id uuid := '791ba310-0a00-4000-8000-000000000008';
  wrong_customer uuid := '791ba310-0a00-4000-8000-000000000009';
  pilgrimage_type text := coalesce(nullif(current_setting('test.pilgrimage_booking_type', true), ''), 'umrah');
  booking_prefix text := CASE pilgrimage_type WHEN 'hajj' THEN 'HAJ-%' ELSE 'UMR-%' END;
  receipt_reference text := 'synthetic-' || pilgrimage_type || '-40000';
  p record;
  invoice_id uuid;
  receipt_id uuid;
  operation_id uuid;
  result jsonb;
  single_passenger jsonb := '[{"full_name":"Synthetic Single","gender":"male"}]';
  family jsonb := '[{"full_name":"Synthetic Parent","gender":"male"},{"full_name":"Synthetic Relative","gender":"female"}]';
BEGIN
  PERFORM public.configure_umrah_room_inventory(org,program_id,'makkah','quad',2,'{"method":"supplement","per_empty_bed":3000}');
  PERFORM public.configure_umrah_room_inventory(org,program_id,'madinah','quad',2,NULL);
  PERFORM public.configure_umrah_room_inventory(org,program_id,'makkah','double',1,'{"method":"fixed","per_person":{"1":34500,"2":30000}}');
  PERFORM public.configure_umrah_room_inventory(org,program_id,'madinah','double',1,NULL);
  PERFORM public.create_umrah_inventory_booking(org,program_id,solo_id,customer_id,'quad','shared',single_passenger,26000);
  PERFORM public.create_umrah_inventory_booking(org,program_id,family_id,customer_id,'quad','private',family,58000);
  PERFORM public.create_umrah_inventory_booking(org,program_id,family_id,customer_id,'quad','private',family,58000);
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id=family_id AND booking_type=pilgrimage_type
      AND selling_price=58000 AND status='confirmed' AND booking_number LIKE booking_prefix)
    OR NOT EXISTS (SELECT 1 FROM public.umrah_inventory_bookings WHERE id=family_id AND booking_id=family_id) THEN
    RAISE EXCEPTION 'Family missing one unified reference';
  END IF;
  SELECT i.id INTO STRICT invoice_id FROM public.invoices i WHERE booking_id=family_id AND i.booking_type=pilgrimage_type;
  PERFORM public.set_umrah_hotel_room_number(org,program_id,
    (SELECT makkah_rooming_group_id FROM public.pilgrims WHERE inventory_booking_id=family_id AND inventory_passenger_no=1),'501');
  IF NOT EXISTS (SELECT 1 FROM public.umrah_rooming_groups
    WHERE id=(SELECT makkah_rooming_group_id FROM public.pilgrims WHERE inventory_booking_id=family_id AND inventory_passenger_no=1)
      AND hotel_room_number='501') THEN
    RAISE EXCEPTION 'Physical room number did not save on the shared group';
  END IF;
  BEGIN
    INSERT INTO public.customer_payments (organization_id, booking_id, customer_id, invoice_id, amount,
      currency, exchange_rate, amount_base, payment_method, payment_date, status)
      VALUES (org, family_id, customer_id, invoice_id, 1, 'EGP', 1, 1, 'cash', current_date, 'completed');
    RAISE EXCEPTION 'A direct payment bypassed the canonical receipt path';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'umrah_payment_on_unified_invoice' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.settle_booking_cancellation_workflow(family_id,'Invalid main screen cancellation','{}','{}','{}');
    RAISE EXCEPTION 'Generic cancellation bypassed passenger inventory settlement';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'umrah_use_departure_operations' THEN RAISE; END IF;
  END;
  receipt_id := public.record_customer_payment(invoice_id,40000,'EGP',1,'cash',NULL,current_date,NULL,NULL,receipt_reference,family_id,customer_id);
  IF public.record_customer_payment(invoice_id,40000,'EGP',1,'cash',NULL,current_date,NULL,NULL,receipt_reference,family_id,customer_id) <> receipt_id
    OR (SELECT count(*) FROM public.customer_payments WHERE booking_id=family_id) <> 1
    OR (SELECT count(*) FROM public.journal_entries WHERE source_type='customer_payment' AND source_id=receipt_id) <> 1
    OR (SELECT remaining_amount FROM public.invoices i WHERE i.id=invoice_id) <> 18000 THEN
    RAISE EXCEPTION 'Payment not allocated exactly once';
  END IF;

  IF (SELECT count(*) FROM public.pilgrims WHERE inventory_booking_id IN (solo_id, family_id)) <> 3
    OR (SELECT sum(total_price) FROM public.pilgrims WHERE inventory_booking_id=family_id) <> 58000
    OR (SELECT count(DISTINCT makkah_rooming_group_id) FROM public.pilgrims WHERE inventory_booking_id=family_id) <> 1
    OR (SELECT count(DISTINCT madinah_rooming_group_id) FROM public.pilgrims WHERE inventory_booking_id=family_id) <> 1
    OR (SELECT count(*) FROM public.get_umrah_room_inventory(org,program_id) WHERE room_type='quad' AND empty_rooms=0 AND male_beds=3 AND female_beds=0) <> 2
  THEN RAISE EXCEPTION 'Shared/private stock, exact pricing or retry was incorrect'; END IF;

  BEGIN
    PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'quad','shared','[{"full_name":"Synthetic New","gender":"female"}]',26000);
    RAISE EXCEPTION 'Shared sales overbooked a private or male room';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'umrah_inventory_rooms_exhausted' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),wrong_customer,'double','private',single_passenger,34500);
    RAISE EXCEPTION 'Accepted a customer from another company';
  EXCEPTION WHEN foreign_key_violation THEN
    IF SQLERRM <> 'umrah_inventory_invalid_customer' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.pilgrims(organization_id,program_id,full_name,gender,room_type)
      VALUES(org,program_id,'Must not bypass stock','male','quad');
    RAISE EXCEPTION 'Legacy direct booking bypassed inventory';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'umrah_inventory_booking_required' THEN RAISE; END IF;
  END;

  FOR p IN SELECT id, inventory_passenger_no FROM public.pilgrims WHERE inventory_booking_id=family_id ORDER BY inventory_passenger_no LOOP
    operation_id := gen_random_uuid();
    result := public.apply_pilgrimage_operations(org, program_id, jsonb_build_array(jsonb_build_object(
      'id',operation_id,'pilgrim_id',p.id,'action','cancel','reason','Verification cancellation',
      'fee',0,'expected_room_type','quad','expected_price',29000,'expected_net_paid',0
    )));
    IF (SELECT remaining_amount FROM public.invoices i WHERE i.id=invoice_id) <> 0
      OR (SELECT selling_price FROM public.bookings WHERE id=family_id) <> (CASE p.inventory_passenger_no WHEN 1 THEN 29000 ELSE 0 END)
      OR NOT EXISTS (SELECT 1 FROM public.refund_requests r WHERE r.id=(result->0->>'refund_id')::uuid
        AND r.booking_id=family_id AND r.amount=(CASE p.inventory_passenger_no WHEN 1 THEN 11000 ELSE 29000 END)
        AND r.status='approved')
      THEN RAISE EXCEPTION 'Partial/full credit, wallet or booking balance incorrect'; END IF;
    IF (SELECT count(*) FROM public.get_umrah_room_inventory(org,program_id)
      WHERE room_type='quad' AND empty_rooms=(p.inventory_passenger_no - 1) AND male_beds=3 AND female_beds=0) <> 2
    THEN RAISE EXCEPTION 'A private room must only return when the final passenger cancels'; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id=family_id AND status='cancelled' AND selling_price=0)
    THEN RAISE EXCEPTION 'Last traveler did not settle the unified booking'; END IF;
  PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'double','private',single_passenger,34500);

  PERFORM public.configure_umrah_room_inventory(org,program_id,'makkah','triple',1,NULL);
  BEGIN
    PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'triple','shared',single_passenger,28000);
    RAISE EXCEPTION 'Booking committed without Madinah room stock';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'umrah_inventory_rooms_exhausted' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.get_umrah_room_inventory(org,program_id)
    WHERE room_type='triple' AND city='makkah' AND empty_rooms=1)
  THEN RAISE EXCEPTION 'Partial reservation left Mecca inventory changed'; END IF;

  PERFORM public.configure_umrah_room_inventory(org,program_id,'makkah','quad',11,NULL);
  PERFORM public.configure_umrah_room_inventory(org,program_id,'madinah','quad',11,NULL);
  PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'quad','shared',
    (SELECT jsonb_agg(jsonb_build_object('full_name','Synthetic Passenger ' || i,'gender','male')) FROM generate_series(1,43) i),1118000);
  IF (SELECT count(*) FROM public.pilgrims g WHERE g.program_id='791ba310-0a00-4000-8000-000000000006' AND g.status<>'cancelled') <> 45 THEN
    RAISE EXCEPTION 'Last air seat was not booked';
  END IF;
  BEGIN
    PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'quad','shared',single_passenger,26000);
    RAISE EXCEPTION 'Booked more than 45 air seats';
  EXCEPTION WHEN invalid_parameter_value THEN
    IF SQLERRM <> 'umrah_inventory_air_seats_exhausted' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub','791ba310-0a00-4000-8000-000000000004',true);
  IF EXISTS(SELECT 1 FROM public.bookings WHERE id=family_id)
    OR EXISTS(SELECT 1 FROM public.umrah_inventory_bookings WHERE organization_id=org)
    OR EXISTS(SELECT 1 FROM public.get_umrah_room_inventory(org,program_id))
  THEN RAISE EXCEPTION 'Another company could read the bookings or stock'; END IF;
  BEGIN
    PERFORM public.create_umrah_inventory_booking(org,program_id,gen_random_uuid(),customer_id,'quad','shared',single_passenger,26000);
    RAISE EXCEPTION 'Another company booked inventory';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'umrah_inventory_denied' THEN RAISE; END IF;
  END;
END;
$test$;
SELECT coalesce(nullif(current_setting('test.pilgrimage_booking_type', true), ''), 'umrah')
  || ': canonical booking, invoice, payment journal, partial AR credit and wallet, full cancellation and inventory passed' AS result;
ROLLBACK;
