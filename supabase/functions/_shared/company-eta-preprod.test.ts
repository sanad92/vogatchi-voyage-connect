import assert from 'node:assert/strict';
import { parseEtaSignedSample, submitEtaPreprodSample } from './company-api-providers.ts';
import { handleCompanyEtaAction } from './company-eta-preprod.ts';

const organizationId = '00000000-0000-4000-8000-000000000001';
const actorId = '00000000-0000-4000-8000-000000000002';
const expectedRevision = '00000000-0000-4000-8000-000000000003';
const sampleId = '00000000-0000-4000-8000-000000000004';
const attemptId = '00000000-0000-4000-8000-000000000005';
const submissionId = 'TZRKK8MFZCPSTW9XCYWBMKME10';
const documentId = 'TZRKK8MFZCPSTW9XCYWBMKME11';
const internalId = 'ETA-FIXTURE-001';
const credentials = { clientId: 'synthetic', clientSecret: 'synthetic-secret' };
const json = `{
 "documents": [{
   "documentType": "I",
   "documentTypeVersion": "1.0",
   "internalID": "${internalId}",
   "totalAmount": 50.0000,
   "signatures": [{ "signatureType": "I", "value": "RklYVFVSRV9TSUdOQVRVUkU=" }]
 }]
}`;

const parsed = parseEtaSignedSample(json);
assert.ok(parsed);
assert.equal(parsed.json, json);
assert.equal(parsed.internalId, internalId);
assert.equal(parseEtaSignedSample(json.replace('"1.0"', '"0.9"')), null);
assert.equal(parseEtaSignedSample(json.replace('"documentType": "I"', '"documentType": "C"')), null);
assert.equal(parseEtaSignedSample(json.replace('"signatureType": "I"', '"signatureType": "S"')), null);
assert.equal(parseEtaSignedSample(json.replace('"internalID":', '"internalId":'))?.internalId, internalId);
assert.equal(parseEtaSignedSample(json.replace('"internalID":', '"internalId": "other", "internalID":')), null);
assert.equal(parseEtaSignedSample(json.replace('"totalAmount":', '"totalAmount": 40, "totalAmount":')), null);
assert.equal(parseEtaSignedSample(json.replace('"totalAmount":', '"totalAmou\\u006et": 40, "totalAmount":')), null);
assert.equal(parseEtaSignedSample(json.replace('"documents":', '"documents": [], "documents":')), null);
assert.equal(parseEtaSignedSample(JSON.stringify({ documents: [...JSON.parse(json).documents, ...JSON.parse(json).documents] })), null);
assert.equal(parseEtaSignedSample(' '.repeat(250001) + json), null);

