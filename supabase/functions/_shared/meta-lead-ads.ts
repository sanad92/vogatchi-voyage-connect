import { readBoundedBytes, readBoundedJsonBody } from './trip-file-bounded-json.ts';

const GRAPH = 'https://graph.facebook.com/v27.0';
const ID = /^[0-9]{1,32}$/;
const SIGNATURE = /^sha256=([0-9a-f]{64})$/i;
const utf8 = new TextEncoder();

type TextRecord = Record<string, unknown>;
const record = (value: unknown): TextRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as TextRecord : null;
export function providerId(value: unknown): string | null {
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  return typeof text === 'string' && ID.test(text) ? text : null;
}

export function isPageToken(value: unknown): value is string {
  return typeof value === 'string' && /^[!-~]{16,4096}$/.test(value);
}

type MetaLeadErrorCode = 'provider_rejected' | 'provider_unavailable' | 'route_not_verified' | 'lead_not_verified';
export class MetaLeadError extends Error {
  readonly code: MetaLeadErrorCode;
  readonly httpStatus?: number;

  constructor(code: MetaLeadErrorCode, httpStatus?: number) {
    super(code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

async function graphGet(
  path: string, query: Record<string, string>, token: string, send: typeof fetch,
): Promise<TextRecord> {
  let response: Response;
  try {
    response = await send(`${GRAPH}/${path}?${new URLSearchParams(query)}`, {
      method: 'GET', headers: { authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(4500), redirect: 'error',
    });
  } catch {
    throw new MetaLeadError('provider_unavailable');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new MetaLeadError(response.status === 429 || response.status >= 500 ? 'provider_unavailable' : 'provider_rejected', response.status);
  }
  try {
    const result = record(await readBoundedJsonBody(response.body, 262144));
    if (!result) throw new Error('unexpected result');
    return result;
  } catch {
    throw new MetaLeadError('provider_unavailable');
  }
}

export async function verifyMetaFormRoute(page: string, form: string, token: string, send: typeof fetch = fetch) {
  const identity = await graphGet('me', { fields: 'id' }, token, send);
  if (providerId(identity.id) !== page) throw new MetaLeadError('route_not_verified');

  let cursor: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const params: Record<string, string> = { fields: 'id', limit: '100' };
    if (cursor) params.after = cursor;
    const result = await graphGet(page + '/leadgen_forms', params, token, send);
    if (Array.isArray(result.data) && result.data.some(row => providerId(record(row)?.id) === form)) return;
    const paging = record(result.paging);
    const after = record(paging?.cursors)?.after;
    // Use the opaque cursor from Meta, with a fixed host. Never fetch a provider-supplied URL.
    if (typeof paging?.next !== 'string' || typeof after !== 'string' || after.length > 1024 || after === cursor) break;
    cursor = after;
  }
  throw new MetaLeadError('route_not_verified');
}

type MetaEvent = { page: string; form: string; leadgen: string };
type LeadDetails = { name: string | null; phone: string | null; email: string | null; campaign: string | null };
type ResolvedRoute = { revision: string; page_token: string };
type ImportResult = 'imported' | 'unavailable' | 'route_changed' | 'already_processed' | 'missing_contact';

function normalizeField(fields: unknown[], field: string): string {
  const values = record(fields.find(value => record(value)?.name === field))?.values;
  if (!Array.isArray(values) || typeof values[0] !== 'string') return '';
  return values[0].slice(0, 512).replace(/\s+/g, ' ').trim();
}

async function retrieveLead(event: MetaEvent, token: string, send: typeof fetch): Promise<LeadDetails> {
  const contactFields = 'id,form_id,field_data';
  let result: TextRecord;
  try {
    result = await graphGet(event.leadgen, { fields: contactFields + ',campaign_id' }, token, send);
  } catch (error) {
    // A token can retrieve contact data without access to ad attribution.
    if (!(error instanceof MetaLeadError) || ![400, 403].includes(error.httpStatus ?? 0)) throw error;
    result = await graphGet(event.leadgen, { fields: contactFields }, token, send);
  }
  if (providerId(result.id) !== event.leadgen || providerId(result.form_id) !== event.form || !Array.isArray(result.field_data)) {
    throw new MetaLeadError('lead_not_verified');
  }
  const fields: unknown[] = result.field_data;
  const name = normalizeField(fields, 'full_name')
    || [normalizeField(fields, 'first_name'), normalizeField(fields, 'last_name')].filter(Boolean).join(' ');
  const phone = normalizeField(fields, 'phone_number').replace(/[ ()-]/g, '');
  const email = normalizeField(fields, 'email').toLowerCase();
  return {
    name: name.slice(0, 160) || null,
    phone: /^\+?[0-9]{7,15}$/.test(phone) ? phone : null,
    email: email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    campaign: providerId(result.campaign_id),
  };
}

function webhookEvents(payload: unknown): MetaEvent[] {
  const object = record(payload);
  if (object?.object !== 'page' || !Array.isArray(object.entry)) return [];
  const events = new Map<string, MetaEvent>();
  for (const item of object.entry) {
    const entry = record(item);
    const page = providerId(entry?.id);
    if (!page || !Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      const update = record(change);
      if (update?.field !== 'leadgen') continue;
      const data = record(update.value);
      const form = providerId(data?.form_id);
      const leadgen = providerId(data?.leadgen_id);
      if (!form || !leadgen || providerId(data?.page_id) !== page) continue;
      events.set(page + ':' + form + ':' + leadgen, { page, form, leadgen });
    }
  }
  return [...events.values()];
}

async function validSignature(bytes: Uint8Array<ArrayBuffer>, signature: string, secret: string): Promise<boolean> {
  const hex = SIGNATURE.exec(signature)?.[1];
  if (!hex) return false;
  const mac = Uint8Array.from(hex.match(/../g)!, pair => parseInt(pair, 16));
  const key = await crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, mac, bytes);
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const a = utf8.encode(left);
  const b = utf8.encode(right);
  if (a.length !== b.length) return false;
  let differences = 0;
  for (let i = 0; i < a.length; i++) differences |= a[i] ^ b[i];
  return differences === 0;
}

type WebhookDependencies = {
  secret?: string;
  verifyToken?: string;
  resolve: (event: MetaEvent) => Promise<ResolvedRoute | null>;
  save: (event: MetaEvent, revision: string, details: LeadDetails) => Promise<ImportResult>;
  send?: typeof fetch;
};

const text = (body: string, status = 200) => new Response(body, {
  status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
});

export async function handleMetaLeadWebhook(request: Request, dependencies: WebhookDependencies): Promise<Response> {
  if (request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    const challenge = params.get('hub.challenge');
    const expected = dependencies.verifyToken;
    return expected && params.get('hub.mode') === 'subscribe' && challenge && challenge.length <= 1024
      && constantTimeTextEqual(params.get('hub.verify_token') ?? '', expected)
      ? text(challenge) : text('Forbidden', 403);
  }
  if (request.method !== 'POST') return text('Method not allowed', 405);
  if (!dependencies.secret) return text('Unavailable', 503);
  const signature = request.headers.get('X-Hub-Signature-256') ?? '';
  if (!SIGNATURE.test(signature)) return text('Forbidden', 403);

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await readBoundedBytes(request.body, 1_048_576);
  } catch {
    return text('Invalid body', 400);
  }
  if (!(await validSignature(bytes, signature, dependencies.secret))) return text('Forbidden', 403);

  let payload: unknown;
  try {
    // Some webhook samples encode IDs as JSON numbers. Keep their exact digits
    // when the runtime exposes the original primitive to the JSON reviver.
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      ((_key: string, value: unknown, context?: { source?: string }) => (
        typeof value === 'number' && !Number.isSafeInteger(value) && context?.source && ID.test(context.source)
          ? context.source : value
      )));
  } catch {
    return text('Invalid JSON', 400);
  }

  const events = webhookEvents(payload);
  const deadline = Date.now() + 12_000;
  let incomplete = false;
  for (let start = 0; start < events.length; start += 8) {
    // Preserve work already committed and let Meta retry unprocessed events.
    if (Date.now() >= deadline) return text('Retry delivery', 503);
    const results = await Promise.allSettled(events.slice(start, start + 8).map(async event => {
      const route = await dependencies.resolve(event);
      if (!route) return;
      const details = await retrieveLead(event, route.page_token, dependencies.send ?? fetch);
      const result = await dependencies.save(event, route.revision, details);
      if (result === 'route_changed') throw new MetaLeadError('route_not_verified');
    }));
    incomplete ||= results.some(result => result.status === 'rejected');
  }
  return incomplete ? text('Retry delivery', 503) : text('OK');
}
