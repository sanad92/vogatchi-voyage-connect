import assert from 'node:assert/strict';
import { assessEvidenceReconciliation } from './evidenceReconciliation';

const old = { status_at_link: 'paid', currency_at_link: 'USD', amount_at_link: 125 };
assert.equal(assessEvidenceReconciliation(old, {
  status: ' PAID ', currency: 'usd', amount: 125,
}), 'details_match');
assert.equal(assessEvidenceReconciliation(old, {
  status: 'reversed', currency: 'USD', amount: 125,
}), 'details_changed');
assert.equal(assessEvidenceReconciliation(old, {
  status: 'paid', currency: 'SAR', amount: 125,
}), 'details_changed');
assert.equal(assessEvidenceReconciliation(old, {
  status: 'paid', currency: 'USD', amount: 126,
}), 'details_changed');
assert.equal(assessEvidenceReconciliation(old, undefined), 'not_in_current_records');
assert.equal(assessEvidenceReconciliation(
  { status_at_link: 'document_record', currency_at_link: null, amount_at_link: null },
  { status: 'document_record', currency: null, amount: null },
), 'details_match');
assert.equal(assessEvidenceReconciliation(
  { status_at_link: 'paid', currency_at_link: 'EGP', amount_at_link: 0 },
  { status: 'paid', currency: 'EGP', amount: Number.NaN },
), 'details_changed');
console.log('Trip File linked financial evidence comparison checks passed.');
