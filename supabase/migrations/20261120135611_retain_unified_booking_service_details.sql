BEGIN;

ALTER TABLE public.booking_hotel_details
  ADD COLUMN cost_per_night numeric CHECK (cost_per_night >= 0 AND cost_per_night < 'Infinity'::numeric),
  ADD COLUMN selling_per_night numeric CHECK (selling_per_night >= 0 AND selling_per_night < 'Infinity'::numeric);

ALTER TABLE public.booking_transport_details
  ADD COLUMN pickup_time time without time zone;

ALTER TABLE public.booking_flight_details
  ADD COLUMN return_flight_number text,
  ADD COLUMN return_departure_airport text,
  ADD COLUMN return_arrival_airport text,
  ADD COLUMN return_departure_date date,
  ADD COLUMN return_departure_time time without time zone,
  ADD COLUMN return_arrival_date date,
  ADD COLUMN return_arrival_time time without time zone;

DO $migration$
DECLARE
  source text := pg_get_functiondef('public.create_booking_atomic(uuid,uuid,jsonb)'::regprocedure);
  uses_static_details boolean := strpos(source, 'UPDATE public.booking_hotel_details SET') > 0;
  original text;
  updated text;
BEGIN
  IF NOT uses_static_details AND strpos(source, 'jsonb_populate_record(NULL::public.%I') = 0 THEN
    RAISE EXCEPTION 'Unrecognized create_booking_atomic detail persistence';
  END IF;

  FOR original, updated IN
    SELECT pairs.old_text, pairs.new_text
    FROM (VALUES
      (
        'detail_start date; detail_end date; start_key text;',
        'detail_start date; detail_end date; effective_detail_end date; return_departure_on date; return_arrival_on date; start_key text;'
      ),
      (
        $patch$'meal_plan','cancellation_policy','booking_reference'];$patch$,
        $patch$'meal_plan','cancellation_policy','booking_reference','cost_per_night','selling_per_night'];$patch$
      ),
      (
        $patch$'taxes_and_fees','is_round_trip','seat_preferences','meal_preferences'];$patch$,
        $patch$'taxes_and_fees','is_round_trip','seat_preferences','meal_preferences',
        'return_flight_number','return_departure_airport','return_arrival_airport','return_departure_date',
        'return_departure_time','return_arrival_date','return_arrival_time'];$patch$
      ),
      (
        $patch$'vehicle_type','route','pickup_point','dropoff_point','passengers'];$patch$,
        $patch$'vehicle_type','route','pickup_point','dropoff_point','passengers','pickup_time'];$patch$
      ),
      (
        $patch$ARRAY['daily_rate','ticket_price_per_person','taxes_and_fees']$patch$,
        $patch$ARRAY['daily_rate','ticket_price_per_person','taxes_and_fees','cost_per_night','selling_per_night']$patch$
      ),
      (
        $patch$ARRAY['departure_time','arrival_time']$patch$,
        $patch$ARRAY['departure_time','arrival_time','pickup_time','return_departure_time','return_arrival_time']$patch$
      ),
      (
        $patch$    detail_start:=(d->>start_key)::date; detail_end:=(d->>end_key)::date;
    IF (start_on IS NOT NULL AND detail_start IS NOT NULL AND start_on<>detail_start)
      OR (end_on IS NOT NULL AND detail_end IS NOT NULL AND end_on<>detail_end) THEN$patch$,
        $patch$    detail_start:=(d->>start_key)::date; detail_end:=(d->>end_key)::date;
    effective_detail_end:=detail_end;
    IF kind='flight' AND d ?| ARRAY['return_flight_number','return_departure_airport','return_arrival_airport',
      'return_departure_date','return_departure_time','return_arrival_date','return_arrival_time'] THEN
      return_departure_on:=(d->>'return_departure_date')::date;
      return_arrival_on:=(d->>'return_arrival_date')::date;
      IF d->'is_round_trip' IS DISTINCT FROM 'true'::jsonb
        OR NULLIF(btrim(d->>'return_departure_airport'),'') IS NULL
        OR NULLIF(btrim(d->>'return_arrival_airport'),'') IS NULL
        OR detail_end IS NULL OR NOT isfinite(detail_end)
        OR detail_end<COALESCE(detail_start,start_on)
        OR return_departure_on IS NULL OR NOT isfinite(return_departure_on)
        OR return_arrival_on IS NULL OR NOT isfinite(return_arrival_on)
        OR return_departure_on<detail_end OR return_arrival_on<return_departure_on THEN
        RAISE EXCEPTION 'أكمل مطارات وتواريخ رحلة العودة بترتيب صحيح' USING ERRCODE='22023';
      END IF;
      effective_detail_end:=return_arrival_on;
    END IF;
    IF (start_on IS NOT NULL AND detail_start IS NOT NULL AND start_on<>detail_start)
      OR (end_on IS NOT NULL AND effective_detail_end IS NOT NULL AND end_on<>effective_detail_end) THEN$patch$
      ),
      (
        'end_on:=COALESCE(end_on,detail_end);',
        'end_on:=COALESCE(end_on,effective_detail_end);'
      ),
      (
        'jsonb_build_object(start_key,start_on,end_key,end_on)',
        'jsonb_build_object(start_key,start_on,end_key,COALESCE(detail_end,end_on))'
      )
    ) AS pairs(old_text,new_text)
    UNION ALL
    SELECT pairs.old_text, pairs.new_text
    FROM (VALUES
      (
        'cancellation_policy,booking_reference)=ROW(hrow.',
        'cancellation_policy,booking_reference,cost_per_night,selling_per_night)=ROW(hrow.'
      ),
      (
        'hrow.cancellation_policy,hrow.booking_reference) WHERE id=hrow.id;',
        'hrow.cancellation_policy,hrow.booking_reference,hrow.cost_per_night,hrow.selling_per_night) WHERE id=hrow.id;'
      ),
      (
        'is_round_trip,seat_preferences,meal_preferences)=ROW(frow.',
        'is_round_trip,seat_preferences,meal_preferences,return_flight_number,return_departure_airport,return_arrival_airport,return_departure_date,return_departure_time,return_arrival_date,return_arrival_time)=ROW(frow.'
      ),
      (
        'frow.is_round_trip,frow.seat_preferences,frow.meal_preferences) WHERE id=frow.id;',
        'frow.is_round_trip,frow.seat_preferences,frow.meal_preferences,frow.return_flight_number,frow.return_departure_airport,frow.return_arrival_airport,frow.return_departure_date,frow.return_departure_time,frow.return_arrival_date,frow.return_arrival_time) WHERE id=frow.id;'
      ),
      (
        'vehicle_type,route,pickup_point,dropoff_point,passengers)=ROW(trow.',
        'vehicle_type,route,pickup_point,dropoff_point,passengers,pickup_time)=ROW(trow.'
      ),
      (
        'trow.pickup_point,trow.dropoff_point,trow.passengers) WHERE id=trow.id;',
        'trow.pickup_point,trow.dropoff_point,trow.passengers,trow.pickup_time) WHERE id=trow.id;'
      )
    ) AS pairs(old_text,new_text)
    WHERE uses_static_details
  LOOP
    IF length(source)-length(replace(source,original,'')) <> length(original) THEN
      RAISE EXCEPTION 'Unexpected create_booking_atomic definition near %', split_part(original,E'\n',1);
    END IF;
    source:=replace(source,original,updated);
  END LOOP;
  EXECUTE source;
END $migration$;

COMMIT;
