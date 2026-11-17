-- Run against a disposable copy of the production migration chain; all fixtures roll back.
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
 '791ba310-0a00-4000-8000-000000000006','791ba310-0a00-4000-8000-000000000001','umrah','Inventory verification',
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
  p record;
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
    PERFORM public.apply_pilgrimage_operations(org, program_id, jsonb_build_array(jsonb_build_object(
      'id',gen_random_uuid(),'pilgrim_id',p.id,'action','cancel','reason','Verification cancellation',
      'fee',0,'expected_room_type','quad','expected_price',29000,'expected_net_paid',0
    )));
    IF (SELECT count(*) FROM public.get_umrah_room_inventory(org,program_id)
      WHERE room_type='quad' AND empty_rooms=(p.inventory_passenger_no - 1) AND male_beds=3 AND female_beds=0) <> 2
    THEN RAISE EXCEPTION 'A private room must only return when the final passenger cancels'; END IF;
  END LOOP;
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
  IF EXISTS(SELECT 1 FROM public.umrah_inventory_bookings WHERE organization_id=org)
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
SELECT 'shared bed, private room, both prices, retry, hotel rollback, last air seat, individual cancellations and tenant isolation passed' AS result;
ROLLBACK;
