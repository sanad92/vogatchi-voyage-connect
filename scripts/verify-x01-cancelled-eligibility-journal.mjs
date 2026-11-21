import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #149: cancelled-invoice eligibility must not be broader than dated-credit recognition.
const sql = readFileSync(process.argv[2] ?? 'supabase/migrations/20261121171500_x01_dated_customer_cancellation_aging.sql', 'utf8');
const eligibility = sql.split('), eligible_invoices AS (')[1]?.split('), cancellation_credits AS (')[0];
const credits = sql.split('), cancellation_credits AS (')[1]?.split('), settlement_events AS MATERIALIZED (')[0];
assert.ok(eligibility && credits, 'X01 aging CTEs must exist');
for (const [name, body] of [['eligibility', eligibility], ['credits', credits]]) {
  assert.match(body, /JOIN LATERAL\s*\(/, name);
  assert.match(body, /HAVING COUNT\(\*\) = 1/, name);
  assert.match(body, /j\.entry_date IS NOT NULL/, name);
  assert.match(body, /j\.status = 'posted' AND j\.is_locked/, name);
  assert.match(body, /j\.total_debit = c\.amount AND j\.total_credit = c\.amount/, name);
  assert.match(body, /j\.booking_id = i\.booking_id/, name);
  assert.match(body, /j\.organization_id = i\.organization_id/, name);
  assert.match(body, /j\.currency = v_currency/, name);
}
const valid = rows => rows.filter(j => j.status === 'posted' && j.locked && j.date !== null && j.amount === 250);
const eligible = rows => valid(rows).length === 1;
const recognized = (rows, date) => eligible(rows) && valid(rows)[0].date <= date ? 250 : 0;
const posted = {status:'posted', locked:true, date:'2026-11-20', amount:250};
for (const rows of [[], [posted,posted], [{...posted,status:'draft'}], [{...posted,locked:false}], [{...posted,date:null}], [{...posted,amount:249}]]) {
  assert.equal(eligible(rows), false);
  assert.equal(recognized(rows,'2026-11-21'),0);
}
assert.equal(eligible([posted]),true);
assert.equal(recognized([posted],'2026-11-19'),0);
assert.equal(recognized([posted],'2026-11-20'),250);
console.log('PASS X01 cancelled eligibility and dated credit use identical unique posted journal guards');
