import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { bearerToken } from '../_shared/auth.ts';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { readBoundedJsonBody } from '../_shared/trip-file-bounded-json.ts';
import { safeAirLocator } from '../_shared/trip-file-air-provider.ts';
import { companyApiStore } from '../_shared/company-api-store.ts';
import { ETA_PREPROD_CA } from '../_shared/eta-preprod-ca.ts';
import {
  CompanyProviderError,
  isCompanyEnvironment,
  isCompanyProvider,
  parseCompanyCredentials,
  parseZatcaSample,
  readCompanyAirPnr,
  verifyEta,
  verifyZatcaSimulation,
} from '../_shared/company-api-providers.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
});
const failure = (error: string, status: number) => json({ error }, status);

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return failure('method_not_allowed', 405);
  const token = bearerToken(request);
  if (!token) return failure('session_required', 401);

  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user || auth.user.is_anonymous) return failure('session_required', 401);
    const quota = rateLimit('company-api-requests:' + auth.user.id, 30, 60_000);
    if (!quota.allowed) return rateLimitResponse(quota.retryAfterMs, CORS);

    let payload: Record<string, unknown>;
    try {
      const input = await readBoundedJsonBody(request.body, 575000);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid body');
      payload = input as Record<string, unknown>;
    } catch {
      return failure('invalid_input', 400);
    }
    const { organizationId, action } = payload;
    if (!isUuid(organizationId) || !['list', 'connect', 'disconnect'].includes(String(action))) {
      return failure('invalid_input', 400);
    }
    const [member, org, permission] = await Promise.all([
      client.from('organization_members').select('role')
        .eq('user_id', auth.user.id).eq('organization_id', organizationId).eq('is_active', true).maybeSingle(),
      client.from('organizations').select('id').eq('id', organizationId).eq('is_active', true).maybeSingle(),
      client.rpc('has_org_permission', { _org_id: organizationId, _permission: 'admin_settings' }),
    ]);
    if (member.error || org.error || permission.error) return failure('configuration_unavailable', 503);
    if (!member.data || !['owner', 'admin'].includes(member.data.role) || !org.data || permission.data !== true) {
      return failure('forbidden', 403);
    }

    const db = companyApiStore();
    if (action === 'list') {
      const { data, error } = await db.rpc('company_api_connections_list', { _org_id: organizationId });
      if (error || !Array.isArray(data)) return failure('configuration_unavailable', 503);
      return json({ connections: data.map(({ provider, environment, revision, checked_at }) =>
        ({ provider, environment, revision, checked_at })) });
    }

    const { provider, expectedRevision } = payload;
    if (!isCompanyProvider(provider) || (expectedRevision !== null && !isUuid(expectedRevision))) {
      return failure('invalid_input', 400);
    }
    const args = { _org_id: organizationId, _provider: provider, _actor_id: auth.user.id, _expected_revision: expectedRevision };
    if (action === 'disconnect') {
      const { data, error } = await db.rpc('company_api_connection_write', args);
      if (error) return failure(error.code === '42501' ? 'forbidden' : 'configuration_unavailable', error.code === '42501' ? 403 : 503);
      return data === true ? json({ ok: true }) : failure('configuration_changed', 409);
    }

    const { environment } = payload;
    const credentials = parseCompanyCredentials(provider, payload.credentials);
    if (!credentials || !isCompanyEnvironment(environment) || (provider === 'zatca' && environment !== 'preproduction')) {
      return failure('invalid_input', 400);
    }
    const checkQuota = rateLimit('company-api-check:' + organizationId + ':' + provider, 5, 60_000);
    if (!checkQuota.allowed) return rateLimitResponse(checkQuota.retryAfterMs, CORS);

    if (provider === 'travelport' || provider === 'sabre') {
      const locator = payload.sample;
      if (!safeAirLocator(locator)) return failure('invalid_sample', 400);
      await readCompanyAirPnr({ provider, environment, credentials, organizationId, locator, useCachedToken: false });
    } else if (provider === 'eta') {
      if (environment === 'production') {
        await verifyEta(environment, credentials);
      } else {
        const tls = Deno.createHttpClient({ caCerts: [ETA_PREPROD_CA] });
        try {
          await verifyEta(environment, credentials, (url, init) => fetch(url, { ...init, client: tls }));
        } finally {
          tls.close();
        }
      }
    } else {
      const sample = parseZatcaSample(payload.sample);
      if (!sample) return failure('invalid_sample', 400);
      await verifyZatcaSimulation(credentials, sample);
    }

    const { data, error } = await db.rpc('company_api_connection_write', {
      ...args, _environment: environment, _credentials: credentials,
    });
    if (error) return failure(error.code === '42501' ? 'forbidden' : 'configuration_unavailable', error.code === '42501' ? 403 : 503);
    return data === true ? json({ ok: true }) : failure('configuration_changed', 409);
  } catch (error) {
    if (error instanceof CompanyProviderError) return failure(error.code, 422);
    return failure('configuration_unavailable', 503);
  }
});
