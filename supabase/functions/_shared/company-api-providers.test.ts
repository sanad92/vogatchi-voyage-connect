import assert from 'node:assert/strict';
import {
  parseCompanyCredentials,
  parseZatcaSample,
  readCompanyAirPnr,
  verifyEta,
  verifyZatcaSimulation,
} from './company-api-providers.ts';

const credentials = { userId: 'API1', pcc: 'ABC1', domain: 'AA', password: 'sample-password' };
const locator = 'ABCDEF';
const tokenCalls: string[] = [];
const verifiedTokens: string[] = [];
const send = async (url: string, request: RequestInit) => {
  const headers = new Headers(request.headers);
  assert.equal(request.redirect, 'error');
  assert.equal(new URL(url).hostname, 'api.cert.platform.sabre.com');
  if (url.endsWith('/auth/token')) {
    tokenCalls.push(headers.get('Authorization')!);
    return Response.json({ access_token: 'fake-bearer-token-' + tokenCalls.length, expires_in: 3600 });
  }
  assert.equal(url.endsWith('/trip/orders/getBooking'), true);
  assert.deepEqual(JSON.parse(String(request.body)), { confirmationId: locator, returnOnly: ['FLIGHTS'] });
  verifiedTokens.push(headers.get('Authorization')!);
  return Response.json({ bookingId: locator, flights: [{ id: 'test-flight' }], travelers: [{ name: 'fixture-only' }] });
};

assert.deepEqual(parseCompanyCredentials('sabre', credentials), credentials);
assert.equal(parseCompanyCredentials('sabre', { ...credentials, endpoint: 'https://example.com' }), null);
assert.equal(parseCompanyCredentials('sabre', { ...credentials, pcc: 'wrong:pcc' }), null);
assert.equal(parseCompanyCredentials('travelport', { accessGroup: 'malformed' }), null);
const args = { provider: 'sabre' as const, environment: 'preproduction' as const, credentials, locator, send };
const result = await readCompanyAirPnr({ ...args, organizationId: 'company-a' });
assert.equal(result.bookingLocatorMatched, true);
assert.equal(JSON.stringify(result).includes('fixture-only'), false);
assert.equal(tokenCalls[0], 'Basic ' + btoa(btoa('V1:API1:ABC1:AA') + ':' + btoa(credentials.password)));
await readCompanyAirPnr({ ...args, organizationId: 'company-b' });
await readCompanyAirPnr({ ...args, organizationId: 'company-a' });
await readCompanyAirPnr({ ...args, organizationId: 'company-a', credentials: { ...credentials, password: 'new-fixture-password' } });
assert.equal(tokenCalls.length, 3);
assert.deepEqual(verifiedTokens.map(value => value.slice(-1)), ['1', '2', '1', '3']);

const travelport = await readCompanyAirPnr({
  organizationId: 'company-b', provider: 'travelport', environment: 'preproduction', locator,
  credentials: { username: 'fixture', password: 'fixture', clientId: 'fixture', clientSecret: 'fixture', accessGroup: 'group-b' },
  send: async (url, request) => {
    if (url.endsWith('/oauth/token')) {
      assert.equal(url, 'https://auth.pp.travelport.net/oauth/token');
      assert.equal((request.body as URLSearchParams).get('grant_type'), 'password');
      return Response.json({ access_token: 'travelport-fixture-token' });
    }
    assert.equal(request.method, 'GET');
    assert.equal(new Headers(request.headers).get('XAUTH_TRAVELPORT_ACCESSGROUP'), 'group-b');
    return Response.json({ ReservationResponse: { Reservation: { Receipt: [
      { '@type': 'ReceiptConfirmation', Identifier: { authority: 'Travelport' }, Confirmation: { Locator: { value: locator } } },
    ] } } });
  },
});
assert.equal(travelport.bookingLocatorMatched, true);

await verifyEta('preproduction', { clientId: 'sample', clientSecret: 'sample-secret' }, async (url, request) => {
  assert.equal(request.redirect, 'error');
  if (url.endsWith('/connect/token')) {
    assert.equal(new URL(url).hostname, 'id.preprod.eta.gov.eg');
    return Response.json({ access_token: 'eta-fixture-token' });
  }
  assert.equal(new URL(url).hostname, 'api.preprod.invoicing.eta.gov.eg');
  assert.equal(request.method, 'GET');
  return Response.json({ result: [{ name: 'i', documentTypeVersions: [{ name: '1.0' }] }] });
});

const sample = parseZatcaSample({
  uuid: '1d487816-70b8-4ade-a618-9d620b73814a',
  invoiceHash: btoa('x'.repeat(32)),
  invoice: btoa('<Invoice/>'),
});
assert.ok(sample);
const zatcaCredentials = { csid: 'dGVzdA==', secret: 'fixture-secret' };
await verifyZatcaSimulation(zatcaCredentials, sample, async (url, request) => {
  assert.equal(url, 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation/compliance/invoices');
  assert.equal(new Headers(request.headers).get('Accept-Version'), 'V2');
  return Response.json({ validationResults: { status: 'PASS', errorMessages: [] } });
});
await assert.rejects(verifyZatcaSimulation(zatcaCredentials, sample, async () =>
  Response.json({ validationResults: { status: 'ERROR', errorMessages: [] } })), { message: 'sample_not_verified' });
console.log('Company API provider request, validation, and organization token isolation checks passed.');
