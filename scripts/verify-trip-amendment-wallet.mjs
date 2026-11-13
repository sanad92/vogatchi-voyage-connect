import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const migration = file => read(`supabase/migrations/${file}.sql`);
await import('./prepare-refund-balances-fixture.mjs');

const walletFixture = read('scripts/test-refund-balances.sql')
  .split('GRANT EXECUTE ON FUNCTION public.record_customer_payment')[0]
  .replace(/^\\set.*$/m, '')
  .replace(/^\\i (.*)$/gm, (_, file) => read(file));

const cases = read('scripts/test-trip-amendment-wallet.sql');
const boundary = '-- Amendment tests';
const fixtureEnd = cases.indexOf(boundary);
if (fixtureEnd < 0) throw new Error('Missing amendment test boundary');

const db = new PGlite();
try {
  await db.exec(walletFixture);
  await db.exec(cases.slice(0, fixtureEnd));
  await db.exec(migration('20261113171743_trip_amendment_wallet'));
  await db.exec(cases.slice(fixtureEnd));
  console.log('Trip amendments PostgreSQL scenarios passed');
  const cockpit = migration('20260907171000_route_aware_booking_profit');
  await db.exec(cockpit.slice(cockpit.indexOf('CREATE OR REPLACE FUNCTION')));
  await db.exec(migration('20261113182458_booking_cancellation_settlement'));
  await db.exec(read('scripts/test-booking-cancellation-settlement.sql'));
  console.log('Booking cancellation settlement PostgreSQL scenarios passed');
  await db.exec(migration('20261113184230_cancel_fully_waived_booking_invoice'));
  await db.exec(read('scripts/test-cancel-fully-waived-booking-invoice.sql'));
  console.log('Fully waived invoice cancellation scenarios passed');
  await db.exec(migration('20261113191412_cancelled_booking_supplier_balance'));
  await db.exec(read('scripts/test-cancelled-booking-supplier-balance.sql'));
  console.log('Cancelled supplier order scenarios passed');
  await db.exec(migration('20261113232530_close_unpaid_supplier_order'));
  const aging = migration('20260905090544_wave3_receivables_payables_aging');
  await db.exec(aging.slice(aging.indexOf('CREATE OR REPLACE FUNCTION public.get_supplier_aging_details_v2'),
    aging.indexOf('CREATE OR REPLACE FUNCTION public.get_aging_control_totals_v2')));
  await db.exec(read('scripts/test-cancel-unpaid-supplier-order.sql'));
  console.log('Confirmed free supplier cancellation and supplier aging scenarios passed');
  await db.exec(migration('20261113234151_settle_booking_with_supplier_cancellation'));
  await db.exec(read('scripts/test-booking-cancellation-with-supplier.sql'));
  console.log('Combined booking and supplier cancellation scenarios passed');
  await db.exec(`CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid)
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT FROM public.organization_members WHERE organization_id = _org AND user_id = _user AND is_active)
    $$`);
  const reports = migration('20260822141000_currency_safe_financial_reports');
  await db.exec(reports.slice(reports.indexOf('CREATE OR REPLACE FUNCTION public.get_supplier_ledger('),
    reports.indexOf('CREATE OR REPLACE FUNCTION public.get_financial_launch_health(')));
  const routes = read('scripts/test-refund-balances.sql').split('CREATE FUNCTION public.get_org_account_route')[1].split('CREATE FUNCTION public._require_route_code')[0];
  await db.exec('CREATE OR REPLACE FUNCTION public.get_org_account_route' + routes.replace("WHEN 'cash' THEN", "WHEN 'cost_hotel' THEN '5000' WHEN 'cash' THEN"));
  await db.exec(migration('20261113234804_full_booking_supplier_cancellation'));
  await db.exec(read('scripts/test-automatic-booking-supplier-cancellation.sql'));
  console.log('Automatic supplier cancellation PostgreSQL scenarios passed');
} catch (error) {
  console.error(error.message, error.where || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
