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
} catch (error) {
  console.error(error.message, error.where || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
