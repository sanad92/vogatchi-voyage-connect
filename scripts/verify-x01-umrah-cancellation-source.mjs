import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #149: guard both Umrah and standard cancellation sources against cross-tenant or cross-booking credit attribution.
const sql = readFileSync(process.argv[2] ?? 'supabase/migrations/20261121171500_x01_dated_customer_cancellation_aging.sql', 'utf8');
const source = sql.split('WITH cancellation_sources AS (')[1]?.split('), eligible_invoices AS (')[0];
const eligible = sql.split('), eligible_invoices AS (')[1]?.split('), cancellation_credits AS (')[0];
const credits = sql.split('), cancellation_credits AS (')[1]?.split('), settlement_events AS MATERIALIZED (')[0];
assert.ok(source && eligible && credits, 'X01 cancellation CTEs exist');
for (const re of [/FROM public\.booking_cancellation_invoice_credits c/, /FROM public\.umrah_booking_invoice_credits u/, /UNION ALL/, /u\.operation_id AS id/, /i\.organization_id = u\.organization_id AND i\.booking_type = 'umrah'/, /u\.organization_id = _org_id AND upper\(i\.currency\) = v_currency/]) assert.match(source, re);
for (const section of [eligible, credits]) {
  for (const re of [/c\.invoice_id = i\.id AND c\.booking_id = i\.booking_id/, /j\.source_id = c\.id/, /j\.source_type = 'booking_cancellation_invoice_credit'/, /j\.organization_id = i\.organization_id/, /j\.booking_id = i\.booking_id/, /j\.currency = v_currency/, /j\.status = 'posted' AND j\.is_locked/, /HAVING COUNT\(\*\) = 1/]) assert.match(section, re);
}
const invoice = {id:'i1', booking:'b1', org:'o1', currency:'EGP'};
const credit = {invoice:'i1', booking:'b1', org:'o1', currency:'EGP', id:'c1', amount:250};
const journal = {source:'c1', booking:'b1', org:'o1', currency:'EGP', amount:250, posted:true, locked:true, date:'2026-11-20'};
const recognize = (c, rows, asOf) => {
  if (c.invoice !== invoice.id || c.booking !== invoice.booking || c.org !== invoice.org || c.currency !== invoice.currency || c.amount <= 0) return 0;
  const matching = rows.filter(j => j.source === c.id && j.booking === invoice.booking && j.org === invoice.org && j.currency === invoice.currency && j.amount === c.amount && j.posted && j.locked && j.date);
  return matching.length === 1 && matching[0].date <= asOf ? c.amount : 0;
};
assert.equal(recognize(credit,[journal],'2026-11-19'),0);
assert.equal(recognize(credit,[journal],'2026-11-20'),250);
for (const [c, rows] of [
  [{...credit,org:'o2'},[journal]], [{...credit,invoice:'i2'},[journal]],
  [{...credit,booking:'b2'},[journal]], [{...credit,currency:'SAR'},[journal]],
  [credit,[{...journal,org:'o2'}]], [credit,[{...journal,booking:'b2'}]],
  [credit,[{...journal,currency:'SAR'}]], [credit,[{...journal,posted:false}]],
  [credit,[{...journal,locked:false}]], [credit,[journal,journal]], [credit,[]]
]) assert.equal(recognize(c,rows,'2026-11-21'),0);
console.log('PASS X01 Umrah/booking source contract and 13 synthetic isolation/as-of scenarios');
