import assert from 'node:assert/strict';

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const invoiceTotals = ({ subtotal, discount = 0, vatRate = 0, paid = 0 }) => {
  assert(subtotal >= 0 && discount >= 0 && vatRate >= 0 && paid >= 0);
  assert(discount <= subtotal);
  const net = money(subtotal - discount);
  const vat = money(net * vatRate / 100);
  const final = money(net + vat);
  assert(paid <= final);
  return { net, vat, final, remaining: money(final - paid) };
};

const allocateReceipt = ({ receipt, invoiceRemaining }) => {
  assert(receipt > 0 && invoiceRemaining >= 0);
  const receivable = money(Math.min(receipt, invoiceRemaining));
  return { receivable, customerAdvance: money(receipt - receivable) };
};

const commission = ({ profits, rate }) => {
  assert(rate >= 0 && rate <= 100);
  return money(Math.max(profits.reduce((sum, profit) => sum + profit, 0), 0) * rate / 100);
};

const groupByCurrency = (rows) => rows.reduce((totals, row) => ({
  ...totals,
  [row.currency]: money((totals[row.currency] || 0) + row.amount),
}), {});

assert.deepEqual(
  invoiceTotals({ subtotal: 1_000, discount: 100, vatRate: 14, paid: 200 }),
  { net: 900, vat: 126, final: 1_026, remaining: 826 },
  'VAT must be calculated after discount and remaining must use the final total',
);

assert.equal(money(750 - 560), 190, 'booking profit must equal selling price minus supplier cost');

assert.deepEqual(
  allocateReceipt({ receipt: 900, invoiceRemaining: 826 }),
  { receivable: 826, customerAdvance: 74 },
  'overpayment must not overstate accounts receivable',
);

assert.equal(commission({ profits: [190, 110, -50], rate: 10 }), 25, 'period commission uses net profit');
assert.equal(commission({ profits: [-100, -25], rate: 10 }), 0, 'loss periods cannot create negative commission');

assert.deepEqual(
  groupByCurrency([
    { amount: 100, currency: 'EGP' },
    { amount: 5, currency: 'USD' },
    { amount: 25, currency: 'EGP' },
  ]),
  { EGP: 125, USD: 5 },
  'different currencies must never be added into one nominal total',
);

const journal = [
  { debit: 1_026, credit: 0 },
  { debit: 0, credit: 900 },
  { debit: 0, credit: 126 },
];
assert.equal(
  money(journal.reduce((sum, line) => sum + line.debit - line.credit, 0)),
  0,
  'invoice journal must balance after discount and VAT',
);

console.log('Financial formula checks passed: 7/7');
