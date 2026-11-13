import assert from 'node:assert/strict';
import {
  reviewBookingEvidenceAllocations,
  type AllocationReviewInput,
  type FinanceSourceRow,
} from './allocationReview';

const orgId = 'org-a';
const bookingId = 'booking-a';
const row = (
  id: string, amount: number, status: string, extra: Partial<FinanceSourceRow> = {},
): FinanceSourceRow => ({
  id, organization_id: orgId, booking_id: bookingId,
  currency: 'USD', amount, status, ...extra,
});
const evidence = (id: string, type: AllocationReviewInput['links'][number]['source_type'],
  amount: number | null, status: string | null) => ({
  id: `link-${id}`, source_type: type, source_id: id,
  status_at_link: status, currency_at_link: 'USD',
  amount_at_link: amount, change_request_id: 'change-1',
});
const base = (): AllocationReviewInput => ({
  orgId, bookingId,
  links: [
    evidence('ci1', 'customer_invoice', 500, 'issued'),
    evidence('cp1', 'customer_payment', 250, 'completed'),
    evidence('si1', 'supplier_invoice', 400, 'partial'),
    evidence('sp1', 'supplier_payment', 100, 'paid'),
    evidence('doc1', 'generated_document', null, 'document_record'),
  ],
  customerInvoices: [row('ci1', 500, 'issued', { recordedPaid: 250 })],
  customerPayments: [row('cp1', 250, 'completed')],
  supplierInvoices: [row('si1', 400, 'partial', { recordedPaid: 100 })],
  supplierPayments: [row('sp1', 100, 'paid')],
  generatedDocuments: [row('doc1', null as unknown as number, 'document_record')],
  customerAllocations: [{
    id: 'ca1', organization_id: orgId,
    invoice_id: 'ci1', payment_id: 'cp1', amount: 250,
  }],
  supplierAllocations: [{
    id: 'sa1', organization_id: orgId,
    supplier_invoice_id: 'si1', supplier_payment_id: 'sp1', amount: 100,
  }],
});
const byId = (input: AllocationReviewInput) => new Map(
  reviewBookingEvidenceAllocations(input).map(result => [result.sourceId, result]),
);

const standard = byId(base());
assert.equal(standard.get('ci1')?.state, 'partially_allocated');
assert.equal(standard.get('ci1')?.allocated, 250);
assert.equal(standard.get('ci1')?.inconsistencies.length, 0);
assert.equal(standard.get('cp1')?.state, 'allocated_in_records');
assert.equal(standard.get('si1')?.state, 'partially_allocated');
assert.equal(standard.get('sp1')?.state, 'allocated_in_records');
assert.equal(standard.get('doc1')?.state, 'not_a_payment_document');
assert.equal(standard.get('doc1')?.allocated, null);

const reversed = base();
reversed.customerPayments[0].status = 'reversed';
assert.equal(byId(reversed).get('cp1')?.state, 'void_or_reversed');
assert.equal(byId(reversed).get('ci1')?.state, 'allocation_conflict');

const hidden = base();
hidden.supplierInvoices = [];
assert.equal(byId(hidden).get('si1')?.state, 'source_not_visible');
assert.equal(byId(hidden).get('sp1')?.state, 'allocation_conflict');

const wrongCompany = base();
wrongCompany.customerAllocations[0].organization_id = 'org-b';
assert.equal(byId(wrongCompany).get('ci1')?.state, 'allocation_conflict');

const anotherBooking = base();
anotherBooking.customerPayments[0].booking_id = 'booking-b';
assert.equal(byId(anotherBooking).get('ci1')?.state, 'allocation_conflict');

const differentCurrency = base();
differentCurrency.customerPayments[0].currency = 'SAR';
assert.equal(byId(differentCurrency).get('ci1')?.state, 'allocation_conflict');

const overallocated = base();
overallocated.customerAllocations[0].amount = 600;
assert.equal(byId(overallocated).get('ci1')?.state, 'over_allocated');

const noAllocation = base();
noAllocation.customerAllocations = [];
assert.equal(byId(noAllocation).get('ci1')?.state, 'no_matching_allocation');
assert.ok(
  byId(noAllocation).get('ci1')?.inconsistencies.some(x => x.includes('حقل المسدد')),
  'legacy amount_paid must not silently replace missing allocation records',
);

const incomplete = base();
incomplete.incompleteData = true;
assert.equal(byId(incomplete).get('ci1')?.state, 'data_incomplete');
assert.equal(byId(incomplete).get('cp1')?.state, 'data_incomplete');

const invalidAmount = base();
invalidAmount.customerInvoices[0].amount = Number.NaN;
assert.equal(byId(invalidAmount).get('ci1')?.state, 'data_incomplete');

const changed = base();
changed.supplierPayments[0].amount = 90;
assert.equal(byId(changed).get('sp1')?.changedSinceLink, true);
assert.equal(byId(changed).get('sp1')?.state, 'over_allocated');

const poOnly = base();
poOnly.supplierAllocations[0].supplier_invoice_id = null;
assert.equal(byId(poOnly).get('sp1')?.state, 'allocation_conflict');

const empty = base();
empty.links = [];
assert.deepEqual(reviewBookingEvidenceAllocations(empty), []);

console.log('Trip File allocation-based financial review checks passed.');
