import assert from 'node:assert/strict';
import { bookingStatusLabel } from '../src/lib/bookingStatus.ts';
import { bookingCollectionStatus, recommendNextAction, verifiedWorkflowStage } from '../src/lib/bookingWorkflow.ts';
import { customerDisplayName } from '../src/lib/customerDisplayName.ts';
import { installPageAssetRecovery } from '../src/lib/recoverPageAssets.ts';

const statusFor = (collected, remaining) => bookingCollectionStatus({
  customer_collected: collected,
  customer_remaining: remaining,
});

const context = {
  stage: 'paid',
  bookingId: 'example',
  hasInvoice: true,
  hasVoucher: false,
  canCreateInvoice: true,
  canRecordPayment: true,
};
const next = (paymentStatus, options = {}) => recommendNextAction({ ...context, paymentStatus, ...options });

assert.equal(statusFor(0, 500), 'unpaid');
assert.equal(verifiedWorkflowStage('paid', 'unpaid'), 'confirmed');
assert.equal(verifiedWorkflowStage('paid', 'unpaid', 'pending'), 'quoted');
assert.equal(verifiedWorkflowStage('operations', 'partial'), 'operations');
assert.equal(next('unpaid').key, 'record-payment');
assert.equal(next('unpaid').advanceTo, undefined);
assert.equal(next('unpaid', { canRecordPayment: false }).key, 'none');
assert.equal(statusFor(499.99, 0.01), 'partial');
assert.equal(next('partial').key, 'record-payment');
assert.equal(statusFor(500, 0), 'paid');
assert.equal(verifiedWorkflowStage('confirmed', 'paid'), 'paid');
assert.equal(next('paid', { stage: 'confirmed' }).key, 'issue-voucher');
assert.equal(next('paid', { stage: 'confirmed' }).advanceTo, undefined);
assert.equal(next('paid', { hasVoucher: true }).key, 'none');
assert.equal(next('paid', { stage: 'cancelled' }).key, 'none');
assert.equal(statusFor(0, 0), 'no_balance');
assert.equal(bookingCollectionStatus({ customer_collected: 500, customer_remaining: 0 }, true), 'no_balance');
assert.equal(bookingCollectionStatus(), 'unknown');
assert.equal(next('unknown').key, 'none');
assert.equal(next('unpaid', { hasInvoice: false }).key, 'issue-invoice');

assert.equal(bookingStatusLabel('confirmed'), 'مؤكد');
assert.equal(bookingStatusLabel('cancelled'), 'ملغي');
assert.equal(bookingStatusLabel('canceled'), 'ملغي');
assert.equal(bookingStatusLabel('constructor'), 'غير محدد');
assert.equal(customerDisplayName('=D9=85=D8=AD=D9=85=D8=AF'), 'محمد');
assert.equal(customerDisplayName('=?UTF-8?Q?=D9=85=D8=AD=D9=85=D8=AF_Ali?='), 'محمد Ali');
assert.equal(customerDisplayName('=d9=85 =d8=b9'), 'م ع');
assert.equal(customerDisplayName('=?UTF-8?Q?=D9=85?= =?UTF-8?Q?=D9=86?='), 'من');
assert.equal(customerDisplayName('A=41=42'), 'A=41=42');
assert.equal(customerDisplayName('=D9=FF'), '=D9=FF');
assert.equal(customerDisplayName('=D9=85=D8=B1=D9=83=D'), 'مرك…');
assert.equal(customerDisplayName('=D9=85=D8=B1=D9='), 'مر…');
assert.equal(customerDisplayName('=D9=85=D8=B1=D9'), 'مر…');
assert.equal(customerDisplayName('=D9=85=D8=B1=20=D8=B9=D9=85'), 'مر عم');
assert.equal(customerDisplayName('=D9=85=D8=B1=20=D'), 'مر…');
assert.equal(customerDisplayName('=D9=85=D8=B1=D9=FF'), '=D9=85=D8=B1=D9=FF');
assert.equal(customerDisplayName('A=41=42='), 'A=41=42=');
assert.equal(customerDisplayName('مها السيد'), 'مها السيد');

const storage = new Map();
let reloads = 0;
let online = false;
let preloadError;
Object.defineProperties(globalThis, {
  navigator: { configurable: true, value: { get onLine() { return online; } } },
  sessionStorage: { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } },
  window: { configurable: true, value: {
    addEventListener: (name, listener) => {
      assert.equal(name, 'vite:preloadError');
      preloadError = listener;
    },
    location: { reload: () => { reloads += 1; } },
  } },
});

installPageAssetRecovery();
const dispatchPreloadError = (message = 'Failed to fetch dynamically imported module') => {
  const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: new Error(message) });
  preloadError(event);
  return event.defaultPrevented;
};
assert.equal(dispatchPreloadError(), false);
online = true;
assert.equal(dispatchPreloadError('Cannot read properties of undefined'), false);
assert.equal(dispatchPreloadError(), true);
assert.equal(dispatchPreloadError(), false);
assert.equal(reloads, 1);

console.log('Booking status, collection, voucher recommendations, customer names and asset recovery verified.');
