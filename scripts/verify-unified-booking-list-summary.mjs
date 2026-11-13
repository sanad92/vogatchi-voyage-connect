import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const own = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
await db.exec(`
  CREATE ROLE authenticated;
  CREATE ROLE anon;
  CREATE TABLE public.bookings (
    organization_id uuid, booking_type text, status text, customer_name text,
    booking_number text, supplier_name text, start_date date, currency text, profit numeric
  );
  INSERT INTO public.bookings
    SELECT '${own}', 'hotel', 'confirmed', 'Nile', 'BK-' || n, 'Operator', '2027-01-05', 'EGP', 10
    FROM generate_series(1, 30) n;
  INSERT INTO public.bookings VALUES
    ('${own}', 'flight', 'pending', 'Nile', 'F-1', 'Operator', '2027-01-06', 'USD', 90),
    ('${own}', 'flight', 'confirmed', 'Delta', 'F-2', 'Other', '2027-01-10', 'USD', 20),
    ('${other}', 'hotel', 'confirmed', 'Nile', 'BK-31', 'Operator', '2027-01-05', 'EGP', 500);
  CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql
    AS $$ SELECT org = current_setting('test.organization')::uuid
      AND (permission = 'bookings_view' OR (permission = 'financial_view' AND current_setting('test.finance') = 'on')) $$;
  ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.bookings TO authenticated;
  CREATE POLICY bookings_scope ON public.bookings FOR SELECT TO authenticated
    USING (organization_id = current_setting('test.organization')::uuid
      AND (current_setting('test.own_only') = 'off' OR booking_number = 'BK-1'));
  SET test.organization = '${own}';
  SET test.finance = 'on';
  SET test.own_only = 'off';
`);
await db.exec(readFileSync('supabase/migrations/20261113234719_unified_booking_list_summary.sql', 'utf8'));
const summary = (org, type = null, status = null, search = null, from = null, to = null) =>
  db.query('SELECT * FROM public.unified_booking_list_summary($1,$2,$3,$4,$5,$6)', [org, type, status, search, from, to]);

await db.exec('SET ROLE authenticated');
assert.deepEqual((await summary(own)).rows, [
  { currency: 'EGP', confirmed: 30, pending: 0, profit: '300' },
  { currency: 'USD', confirmed: 1, pending: 1, profit: '110' },
]);
assert.deepEqual((await summary(own, 'flight', 'pending', 'Nile', '2027-01-06', '2027-01-06')).rows,
  [{ currency: 'USD', confirmed: 0, pending: 1, profit: '90' }]);
assert.deepEqual((await summary(other)).rows, []);
await db.exec("SET test.finance = 'off'; SET test.own_only = 'on'");
assert.deepEqual((await summary(own)).rows, [{ currency: null, confirmed: 1, pending: 0, profit: null }]);
await db.exec('RESET ROLE; SET ROLE anon');
await assert.rejects(summary(own), { code: '42501' });
await db.close();
console.log('Booking summary passed for pagination, currency totals, filters, row-level scope and anonymous access.');
