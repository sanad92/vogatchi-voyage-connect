import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const workspace = read('src/pages/BookingWorkspace.tsx');
const amendmentUi = read('src/components/bookings/workspace/BookingAmendmentsTab.tsx');
const handoffUi = read('src/components/bookings/workspace/BookingAmendmentHandoffPanel.tsx');
const sourceEvidenceUi = read('src/components/bookings/workspace/BookingAmendmentEvidencePanel.tsx');
const financialReviewUi = read('src/components/bookings/workspace/BookingAmendmentFinancialReview.tsx');
const itinerary = read('src/components/bookings/workspace/ItineraryTab.tsx');
const serviceHook = read('src/hooks/useBookingServices.ts');
const quotes = read('src/pages/QuoteDetails.tsx');
const versionUi = read('src/components/quotes/QuoteVersionHistory.tsx');
const amendmentSql = read('scripts/deploy-trip-file-amendments.sql');
const handoffSql = read('scripts/deploy-trip-file-supervised-handoff.sql');
const evidenceSql = read('scripts/deploy-trip-file-source-evidence-links.sql');
const versionsSql = read('scripts/deploy-quote-version-snapshots.sql');

assert.match(workspace, /<BookingAmendmentsTab\s+bookingId=/, 'trip amendments must appear in the existing booking workspace');
assert.match(amendmentUi, /BookingAmendmentHandoffPanel/, 'approved amendments must show handoff evidence');
assert.match(handoffUi, /BookingAmendmentEvidencePanel/, 'handoffs must expose original document links');
assert.match(sourceEvidenceUi, /BookingAmendmentFinancialReview/, 'document links must lead to finance reconciliation');
assert.match(financialReviewUi, /useBookingProfitCockpit/, 'existing authoritative booking finance RPC is reused');

assert.match(itinerary, /TripServicesMoneySummary/, 'existing itinerary must expose currency-safe service overview');
assert.match(serviceHook, /if \(failed\) throw new Error/, 'service queries must not silently return an empty list on errors');
assert.match(quotes, /QuoteVersionHistory/, 'quote details must include version history');
assert.match(quotes, /hasPermission\('financial_view'\)/, 'price archives must be finance-gated in UI');
assert.match(versionUi, /capture_quote_version_snapshot/, 'quote archive must call original guarded RPC');

for (const [label, sql] of [
  ['amendments', amendmentSql],
  ['handoff', handoffSql],
  ['evidence', evidenceSql],
  ['quote versions', versionsSql],
]) {
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/, label + ' must enable RLS');
  assert.match(sql, /REVOKE ALL/, label + ' must revoke default privileges');
  assert.match(sql, /SECURITY DEFINER/, label + ' must guard privileged operations');
  assert.match(sql, /auth\.uid\(\)/, label + ' must check authenticated actor');
}
assert.doesNotMatch(evidenceSql, /UPDATE public\.(?:invoices|supplier_invoices|customer_payments|supplier_payments|bookings)\s+SET/i,
  'linking source evidence must not mutate core finance/booking rows');
assert.doesNotMatch(handoffSql, /UPDATE public\.(?:invoices|supplier_invoices|customer_payments|supplier_payments|bookings)\s+SET/i,
  'human handoff cannot mutate original financial/booking records');
assert.doesNotMatch(versionsSql, /UPDATE public\.(?:quotes|quote_items|bookings)\s+SET/i,
  'quote snapshot must not alter current quote');

const docs = read('docs/trip-file-2-allocation-review-2026-11-08.md');
assert.match(docs, /not a payment processor|NOT proof|NOT proof|NOT complete|NOT certif|NOT prove|not prove/i,
  'release documentation must not treat a record link as banking execution');
console.log('Integrated Trip File #26-#31 source security and UI routing checks passed.');
