
-- Data migration from legacy tables

-- Hotel bookings
INSERT INTO public.bookings (organization_id, booking_number, booking_type, customer_id, customer_name, employee_id, supplier_name, status_id, selling_price, cost_price, profit, currency, start_date, end_date, legacy_table, legacy_id, created_at, updated_at)
SELECT 
  h.organization_id,
  'BK-' || to_char(COALESCE(h.created_at, now()), 'YYYY') || '-H' || LPAD(ROW_NUMBER() OVER (ORDER BY h.created_at)::TEXT, 4, '0'),
  'hotel', h.customer_id, h.customer_name, h.employee_id, h.hotel_name, h.status_id,
  COALESCE(h.total_cost_customer, 0),
  COALESCE(h.total_cost_customer, 0) - COALESCE(h.total_profit, 0),
  COALESCE(h.total_profit, 0),
  COALESCE(h.currency, 'EGP'), h.check_in_date, h.check_out_date,
  'hotel_bookings', h.id, h.created_at, h.updated_at
FROM public.hotel_bookings h WHERE h.organization_id IS NOT NULL;

INSERT INTO public.booking_hotel_details (booking_id, hotel_name, room_type, board_type, check_in, check_out, nights, rooms)
SELECT b.id, h.hotel_name, h.room_type, h.meal_plan, h.check_in_date, h.check_out_date, h.number_of_nights, 1
FROM public.hotel_bookings h JOIN public.bookings b ON b.legacy_table = 'hotel_bookings' AND b.legacy_id = h.id;

-- Flight bookings
INSERT INTO public.bookings (organization_id, booking_number, booking_type, customer_id, customer_name, employee_id, supplier_name, status_id, selling_price, cost_price, profit, currency, start_date, notes, legacy_table, legacy_id, created_at, updated_at)
SELECT 
  f.organization_id,
  'BK-' || to_char(COALESCE(f.created_at, now()), 'YYYY') || '-F' || LPAD(ROW_NUMBER() OVER (ORDER BY f.created_at)::TEXT, 4, '0'),
  'flight', f.customer_id, f.customer_name, f.employee_id, f.supplier_name, f.status_id,
  COALESCE(f.total_cost_egp, 0), COALESCE(f.supplier_cost_egp, 0), COALESCE(f.total_profit, 0),
  'EGP', f.booking_date, f.special_requests,
  'flight_bookings', f.id, f.created_at, f.updated_at
FROM public.flight_bookings f WHERE f.organization_id IS NOT NULL;

INSERT INTO public.booking_flight_details (booking_id, airline, flight_number, departure_date, ticket_number, pnr)
SELECT b.id, f.supplier_name, f.flight_number, f.departure_date, f.ticket_numbers, f.confirmation_number
FROM public.flight_bookings f JOIN public.bookings b ON b.legacy_table = 'flight_bookings' AND b.legacy_id = f.id;

-- Car rentals
INSERT INTO public.bookings (organization_id, booking_number, booking_type, customer_id, customer_name, employee_id, supplier_id, supplier_name, status_id, selling_price, cost_price, profit, currency, start_date, end_date, notes, legacy_table, legacy_id, created_at, updated_at)
SELECT 
  c.organization_id,
  'BK-' || to_char(COALESCE(c.created_at, now()), 'YYYY') || '-C' || LPAD(ROW_NUMBER() OVER (ORDER BY c.created_at)::TEXT, 4, '0'),
  'car_rental', c.customer_id, c.customer_name, c.employee_id, c.supplier_id, c.supplier_name, c.status_id,
  COALESCE(c.total_cost_egp, c.total_rental_cost, 0), COALESCE(c.supplier_cost_egp, c.supplier_total_cost, 0), COALESCE(c.total_profit, 0),
  COALESCE(c.currency, 'EGP'), c.rental_start_date::date, c.rental_end_date::date, c.special_requirements,
  'car_rentals', c.id, c.created_at, c.updated_at
FROM public.car_rentals c WHERE c.organization_id IS NOT NULL;

INSERT INTO public.booking_car_details (booking_id, car_type, pickup_location, dropoff_location, pickup_date, dropoff_date, daily_rate, insurance_included)
SELECT b.id, COALESCE(c.vehicle_make || ' ' || c.vehicle_model, ''), c.pickup_location, c.return_location, c.rental_start_date::date, c.rental_end_date::date, c.daily_rate, COALESCE(c.insurance_included, false)
FROM public.car_rentals c JOIN public.bookings b ON b.legacy_table = 'car_rentals' AND b.legacy_id = c.id;

-- Transport bookings
INSERT INTO public.bookings (organization_id, booking_number, booking_type, customer_id, customer_name, employee_id, supplier_name, status_id, selling_price, cost_price, profit, currency, start_date, notes, legacy_table, legacy_id, created_at, updated_at)
SELECT 
  t.organization_id,
  'BK-' || to_char(COALESCE(t.created_at, now()), 'YYYY') || '-T' || LPAD(ROW_NUMBER() OVER (ORDER BY t.created_at)::TEXT, 4, '0'),
  'transport', t.customer_id, t.customer_name, t.employee_id, t.supplier_name, t.status_id,
  COALESCE(t.total_cost, 0), COALESCE(t.supplier_cost, 0), COALESCE(t.total_profit, 0),
  COALESCE(t.currency, 'EGP'), t.departure_date, t.special_requests,
  'transport_bookings', t.id, t.created_at, t.updated_at
FROM public.transport_bookings t WHERE t.organization_id IS NOT NULL;

INSERT INTO public.booking_transport_details (booking_id, vehicle_type, route, pickup_point, dropoff_point, passengers)
SELECT b.id, NULL, NULL, t.pickup_location, t.dropoff_location, COALESCE(t.number_of_passengers, 1)
FROM public.transport_bookings t JOIN public.bookings b ON b.legacy_table = 'transport_bookings' AND b.legacy_id = t.id;
