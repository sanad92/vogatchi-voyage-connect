import assert from 'node:assert/strict';

// Synthetic event-stream regression: credits are not cash receipts.
// A joined journal can repeat a source; identity, not amount, deduplicates.
function balanceAsOf({ face, events, asOf, org, currency }) {
  const seen = new Set();
  const totals = { cash: 0, wallet: 0, cancellation: 0 };
  for (const event of events) {
    if (event.org !== org || event.currency !== currency ||
        event.date > asOf || event.status !== 'posted' || event.reversed) continue;
    if (!Object.hasOwn(totals, event.kind)) continue;
    if (!event.sourceId || !Number.isFinite(event.amount) || event.amount <= 0)
      throw new Error('Invalid accounting event');
    const key = `${event.kind}:${event.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    totals[event.kind] += event.amount;
  }
  return { ...totals, outstanding: Math.max(0, face - Object.values(totals).reduce((a,b)=>a+b,0)) };
}
const base = { face: 1000, org: 'A', currency: 'EGP' };
const cash = { kind:'cash', sourceId:'receipt-1', amount:300, date:'2026-11-05', status:'posted', org:'A', currency:'EGP' };
const cancellation = { kind:'cancellation', sourceId:'credit-1', amount:200, date:'2026-11-20', status:'posted', org:'A', currency:'EGP' };
const wallet = { kind:'wallet', sourceId:'wallet-1', amount:100, date:'2026-11-18', status:'posted', org:'A', currency:'EGP' };
const events = [cash, cancellation, { ...cancellation }, wallet,
  { ...cancellation, sourceId:'credit-foreign', org:'B', amount:900 },
  { ...cancellation, sourceId:'credit-SAR', currency:'SAR', amount:900 },
  { ...cancellation, sourceId:'credit-draft', status:'draft', amount:900 },
  { ...cancellation, sourceId:'credit-reversed', reversed:true, amount:900 },
  { ...cancellation, sourceId:'credit-future', date:'2026-12-01', amount:900 }];
assert.deepEqual(balanceAsOf({ ...base, events, asOf:'2026-11-10' }),
  { cash:300, wallet:0, cancellation:0, outstanding:700 });
assert.deepEqual(balanceAsOf({ ...base, events, asOf:'2026-11-19' }),
  { cash:300, wallet:100, cancellation:0, outstanding:600 });
assert.deepEqual(balanceAsOf({ ...base, events, asOf:'2026-11-20' }),
  { cash:300, wallet:100, cancellation:200, outstanding:400 });
// Equal amounts from distinct source identities must both be counted.
assert.equal(balanceAsOf({ ...base, events:[cancellation, {...cancellation, sourceId:'credit-2'}], asOf:'2026-11-20' }).outstanding,600);
// Supplier payable uses the same dated contract but its own SAR currency.
assert.equal(balanceAsOf({ face:1000, org:'A', currency:'SAR', asOf:'2026-11-20', events:[
  { kind:'cash', sourceId:'supplier-pay-1', amount:300, date:'2026-11-05', status:'posted', org:'A', currency:'SAR' },
  { kind:'cancellation', sourceId:'supplier-credit-1', amount:700, date:'2026-11-20', status:'posted', org:'A', currency:'SAR' }
] }).outstanding,0);
assert.throws(() => balanceAsOf({ ...base, asOf:'2026-11-20', events:[{ ...cancellation, sourceId:'' }] }), /Invalid accounting event/);
console.log('PASS X01 synthetic identity dedup, separate cash/wallet/credit, as-of, tenant, currency, status, reversal, supplier');