let row: Record<string, string | null> | null = null;
let posted = 0;
let checked = 0;
let postedState: 'accepted' | 'rejected' | 'unconfirmed' | 'malformed' = 'accepted';
let returnedId = documentId;
let providerStatus = 'valid';
const accepted = { submissionUUID: submissionId, acceptedDocuments: [
  { uuid: documentId, internalId, longId: 'ignored-private-provider-value' },
], rejectedDocuments: [] };
const withEmptyBody = () => new Response(null, { status: 503 });
const send = async (url: string, request: RequestInit) => {
  assert.equal(request.redirect, 'error');
  assert.ok(request.signal instanceof AbortSignal);
  if (url.endsWith('/connect/token')) {
    assert.equal(url, 'https://id.preprod.eta.gov.eg/connect/token');
    assert.equal(new Headers(request.headers).get('Authorization'), 'Basic ' + btoa('synthetic:synthetic-secret'));
    assert.equal((request.body as URLSearchParams).get('grant_type'), 'client_credentials');
    return Response.json({ access_token: 'synthetic-eta-provider-token' });
  }
  assert.equal(new URL(url).origin, 'https://api.preprod.invoicing.eta.gov.eg');
  assert.equal(new Headers(request.headers).get('Authorization'), 'Bearer synthetic-eta-provider-token');
  if (request.method === 'POST') {
    posted++;
    assert.equal(url, 'https://api.preprod.invoicing.eta.gov.eg/api/v1.0/documentsubmissions/');
    assert.equal(request.body, json);
    if (postedState === 'unconfirmed') return withEmptyBody();
    if (postedState === 'rejected') {
      return Response.json({ acceptedDocuments: [], rejectedDocuments: [{ internalId, error: { details: 'fixture confidential' } }] }, { status: 202 });
    }
    if (postedState === 'malformed') {
      return Response.json({ ...accepted, acceptedDocuments: [{ ...accepted.acceptedDocuments[0], internalId: 'unrelated' }] }, { status: 202 });
    }
    return Response.json(accepted, { status: 202 });
  }
  checked++;
  assert.equal(request.method, 'GET');
  assert.equal(url, `https://api.preprod.invoicing.eta.gov.eg/api/v1.0/documentsubmissions/${submissionId}?pageNo=1&pageSize=1`);
  return Response.json({ uuid: submissionId, documentCount: 1, overallStatus: providerStatus, documentSummary: [
    { uuid: returnedId, internalId, status: providerStatus, receiverName: 'fixture confidential' },
  ] });
};
const rpc = async (name: string, args: Record<string, unknown>) => {
  assert.equal(args._org_id, organizationId);
  if (name !== 'company_eta_sample_record') assert.equal(args._actor_id, actorId);
  if (name === 'company_eta_samples_list') return { data: row ? [row] : [], error: null };
  if (name === 'company_eta_sample_claim') {
    assert.equal(args._revision, expectedRevision);
    assert.equal(args._internal_id, internalId);
    assert.match(String(args._payload_hash), /^[a-f0-9]{64}$/);
    assert.equal(Object.keys(args).some(key => /sample_json|secret/.test(key)), false);
    if (row) return { data: { sample: row }, error: null };
    row = { id: sampleId, internal_id: internalId, status: 'sending', submission_id: null, document_id: null };
    return { data: { sample: row, credentials, attempt_id: attemptId }, error: null };
  }
  assert.equal(args._sample_id, sampleId);
  assert.ok(row);
  if (name === 'company_eta_sample_for_refresh') {
    return { data: row.status === 'submitted' ? { sample: row, credentials, attempt_id: attemptId } : { sample: row }, error: null };
  }
  assert.equal(name, 'company_eta_sample_record');
  assert.equal(args._attempt_id, attemptId);
  assert.equal(args._expected_status, row.status);
  row = {
    ...row,
    status: String(args._status),
    submission_id: args._submission_id ? String(args._submission_id) : row.submission_id,
    document_id: args._document_id ? String(args._document_id) : row.document_id,
  };
  return { data: row, error: null };
};
const common = { organizationId, actorId, rpc, send };
const submit = () => handleCompanyEtaAction({ ...common, action: 'eta_sample_submit', payload: { expectedRevision, sampleJson: json } });
const refresh = () => handleCompanyEtaAction({ ...common, action: 'eta_sample_refresh', payload: { sampleId } });
const status = (result: Awaited<ReturnType<typeof submit>>) => (result.body.sample as { status: string })?.status;

const first = await submit();
assert.equal(status(first), 'submitted');
assert.equal(JSON.stringify(first).includes('longId') || JSON.stringify(first).includes('synthetic-secret'), false);
assert.equal(status(await submit()), 'submitted');
assert.equal(posted, 1);
providerStatus = 'Submitted';
assert.equal(status(await refresh()), 'submitted');
returnedId = 'X'.repeat(26);
assert.deepEqual(await refresh(), { status: 422, body: { error: 'sample_not_verified' } });
returnedId = documentId;
providerStatus = 'Valid';
const validated = await refresh();
assert.equal(status(validated), 'valid');
assert.equal(JSON.stringify(validated).includes('receiverName'), false);
assert.equal(status(await refresh()), 'valid');
assert.equal(checked, 3);

for (const [mode, state] of [['unconfirmed', 'unknown'], ['malformed', 'unknown'], ['rejected', 'rejected']] as const) {
  row = null;
  const posts = posted;
  postedState = mode;
  assert.equal(status(await submit()), state);
  assert.equal(status(await submit()), state);
  assert.equal(posted, posts + 1);
}
const notSent = await submitEtaPreprodSample(credentials, parsed, async url => {
  assert.equal(url, 'https://id.preprod.eta.gov.eg/connect/token');
  return new Response(null, { status: 401 });
});
assert.deepEqual(notSent, { status: 'not_sent' });

const blocked = await handleCompanyEtaAction({
  ...common, action: 'eta_sample_submit', payload: { expectedRevision, sampleJson: json },
  rpc: async () => ({ data: { error: 'eta_test_connection_required' }, error: null }),
  send: async () => assert.fail('no provider access for a missing or production connection'),
});
assert.equal(blocked.status, 409);
const denied = await handleCompanyEtaAction({
  ...common, action: 'eta_sample_submit', payload: { expectedRevision, sampleJson: json },
  rpc: async () => ({ data: null, error: { code: '42501' } }),
  send: async () => assert.fail('no provider access for a denied request'),
});
assert.equal(denied.status, 403);

console.log('ETA test-host authentication, byte-preserved submissions, no ambiguous resend, and verified document status passed.');
