import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyCalculatedBookingAmount, bookingDayCount, resolveFlightCatalogLabel } from '../src/lib/bookingServiceFields.ts';

const db = new PGlite();
const organization = randomUUID();
const user = randomUUID();
const customer = randomUUID();
await db.exec(`
  CREATE SCHEMA auth;
  CREATE ROLE authenticated;
  CREATE ROLE anon;
  CREATE TABLE organizations(id uuid PRIMARY KEY);
  CREATE TABLE customers(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, organization_id uuid, name text, phone text, email text);
  CREATE TABLE suppliers(id uuid, organization_id uuid, name text, is_active boolean);
  CREATE TABLE employees(id uuid, organization_id uuid, is_active boolean);
  CREATE TABLE bookings(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, organization_id uuid, booking_number text, booking_type text,
    customer_id uuid, customer_name text, supplier_id uuid, supplier_name text, employee_id uuid,
    selling_price numeric, cost_price numeric, base_selling_price numeric, base_cost_price numeric, currency text,
    start_date date, end_date date, notes text, status text, cancellation_terms jsonb);
  CREATE TABLE invoices(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, booking_id uuid, organization_id uuid, status text,
    customer_id uuid, currency text, subtotal numeric, final_amount numeric);
  CREATE TABLE booking_automation_steps(booking_id uuid,step_key text,status text);
  CREATE TABLE supplier_payment_orders(id uuid, booking_id uuid, source_type text, source_id uuid, organization_id uuid, supplier_id uuid, amount numeric, currency text);
  CREATE TABLE supplier_invoices(payment_order_id uuid, organization_id uuid, supplier_id uuid, amount numeric, currency text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${user}'::uuid $$;
  CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
  CREATE FUNCTION public.has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
  CREATE FUNCTION public.sync_booking_financials(_booking uuid) RETURNS jsonb LANGUAGE sql AS $$
    INSERT INTO public.invoices(booking_id,organization_id,customer_id,currency,subtotal,final_amount)
      SELECT id,organization_id,customer_id,currency,selling_price,selling_price FROM public.bookings WHERE id=_booking;
    SELECT '{"invoice_updated":true}'::jsonb
  $$;
  INSERT INTO organizations VALUES ('${organization}');
  INSERT INTO customers(id,organization_id,name) VALUES ('${customer}','${organization}','Fixture');
`);
await db.exec(`
  CREATE TABLE booking_car_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, booking_id uuid, car_type text, pickup_location text,
    dropoff_location text, pickup_date date, dropoff_date date, daily_rate numeric, insurance_included boolean,
    selling_amount numeric, cost_amount numeric
  );
  CREATE TABLE booking_flight_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, booking_id uuid, airline text, flight_number text,
    departure_airport text, departure_date date, departure_time text, arrival_airport text, arrival_date date, arrival_time text,
    ticket_number text, pnr text, passengers_count integer DEFAULT 1, flight_class text, ticket_price_per_person numeric,
    taxes_and_fees numeric, is_round_trip boolean, seat_preferences text, meal_preferences text, selling_amount numeric, cost_amount numeric
  );
  CREATE TABLE booking_hotel_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, booking_id uuid, hotel_name text, room_type text, board_type text,
    check_in date, check_out date, nights integer, rooms integer DEFAULT 1, star_rating integer, city text,
    adults integer, children integer, children_ages text, meal_plan text, cancellation_policy text, booking_reference text,
    selling_amount numeric, cost_amount numeric
  );
  CREATE TABLE booking_transport_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, booking_id uuid, vehicle_type text, route text,
    pickup_point text, dropoff_point text, passengers integer DEFAULT 1, selling_amount numeric, cost_amount numeric
  );
`);
await db.exec(readFileSync('scripts/deploy-atomic-booking.sql', 'utf8'));
await db.exec(readFileSync('drizzle/migrations/0022_create_booking_atomic_static_sql.sql', 'utf8'));
await db.exec(readFileSync('supabase/migrations/20261120135611_retain_unified_booking_service_details.sql', 'utf8'));

