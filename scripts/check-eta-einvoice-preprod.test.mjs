import assert from 'node:assert/strict';
import test from 'node:test';
import { checkEtaPreproduction } from './check-eta-einvoice-preprod.mjs';

const clientId = 'test-erp';
const clientSecret = 'test-secret';
const accessToken = 'test.eta.token';

test('uses official preproduction URLs and reads document types after login', async () => {
  const calls = [];
  const send = async (url, options) => {
    calls.push({ url, options });
    return Response.json(calls.length === 1
      ? { access_token: accessToken }
      : { result: [{ name: 'i', documentTypeVersions: [{ name: '1.0' }] }] });
  };
  const status = await checkEtaPreproduction({ clientId, clientSecret, send });

  assert.deepEqual(status, {
    environment: 'preproduction',
    authenticated: true,
    invoiceDocumentTypeFound: true,
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://id.preprod.eta.gov.eg/connect/token');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from('test-erp:test-secret').toString('base64')}`);
  assert.equal(calls[0].options.body.get('grant_type'), 'client_credentials');
  assert.equal(calls[1].url, 'https://api.preprod.invoicing.eta.gov.eg/api/v1.0/documenttypes');
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${accessToken}`);
  assert.ok(calls.every(({ options }) => options.redirect === 'error' && options.signal instanceof AbortSignal));
});

test('stops on failed login and omits provider error details', async () => {
  let requests = 0;
  const send = async () => {
    requests += 1;
    return Response.json({ error_description: 'private detail' }, { status: 401 });
  };
  await assert.rejects(checkEtaPreproduction({ clientId, clientSecret, send }), { message: 'eta_login_http_401' });
  assert.equal(requests, 1);
});

test('rejects missing credentials, malformed tokens and incomplete catalogs', async () => {
  await assert.rejects(checkEtaPreproduction({ clientId }), { message: 'eta_preproduction_credentials_missing_or_invalid' });
  await assert.rejects(checkEtaPreproduction({
    clientId,
    clientSecret,
    send: async () => Response.json({ access_token: 'invalid token\n' }),
  }), { message: 'eta_login_invalid_token' });
  await assert.rejects(checkEtaPreproduction({
    clientId,
    clientSecret,
    send: async (url) => Response.json(url.endsWith('/token') ? { access_token: accessToken } : { result: [] }),
  }), { message: 'eta_invoice_document_type_missing' });
});
