# Trip File 2.0 — Sprint 10: Hotelbeds provider-date diagnostics

**Staged read-only development. Not deployed, no Hotelbeds credentials or live booking calls.**

This sprint builds on PR #34, which stages a user-triggered Hotelbeds Hotel
BookingDetail GET lookup. Official endpoint documentation:
https://www.postman.com/clientapi/apitude-by-hotelbeds/request/fx27j8x/bookingdetail
and https://developer.hotelbeds.com/documentation/hotels/booking-api/

## What's new

- Alongside provider booking status, the server tries to read check-in and
  check-out dates ONLY from the expected response structure
  `booking.hotel.checkIn` and `booking.hotel.checkOut`.
- Compares those values with `hotel_bookings.check_in_date` and
  `hotel_bookings.check_out_date` of the ORIGINAL linked hotel service,
  as selected in the same-company same-booking RLS-scoped query.
- Only three results per date: match, mismatch, not_available.
- An absent provider field or invalid ISO calendar date produces
  `not_available` (never a guessed match).
- The response contains **no actual guest names, emails, room details,
  net supplier prices or full provider JSON**.
- UI explains explicitly that a match is between provider and **current
  local booking record**, NOT between the provider and the requested
  free-text amendment. A mismatch requires manual investigation.
- The existing `amendmentExecutionVerified=false` invariant is preserved.
- No supplier POST/PUT/DELETE, no booking/payment/refund writes, no emails.

## Critical limitation

The request schema currently has `description` and optional price deltas;
it does not have a verified structured target of expected travel dates,
room attributes, guest counts, or supplier price agreed for the amendment.
Therefore it is **not possible to prove the exact amendment was executed**
using this date diagnostic, even if both dates match.

Hotelbeds documentation shows the booking lookup operation, but a real test
BookingDetail JSON payload has not been observed in this environment. If the
date path differs in a particular API response the code returns "not available"
rather than parsing unexpected fields or claiming a false match.

## Release blockers

- Actual Lovable Cloud DB is enabled but the read-only query was repeatedly
  unavailable. Supabase connected projects enumerated separately do not
  include the project's configured `gvozalurfthzxpuasplo` project reference.
  Do not deploy migrations to a different inactive project.
- CI pure tests use synthetic Hotelbeds-shaped data and cannot replace
  real provider test booking and authenticated RLS/permission checks.
- Provider API credentials are OFF by default and confined to a single
  organization via the explicit allowlist, as in PR #34.
- Before any operational acceptance, capture a reviewed, immutable
  structured amendment **target** and compare it with a genuine
  provider response verified for exact hotel, room, date, passengers and
  currency/price. Payment/refund must be independently reconciled.
- A multi-company secret manager, global rate limits and an audit log
  remain mandatory for production rollout.

This sprint is diagnostic source code only, not execution verification.
