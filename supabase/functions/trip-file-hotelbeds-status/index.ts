/**
 * Read-only Hotelbeds Hotel BookingDetail observation for Trip File.
 * Staged for authenticated testing only. No supplier POST/PUT/DELETE,
 * no booking/invoice/refund writes and no raw provider response returned.
 *
 * Required opt-in server secrets:
 *   HOTELBEDS_VERIFY_ENABLED=true
 *   HOTELBEDS_VERIFY_ALLOWED_ORG_ID=<exact organization uuid>
 *   HOTELBEDS_VERIFY_API_KEY / HOTELBEDS_VERIFY_SECRET
 *   HOTELBEDS_VERIFY_ENV=test (default) | production
 *   HOTELBEDS_VERIFY_PRODUCTION_ACK=REVIEWED (additional prod guard)
 */
import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import {
  hotelbedsDetailUrl,
  isSafeHotelbedsReference,
  matchesRegisteredHotelbedsService,
  parseHotelbedsBookingObservation,
} from '../_shared/trip-file-hotelbeds.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });

async function sha256hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}
const notConfigured = () => json({
  state: 'not_configured',
  externalProviderVerification: 'not_performed',
  amendmentExecutionVerified: false,
  message: 'Hotelbeds verification is not configured for this company.',
});
const denied = () => json({ error: 'verification_not_authorized' }, 403);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+[A-Za-z0-9._-]+$/.test(authorization)) {
    return json({ error: 'user_session_required' }, 401);
  }
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (!Number.isFinite(contentLength) || contentLength > 2048) {
    return json({ error: 'invalid_request_size' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'auth_not_configured' }, 503);

  // User session and RLS only: never give this handler service_role access.
  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: sessionError } = await client.auth.getUser();
  if (sessionError || !auth.user) return json({ error: 'session_invalid' }, 401);
  const quota = rateLimit('hotelbeds-trip-file:' + auth.user.id, 4, 60_000);
  if (!quota.allowed) return rateLimitResponse(quota.retryAfterMs, CORS);

  let requestId: string;
  try {
    const payload = await request.json();
    const candidate = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).requestId : null;
    if (typeof candidate !== 'string' || !UUID.test(candidate)) throw new Error('invalid');
    requestId = candidate;
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }

  const { data: amendment, error: amendmentError } = await client
    .from('booking_change_requests' as any)
    .select('id,organization_id,booking_id,service_kind,service_reference,status')
    .eq('id', requestId).maybeSingle();
  if (amendmentError) return json({ error: 'trip_file_database_unavailable' }, 503);
  if (!amendment) return denied();

  const a = amendment as any;
  if (a.status !== 'approved' || a.service_kind !== 'hotel'
    || !isSafeHotelbedsReference(a.service_reference) || !UUID.test(a.organization_id)
    || !UUID.test(a.booking_id)) return denied();

  // Check explicit active membership and organization permission against
  // server-side request/org (not an organization ID supplied by the browser).
  const [membership, bookingView, financeView] = await Promise.all([
    client.from('organization_members').select('is_active')
      .eq('organization_id', a.organization_id)
      .eq('user_id', auth.user.id).maybeSingle(),
    client.rpc('has_org_permission' as any, {
      _org_id: a.organization_id, _permission: 'bookings_view',
    }),
    client.rpc('has_org_permission' as any, {
      _org_id: a.organization_id, _permission: 'financial_view',
    }),
  ]);
  if (membership.error || bookingView.error || financeView.error) {
    return json({ error: 'authorization_service_unavailable' }, 503);
  }
  if (!membership.data?.is_active || bookingView.data !== true || financeView.data !== true) {
    return denied();
  }

  const [parent, handoff, source] = await Promise.all([
    client.from('bookings')
      .select('id,organization_id,status,workflow_stage')
      .eq('id', a.booking_id).eq('organization_id', a.organization_id).maybeSingle(),
    client.from('booking_change_handoffs' as any)
      .select('status').eq('change_request_id', a.id)
      .eq('booking_id', a.booking_id).eq('organization_id', a.organization_id).maybeSingle(),
    client.from('hotel_bookings')
      .select('id,organization_id,booking_id,booking_reference_supplier,booking_source,supplier_name')
      .eq('booking_id', a.booking_id)
      .eq('organization_id', a.organization_id)
      .eq('booking_reference_supplier', a.service_reference)
      .limit(2),
  ]);
  if (parent.error || handoff.error || source.error) {
    return json({ error: 'booking_lookup_unavailable' }, 503);
  }
  const booking = parent.data;
  if (!booking || booking.status === 'cancelled' || booking.workflow_stage === 'cancelled') {
    return denied();
  }
  if (!handoff.data || !['supplier_confirmed','finance_reviewed','execution_reported']
    .includes((handoff.data as any).status)) return denied();

  const linkedHotel = source.data ?? [];
  if (linkedHotel.length !== 1 || !matchesRegisteredHotelbedsService(
    linkedHotel[0], a.organization_id, a.booking_id, a.service_reference,
  )) {
    // No free-form supplier reference can access unrelated provider bookings.
    return json({
      state: 'reference_not_linked',
      externalProviderVerification: 'not_performed',
      amendmentExecutionVerified: false,
    }, 409);
  }

  // Single-company, explicitly enabled secret set. Never reuse one agency's
  // provider credentials to inspect another company's reservations.
  if (Deno.env.get('HOTELBEDS_VERIFY_ENABLED') !== 'true' ||
    Deno.env.get('HOTELBEDS_VERIFY_ALLOWED_ORG_ID') !== a.organization_id) {
    return notConfigured();
  }
  const apiKey = Deno.env.get('HOTELBEDS_VERIFY_API_KEY');
  const secret = Deno.env.get('HOTELBEDS_VERIFY_SECRET');
  const environment = Deno.env.get('HOTELBEDS_VERIFY_ENV') === 'production'
    ? 'production' : 'test';
  if (!apiKey || !secret || (environment === 'production'
    && Deno.env.get('HOTELBEDS_VERIFY_PRODUCTION_ACK') !== 'REVIEWED')) {
    return notConfigured();
  }

  const urlToGet = hotelbedsDetailUrl(environment, a.service_reference);
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const signature = await sha256hex(apiKey + secret + String(epoch));
    const response = await fetch(urlToGet, {
      method: 'GET',
      headers: {
        'Api-key': apiKey, 'X-Signature': signature, Accept: 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    const statedSize = Number(response.headers.get('content-length') || '0');
    if (!response.ok || (statedSize && statedSize > 131_072) ||
      !(response.headers.get('content-type') || '').includes('json')) {
      return json({
        state: 'provider_unavailable',
        externalProviderVerification: 'not_performed',
        amendmentExecutionVerified: false,
      }, 502);
    }
    const raw = await response.text();
    if (raw.length > 131_072) {
      return json({ state: 'provider_unavailable', amendmentExecutionVerified: false }, 502);
    }
    const observation = parseHotelbedsBookingObservation(
      JSON.parse(raw), a.service_reference,
    );
    return json({
      state: 'provider_booking_observed',
      provider: 'hotelbeds_hotel',
      environment,
      checkedAt: new Date().toISOString(),
      providerBookingStatus: observation.providerStatus,
      referenceMatchesRegisteredService: true,
      externalProviderVerification: 'booking_status_only',
      amendmentExecutionVerified: false,
      caveat: 'Booking status lookup does not prove a requested room/date/price change.',
    });
  } catch {
    // Never return provider response, auth signature, raw guest records or URL.
    return json({
      state: 'provider_unavailable',
      externalProviderVerification: 'not_performed',
      amendmentExecutionVerified: false,
    }, 502);
  }
});
