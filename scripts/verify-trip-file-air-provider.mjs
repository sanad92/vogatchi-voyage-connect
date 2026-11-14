import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(path,'utf8');
const edge=source('supabase/functions/trip-file-air-reservation-status/index.ts');
const shared=source('supabase/functions/_shared/trip-file-air-provider.ts');
const config=source('supabase/config.toml');
const component=source('src/components/bookings/workspace/BookingAirProviderObservation.tsx');
const handoff=source('src/components/bookings/workspace/BookingAmendmentHandoffPanel.tsx');

assert.match(config,/\[functions\.trip-file-air-reservation-status\]\s*verify_jwt\s*=\s*true/,
  'JWT must be platform-verified');
assert.match(edge,/client\.auth\.getUser\(\)/, 'user JWT must be validated server-side');
assert.match(edge,/from\('organization_members'\)/);
assert.match(edge,/\.eq\('user_id',auth\.user\.id\)/);
assert.match(edge,/_permission:'bookings_view'/);
assert.match(edge,/_permission:'financial_view'/);
assert.match(edge,/from\('flight_bookings'\)/);
assert.match(edge,/\.eq\('booking_id',change\.booking_id\)/);
assert.match(edge,/sameAirBookingReference\(/);
assert.match(edge,/status!=='approved'/);
assert.match(edge,/service_kind!=='flight'/);
assert.match(edge,/handoff\.data/);
assert.match(edge,/TRAVELPORT_VERIFY_ENABLED/);
assert.match(edge,/TRAVELPORT_VERIFY_ALLOWED_ORG_ID/);
assert.match(edge,/TRAVELPORT_VERIFY_PRODUCTION_ACK/);
assert.match(edge,/enterprise_contract_required/, 'Amadeus must not be called without enterprise contract');
assert.match(edge,/obtainTravelportToken\(environment\)/);
assert.match(edge,/readBoundedJsonBody\(request\.body,2000\)/);
assert.match(edge,/readBoundedJsonBody\(tokenResponse\.body,16000\)/);
assert.match(edge,/readBoundedJsonBody\(response\.body,262144\)/);
assert.doesNotMatch(edge,/request\.json\(\)|tokenResponse\.text\(\)|response\.text\(\)/,
  'untrusted JSON must not be buffered without a byte limit');
assert.match(edge,/method:'GET'/, 'Travelport uses GET for reservation retrieval');
assert.match(edge,/SABRE_VERIFY_ALLOWED_ORG_ID/);
assert.match(edge,/SABRE_VERIFY_PRODUCTION_ACK/);
assert.match(edge,/fetch\(sabreEndpoints\(environment\)\.retrieve/);
assert.match(edge,/body: JSON.stringify\(\{ confirmationId: locator, returnOnly: \['FLIGHTS'\] \}\)/);
assert.match(shared,/retrieve: host \+ '\/v1\/trip\/orders\/getBooking'/);
assert.match(edge,/if \(provider === 'sabre'\) return observeSabre\(change.organization_id, change.service_reference\)/);
assert.match(edge,/redirect:'error'/, 'no provider redirects');
assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY/,'must not bypass RLS');
assert.doesNotMatch(edge,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/,'must not write DB');
assert.doesNotMatch(edge,/method:'(?:PUT|PATCH|DELETE)'/,'no supplier booking writes');
assert.doesNotMatch(edge,/test\.api\.amadeus\.com|api\.amadeus\.com/,
  'retired Amadeus self-service must never be called');
assert.match(shared,/ReservationResponse/, 'Travelport official response shape');
assert.match(shared,/ReceiptConfirmation/, 'must bind retrieved receipt to booking locator');
assert.match(shared,/amendmentExecutionVerified:\s*false/);
assert.match(shared,/ticketIssuanceVerified:\s*false/);
assert.match(component,/Amadeus Enterprise/);
assert.match(component,/مش دليل على إصدار التذكرة/);
assert.match(handoff,/BookingAirProviderObservation/);
console.log('Trip File air supplier JWT, tenant, read-only and Amadeus contract checks passed');
