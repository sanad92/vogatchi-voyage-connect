DO $do$
DECLARE src text; new_src text;
BEGIN
  src := pg_get_functiondef('public.create_booking_atomic(uuid,uuid,jsonb)'::regprocedure);
  new_src := replace(src, '  columns_sql text; values_sql text; sync_result jsonb;',
'  sync_result jsonb;
  hrow public.booking_hotel_details%ROWTYPE; frow public.booking_flight_details%ROWTYPE;
  crow public.booking_car_details%ROWTYPE; trow public.booking_transport_details%ROWTYPE;');
  new_src := replace(new_src, $q$  SELECT string_agg(format('%I',key),',' ORDER BY key),string_agg(format('r.%I',key),',' ORDER BY key)
    INTO columns_sql,values_sql FROM jsonb_object_keys(d) e(key);
  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r RETURNING id',
    detail_table,columns_sql,values_sql,detail_table) INTO detail_id USING d;$q$,
$q$  CASE detail_table
    WHEN 'booking_hotel_details' THEN
      INSERT INTO public.booking_hotel_details(booking_id,selling_amount,cost_amount) VALUES(b.id,sell,cost) RETURNING * INTO hrow;
      hrow:=jsonb_populate_record(hrow,d);
      UPDATE public.booking_hotel_details SET (hotel_name,room_type,board_type,check_in,check_out,nights,rooms,star_rating,city,adults,children,children_ages,meal_plan,cancellation_policy,booking_reference)=ROW(hrow.hotel_name,hrow.room_type,hrow.board_type,hrow.check_in,hrow.check_out,hrow.nights,hrow.rooms,hrow.star_rating,hrow.city,hrow.adults,hrow.children,hrow.children_ages,hrow.meal_plan,hrow.cancellation_policy,hrow.booking_reference) WHERE id=hrow.id;
      detail_id:=hrow.id;
    WHEN 'booking_flight_details' THEN
      INSERT INTO public.booking_flight_details(booking_id,selling_amount,cost_amount) VALUES(b.id,sell,cost) RETURNING * INTO frow;
      frow:=jsonb_populate_record(frow,d);
      UPDATE public.booking_flight_details SET (airline,flight_number,departure_airport,arrival_airport,departure_date,departure_time,arrival_date,arrival_time,ticket_number,pnr,passengers_count,flight_class,ticket_price_per_person,taxes_and_fees,is_round_trip,seat_preferences,meal_preferences)=ROW(frow.airline,frow.flight_number,frow.departure_airport,frow.arrival_airport,frow.departure_date,frow.departure_time,frow.arrival_date,frow.arrival_time,frow.ticket_number,frow.pnr,frow.passengers_count,frow.flight_class,frow.ticket_price_per_person,frow.taxes_and_fees,frow.is_round_trip,frow.seat_preferences,frow.meal_preferences) WHERE id=frow.id;
      detail_id:=frow.id;
    WHEN 'booking_car_details' THEN
      INSERT INTO public.booking_car_details(booking_id,selling_amount,cost_amount) VALUES(b.id,sell,cost) RETURNING * INTO crow;
      crow:=jsonb_populate_record(crow,d);
      UPDATE public.booking_car_details SET (car_type,pickup_location,dropoff_location,pickup_date,dropoff_date,daily_rate,insurance_included)=ROW(crow.car_type,crow.pickup_location,crow.dropoff_location,crow.pickup_date,crow.dropoff_date,crow.daily_rate,crow.insurance_included) WHERE id=crow.id;
      detail_id:=crow.id;
    WHEN 'booking_transport_details' THEN
      INSERT INTO public.booking_transport_details(booking_id,selling_amount,cost_amount) VALUES(b.id,sell,cost) RETURNING * INTO trow;
      trow:=jsonb_populate_record(trow,d);
      UPDATE public.booking_transport_details SET (vehicle_type,route,pickup_point,dropoff_point,passengers)=ROW(trow.vehicle_type,trow.route,trow.pickup_point,trow.dropoff_point,trow.passengers) WHERE id=trow.id;
      detail_id:=trow.id;
  END CASE;$q$);
  IF new_src = src OR position('EXECUTE format' in new_src) > 0 OR position('columns_sql' in new_src) > 0 THEN
    RAISE EXCEPTION 'create_booking_atomic body did not match expected text';
  END IF;
  EXECUTE new_src;
END $do$;
REVOKE EXECUTE ON FUNCTION public.create_booking_atomic(uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,uuid,jsonb) TO authenticated;