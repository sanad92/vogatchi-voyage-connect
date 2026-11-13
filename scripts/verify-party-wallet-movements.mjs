import assert from 'node:assert/strict';
import { listPartyWalletMovements, walletDocumentPath } from '../src/lib/partyWalletMovements.ts';

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
assert.deepEqual(invoice.links.map(link => walletDocumentPath(link, 'customer')), [
  '/invoices?id=i1', '/refund-balances?kind=customer&view=all&refund=c1',
]);
assert.equal(walletDocumentPath(approval.links[0], 'customer'), '/refund-balances?kind=customer&view=all&refund=c1');
assert.equal(walletDocumentPath({ kind: 'booking', id: 'booking/id', label: 'Booking' }, 'customer'), '/bookings/booking%2Fid/workspace?tab=financials');

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
    { id: 's4', amount: 200, created_at: '2026-11-13T11:00:00Z', supplier_order_id: 'o1', order: { reference_number: 'PO-1' } },
  ],
}]);
assert.deepEqual([supplierOffset.balanceDelta, supplierOffset.cashDirection], [-200, undefined]);
assert.deepEqual([supplierReceipt.currency, supplierReceipt.balanceDelta, supplierReceipt.cashDirection], ['USD', -70, 'in']);
assert.equal(supplierCredit.balanceDelta, 500);
assert.deepEqual(supplierOffset.links.map(link => walletDocumentPath(link, 'supplier')), [
  '/payment-orders?id=o1', '/refund-balances?kind=supplier&view=all&refund=c1',
]);
console.log('Wallet activity order, ordinary payments, partial settlements, and legacy refunds passed');

const { buildWalletStatement, walletStatementDay } = await import('../src/lib/walletStatement.ts');
assert.equal(walletStatementDay('2026-11-09T22:30:00Z'), '2026-11-10');
assert.equal(walletStatementDay('2026-11-09'), '2026-11-09');
const { rows, totals, undatedCount } = buildWalletStatement([
  { ...payment, id: 'before', date: '2026-11-09', balanceDelta: 500 },
  { ...payment, id: 'approval', date: '2026-11-09T22:30:00Z', balanceDelta: 300 },
  { ...payment, id: 'applied', date: '2026-11-13', balanceDelta: -150 },
  { ...payment, id: 'outside', date: '2026-11-13T22:30:00Z', balanceDelta: -100 },
  { ...payment, id: 'usd', date: '2026-11-12', currency: 'USD', balanceDelta: 72.31 },
  { ...payment, id: 'supplier-cash', date: '2026-11-12', currency: 'SAR', balanceDelta: 0 },
  { ...payment, id: 'undated', date: null },
], '2026-11-10', '2026-11-13');
assert.deepEqual(rows.map(row => row.id), ['approval', 'supplier-cash', 'usd', 'applied']);
assert.deepEqual(totals, [
  { currency: 'EGP', opening: 50000, added: 30000, applied: 15000, closing: 65000 },
  { currency: 'SAR', opening: 0, added: 0, applied: 0, closing: 0 },
  { currency: 'USD', opening: 0, added: 7231, applied: 0, closing: 7231 },
]);
assert.equal(undatedCount, 1);
console.log('Wallet statement inclusive dates, Cairo cutoff, per-currency balances and undated handling passed');
