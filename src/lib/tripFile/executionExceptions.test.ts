import assert from 'node:assert/strict';
import { assessAmendmentExecutionExceptions, type ExecutionReviewInput } from './executionExceptions';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import type { BookingSourceEvidence } from '@/hooks/useBookingChangeSourceEvidence';
import type { EvidenceReviewLine } from './allocationReview';

const org='org-1', booking='booking-1', requestId='req-1';
const proposal = (): BookingChangeRequest => ({
  id:requestId, booking_id:booking, organization_id:org, status:'approved',
  change_kind:'room', service_kind:'hotel', service_reference:'supplier-123',
  description:'Change double room to triple', proposed_selling_delta:0,
  proposed_cost_delta:0, estimate_currency:'USD', requested_by:'requester',
  requested_at:'2026-11-07T00:00:00Z', reviewed_by:'manager', reviewed_at:'2026-11-07T01:00:00Z',
  review_note:null,
});
const handoff = (): BookingChangeHandoff => ({
  id:'h-1',change_request_id:requestId,organization_id:org,booking_id:booking,
  status:'execution_reported',supplier_reference:'SUP-REF',supplier_confirmed_by:'operations',
  supplier_confirmed_at:'2026-11-07T01:01:00Z',finance_reference:'FIN-REF',
  finance_reviewed_by:'finance',finance_reviewed_at:'2026-11-07T01:02:00Z',
  execution_reference:'OP-REF',execution_reported_by:'manager',
  execution_reported_at:'2026-11-07T01:03:00Z',blocked_at:null,
});
const link = (type: BookingSourceEvidence['source_type'], id:string):BookingSourceEvidence => ({
  id:'link-'+id, organization_id:org,booking_id:booking,
  change_request_id:requestId,source_type:type,source_id:id,
  status_at_link:'issued',currency_at_link:'USD',amount_at_link:500,
  reference_at_link:'TEST-REF',linked_by:'finance',linked_at:'2026-11-07T01:05:00Z',
});
const allocation=(linkId:string,state:EvidenceReviewLine['state'],
  changedSinceLink=false):EvidenceReviewLine=>({
  evidenceId:linkId,requestId,type:'customer_invoice',sourceId:linkId.slice(5),
  state,changedSinceLink,amount:500,currency:'USD',allocated:500,recordedPaid:500,
  inconsistencies:[],
});
const base=():ExecutionReviewInput=>({
  organizationId:org,bookingId:booking,bookingStatus:'confirmed',workflowStage:'confirmed',
  requests:[proposal()],handoffs:[handoff()],evidence:[],allocations:[],dataComplete:true,
});
const review=(input:ExecutionReviewInput)=>assessAmendmentExecutionExceptions(input)[0];
const codes=(input:ExecutionReviewInput)=>review(input).issues.map(i=>i.code);
const clean=review(base());
assert.equal(clean.assessment,'internal_records_documented');
assert.equal(clean.externalProviderVerification,'not_implemented');
assert.equal(clean.issues.length,0);

const unknown=base();
unknown.requests[0].proposed_cost_delta=null;
assert.equal(review(unknown).assessment,'needs_human_review');
assert.ok(codes(unknown).includes('financial_impact_unassessed'));

const money=base();
money.requests[0].proposed_cost_delta=120;
money.requests[0].proposed_selling_delta=200;
assert.ok(codes(money).includes('customer_document_missing'));
assert.ok(codes(money).includes('supplier_document_missing'));
assert.ok(codes(money).includes('amendment_amount_not_reconciled'));

const two=base();
two.requests[0].proposed_selling_delta=200;
two.requests[0].proposed_cost_delta=120;
two.evidence=[link('customer_invoice','c1'),link('supplier_invoice','s1')];
two.allocations=[allocation('link-c1','allocated_in_records'),allocation('link-s1','allocated_in_records')];
assert.ok(!codes(two).includes('customer_document_missing'));
assert.ok(!codes(two).includes('supplier_document_missing'));
assert.ok(codes(two).includes('amendment_amount_not_reconciled'));
assert.equal(review(two).externalProviderVerification,'not_implemented');

const reversed=base();
reversed.evidence=[link('customer_payment','c1')];
reversed.allocations=[allocation('link-c1','void_or_reversed',true)];
assert.equal(review(reversed).assessment,'blocked');
assert.ok(codes(reversed).includes('source_document_changed'));
assert.ok(codes(reversed).includes('source_document_invalid'));

const crossOrg=base();
crossOrg.evidence=[{...link('supplier_invoice','s1'),organization_id:'other-org'}];
assert.ok(codes(crossOrg).includes('evidence_tenant_mismatch'));

const badReview=base();
badReview.handoffs[0].finance_reviewed_by='operations';
assert.ok(codes(badReview).includes('independent_review_missing'));

const missingHandoff=base();
missingHandoff.handoffs=[];
assert.ok(codes(missingHandoff).includes('handoff_missing'));

const blocked=base();
blocked.handoffs[0].status='blocked';
assert.equal(review(blocked).assessment,'blocked');

const cancelled=base();
cancelled.workflowStage='cancelled';
assert.ok(codes(cancelled).includes('booking_cancelled'));

const partial=base();
partial.evidence=[link('customer_payment','p1')];
partial.allocations=[allocation('link-p1','partially_allocated')];
assert.ok(codes(partial).includes('source_allocation_unverified'));

const missingSource=base();
missingSource.evidence=[link('supplier_invoice','i1')];
assert.ok(codes(missingSource).includes('source_allocation_unverified'));

const incomplete=base();
incomplete.dataComplete=false;
assert.ok(codes(incomplete).includes('source_data_unavailable'));
assert.equal(review(incomplete).assessment,'blocked');

const wrongBooking=base();
wrongBooking.requests[0].booking_id='booking-2';
assert.ok(codes(wrongBooking).includes('tenant_mismatch'));

const truncated=base();
truncated.evidence=Array.from({length:200},(_,i)=>link('generated_document',String(i)));
assert.ok(codes(truncated).includes('financial_documents_truncated'));

const supplierFirst=base();
supplierFirst.handoffs[0].status='supplier_confirmed';
supplierFirst.handoffs[0].finance_reference=null;
supplierFirst.handoffs[0].finance_reviewed_by=null;
supplierFirst.handoffs[0].execution_reference=null;
supplierFirst.handoffs[0].execution_reported_by=null;
assert.ok(codes(supplierFirst).includes('finance_review_missing'));
assert.ok(codes(supplierFirst).includes('operations_attestation_missing'));
assert.deepEqual(assessAmendmentExecutionExceptions({...base(),requests:[]}),[]);
console.log('Trip File execution exception and external-verification fail-closed checks passed');
