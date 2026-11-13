# Safar ERP — Trip File 2.0 Sprint 9: Hotelbeds booking status observation

**Staged code only. Not deployed; no live database or supplier credentials used.**

## Source and scope

Official Hotelbeds Hotel Booking API documentation:
https://developer.hotelbeds.com/documentation/hotels/booking-api/

Hotelbeds published Postman BookingDetail:
https://www.postman.com/clientapi/apitude-by-hotelbeds/request/fx27j8x/bookingdetail

The request is GET /hotel-api/1.0/bookings/{bookingReference} to retrieve an existing
hotel booking status. **A confirmed booking status does NOT prove that a proposed
room, date, pax or price amendment was executed.**

## Implemented

- User-initiated lookup only. No polling, supplier mutation or payment action.
- Authenticated Supabase Edge Function requires valid signed-in JWT, active
  organization membership, bookings_view and financial_view permissions.
- Fetches the amendment and booking from the user's RLS-scoped client.
- Requires an approved hotel amendment, active supplier handoff and a
  non-cancelled original booking.
- Finds one actual hotel_bookings record with matching original booking ID,
  company, Hotelbeds identity and booking_reference_supplier.
- Server-only API key and secret; validates exact allowed organization ID.
  Frontend never receives credentials.
- Supplier URL and GET verb are fixed; no caller-controlled host or path;
  redirects refused, timeout and basic response size limit.
- Response includes only observation status CONFIRMED/CANCELLED/MODIFIED/UNKNOWN,
  timestamp, environment and warning; strips guest details, financial data
  and raw provider body.
- No changes to bookings, invoices, payments, refunds, quotes or supplier API.
- All observations always carry amendmentExecutionVerified=false.
- Existing BookingWorkspace handoff gains a manual inspection panel.

## Explicit server-only opt-in configuration

All variables are unset by default; leaving them unset blocks supplier calls:

- HOTELBEDS_VERIFY_ENABLED=true
- HOTELBEDS_VERIFY_ALLOWED_ORG_ID=exact authorized staging organization UUID
- HOTELBEDS_VERIFY_API_KEY=server-only secret
- HOTELBEDS_VERIFY_SECRET=server-only secret
- HOTELBEDS_VERIFY_ENV=test

A production lookup additionally requires HOTELBEDS_VERIFY_ENV=production and
HOTELBEDS_VERIFY_PRODUCTION_ACK=REVIEWED.

**Do not put credentials in VITE_ variables or GitHub.** This version is
single-org only. A genuine multi-tenant credential vault and company-specific
provider authorization are required before offering it to other agencies.
An in-memory rate limiter is present but does not replace shared limits.

## Mandatory nonproduction acceptance

1. Restore database read access in the correct Lovable Cloud project; exact
   root cause is currently not confirmed.
2. Verify hosted schema, RLS, active membership, permissions and original
   supplier reference records under two real TEST organization accounts.
3. Use Hotelbeds TEST credentials and TEST bookings; test confirmed, cancelled,
   not-found, wrong-company, wrong-service, and missing credentials outcomes.
4. Before saying a particular amendment has been executed, compare an
   independently trusted before/after supplier payload for exact room, dates,
   guest counts and currency/cost. This phase does not do that comparison.
5. Introduce shared rate limits, audit retention and secret isolation before
   high-volume or multi-company use.
6. Keep supplier modifications, refunds, payments and outgoing messages disabled.

## Automated verification

Pure TypeScript: reference sanitation, host isolation, company/booking binding,
supplier response PII stripping and false verification prevention.

Static contract: platform JWT flag, RLS client authorization, active membership,
permission RPCs, fixed GET, no service_role, no database writes, opt-in gate.

Integrated GitHub Actions also runs the earlier Trip File PostgreSQL security
fixtures, TypeScript check and app production build. These checks **do not**
constitute a real authenticated hosted or Hotelbeds test.
