/**
 * Trip File: ONE user-triggered READ-ONLY air PNR observation.
 * Travelport TripServices Air v11 is implemented behind strict opt-in.
 * Amadeus Enterprise requires agency-specific provisioned SOAP/API contracts;
 * never send its PNR to retired Self-Service endpoints or guessed hosts.
 * No external booking mutation, ticket issue, cancellation or local DB write.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { readBoundedJsonBody } from '../_shared/trip-file-bounded-json.ts';
import {
  sameAirBookingReference, providerFromSupplier, parseTravelportReservation,
  safeAirLocator, travelportOAuthUrl, travelportRetrieveUrl,
  type ProviderEnvironment,
} from '../_shared/trip-file-air-provider.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const send = (data: Record<string,unknown>, status=200) =>
  new Response(JSON.stringify({...data, amendmentExecutionVerified:false}),{
    status, headers: {...CORS, 'Content-Type':'application/json; charset=utf-8'},
  });
const unavailable = (provider?: string) => send({
  state:'not_configured', provider:provider ?? null,
  externalProviderVerification:'not_performed',
  ticketIssuanceVerified:false,
});
const unauthorized = () => send({error:'not_authorized'},403);
type TokenCache = { token:string; expiresAt:number; credentialKey:string };
let cache:TokenCache | null = null;
let inFlightToken:Promise<string> | null = null;

const getEnv = (name:string) => (Deno.env.get(name) || '').trim();
async function obtainTravelportToken(env: ProviderEnvironment):Promise<string> {
  const username = getEnv('TRAVELPORT_VERIFY_USERNAME');
  const password = Deno.env.get('TRAVELPORT_VERIFY_PASSWORD') || '';
  const id = getEnv('TRAVELPORT_VERIFY_CLIENT_ID');
  const secret = Deno.env.get('TRAVELPORT_VERIFY_CLIENT_SECRET') || '';
  if (!username || !password || !id || !secret) throw new Error('credentials_missing');

  const key = env+'|'+username+'|'+id;
  if (cache?.credentialKey === key && Date.now() < cache.expiresAt) return cache.token;
  if (inFlightToken) return inFlightToken;
  inFlightToken = (async () => {
    const tokenResponse = await fetch(travelportOAuthUrl(env),{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
      body:new URLSearchParams({
        grant_type:'password',username,password,client_id:id,client_secret:secret,
      }),
      redirect:'error',signal:AbortSignal.timeout(7500),
    });
    if (!tokenResponse.ok || Number(tokenResponse.headers.get('content-length')||0) > 16000) {
      throw new Error('provider_auth_failed');
    }
    const body = await readBoundedJsonBody(tokenResponse.body,16000) as {
      access_token?:unknown;expires_in?:unknown;
    };
    if (typeof body.access_token !== 'string' ||
      body.access_token.length < 12 || body.access_token.length > 8192) {
      throw new Error('provider_auth_invalid_token');
    }
    const seconds = typeof body.expires_in === 'number' && body.expires_in >= 180
      ? Math.min(body.expires_in,86400) : 3600;
    cache = {
      token:body.access_token,credentialKey:key,
      expiresAt:Date.now() + (seconds - 120)*1000,
    };
    return body.access_token;
  })();
  try { return await inFlightToken; } finally { inFlightToken=null; }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null,{headers:CORS});
  if (request.method !== 'POST') return send({error:'method_not_allowed'},405);
  const bearer = request.headers.get('Authorization')||'';
  if (!/^Bearer\s+[A-Za-z0-9._-]+$/.test(bearer)) {
    return send({error:'session_required'},401);
  }
  if (Number(request.headers.get('content-length')||0) > 2000) {
    return send({error:'request_too_large'},400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return send({error:'auth_unavailable'},503);
  const client = createClient(url,anon,{
    global:{headers:{Authorization:bearer}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const {data:auth,error:sessionError} = await client.auth.getUser();
  if (sessionError || !auth.user) return send({error:'invalid_session'},401);
  const quota = rateLimit('trip-file-air-lookup:'+auth.user.id,4,60000);
  if (!quota.allowed) return rateLimitResponse(quota.retryAfterMs,CORS);

  let requestId:string;
  try {
    const data = await readBoundedJsonBody(request.body,2000) as Record<string,unknown> | null;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof data.requestId !== 'string' || !UUID.test(data.requestId)) {
      return send({error:'invalid_request'},400);
    }
    requestId=data.requestId;
  } catch { return send({error:'invalid_request'},400); }

  // Never receive provider, PNR, URL or organization ID from the browser.
  const {data:requestRecord,error:requestError} = await (client as any)
    .from('booking_change_requests')
    .select('id,organization_id,booking_id,status,service_kind,service_reference')
    .eq('id',requestId).maybeSingle();
  if (requestError) return send({error:'trip_file_schema_unavailable'},503);
  if (!requestRecord) return unauthorized();
  const change = requestRecord as {
    id:string;organization_id:string;booking_id:string;status:string;
    service_kind:string|null;service_reference:string|null;
  };
  if (!UUID.test(change.organization_id) || !UUID.test(change.booking_id) ||
    change.status!=='approved' || change.service_kind!=='flight' ||
    !safeAirLocator(change.service_reference)) return unauthorized();

  const [membership,canBook,canFinance,parent,handoff,linked] = await Promise.all([
    client.from('organization_members').select('is_active')
      .eq('user_id',auth.user.id).eq('organization_id',change.organization_id).maybeSingle(),
    (client as any).rpc('has_org_permission',{
      _org_id:change.organization_id,_permission:'bookings_view',
    }),
    (client as any).rpc('has_org_permission',{
      _org_id:change.organization_id,_permission:'financial_view',
    }),
    client.from('bookings').select('id,status,workflow_stage,organization_id')
      .eq('id',change.booking_id).eq('organization_id',change.organization_id).maybeSingle(),
    (client as any).from('booking_change_handoffs').select('status')
      .eq('change_request_id',change.id).eq('organization_id',change.organization_id)
      .eq('booking_id',change.booking_id).maybeSingle(),
    client.from('flight_bookings')
      .select('id,organization_id,booking_id,booking_reference,supplier_reference,supplier_name')
      .eq('organization_id',change.organization_id).eq('booking_id',change.booking_id)
      .or('booking_reference.eq.'+change.service_reference+
        ',supplier_reference.eq.'+change.service_reference).limit(3),
  ]);
  if (membership.error || canBook.error || canFinance.error || parent.error ||
    handoff.error || linked.error) return send({error:'authorization_data_unavailable'},503);
  if (!membership.data?.is_active || canBook.data!==true || canFinance.data!==true) {
    return unauthorized();
  }
  if (!parent.data || parent.data.status==='cancelled' ||
    parent.data.workflow_stage==='cancelled' || !handoff.data ||
    !['supplier_confirmed','finance_reviewed','execution_reported'].includes(handoff.data.status)) {
    return unauthorized();
  }
  const rows=linked.data||[];
  if (rows.length !== 1) return send({
    state:'source_not_unambiguous',externalProviderVerification:'not_performed',
    ticketIssuanceVerified:false,
  },409);
  const provider = providerFromSupplier(rows[0].supplier_name);
  if (!provider || !sameAirBookingReference(
    rows[0],change.organization_id,change.booking_id,change.service_reference,provider,
  )) return send({
    state:'source_not_unambiguous', externalProviderVerification:'not_performed',
    ticketIssuanceVerified:false,
  },409);

  // Amadeus Self-Service was decommissioned. No contract-specific Enterprise
  // endpoint, office/PCC or secure SOAP session has been supplied or verified.
  // Return a truthful disabled status; absolutely no Amadeus network call.
  if (provider==='amadeus_enterprise') return send({
    state:'enterprise_contract_required',provider,
    externalProviderVerification:'not_performed',ticketIssuanceVerified:false,
  });

  if (getEnv('TRAVELPORT_VERIFY_ENABLED')!=='true' ||
      getEnv('TRAVELPORT_VERIFY_ALLOWED_ORG_ID')!==change.organization_id) {
    return unavailable(provider);
  }
  const environment:ProviderEnvironment =
    getEnv('TRAVELPORT_VERIFY_ENV')==='production'?'production':'preproduction';
  const accessGroup = getEnv('TRAVELPORT_VERIFY_ACCESS_GROUP');
  if (!accessGroup || accessGroup.length>100 ||
    !getEnv('TRAVELPORT_VERIFY_USERNAME') ||
    !Deno.env.get('TRAVELPORT_VERIFY_PASSWORD') ||
    !getEnv('TRAVELPORT_VERIFY_CLIENT_ID') ||
    !Deno.env.get('TRAVELPORT_VERIFY_CLIENT_SECRET') ||
    (environment==='production' && getEnv('TRAVELPORT_VERIFY_PRODUCTION_ACK')!=='REVIEWED')) {
    return unavailable(provider);
  }

  try {
    const token=await obtainTravelportToken(environment);
    const response=await fetch(travelportRetrieveUrl(environment,change.service_reference),{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(9000),
      headers:{
        Authorization:'Bearer '+token,
        'XAUTH_TRAVELPORT_ACCESSGROUP':accessGroup,
        Accept:'application/json',
        'Accept-Encoding':'gzip, deflate',
        'Cache-Control':'no-cache',
      },
    });
    // Do not expose remote errors or ticket/passenger/payment details.
    if (!response.ok || Number(response.headers.get('content-length')||0)>262144 ||
      !(response.headers.get('content-type')||'').toLowerCase().includes('json')) {
      return send({state:'provider_unavailable',provider,
        externalProviderVerification:'not_performed',ticketIssuanceVerified:false},502);
    }
    const body=await readBoundedJsonBody(response.body,262144);
    const observation=parseTravelportReservation(body,change.service_reference);
    return send({
      state:'provider_pnr_observed',
      provider,
      environment,
      checkedAt:new Date().toISOString(),
      airStatus:observation.airStatus,
      segmentStatusSamples:observation.statusSampleCount,
      externalProviderVerification:'pnr_status_only',
      ticketIssuanceVerified:false,
      caveat:'PNR retrieval does not prove ticket issue, completed changes or refund.',
    });
  } catch {
    return send({
      state:'provider_unavailable',provider,
      externalProviderVerification:'not_performed',ticketIssuanceVerified:false,
    },502);
  }
});
