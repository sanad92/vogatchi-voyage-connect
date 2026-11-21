import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// X01: effective SQL contract + synthetic arithmetic; never connects to production.
const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Usage: node scripts/verify-x01-historical-cancellation.mjs <effective-aging.sql>');
  process.exit(2);
}
const outstanding = ({ total, payments, credits, asOf, org, currency }) =>
  Math.max(0, total - [...payments, ...credits]
    .filter(e => e.org === org && e.currency === currency && e.posted && !e.reversed && e.date <= asOf)
    .reduce((sum, e) => sum + e.amount, 0));
const invoice = { total: 1000, org: 'tenant-A', currency: 'EGP',
  payments: [{ amount: 300, date: '2026-11-05', org: 'tenant-A', currency: 'EGP', posted: true }],
  credits: [{ amount: 200, date: '2026-11-20', org: 'tenant-A', currency: 'EGP', posted: true },
    { amount: 900, date: '2026-11-10', org: 'tenant-B', currency: 'EGP', posted: true },
    { amount: 900, date: '2026-11-10', org: 'tenant-A', currency: 'SAR', posted: true },
    { amount: 900, date: '2026-11-10', org: 'tenant-A', currency: 'EGP', posted: false }] };
assert.equal(outstanding({ ...invoice, asOf: '2026-11-10' }), 700);
assert.equal(outstanding({ ...invoice, asOf: '2026-11-20' }), 500);
assert.equal(outstanding({ ...invoice, asOf: '2026-11-21', credits: [...invoice.credits,
  { amount: 800, date: '2026-11-21', org: 'tenant-A', currency: 'EGP', posted: true, reversed: true }] }), 500);
console.log('PASS synthetic partial cancellation, tenant, currency, posted/reversed and as-of arithmetic');

// Full cancellation must be invisible as a receivable only after its posted date,
// not because its mutable invoice status has already changed.
const full = { total: 1000, org: 'tenant-A', currency: 'EGP',
  payments: [], credits: [{ amount: 1000, date: '2026-11-20', org: 'tenant-A',
    currency: 'EGP', posted: true }] };
assert.equal(outstanding({ ...full, asOf: '2026-11-19' }), 1000);
assert.equal(outstanding({ ...full, asOf: '2026-11-20' }), 0);
// Supplier credit is scoped by tenant and SAR; pending and reversed offsets
// cannot reduce a historical payable.
const supplier = { total: 1000, org: 'tenant-A', currency: 'SAR',
  payments: [{ amount: 300, date: '2026-11-05', org: 'tenant-A', currency: 'SAR', posted: true }],
  credits: [{ amount: 700, date: '2026-11-20', org: 'tenant-A', currency: 'SAR', posted: true },
    { amount: 700, date: '2026-11-10', org: 'tenant-B', currency: 'SAR', posted: true },
    { amount: 700, date: '2026-11-10', org: 'tenant-A', currency: 'EGP', posted: true },
    { amount: 700, date: '2026-11-10', org: 'tenant-A', currency: 'SAR', posted: false }] };
assert.equal(outstanding({ ...supplier, asOf: '2026-11-19' }), 700);
assert.equal(outstanding({ ...supplier, asOf: '2026-11-20' }), 0);
console.log('PASS synthetic full customer cancellation and supplier SAR dated cancellation');


// Contract gate intentionally fails on current SQL: it is a regression guard, not a functional fix.
// Pass the final effective definition, not an older migration shadowed by a newer override.
const sql = readFileSync(sqlPath, 'utf8');
for (const name of ['get_customer_aging_details_v2', 'get_supplier_aging_details_v2']) {
  const start = sql.search(new RegExp('CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.' + name + '\\s*\\(', 'i'));
  assert.notEqual(start, -1, name + ': missing effective definition');
  const end = sql.indexOf('$$;', start);
  assert.notEqual(end, -1, name + ': unterminated function');
  const definition = sql.slice(start, end + 3);
  assert.doesNotMatch(definition,
    /AND\s+COALESCE\(lower\(i\.status\),\s*''\)\s+NOT\s+IN\s*\('cancelled',\s*'canceled',\s*'void',\s*'draft'\)/i,
    name + ': mutable current status hides historical invoices');
  assert.match(definition, /booking_cancellation_invoice_credits|dated_cancellation_credit/i,
    name + ': no dated cancellation credit source');
  console.log('PASS ' + name + ': dated cancellation contract');
}
