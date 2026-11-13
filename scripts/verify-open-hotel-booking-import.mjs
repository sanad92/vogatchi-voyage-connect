import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { hotelImportRows, hotelImportFields } from '../src/lib/openHotelBookingImport.ts';
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, admin, otherAdmin, agent, customer, foreignCustomer, supplier] = Array.from({ length: 8 }, (_, n) => uid(n + 1));
const values = {
  source_reference: 'LEGACY-01', customer_id: customer, supplier_id: supplier,
  hotel_name: 'Hotel One', check_in: '2099-12-10', check_out: '2099-12-15',
  rooms: '2', currency: 'EGP', selling_price: '12000', cost_price: '7000', customer_paid: '0', supplier_paid: '0',
};
const sheet = hotelImportFields.map(key => key === 'check_in' ? new Date(2099, 11, 10) : values[key] ?? '');
const [valid] = hotelImportRows([hotelImportFields, sheet]);
assert.equal(valid.check_in, values.check_in);
assert.throws(() => hotelImportRows([hotelImportFields, ...Array(51).fill(sheet)]), /50/);
assert.throws(() => hotelImportRows([[...hotelImportFields, 'status'], sheet]), /status/);

const db = new PGlite();
await db.exec(`
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT current_setting(''qa.actor'', true)::uuid';
CREATE TABLE organizations(id uuid PRIMARY KEY);
CREATE TABLE customers(id uuid PRIMARY KEY, organization_id uuid, name text);
CREATE TABLE suppliers(id uuid PRIMARY KEY, organization_id uuid, name text, is_active boolean);
CREATE TABLE bookings(id uuid PRIMARY KEY, organization_id uuid, payload jsonb);
CREATE TABLE invoices(booking_id uuid REFERENCES bookings(id), amount numeric);
CREATE TABLE supplier_payment_orders(booking_id uuid REFERENCES bookings(id), amount numeric);
INSERT INTO organizations VALUES ('${org}'), ('${otherOrg}');
INSERT INTO customers VALUES ('${customer}', '${org}', 'Local customer'), ('${foreignCustomer}', '${otherOrg}', 'Other customer');
INSERT INTO suppliers VALUES ('${supplier}', '${org}', 'Local supplier', true);
CREATE FUNCTION public.get_user_org_role(uuid,uuid) RETURNS text LANGUAGE sql AS $$
  SELECT CASE WHEN $2 = '${org}' AND $1 IN ('${admin}', '${otherAdmin}') THEN 'admin'
    WHEN $2 = '${org}' AND $1 = '${agent}' THEN 'agent' END
$$;
CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$
  SELECT public.get_user_org_role(auth.uid(), $1) IS NOT NULL
$$;
CREATE FUNCTION public.has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$
  SELECT public.can_org_write($1)
$$;
CREATE FUNCTION public.create_booking_atomic(uuid,uuid,jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.bookings VALUES ($2, $1, $3);
  INSERT INTO public.invoices VALUES ($2, ($3->>'selling_price')::numeric);
  INSERT INTO public.supplier_payment_orders VALUES ($2, ($3->>'cost_price')::numeric);
  RETURN jsonb_build_object('id', $2);
END;
$$;
`);
await db.exec(readFileSync('supabase/migrations/20261113234350_import_open_hotel_bookings.sql', 'utf8'));
const actor = (id, role = 'authenticated') => db.exec(`RESET ROLE; SET ROLE ${role}; SET qa.actor = '${id}'`);
const run = async (rows, commit = false, tenant = org) => (
  await db.query('SELECT public.import_open_hotel_bookings($1,$2::jsonb,$3) AS result', [tenant, JSON.stringify(rows), commit])
).rows[0].result;
const counts = async () => {
  await db.exec('RESET ROLE');
  return (await db.query(`SELECT (SELECT count(*)::int FROM bookings) AS bookings,
    (SELECT count(*)::int FROM invoices) AS invoices,
    (SELECT count(*)::int FROM supplier_payment_orders) AS orders`)).rows[0];
};
await actor(admin);
const preview = await run([valid]);
assert.equal(preview.entries[0].customer, 'Local customer');
assert.equal(preview.entries[0].sale, 12000);
assert.equal(preview.imported, 0);
assert.deepEqual(await counts(), { bookings: 0, invoices: 0, orders: 0 });
await actor(admin);
await assert.rejects(run([valid, { ...valid, source_reference: 'legacy-02', customer_paid: '1' }], true), /2/);
assert.deepEqual(await counts(), { bookings: 0, invoices: 0, orders: 0 });
await actor(admin);
await assert.rejects(run([{ ...valid, customer_id: foreignCustomer }]), { code: '22023' });
await assert.rejects(run([valid], true, otherOrg), { code: '42501' });
await assert.rejects(run([valid, { ...valid, source_reference: 'legacy-01' }], true), { code: '22023' });
assert.equal((await run([valid], true)).imported, 1);
await actor(otherAdmin);
assert.equal((await run([valid], true)).skipped, 1);
await assert.rejects(run([{ ...valid, selling_price: '14000' }], true), { code: '22023' });
await actor(agent);
await assert.rejects(run([valid]), { code: '42501' });
await actor(admin, 'anon');
await assert.rejects(run([valid]), { code: '42501' });
assert.deepEqual(await counts(), { bookings: 1, invoices: 1, orders: 1 });
await db.close();
console.log('Hotel booking import passed spreadsheet parsing, read-only preview, rollback, exact replay, and tenant/role checks.');
