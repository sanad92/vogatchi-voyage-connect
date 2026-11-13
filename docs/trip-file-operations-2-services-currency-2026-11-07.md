# Trip File & Booking Operations 2.0 — Service Currency Overview

Status: **staged in code, not published or merged**.

## Verified from existing code
- Existing BookingWorkspace has a 'البرنامج' itinerary tab.
- Linked hotel, flight, transport and car bookings are already queried and
  displayed with their individual supplier/cost/sell amounts and currency.
- The existing user experience does not aggregate them by currency, and the
  four source-table requests previously could silently fail while returning
  an empty list.

## Changes
- Reuse `useBookingServices` and `ItineraryTab` rather than building
  another service store or changing existing financial reports.
- Render a read-only `TripServicesMoneySummary` with separate **EGP**,
  **SAR**, **USD**, etc. cards (only currencies actually found in the data).
- For each individual currency, summarize linked-service selling, cost,
  indicative gross difference and count.
- **Unknown/missing currency is its own bucket**. No default to EGP;
  no currency conversion; no mixed-currency totals.
- A failed service query shows a real error and retry button, not a false
  'no services' empty state.
- Warn when any linked service shows zero cost: it may be legitimately
  free or a missing supplier value.
- Invalid numeric input from a backend row prevents showing a misleading
  profit for its currency group.
- No writes, invoices, supplier payments, refunds, exchange rates,
  booking status changes or WhatsApp messages.

## Financial accuracy limitations
- Existing service cost mapping for hotels derives estimated supplier cost
  from cost per night × nights × room count. This is NOT authoritative
  supplier settlement or a complete all-in margin.
- The derived difference does not include FX, taxes, commissions, payment
  fees, amendments or unlinked expenses.
- Read the Finance tab's accounting and Profit Cockpit for financial
  reporting. This UI explicitly labels service amounts as indicative.
- Linked-service queries may return cost 0 for null source values; we warn
  rather than declare the result as a verified profit.
- Sales amounts are not automatically posted into any financial ledger.

## Tests and release
- Pure TypeScript tests validate independent SAR/USD buckets, missing
  currency, invalid numeric data and zero costs.
- Existing TypeScript/build checks run in CI.
- Live Lovable Cloud database not accessible for hosted end-to-end tests.
- Review service source-column naming, supplier net costs, currency and
  rounding by actual booking before publishing.
- This branch is independent of amendments PR #26 and quote snapshot PR #27.
  The unmerged Operations PR #17 also touched the service hook/itinerary
  and may need conflict reconciliation at merge.
