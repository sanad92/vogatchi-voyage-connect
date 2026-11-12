/** Draft: read-only Air GDS source observation.
 * Travelport TripServices v11 Reservation Retrieve GET is optional and OFF.
 * Amadeus Enterprise requires verified PNR contract; no legacy self-service.
 * Never sends customer PII, mutates a booking, issues ticket, refunds or posts.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import {
  isRegisteredGdsFlight, validTravelportLocator,
  travelportReservationUrl, parseTravelportAirObservation,
  type AirGdsProvider,
} from '../_shared/trip-file-air-gds.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify({ amendmentExecutionVerified: false, ...body }),
  { status, headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8'} },
);
const denied = () => json({ error: 'air_gds_verification_not_authorized' }, 403);
const unconfigured = (provider: AirGdsProvider, reason = 'not_configured') =>
  json({ provider, state: reason, externalProviderVerification:'not_performed' });

let cached: { accessToken:string; expiresAt:number; environment:string } | null = null;

async function travelportToken(environment: 'preproduction' | 'production'): Promise<string | null> {
  const now = Date.now();
  if (cached?.environment === environment && cached.expiresAt > now + 30_000) {
    return cached.accessToken;
  }
  const username = Deno.env.get('TRAVELPORT_VERIFY_USERNAME');
  const password = Deno.env.get('TRAVELPORT_VERIFY_PASSWORD');
  const clientId = Deno.env.get('TRAVELPORT_VERIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('TRAVELPORT_VERIFY_CLIENT_SECRET');
  if (!username || !password || !clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type:'password', username, password,
    client_id:clientId, client_secret:clientSecret,
  });
  const endpoint = environment === 'production'
    ? 'https://auth.travelport.net/oauth/token'
    : 'https://auth.pp.travelport.net/oauth/token';
  const response = await fetch(endpoint, {
    method:'POST', body,
    headers: { 'Content-Type':'application/x-www-form-urlencoded', Accept:'application/json' },
    redirect:'error', signal:AbortSignal.timeout(8000),
  });
  if (!response.ok || Number(response.headers.get('content-length') || '0') > 16_384) {
    throw new Error('travelport_token_unavailable');
  }
  const raw = await response.text();
  if (raw.length > 16_384) throw new Error('travelport_token_response_too_large');
  const data = JSON.parse(raw);
  if (!data || typeof data.access_token !== 'string'
    || !data.access_token || data.access_token.length > 8_000) {
    throw new Error('invalid_travelport_token_response');
  }
  // Cache for less than the provisioned token TTL; no token stored to DB.
  const ttl = Number(data.expires_in);
  const seconds = Number.isFinite(ttl) && ttl >= 120
    ? Math.min(ttl - 90, 23 * 3600) : 120;
  cached = { accessToken:data.access_token, environment, expiresAt:now + seconds * 1000 };
  return cached.accessToken;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null,{headers:CORS});
  if (request.method !== 'POST') return json({error:'method_not_allowed'},405);
  const header = request.headers.get('Authorization') || '';
  if (!/^Bearer\s+[A-Za-z0-9._-]+$/.test(header)) {
    return json({error:'signed_in_session_required'},401);
  }
  const size = Number(request.headers.get('content-length') || '0');
  if (!Number.isFinite(size) || size > 2048) return json({error:'invalid_request_size'},400);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({error:'auth_not_configured'},503);
  const client = createClient(url,anon,{
    global:{headers:{Authorization:header}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const {data:auth,error:sessionError} = await client.auth.getUser();
  if (sessionError || !auth.user) return json({error:'session_invalid'},401);
  const quota=rateLimit('air-gds-readonly:'+auth.user.id,3,60_000);
  if(!quota.allowed) return rateLimitResponse(quota.retryAfterMs,CORS);

  let requestId:string; let provider:AirGdsProvider;
  try {
    const payload=await request.json();
    const raw=payload && typeof payload==='object'&&!Array.isArray(payload)
      ? payload as Record<string,unknown>:null;
    if(!raw || typeof raw.requestId!=='string'||!UUID.test(raw.requestId)
      || (raw.provider!=='travelport' && raw.provider!=='amadeus')) {
      throw new Error('invalid');
    }
    requestId=raw.requestId;
    provider=raw.provider;
  } catch {return json({error:'invalid_request'},400);}

  const {data:amendment,error:amendmentError}=await client
    .from('booking_change_requests' as any)
    .select('id,organization_id,booking_id,service_kind,service_reference,status')
    .eq('id',requestId).maybeSingle();
  if(amendmentError) return json({error:'trip_file_database_unavailable'},503);
  const a=amendment as any;
  if(!a || a.status!=='approved'||a.service_kind!=='flight'
    ||!UUID.test(a.organization_id)||!UUID.test(a.booking_id)
    ||typeof a.service_reference!=='string')return denied();

  const [member,bookingsPermission,financePermission]=await Promise.all([
    client.from('organization_members').select('is_active')
      .eq('organization_id',a.organization_id)
      .eq('user_id',auth.user.id).maybeSingle(),
    client.rpc('has_org_permission' as any,{
      _org_id:a.organization_id,_permission:'bookings_view',
    }),
    client.rpc('has_org_permission' as any,{
      _org_id:a.organization_id,_permission:'financial_view',
    }),
  ]);
  if(member.error||bookingsPermission.error||financePermission.error)
    return json({error:'authorization_unavailable'},503);
  if(!member.data?.is_active || bookingsPermission.data!==true
    ||financePermission.data!==true)return denied();

  const [parent,handoff,flights]=await Promise.all([
    client.from('bookings').select('id,organization_id,status,workflow_stage')
      .eq('id',a.booking_id).eq('organization_id',a.organization_id).maybeSingle(),
    client.from('booking_change_handoffs' as any).select('status')
      .eq('organization_id',a.organization_id).eq('booking_id',a.booking_id)
      .eq('change_request_id',requestId).maybeSingle(),
    client.from('flight_bookings')
      .select('id,booking_id,organization_id,supplier_reference,supplier_name')
      .eq('organization_id',a.organization_id).eq('booking_id',a.booking_id)
      .eq('supplier_reference',a.service_reference).limit(2),
  ]);
  if(parent.error||handoff.error||flights.error)
    return json({error:'booking_lookup_unavailable'},503);
  if(!parent.data || ['cancelled','canceled'].includes(String(parent.data.status).toLowerCase())
    ||String(parent.data.workflow_stage).toLowerCase()==='cancelled')return denied();
  if(!handoff.data || !['supplier_confirmed','finance_reviewed','execution_reported']
    .includes((handoff.data as any).status))return denied();

  // Fail closed when the same provider locator appears on multiple service rows.
  if(flights.data?.length!==1 || !isRegisteredGdsFlight(
    flights.data[0],a.organization_id,a.booking_id,a.service_reference,provider,
  ))return json({
    state:'reference_not_linked',provider,externalProviderVerification:'not_performed',
  },409);

  // Platform opt-in is scoped to one company, never shared across agencies.
  if(Deno.env.get('AIR_GDS_VERIFY_ENABLED')!=='true'
    ||Deno.env.get('AIR_GDS_VERIFY_ALLOWED_ORG_ID')!==a.organization_id) {
    return unconfigured(provider);
  }

  if(provider==='amadeus') {
    // Amadeus Self-Service was retired in July 2026. The Enterprise
    // PNR_Retrieve API contract has not been provisioned or validated.
    // Never attempt to fetch a GDS PNR via retired Flight Order Management.
    return unconfigured(provider,'enterprise_contract_required');
  }

  if(!validTravelportLocator(a.service_reference)
    ||Deno.env.get('TRAVELPORT_VERIFY_ENABLED')!=='true') {
    return unconfigured(provider);
  }
  const environment=Deno.env.get('TRAVELPORT_VERIFY_ENV')==='production'
    ? 'production' as const:'preproduction' as const;
  if(environment==='production'
    &&Deno.env.get('TRAVELPORT_VERIFY_PRODUCTION_ACK')!=='REVIEWED') {
    return unconfigured(provider);
  }
  const accessGroup=Deno.env.get('TRAVELPORT_VERIFY_ACCESS_GROUP');
  if(!accessGroup || !/^[A-Za-z0-9-]{12,64}$/.test(accessGroup)) {
    return unconfigured(provider);
  }

  try {
    const token=await travelportToken(environment);
    if(!token) return unconfigured(provider);
    const response=await fetch(travelportReservationUrl(environment,a.service_reference),{
      method:'GET',
      headers:{
        Accept:'application/json',
        Authorization:'Bearer '+token,
        XAUTH_TRAVELPORT_ACCESSGROUP:accessGroup,
        'Cache-Control':'no-cache',
      },
      redirect:'error',signal:AbortSignal.timeout(8000),
    });
    const declared=Number(response.headers.get('content-length')||'0');
    if(!response.ok || declared>131_072 ||
      !(response.headers.get('content-type')||'').includes('json')) {
      return json({provider,state:'provider_unavailable',
        externalProviderVerification:'not_performed'},502);
    }
    const raw=await response.text();
    if(raw.length>131_072)throw new Error('response_too_large');
    const observation=parseTravelportAirObservation(JSON.parse(raw),a.service_reference);
    return json({
      provider,
      state:'provider_reservation_observed',
      environment,
      checkedAt:new Date().toISOString(),
      externalProviderVerification:'reservation_status_only',
      reservationStatus:observation.reservationStatus,
      scheduleChangeFlag:observation.scheduleChangeFlag,
      bookingReferenceMatched:observation.bookingReferenceMatched,
      ticketingVerified:false,
      caveat:'Reservation status is not ticket validation or proof of requested amendment.',
    });
  }catch {
    // Do not leak provider PII, credentials, token or upstream response.
    return json({provider,state:'provider_unavailable',
      externalProviderVerification:'not_performed'},502);
  }
});
