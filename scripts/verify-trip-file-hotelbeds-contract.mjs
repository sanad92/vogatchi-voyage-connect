import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const edge = read('supabase/functions/trip-file-hotelbeds-status/index.ts');
const shared = read('supabase/functions/_shared/trip-file-hotelbeds.ts');
const config = read('supabase/config.toml');
const component = read('src/components/bookings/workspace/BookingHotelbedsObservation.tsx');
const handoff = read('src/components/bookings/workspace/BookingAmendmentHandoffPanel.tsx');

assert.match(config, /\[functions\.trip-file-hotelbeds-status\]\s*verify_jwt\s*=\s*true/,
  'Edge function must require a signed-in JWT');
assert.match(edge, /client\.auth\.getUser\(\)/, 'JWT must be verified with the auth server');
assert.match(edge, /from\('organization_members'\)/, 'company membership is server-checked');
assert.match(edge, /is_active/, 'inactive staff cannot use supplier credentials');
assert.match(edge, /_permission:\s*'bookings_view'/, 'booking-view permission must be required');
assert.match(edge, /_permission:\s*'financial_view'/, 'financial-view permission must be required');
assert.match(edge, /from\('hotel_bookings'\)/, 'supplier ref must match original service row');
assert.match(edge, /booking_reference_supplier/, 'do not use free-form amendment notes as provider truth');
assert.match(edge, /HOTELBEDS_VERIFY_ALLOWED_ORG_ID/, 'single tenant feature gate required');
assert.match(edge, /HOTELBEDS_VERIFY_ENABLED/, 'feature disabled without explicit opt-in');
assert.match(edge, /HOTELBEDS_VERIFY_PRODUCTION_ACK/, 'production gate must be explicit');
assert.match(edge, /redirect:\s*'error'/, 'never follow supplier HTTP redirects');
assert.match(edge, /method:\s*'GET'/, 'outbound supplier request must be read-only');
assert.doesNotMatch(edge, /fetch\(.*req\.url/, 'do not let a user choose a supplier URL');
assert.doesNotMatch(edge, /SUPABASE_SERVICE_ROLE_KEY/, 'this endpoint must not bypass RLS');
assert.doesNotMatch(edge, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/,
  'no financial, provider or booking writes allowed');
assert.doesNotMatch(edge, /method:\s*'(?:POST|PUT|PATCH|DELETE)'/,
  'outbound provider methods must never write to supplier');
assert.match(shared, /amendmentExecutionVerified:\s*false/,
  'booking status cannot imply amendment completion');
assert.match(component, /حتى لو كانت الحالة CONFIRMED/,
  'UI must warn that existing booking confirmation does not prove modification');
assert.match(handoff, /BookingHotelbedsObservation/,
  'provider observation must appear in the existing handoff workspace');
console.log('Trip File Hotelbeds JWT, RLS, tenant-binding and no-write source contracts passed.');
