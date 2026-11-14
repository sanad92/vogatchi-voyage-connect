import {
  parseSabreReservation,
  parseTravelportReservation,
  sabreEndpoints,
  travelportOAuthUrl,
  travelportRetrieveUrl,
  type ProviderEnvironment,
} from './trip-file-air-provider.ts';
import { readBoundedJsonBody } from './trip-file-bounded-json.ts';

export type CompanyProvider = 'travelport' | 'sabre' | 'eta' | 'zatca';
export type AirCompanyProvider = 'travelport' | 'sabre';
export type CompanyCredentials = Record<string, string>;
type Send = (url: string, init: RequestInit) => Promise<Response>;

const credentialFields: Record<CompanyProvider, readonly string[]> = {
  travelport: ['username', 'password', 'clientId', 'clientSecret', 'accessGroup'],
  sabre: ['userId', 'pcc', 'domain', 'password'],
  eta: ['clientId', 'clientSecret'],
  zatca: ['csid', 'secret'],
};

export function isCompanyProvider(value: unknown): value is CompanyProvider {
  return typeof value === 'string' && Object.hasOwn(credentialFields, value);
}

export function isCompanyEnvironment(value: unknown): value is ProviderEnvironment {
  return value === 'preproduction' || value === 'production';
}

export function parseCompanyCredentials(provider: CompanyProvider, value: unknown): CompanyCredentials | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== credentialFields[provider].length) return null;
  const output: CompanyCredentials = {};
  for (const field of credentialFields[provider]) {
    const raw = input[field];
    const limit = field === 'csid' ? 8192 : field === 'accessGroup' ? 100 : 1024;
    if (typeof raw !== 'string' || !raw.trim() || raw.length > limit || /[\u0000-\u001f\u007f]/.test(raw)) return null;
    output[field] = /password|secret/i.test(field) ? raw : raw.trim();
  }
  if (provider === 'sabre' && [output.userId, output.pcc, output.domain].some(part => !/^[\w.-]+$/.test(part))) return null;
  if (provider === 'eta' && output.clientId.includes(':')) return null;
  if (provider === 'zatca' && !/^[A-Za-z0-9+/]+={0,2}$/.test(output.csid)) return null;
  if (provider === 'travelport' && !/^[\x21-\x7e]+$/.test(output.accessGroup)) return null;
  return output;
}

export class CompanyProviderError extends Error {
  constructor(public code: 'provider_auth_rejected' | 'provider_access_rejected' | 'provider_unavailable'
    | 'sample_not_verified' | 'document_type_unavailable') {
    super(code);
  }
}

const encode = new TextEncoder();
function basic(value: string) {
  return btoa(String.fromCharCode(...encode.encode(value)));
}

async function requestJson(send: Send, url: string, init: RequestInit, stage: 'auth' | 'read', limit: number) {
  try {
    const response = await send(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 401 || response.status === 403 || (stage === 'auth' && response.status === 400)) {
        throw new CompanyProviderError(stage === 'auth' ? 'provider_auth_rejected' : 'provider_access_rejected');
      }
      if (stage === 'read' && [400, 404, 422].includes(response.status)) {
        throw new CompanyProviderError('sample_not_verified');
      }
      throw new CompanyProviderError('provider_unavailable');
    }
    const body = await readBoundedJsonBody(response.body, limit);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid response');
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CompanyProviderError) throw error;
    throw new CompanyProviderError('provider_unavailable');
  }
}

async function getToken(send: Send, url: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  const response = await requestJson(send, url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields),
  }, 'auth', 16000);
  const token = response.access_token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9._~+\/-]{12,8192}={0,2}$/.test(token)
    || (response.token_type !== undefined && String(response.token_type).toLowerCase() !== 'bearer')) {
    throw new CompanyProviderError('provider_unavailable');
  }
  return { token, expiresIn: Number(response.expires_in) };
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const pendingTokens = new Map<string, Promise<string>>();

async function airToken(provider: AirCompanyProvider, environment: ProviderEnvironment, credentials: CompanyCredentials, send: Send) {
  if (provider === 'travelport') {
    return getToken(send, travelportOAuthUrl(environment), {
      grant_type: 'password',
      username: credentials.username,
      password: credentials.password,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });
  }
  const clientId = basic(`V1:${credentials.userId}:${credentials.pcc}:${credentials.domain}`);
  const password = basic(credentials.password);
  return getToken(send, sabreEndpoints(environment).token, { grant_type: 'client_credentials' }, {
    Authorization: 'Basic ' + basic(`${clientId}:${password}`),
    'Conversation-ID': crypto.randomUUID(),
  });
}