const base = { customer_id: customer, selling_price: 135, cost_price: 0, currency: 'EGP' };
const create = async (details, requestId = randomUUID()) => {
  const { rows: [row] } = await db.query('SELECT public.create_booking_atomic($1,$2,$3) AS booking',
    [organization, requestId, JSON.stringify({ ...base, ...details })]);
  return row.booking;
};
const outbound = {
  airline: 'شركة طيران يدوية', flight_class: 'فئة خاصة',
  departure_airport: 'CAI', departure_date: '2026-12-01', departure_time: '10:30',
  arrival_airport: 'RUH', arrival_date: '2026-12-01', arrival_time: '14:00',
  is_round_trip: true,
};
const flightDetails = {
  ...outbound, return_flight_number: 'XX850',
  return_departure_airport: 'RUH', return_departure_date: '2026-12-10', return_departure_time: '20:25',
  return_arrival_airport: 'CAI', return_arrival_date: '2026-12-11', return_arrival_time: '00:35',
};
const requestId = randomUUID();
const flight = { booking_type: 'flight', start_date: '2026-12-01', end_date: '2026-12-11', flightDetails };
const savedFlight = await create(flight, requestId);
assert.equal(savedFlight.end_date, '2026-12-11');
const { rows: [saved] } = await db.query(`
  SELECT airline, flight_class, arrival_date::text, return_departure_airport,
    return_arrival_date::text, return_departure_time::text, return_flight_number
  FROM booking_flight_details WHERE booking_id = $1
`, [savedFlight.id]);
assert.deepEqual(saved, {
  airline: 'شركة طيران يدوية', flight_class: 'فئة خاصة', arrival_date: '2026-12-01',
  return_departure_airport: 'RUH', return_arrival_date: '2026-12-11',
  return_departure_time: '20:25:00', return_flight_number: 'XX850',
});
assert.equal((await create(flight, requestId)).already_created, true);
assert.equal((await create({ booking_type: 'flight', flightDetails: outbound })).end_date, '2026-12-01');
await assert.rejects(create({ ...flight, end_date: '2026-12-01' }), { code: '22023' });
await assert.rejects(create({ ...flight, flightDetails: { ...flightDetails, is_round_trip: false } }), { code: '22023' });
await assert.rejects(create({ ...flight, flightDetails: { ...flightDetails, return_departure_date: '2026-11-30' } }), { code: '22023' });
await assert.rejects(create({ ...flight, flightDetails: { ...flightDetails, return_arrival_airport: '' } }), { code: '22023' });

const stay = {
  booking_type: 'hotel',
  hotelDetails: {
    hotel_name: 'Fixture stay', check_in: '2026-12-01', check_out: '2026-12-03',
    rooms: 2, cost_per_night: 52.35, selling_per_night: 85,
  },
};
const hotel = await create(stay);
const lodging = await db.query('SELECT nights, cost_per_night, selling_per_night FROM booking_hotel_details WHERE booking_id = $1', [hotel.id]);
assert.deepEqual(lodging.rows, [{ nights: 2, cost_per_night: '52.35', selling_per_night: '85' }]);
await assert.rejects(create({ ...stay, hotelDetails: { ...stay.hotelDetails, cost_per_night: -1 } }), { code: '22023' });

const transfer = {
  booking_type: 'transport', start_date: '2026-12-01', end_date: '2026-12-01',
  transportDetails: { vehicle_type: 'Minibus', pickup_point: 'T1', pickup_time: '07:15' },
};
const booking = await create(transfer);
const pickup = await db.query('SELECT pickup_time::text FROM booking_transport_details WHERE booking_id = $1', [booking.id]);
assert.equal(pickup.rows[0].pickup_time, '07:15:00');
await assert.rejects(create({ ...transfer, transportDetails: { ...transfer.transportDetails, pickup_time: '24:00' } }), { code: '22023' });

const rental = await create({
  booking_type: 'car_rental',
  carDetails: { car_type: 'Van', pickup_date: '2026-12-01', dropoff_date: '2026-12-01', daily_rate: 135 },
});
assert.equal(rental.start_date, rental.end_date);
assert.equal((await db.query('SELECT count(*)::int AS bookings FROM bookings')).rows[0].bookings, 5);
await db.exec('SET ROLE anon');
await assert.rejects(create(transfer), { code: '42501' });
await db.close();

assert.equal(bookingDayCount('2026-11-01', '2026-11-02'), 1);
assert.equal(bookingDayCount('2026-11-01', '2026-11-01', true), 1);
assert.equal(bookingDayCount('2026-11-01', '2026-11-01'), null);
assert.equal(bookingDayCount('2026-11-03', '2026-11-01', true), null);
assert.equal(bookingDayCount('2026-02-30', '2026-03-02', true), null);
assert.equal(applyCalculatedBookingAmount('120.00', 120, 240), 240);
assert.equal(applyCalculatedBookingAmount('140.00', 120, 240), undefined);
assert.equal(applyCalculatedBookingAmount('120.00', 120, null), 0);
const uuid = randomUUID();
assert.equal(resolveFlightCatalogLabel(uuid), undefined);
assert.equal(resolveFlightCatalogLabel(uuid, [{ id: uuid, name: 'Economy', name_ar: 'اقتصادي' }]), 'اقتصادي');
assert.equal(resolveFlightCatalogLabel('  شركة طيران  '), 'شركة طيران');
console.log('Service fields: persisted rates, pickup time, separate return legs, idempotency, validation, and pricing/catalog helpers passed.');
