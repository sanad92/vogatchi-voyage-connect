
-- Unified booking views exposing legacy column names so the
-- type-specific list pages (hotel, flight, transport, car) can read
-- all bookings from the unified `bookings` + `booking_*_details` tables.

-- ============ HOTEL ============
DROP VIEW IF EXISTS public.hotel_bookings_unified CASCADE;
CREATE VIEW public.hotel_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost_customer,
  b.cost_price                            AS total_cost_supplier,
  b.profit                                AS total_profit,
  b.booking_number                        AS internal_booking_number,
  b.notes                                 AS internal_notes,
  b.created_at,
  b.updated_at,
  COALESCE(h.hotel_name, '')              AS hotel_name,
  h.star_rating                           AS hotel_star_rating,
  h.city                                  AS destination_city,
  COALESCE(h.check_in,  b.start_date)     AS check_in_date,
  COALESCE(h.check_out, b.end_date)       AS check_out_date,
  COALESCE(h.nights, GREATEST(1, (COALESCE(h.check_out, b.end_date) - COALESCE(h.check_in, b.start_date)))) AS number_of_nights,
  COALESCE(h.rooms, 1)                    AS number_of_rooms,
  COALESCE(h.room_type, '')               AS room_type,
  COALESCE(h.adults, 0)                   AS number_of_adults,
  COALESCE(h.children, 0)                 AS number_of_children,
  h.children_ages,
  COALESCE(h.meal_plan, h.board_type, 'RO') AS meal_plan,
  h.cancellation_policy,
  h.booking_reference                     AS booking_reference_supplier,
  CASE WHEN COALESCE(h.nights,0) > 0
       THEN b.selling_price / h.nights
       ELSE b.selling_price END           AS selling_price_per_night,
  CASE WHEN COALESCE(h.nights,0) > 0
       THEN b.cost_price / h.nights
       ELSE b.cost_price END              AS cost_per_night,
  0::numeric                              AS paid_amount,
  b.selling_price                         AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  NULL::timestamptz                       AS invoice_sent_date,
  NULL::timestamptz                       AS voucher_sent_date,
  NULL::timestamptz                       AS supplier_payment_sent_date,
  b.created_at::date                      AS booking_date,
  ''::text                                AS booking_agent_name
FROM public.bookings b
LEFT JOIN public.booking_hotel_details h ON h.booking_id = b.id
WHERE b.booking_type = 'hotel';

GRANT SELECT ON public.hotel_bookings_unified TO authenticated;

-- ============ FLIGHT ============
DROP VIEW IF EXISTS public.flight_bookings_unified CASCADE;
CREATE VIEW public.flight_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost,
  b.cost_price                            AS supplier_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS booking_reference,
  b.notes                                 AS special_requests,
  b.created_at,
  b.updated_at,
  f.airline                               AS airline_name,
  f.flight_number,
  f.flight_class                          AS flight_class_name,
  f.departure_airport                     AS departure_airport_code,
  f.arrival_airport                       AS arrival_airport_code,
  COALESCE(f.departure_date, b.start_date) AS departure_date,
  f.departure_time,
  COALESCE(f.arrival_date,   b.end_date)   AS arrival_date,
  f.arrival_time,
  f.ticket_number,
  f.pnr                                   AS confirmation_number,
  COALESCE(f.passengers_count, 1)         AS number_of_passengers,
  f.ticket_price_per_person,
  f.taxes_and_fees,
  f.is_round_trip,
  f.seat_preferences,
  f.meal_preferences,
  0::numeric                              AS paid_amount,
  b.selling_price                         AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  ''::text                                AS booking_agent_name
FROM public.bookings b
LEFT JOIN public.booking_flight_details f ON f.booking_id = b.id
WHERE b.booking_type = 'flight';

GRANT SELECT ON public.flight_bookings_unified TO authenticated;

-- ============ TRANSPORT ============
DROP VIEW IF EXISTS public.transport_bookings_unified CASCADE;
CREATE VIEW public.transport_bookings_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_cost,
  b.cost_price                            AS supplier_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS booking_reference,
  b.notes                                 AS special_requests,
  b.created_at,
  b.updated_at,
  t.vehicle_type                          AS vehicle_type_name,
  t.route                                 AS route_name,
  t.pickup_point                          AS pickup_location,
  t.dropoff_point                         AS dropoff_location,
  COALESCE(t.passengers, 1)               AS number_of_passengers,
  COALESCE(b.start_date, b.created_at::date) AS departure_date,
  NULL::text                              AS departure_time,
  NULL::text                              AS driver_name,
  NULL::text                              AS driver_phone,
  NULL::text                              AS vehicle_plate_number,
  0::numeric                              AS paid_amount,
  b.selling_price                         AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS voucher_sent,
  false                                   AS supplier_payment_sent,
  NULL::timestamptz                       AS invoice_sent_date,
  NULL::timestamptz                       AS voucher_sent_date,
  NULL::timestamptz                       AS supplier_payment_sent_date
FROM public.bookings b
LEFT JOIN public.booking_transport_details t ON t.booking_id = b.id
WHERE b.booking_type = 'transport';

GRANT SELECT ON public.transport_bookings_unified TO authenticated;

-- ============ CAR RENTAL ============
DROP VIEW IF EXISTS public.car_rentals_unified CASCADE;
CREATE VIEW public.car_rentals_unified
WITH (security_invoker = on) AS
SELECT
  b.id,
  b.organization_id,
  b.customer_id,
  b.customer_name,
  b.employee_id,
  b.supplier_id,
  b.supplier_name,
  b.status_id,
  b.currency,
  b.selling_price                         AS total_rental_cost,
  b.cost_price                            AS supplier_total_cost,
  b.profit                                AS total_profit,
  b.booking_number                        AS rental_reference,
  b.notes                                 AS special_requirements,
  b.created_at,
  b.updated_at,
  c.car_type                              AS vehicle_type_name,
  c.pickup_location,
  c.dropoff_location                      AS return_location,
  COALESCE(c.pickup_date, b.start_date)   AS rental_start_date,
  COALESCE(c.dropoff_date, b.end_date)    AS rental_end_date,
  GREATEST(1, (COALESCE(c.dropoff_date, b.end_date) - COALESCE(c.pickup_date, b.start_date))) AS rental_duration_days,
  c.daily_rate,
  COALESCE(c.insurance_included, false)   AS insurance_included,
  0::numeric                              AS paid_amount,
  b.selling_price                         AS remaining_amount,
  false                                   AS invoice_sent,
  false                                   AS supplier_payment_sent
FROM public.bookings b
LEFT JOIN public.booking_car_details c ON c.booking_id = b.id
WHERE b.booking_type IN ('car_rental', 'car');

GRANT SELECT ON public.car_rentals_unified TO authenticated;