async function cachedAirToken(key: string, get: () => ReturnType<typeof airToken>) {
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  tokenCache.delete(key);
  const pending = pendingTokens.get(key);
  if (pending) return pending;
  const request = get().then(({ token, expiresIn }) => {
    if (Number.isFinite(expiresIn) && expiresIn > 120) {
      if (tokenCache.size >= 128) {
        const oldest = tokenCache.keys().next().value;
        if (oldest) tokenCache.delete(oldest);
      }
      tokenCache.set(key, { token, expiresAt: Date.now() + (Math.min(expiresIn, 604800) - 60) * 1000 });
    }
    return token;
  }).finally(() => pendingTokens.delete(key));
  pendingTokens.set(key, request);
  return request;
}

export async function readCompanyAirPnr({
  provider, environment, credentials, organizationId, locator, send = fetch, useCachedToken = true,
}: {
  provider: AirCompanyProvider;
  environment: ProviderEnvironment;
  credentials: CompanyCredentials;
  organizationId: string;
  locator: string;
  send?: Send;
  useCachedToken?: boolean;
}) {
  const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    encode.encode(JSON.stringify([organizationId, provider, environment, credentials])),
  ))).map(byte => byte.toString(16).padStart(2, '0')).join('');
  const get = () => airToken(provider, environment, credentials, send);
  const token = useCachedToken ? await cachedAirToken(key, get) : (await get()).token;
  const commonHeaders = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  let body: Record<string, unknown>;
  try {
    if (provider === 'travelport') {
      body = await requestJson(send, travelportRetrieveUrl(environment, locator), {
        method: 'GET',
        headers: {
          ...commonHeaders,
          'XAUTH_TRAVELPORT_ACCESSGROUP': credentials.accessGroup,
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
        },
      }, 'read', 262144);
    } else {
      body = await requestJson(send, sabreEndpoints(environment).retrieve, {
        method: 'POST',
        headers: { ...commonHeaders, 'Content-Type': 'application/json', 'Conversation-ID': crypto.randomUUID() },
        body: JSON.stringify({ confirmationId: locator, returnOnly: ['FLIGHTS'] }),
      }, 'read', 262144);
    }
  } catch (error) {
    if (error instanceof CompanyProviderError && error.code === 'provider_access_rejected') tokenCache.delete(key);
    throw error;
  }
  try {
    return provider === 'travelport' ? parseTravelportReservation(body, locator) : parseSabreReservation(body, locator);
  } catch {
    throw new CompanyProviderError('sample_not_verified');
  }
}

export async function verifyEta(environment: ProviderEnvironment, credentials: CompanyCredentials, send: Send = fetch) {
  const test = environment === 'preproduction';
  const identity = test ? 'https://id.preprod.eta.gov.eg' : 'https://id.eta.gov.eg';
  const api = test ? 'https://api.preprod.invoicing.eta.gov.eg' : 'https://api.invoicing.eta.gov.eg';
  const { token } = await getToken(send, identity + '/connect/token', { grant_type: 'client_credentials' }, {
    Authorization: 'Basic ' + basic(`${credentials.clientId}:${credentials.clientSecret}`),
  });
  const catalog = await requestJson(send, api + '/api/v1.0/documenttypes', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  }, 'read', 262144);
  const invoice = Array.isArray(catalog.result) && catalog.result.find(type => type?.name === 'i');
  if (!Array.isArray(invoice?.documentTypeVersions) || !invoice.documentTypeVersions.length) {
    throw new CompanyProviderError('document_type_unavailable');
  }
}

export interface ZatcaSample { uuid: string; invoiceHash: string; invoice: string }
export function parseZatcaSample(value: unknown): ZatcaSample | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { uuid, invoiceHash, invoice } = value as Partial<ZatcaSample>;
  if (typeof uuid !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid)
    || typeof invoiceHash !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(invoiceHash)
    || typeof invoice !== 'string' || invoice.length > 550000 || invoice.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(invoice)) return null;
  return { uuid, invoiceHash, invoice };
}

export async function verifyZatcaSimulation(credentials: CompanyCredentials, sample: ZatcaSample, send: Send = fetch) {
  const response = await requestJson(send, 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation/compliance/invoices', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic(`${credentials.csid}:${credentials.secret}`),
      'Accept-Version': 'V2',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sample),
  }, 'read', 65536);
  const validation = response.validationResults as { status?: unknown; errorMessages?: unknown };
  if (!validation || !['PASS', 'WARNING'].includes(String(validation.status))
    || !Array.isArray(validation.errorMessages) || validation.errorMessages.length) {
    throw new CompanyProviderError('sample_not_verified');
  }
}
