import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #149: a draft/void legacy receipt must not reduce the current paid-cache fallback.
const sql = readFileSync(process.argv[2] ?? 'supabase/migrations/20261121171500_x01_dated_customer_cancellation_aging.sql', 'utf8');
const section = sql.split('), legacy_receipts AS (')[1]?.split('), prepared AS (')[0];
assert.ok(section, 'legacy_receipts CTE exists');
assert.match(section, /SUM\(j\.total_debit\) FILTER \(WHERE j\.status = 'posted' AND j\.entry_date <= v_as_of\) AS paid_as_of/);
assert.match(section, /SUM\(j\.total_debit\) FILTER \(WHERE j\.status = 'posted'\) AS recorded_amount/);
const rows = [
  { amount: 40, status: 'posted', date: '2026-11-10' },
  { amount: 90, status: 'draft', date: '2026-11-11' },
  { amount: 70, status: 'void', date: '2026-11-12' },
  { amount: 30, status: 'posted', date: '2026-11-25' },
];
const recorded = rows.filter(r => r.status === 'posted').reduce((n, r) => n + r.amount, 0);
const asOf = rows.filter(r => r.status === 'posted' && r.date <= '2026-11-20').reduce((n, r) => n + r.amount, 0);
assert.equal(recorded, 70);
assert.equal(asOf, 40);
assert.equal(Math.max(100 - recorded, 0), 30, 'draft and void rows do not suppress fallback');
console.log('PASS X01 legacy receipts: posted-only recorded amount, dated as-of, draft/void excluded');
