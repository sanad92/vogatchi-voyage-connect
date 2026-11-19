import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = readFileSync(new URL('../supabase/migrations/20261119230647_preview_booking_financial_gaps.sql', import.meta.url), 'utf8');
const org = '10000000-0000-0000-0000-000000000001';
const otherOrg = '10000000-0000-0000-0000-000000000002';
const booking = '20000000-0000-0000-0000-000000000001';
const invoicedBooking = '20000000-0000-0000-0000-000000000002';
const otherBooking = '20000000-0000-0000-0000-000000000003';
const supplier = '30000000-0000-0000-0000-000000000001';

try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE TABLE public.bookings (id uuid, organization_id uuid, selling_price numeric, cost_price numeric, supplier_id uuid);
    CREATE TABLE public.invoices (booking_id uuid, organization_id uuid);
    CREATE TABLE public.supplier_payments (booking_id uuid, organization_id uuid);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT '40000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE FUNCTION public._org_permission_state(uuid, uuid, text)
    RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql STABLE AS
      $$ SELECT $1 = '${org}'::uuid AND $2 = auth.uid() AND $3 = 'financial_edit', 'organization'::text $$;

    INSERT INTO public.bookings VALUES
      ('${booking}', '${org}', 900, 300, '${supplier}'),
      ('${invoicedBooking}', '${org}', 509, 200, '${supplier}'),
      ('${otherBooking}', '${otherOrg}', 300, 100, '${supplier}');
    INSERT INTO public.invoices VALUES ('${invoicedBooking}', '${org}');
    INSERT INTO public.supplier_payments VALUES ('${invoicedBooking}', '${org}');
  `);
  await db.exec(migration);
  await db.exec('SET ROLE authenticated');
  const preview = await db.query('SELECT public.preview_booking_financial_gaps($1) AS result', [org]);
  assert.deepEqual(preview.rows[0].result, { bookings_missing_invoice: 1, bookings_missing_supplier_payment: 1 });

  const legacy = await db.query('SELECT public.reconcile_bookings_for_org($1) AS result', [org]);
  assert.equal(legacy.rows[0].result.mode, 'preview');
  assert.equal(legacy.rows[0].result.invoices_created, 0);
  assert.equal(legacy.rows[0].result.payments_created, 0);
  await assert.rejects(() => db.query('SELECT public.preview_booking_financial_gaps($1)', [otherOrg]), { code: '42501' });
  await db.exec('RESET ROLE');
  const after = await db.query('SELECT (SELECT count(*) FROM invoices) AS invoices, (SELECT count(*) FROM supplier_payments) AS payments');
  assert.deepEqual(after.rows[0], { invoices: 1, payments: 1 });
  console.log('Booking financial gap preview is organization-scoped and both entry points are read-only.');
} finally {
  await db.close();
}
