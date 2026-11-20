import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const org = id(1);
const otherOrg = id(2);
const owner = id(3);
const viewer = id(4);
const ownScope = id(5);
const otherTenant = id(6);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.actor', true), '')::uuid $$;
    CREATE FUNCTION public._org_permission_state(uuid, uuid, text) RETURNS TABLE(granted boolean, data_scope text)
    LANGUAGE sql STABLE AS $$
      SELECT CASE
        WHEN $1 = '${org}' AND $2 = '${owner}' THEN true
        WHEN $1 = '${org}' AND $2 = '${viewer}' THEN $3 = 'bookings_view'
        WHEN $1 = '${org}' AND $2 = '${ownScope}' THEN true
        WHEN $1 = '${otherOrg}' AND $2 = '${otherTenant}' THEN true
        ELSE false END,
      CASE WHEN $2 = '${ownScope}' AND $3 <> 'bookings_view' THEN 'own' ELSE 'organization' END
    $$;
    CREATE FUNCTION public.has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT granted FROM public._org_permission_state($1,auth.uid(),$2)
    $$;
    CREATE TABLE bookings (
      id uuid, organization_id uuid, customer_id uuid, customer_name text, employee_id uuid, supplier_id uuid, supplier_name text,
      status_id uuid, currency text, selling_price numeric, cost_price numeric, profit numeric, booking_number text, notes text,
      created_at timestamptz, updated_at timestamptz, start_date date, end_date date, booking_type text, status text,
      workflow_stage text, is_demo boolean DEFAULT false
    );
    CREATE TABLE booking_hotel_details (
      booking_id uuid, hotel_name text, star_rating integer, city text, check_in date, check_out date,
      nights integer, rooms integer, room_type text, adults integer, children integer, children_ages text,
      meal_plan text, board_type text, cancellation_policy text, booking_reference text,
      selling_per_night numeric, cost_per_night numeric, selling_amount numeric, cost_amount numeric
    );
    CREATE TABLE booking_flight_details (
      booking_id uuid, airline text, flight_number text, flight_class text, departure_airport text, arrival_airport text,
      departure_date date, departure_time time, arrival_date date, arrival_time time, ticket_number text, pnr text, passengers_count integer,
      ticket_price_per_person numeric, taxes_and_fees numeric, is_round_trip boolean, seat_preferences text, meal_preferences text
    );
    CREATE TABLE booking_transport_details (
      booking_id uuid, vehicle_type text, route text, pickup_point text, dropoff_point text, passengers integer, pickup_time time
    );
    CREATE TABLE booking_car_details (
      booking_id uuid, car_type text, pickup_location text, dropoff_location text,
      pickup_date date, dropoff_date date, daily_rate numeric, insurance_included boolean
    );
    CREATE TABLE invoices (
      id uuid, organization_id uuid, booking_id uuid, status text, issued_date date, created_at timestamptz, created_by uuid,
      is_demo boolean DEFAULT false, currency text, final_amount numeric, total_paid_amount numeric, remaining_amount numeric
    );
    CREATE TABLE booking_vouchers (id uuid, organization_id uuid, booking_id uuid);
    CREATE TABLE generated_documents (id uuid, organization_id uuid, booking_id uuid, created_by uuid, document_type text);
    GRANT SELECT ON bookings, booking_hotel_details, booking_flight_details, booking_transport_details, booking_car_details,
      invoices, booking_vouchers, generated_documents TO authenticated;
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY member_bookings ON bookings FOR SELECT TO authenticated USING (public.has_org_permission(organization_id,'bookings_view'));
    CREATE POLICY invoice_restrictions ON invoices FOR SELECT TO authenticated
      USING (public.has_org_permission(organization_id,'bookings_view') AND id <> '${id(90)}'::uuid);
    INSERT INTO bookings(id, organization_id, booking_type, status, workflow_stage, currency, selling_price) VALUES
      ('${id(10)}','${org}','hotel','confirmed','confirmed','EGP',100),
      ('${id(11)}','${org}','flight','pending','lead','EGP',100),
      ('${id(12)}','${org}','transport','cancelled','cancelled','EGP',100),
      ('${id(13)}','${org}','car_rental','confirmed','confirmed','EGP',100),
      ('${id(14)}','${otherOrg}','hotel','confirmed','confirmed','EGP',100);
    INSERT INTO booking_transport_details(booking_id,pickup_time) VALUES ('${id(12)}','14:30');
    INSERT INTO booking_hotel_details(booking_id,nights,rooms,selling_per_night,cost_amount)
      VALUES ('${id(10)}',2,2,35,80);
    INSERT INTO invoices VALUES
      ('${id(20)}','${org}','${id(10)}','partially_paid','2026-11-10',now(),'${ownScope}',false,'EGP',100,40,50),
      ('${id(21)}','${org}','${id(10)}','unpaid','2026-11-15',now(),'${owner}',false,'EGP',20,0,20),
      ('${id(22)}','${org}','${id(10)}','draft','2026-11-16',now(),'${owner}',false,'EGP',90,0,90),
      ('${id(23)}','${org}','${id(10)}','unpaid','2026-11-14',now(),'${owner}',false,'USD',77,0,77),
      ('${id(90)}','${org}','${id(10)}','paid','2026-11-16',now(),'${owner}',false,'EGP',75,75,0),
      ('${id(24)}','${otherOrg}','${id(10)}','paid','2026-11-16',now(),'${otherTenant}',false,'EGP',80,80,0),
      ('${id(26)}','${org}','${id(10)}','paid','2026-11-16',now(),'${owner}',true,'EGP',75,75,0),
      ('${id(30)}','${org}','${id(11)}','draft','2026-11-09',now(),'${owner}',false,'EGP',100,0,100),
      ('${id(31)}','${org}','${id(12)}','void','2026-11-09',now(),'${owner}',false,'EGP',100,100,0);
    INSERT INTO booking_vouchers VALUES ('${id(50)}','${org}','${id(12)}'), ('${id(51)}','${otherOrg}','${id(11)}');
    INSERT INTO generated_documents VALUES ('${id(70)}','${org}','${id(10)}','${ownScope}','voucher');
  `);
  await db.exec(migration('20260630062247_2f49ca3b-6ecd-4894-9765-7dec9093c015.sql'));
  await db.exec(migration('20261120135717_specialize_booking_list_financial_status.sql'));

  const as = async user => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('test.actor',$1,false)", [user]);
    await db.exec('SET ROLE authenticated');
  };
  const select = name => db.query(
    `SELECT id, paid_amount, remaining_amount, invoice_id, invoice_document_status, voucher_document_status FROM ${name}`,
  );

  await as(owner);
  assert.deepEqual((await select('hotel_bookings_unified')).rows, [{
    id: id(10), paid_amount: '40', remaining_amount: '70', invoice_id: id(21),
    invoice_document_status: 'issued', voucher_document_status: 'issued',
  }]);
  const nightly = (await db.query('SELECT selling_price_per_night::int AS selling, cost_per_night::int AS cost, booking_status_code FROM public.hotel_bookings_unified')).rows[0];
  assert.deepEqual(nightly, { selling: 35, cost: 20, booking_status_code: 'confirmed' });
  const flight = (await select('flight_bookings_unified')).rows[0];
  assert.equal(flight.invoice_document_status, 'draft');
  assert.equal(flight.voucher_document_status, 'awaiting_confirmation');
  assert.equal(flight.remaining_amount, null);
  const transport = (await select('transport_bookings_unified')).rows[0];
  assert.equal(transport.invoice_document_status, 'archived');
  assert.equal(transport.voucher_document_status, 'archived');
  assert.equal(transport.paid_amount, null);
  assert.equal((await db.query('SELECT departure_time FROM public.transport_bookings_unified')).rows[0].departure_time, '14:30:00');
  const car = (await select('car_rentals_unified')).rows[0];
  assert.equal(car.invoice_document_status, 'missing');
  assert.equal(car.voucher_document_status, 'missing');
  assert.equal(car.remaining_amount, null);

  await as(viewer);
  assert.deepEqual((await select('hotel_bookings_unified')).rows, [{
    id: id(10), paid_amount: null, remaining_amount: null, invoice_id: null,
    invoice_document_status: null, voucher_document_status: null,
  }]);
  await as(ownScope);
  const mine = (await select('hotel_bookings_unified')).rows[0];
  assert.equal(mine.invoice_id, id(20));
  assert.equal(mine.remaining_amount, '50');
  assert.equal(mine.voucher_document_status, 'issued');
  assert.equal((await select('transport_bookings_unified')).rows[0].voucher_document_status, null);
  await as(otherTenant);
  assert.deepEqual((await select('hotel_bookings_unified')).rows.map(row => row.id), [id(14)]);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(() => select('specialized_booking_finance_facts'), { code: '42501' });

  console.log('Specialized booking lists use real invoice/voucher facts and preserve row and role permissions.');
} finally {
  await db.close();
}
