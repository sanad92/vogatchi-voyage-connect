import { pathToFileURL } from 'node:url';

// Run with ETA_PREPROD_CLIENT_ID and ETA_PREPROD_CLIENT_SECRET in the process
// environment. Use NODE_EXTRA_CA_CERTS with ETA's official PreProd root CA.
// https://sdk.invoicing.eta.gov.eg/faq/#how-to-set-up-environment-to-access-test-apis-and-test-portals
const tokenEndpoint = 'https://id.preprod.eta.gov.eg/connect/token';
const documentTypesEndpoint = 'https://api.preprod.invoicing.eta.gov.eg/api/v1.0/documenttypes';

async function requestJson(send, url, options, stage) {
  const response = await send(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    throw new Error(`${stage}_connection_failed`);
  });
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`${stage}_http_${response.status}`);
  }
  return response.json().catch(() => {
    throw new Error(`${stage}_invalid_json`);
  });
}

export async function checkEtaPreproduction({ clientId, clientSecret, send = fetch }) {
  if (!clientId || !clientSecret || clientId.includes(':')) {
    throw new Error('eta_preproduction_credentials_missing_or_invalid');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const login = await requestJson(send, tokenEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  }, 'eta_login');

  const token = login?.access_token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9._~+\/-]{1,8192}={0,2}$/.test(token)) {
    throw new Error('eta_login_invalid_token');
  }

  const catalog = await requestJson(send, documentTypesEndpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }, 'eta_document_types');

  const invoiceType = Array.isArray(catalog?.result) && catalog.result.find(type => type?.name === 'i');
  if (!Array.isArray(invoiceType?.documentTypeVersions) || !invoiceType.documentTypeVersions.length) {
    throw new Error('eta_invoice_document_type_missing');
  }
  return { environment: 'preproduction', authenticated: true, invoiceDocumentTypeFound: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await checkEtaPreproduction({
      clientId: process.env.ETA_PREPROD_CLIENT_ID,
      clientSecret: process.env.ETA_PREPROD_CLIENT_SECRET,
    })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
