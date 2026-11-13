import assert from 'node:assert/strict';
import { groupLinkedServicesByCurrency } from './serviceSummary';

const groups = groupLinkedServicesByCurrency([
  { currency: 'usd', selling: 150, cost: 110 },
  { currency: 'USD', selling: 50, cost: 30 },
  { currency: 'SAR', selling: 700, cost: 550 },
  { currency: '  sar ', selling: 300, cost: 250 },
  { currency: null, selling: 1000, cost: 400 },
]);

assert.deepEqual(groups.map(g => g.currency), ['SAR', 'USD', null]);
const usd = groups.find(g => g.currency === 'USD')!;
const sar = groups.find(g => g.currency === 'SAR')!;
const missing = groups.find(g => g.currency === null)!;
assert.equal(usd.count, 2);
assert.equal(usd.totalSelling, 200);
assert.equal(usd.totalCost, 140);
assert.equal(usd.indicativeGrossProfit, 60);
assert.equal(sar.totalSelling, 1000);
assert.equal(sar.totalCost, 800);
assert.equal(sar.indicativeGrossProfit, 200);
assert.equal(missing.count, 1);
// Unknown currency is intentionally NOT reclassified as EGP or USD.
assert.equal(missing.currency, null);
assert.equal(groups.length, 3);

const incomplete = groupLinkedServicesByCurrency([
  { currency: 'EGP', selling: 200, cost: 0 },
  { currency: 'EGP', selling: Number.NaN, cost: 35 },
]);
assert.equal(incomplete.length, 1);
assert.equal(incomplete[0].zeroCostRecords, 1);
assert.equal(incomplete[0].incompleteNumbers, 1);
assert.ok(Number.isNaN(incomplete[0].indicativeGrossProfit));

assert.deepEqual(groupLinkedServicesByCurrency([]), []);
console.log('Trip File per-currency service summary checks passed.');
