import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { bearerToken } from '../_shared/auth.ts';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { readBoundedJsonBody } from '../_shared/trip-file-bounded-json.ts';
import { isPageToken, MetaLeadError, providerId, verifyMetaFormRoute } from '../_shared/meta-lead-ads.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const isId = (value: unknown): value is string => typeof value === 'string' && !!providerId(value);
const json = (body: object, status = 200) => Response.json(body, { status, headers: CORS });
const failure = (error: string, status: number) => json({ error }, status);

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return failure('method_not_allowed', 405);
  const jwt = bearerToken(request);
  if (!jwt) return failure('session_required', 401);

  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: 'Bearer ' + jwt } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authentication, error: authError } = await client.auth.getUser(jwt);
    if (authError || !authentication.user || authentication.user.is_anonymous) return failure('session_required', 401);

    const quota = rateLimit('meta-lead-ads-config:' + authentication.user.id, 20, 60_000);
    if (!quota.allowed) return rateLimitResponse(quota.retryAfterMs, CORS);

    let input: Record<string, unknown>;
    try {
      const parsed = await readBoundedJsonBody(request.body, 8192);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body');
      input = parsed as Record<string, unknown>;
    } catch {
      return failure('invalid_input', 400);
    }
    const { organizationId, action, page, form, revision, pageToken } = input;
    if (!uuid(organizationId) || !['list', 'connect', 'disconnect'].includes(String(action))) return failure('invalid_input', 400);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const actor = { _org_id: organizationId, _actor_id: authentication.user.id };

    // The list RPC checks membership and permission before any call to Meta.
    const { data: routes, error: listError } = await admin.rpc('meta_lead_ads_routes_list', actor);
    if (listError) return failure(listError.code === '42501' ? 'forbidden' : 'configuration_unavailable', listError.code === '42501' ? 403 : 503);
    const webhookConfigured = Boolean(Deno.env.get('META_LEAD_ADS_APP_SECRET') && Deno.env.get('META_LEAD_ADS_VERIFY_TOKEN'));
    if (action === 'list') return json({ routes, webhookConfigured });

    if (!isId(page) || !isId(form) || (revision !== null && !uuid(revision))) return failure('invalid_input', 400);
    let token: string | null = null;
    if (action === 'connect') {
      if (!isPageToken(pageToken)) return failure('invalid_input', 400);
      const quota = rateLimit('meta-lead-ads-provider:' + organizationId, 5, 60_000);
      if (!quota.allowed) return rateLimitResponse(quota.retryAfterMs, CORS);
      await verifyMetaFormRoute(page, form, pageToken);
      token = pageToken;
    }
    const { data, error } = await admin.rpc('meta_lead_ads_route_write', {
      ...actor, _page_id: page, _form_id: form, _expected_revision: revision, _page_token: token,
    });
    if (error) {
      if (error.code === '42501') return failure('forbidden', 403);
      if (error.code === '22023') return failure('invalid_input', 400);
      return failure('configuration_unavailable', 503);
    }
    return data === true ? json({ ok: true }) : failure('route_conflict', 409);
  } catch (error) {
    if (error instanceof MetaLeadError) return failure(error.code, 422);
    return failure('configuration_unavailable', 503);
  }
});
