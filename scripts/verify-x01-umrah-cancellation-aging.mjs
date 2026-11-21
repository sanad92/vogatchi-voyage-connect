import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression contract for #149: test both posted credit writers without production data.
// The SQL still needs an isolated PostgreSQL migration-chain integration run.
const sql = readFileSync(new URL('../supabase/migrations/20261121171500_x01_dated_customer_cancellation_aging.sql', import.meta.url), 'utf8');
const umrahWriter = readFileSync(new URL('../supabase/migrations/20261117135404_unify_umrah_booking_accounting.sql', import.meta.url), 'utf8');
const sources = sql.match(/WITH cancellation_sources AS \(([\s\S]*?)\), eligible_invoices AS \(/i)?.[1];
assert.ok(sources, 'dated customer aging must define canonical cancellation sources');
assert.match(sources, /FROM public\.booking_cancellation_invoice_credits c/);
assert.match(sources, /FROM public\.umrah_booking_invoice_credits u/);
assert.match(sources, /u\.operation_id AS id/);
assert.match(sources, /u\.organization_id = _org_id/);
assert.match(sources, /i\.organization_id = u\.organization_id/);
assert.match(sources, /upper\(i\.currency\) = v_currency/);
assert.equal((sql.match(/(?:FROM|JOIN) cancellation_sources c/g) ?? []).length, 2,
  'both cancelled invoice eligibility and dated balances must include both credit writers');
assert.match(sql, /j\.source_id = c\.id/);
assert.match(sql, /j\.source_type = 'booking_cancellation_invoice_credit'/);
assert.match(sql, /j\.organization_id = i\.organization_id/);
assert.match(sql, /j\.booking_id = i\.booking_id/);
assert.match(sql, /j\.currency = v_currency/);
assert.match(sql, /j\.status = 'posted' AND j\.is_locked/);
assert.match(sql, /FILTER \(WHERE j\.entry_date <= v_as_of\)/);
assert.match(umrahWriter, /INSERT INTO public\.umrah_booking_invoice_credits \(operation_id, organization_id, invoice_id, amount\)/);
assert.match(umrahWriter, /'booking_cancellation_invoice_credit', operation\.id, b\.id/);

// Synthetic as-of model: both sources use one locked posted journal per credit,
// and never consume offsets from a different tenant, booking or currency.
const invoices = [
  { id: 'regular-invoice', booking: 'regular-booking', org: 'A', currency: 'SAR', face: 500, cash: 0 },
  { id: 'umrah-invoice', booking: 'umrah-booking', org: 'A', currency: 'EGP', face: 1000, cash: 300 },
];
const credits = [
  { id: 'booking-credit', invoice: 'regular-invoice', booking: 'regular-booking', org: 'A', currency: 'SAR', amount: 500 },
  { id: 'umrah-operation', invoice: 'umrah-invoice', booking: 'umrah-booking', org: 'A', currency: 'EGP', amount: 700 },
  { id: 'wrong-tenant', invoice: 'umrah-invoice', booking: 'umrah-booking', org: 'B', currency: 'EGP', amount: 500 },
  { id: 'wrong-booking', invoice: 'umrah-invoice', booking: 'other-booking', org: 'A', currency: 'EGP', amount: 500 },
];
const journals = [
  { source: 'booking-credit', org: 'A', booking: 'regular-booking', currency: 'SAR', amount: 500, date: '2026-11-20', posted: true, locked: true },
  { source: 'umrah-operation', org: 'A', booking: 'umrah-booking', currency: 'EGP', amount: 700, date: '2026-11-20', posted: true, locked: true },
  { source: 'wrong-tenant', org: 'B', booking: 'umrah-booking', currency: 'EGP', amount: 500, date: '2026-11-18', posted: true, locked: true },
  { source: 'wrong-booking', org: 'A', booking: 'other-booking', currency: 'EGP', amount: 500, date: '2026-11-18', posted: true, locked: true },
  { source: 'unposted', org: 'A', booking: 'umrah-booking', currency: 'EGP', amount: 900, date: '2026-11-18', posted: false, locked: true },
];
function balanceAsOf(invoice, date) {
  const applied = credits.filter(c => c.invoice === invoice.id && c.booking === invoice.booking
    && c.org === invoice.org && c.currency === invoice.currency)
    .reduce((sum, c) => sum + journals.filter(j => j.source === c.id && j.org === invoice.org
      && j.booking === invoice.booking && j.currency === invoice.currency && j.amount === c.amount
      && j.posted && j.locked && j.date <= date).reduce((x, j) => x + j.amount, 0), 0);
  return Math.max(0, invoice.face - invoice.cash - applied);
}
assert.equal(balanceAsOf(invoices[0], '2026-11-19'), 500);
assert.equal(balanceAsOf(invoices[0], '2026-11-20'), 0);
assert.equal(balanceAsOf(invoices[1], '2026-11-19'), 700);
assert.equal(balanceAsOf(invoices[1], '2026-11-20'), 0);
console.log('PASS #149 standard + Umrah dated cancellation source contract and synthetic balances');
