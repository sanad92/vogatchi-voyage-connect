import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/lib/itineraryPricing.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const { priceItineraryLine } = sandbox.exports;
const scenarios = [
  { cost: 100, quantity: 3, exchangeRate: 1, markupType: 'percent', markup: 15 },
  { cost: 12.345, quantity: 7, exchangeRate: 53.27, markupType: 'fixed', markup: 200 },
  { cost: 18.88, quantity: 9, exchangeRate: 1, markupType: 'manual', markup: 200 },
  { cost: 0.01, quantity: 3, exchangeRate: 1, markupType: 'manual', markup: 0.01 },
  { cost: 999.99, quantity: 2, exchangeRate: 0.25, markupType: 'percent', markup: 8 },
];
for (const line of scenarios) {
  const result = priceItineraryLine(line);
  const dbCost = Math.round((result.costPrice * line.quantity + Number.EPSILON) * 100) / 100;
  const dbSale = Math.round((result.sellingPrice * line.quantity + Number.EPSILON) * 100) / 100;
  assert.equal(result.totalCost, dbCost);
  assert.equal(result.totalSale, dbSale);
  assert.ok(Number.isFinite(result.totalSale));
}
console.log('Itinerary pricing rounding: 5 scenarios passed');
