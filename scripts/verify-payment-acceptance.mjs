import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/paymentOrderBalance.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { paymentOrderBalance, canPayOrder } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
assert.deepEqual(paymentOrderBalance(1000, []), { paidAmount: 0, remainingAmount: 1000 });
assert.deepEqual(paymentOrderBalance(1000, [{amount: 300}, {amount: 200}]), { paidAmount: 500, remainingAmount: 500 });
assert.equal(paymentOrderBalance(1000, [{amount:1000}]).remainingAmount, 0);
assert.equal(paymentOrderBalance(1000, [{amount:1100}]).remainingAmount, 0);
assert.equal(paymentOrderBalance(0.3, [{amount:0.1}, {amount:0.2}]).remainingAmount, 0);
assert.equal(canPayOrder({ approval_status:'approved', status:'partially_paid', remainingAmount:500 }), true);
for (const status of ['paid','cancelled','rejected']) {
  assert.equal(canPayOrder({ approval_status:'approved', status, remainingAmount:500 }), false);
}
assert.equal(canPayOrder({ approval_status:'pending', status:'pending', remainingAmount:500 }), false);
assert.equal(canPayOrder({ approval_status:'approved', status:'approved', remainingAmount:0 }), false);
console.log('Payment acceptance: 11 behavioral checks passed. Database authorization and browser payment execution require separate verification.');
