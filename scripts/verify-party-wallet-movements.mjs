import assert from 'node:assert/strict';
import { listPartyWalletMovements } from '../src/lib/partyWalletMovements.ts';

const payment = {
  id: 'payment:1', date: '2026-11-10', label: 'دفعة من العميل',
  amount: 1000, currency: 'EGP', balanceDelta: 0, cashDirection: 'in',
};
const refund = {
  id: 'c1', kind: 'customer', status: 'paid', amount: 500, currency: 'EGP',
  createdAt: '2026-11-10T17:00:00Z', decisionAt: '2026-11-11T11:00:00Z',
  paidAt: '2026-11-13T11:00:00Z', treasuryName: 'Treasury', source: 'Booking 1',
  movements: [
    { id: 's1', amount: 300, created_at: '2026-11-12T11:00:00Z', invoice_id: 'i1', invoice: { invoice_number: 'INV-1' } },
    { id: 's2', amount: 200, created_at: '2026-11-13T11:00:00Z', treasury_account_id: 't1' },
  ],
};
const [payout, invoice, approval, receipt] = listPartyWalletMovements([payment], [refund]);
assert.deepEqual([payout.id, invoice.id, approval.id, receipt.id], ['settlement:s2', 'settlement:s1', 'refund:c1', 'payment:1']);
assert.deepEqual([payout.balanceDelta, payout.cashDirection], [-200, 'out']);
assert.deepEqual([invoice.balanceDelta, invoice.cashDirection, invoice.document], [-300, undefined, 'INV-1']);
assert.equal(approval.balanceDelta, 500);
assert.equal(receipt.balanceDelta, 0);

const [direct] = listPartyWalletMovements([], [{ ...refund, movements: [] }]);
assert.deepEqual([direct.date, direct.amount, direct.balanceDelta, direct.cashDirection], [refund.paidAt, 500, 0, 'out']);
const [partner] = listPartyWalletMovements([], [{ ...refund, movements: [], pilgrimageB2B: true }]);
assert.equal(partner.label, 'صرف استرداد حج وعمرة للشريك');
const [pending] = listPartyWalletMovements([], [{ ...refund, status: 'requested', movements: [], decisionAt: null }]);
assert.deepEqual([pending.date, pending.balanceDelta, pending.cashDirection], [refund.createdAt, 0, undefined]);

const [supplierOffset, supplierReceipt, supplierCredit] = listPartyWalletMovements([], [{
  ...refund,
  kind: 'supplier', status: 'confirmed', currency: 'USD',
  movements: [
    { id: 's3', amount: 70, created_at: '2026-11-13T10:00:00Z', treasury_account_id: 't1' },
    { id: 's4', amount: 200, created_at: '2026-11-13T11:00:00Z', supplier_order_id: 'o1' },
  ],
}]);
assert.deepEqual([supplierOffset.balanceDelta, supplierOffset.cashDirection], [-200, undefined]);
assert.deepEqual([supplierReceipt.currency, supplierReceipt.balanceDelta, supplierReceipt.cashDirection], ['USD', -70, 'in']);
assert.equal(supplierCredit.balanceDelta, 500);
console.log('Wallet activity order, ordinary payments, partial settlements, and legacy refunds passed');
