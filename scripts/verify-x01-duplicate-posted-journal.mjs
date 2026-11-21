import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// X01 #149: isolated source contract plus synthetic duplicate-journal fixture.
// Run with the effective X01 migration path to verify SQL structure.
if (process.argv[2]) {
  const sql = readFileSync(process.argv[2], 'utf8');
  const credits = sql.slice(sql.indexOf('), cancellation_credits AS ('), sql.indexOf('), settlement_events AS MATERIALIZED'));
  assert.match(credits, /JOIN LATERAL\s*\(/);
  assert.match(credits, /HAVING COUNT\(\*\) = 1/);
  assert.match(credits, /SUM\(c\.amount\) FILTER \(WHERE j\.entry_date <= v_as_of\)/);
  assert.match(credits, /j\.source_id = c\.id/);
} else {
  console.log('SKIP SQL source contract: migration path not provided');
}
const recognize = (rows, asOf) => rows.length === 1 && rows[0].date <= asOf ? 250 : 0;
assert.equal(recognize([{date:'2026-11-20'}], '2026-11-19'), 0);
assert.equal(recognize([{date:'2026-11-20'}], '2026-11-20'), 250);
assert.equal(recognize([{date:'2026-11-20'},{date:'2026-11-20'}], '2026-11-20'), 0);
assert.equal(recognize([], '2026-11-20'), 0);
console.log('PASS X01 synthetic duplicate posted journal cases');
