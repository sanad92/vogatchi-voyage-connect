# Safar ERP / Trip File 2.0 — Air GDS observation (Amadeus + Travelport)

**Status: staged DRAFT source only — no provider credentials, no deployment, no live booking access.**

## Why the providers require different integrations

### Travelport TripServices v11 (Air)

Official Travelport docs specify an authenticated Reservation Retrieve:
`GET /11/air/book/reservation/reservations/{LocatorCode}`.
They describe `ReservationResponse.Reservation.Receipt`, `Confirmation.Locator` and
`OfferStatus.StatusAir`. Common examples include `HK` confirmed, `XX`
cancelled and `TK/UN` schedule-change indications. Ticket numbers require
additional ticket/document verification, NOT just reservation status.

- https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/Air11/Book/APIRef_ReservationRetrieve.htm
- https://developer.travelport.com/apis/flights/retrieve-bookings-and-tickets/getreservationbylocator
- https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/GeneralProject/Oauth.htm
- https://developer.travelport.com/docs/flights/general/common-flights-api-headers

Travelport uses OAuth2 with a token valid about 24 hours. The server-only
auth flow uses provisioned username, password, client_id and client_secret.
A module-local token cache avoids generating a token per user request within
the same function isolate. This is **not a global/distributed token cache**;
review shared token coordination and rate controls before production rollout.

### Amadeus Enterprise

Amadeus' former Self-Service developer portal was **decommissioned on
17 July 2026**. Its old `/v1/booking/flight-orders/{flightOrderId}` endpoint
accepted a specific **Flight Order ID** created by that API, not every
Amadeus GDS PNR. Do not mistake an airline locator or PNR for a Flight Order ID.

Current official portal:
- https://developers.amadeus.com/api-catalog
- https://amadeus.com/en/industry-messaging/statement-regarding-amadeus-for-developers-portal

The connected user's **Amadeus Enterprise product/license, PNR retrieval
service, authentication transport and response schema have not been
supplied or confirmed**. Therefore the new Amadeus UI/Edge route does
tenant and original-flight checks but responds `enterprise_contract_required`.
It **never attempts the retired Self-Service URL**, and never falsely
claims that a PNR is externally verified. A specific Enterprise API and
signed contract must be reviewed before an active Amadeus adapter can be
implemented.

## What was implemented

- New existing-workspace panel after approved flight amendments with
  manual **Amadeus** and **Travelport** buttons.
- Browser sends `requestId` and explicit provider only. No user-specified
  URL, login, passenger name or arbitrary lookup PNR.
- Supabase Edge Function with `verify_jwt=true`; verifies user session,
  active membership, `bookings_view` and `financial_view` using current
  company's stored amendment record and RLS-scoped query.
- Requires approved flight amendment, a non-cancelled parent booking,
  an active supplier/finance handoff, and **exactly one** original
  `flight_bookings` row with matching `organization_id`, `booking_id`
  and `supplier_reference`.
- Original flight `supplier_name` must explicitly identify Travelport,
  Galileo, Worldspan, Apollo or Amadeus; an unrelated consolidator is
  **not** automatically treated as direct GDS access.
- Travelport locator restricts to uppercase alphanumerics; URL host, path
  and outbound GET verb are fixed in code. No SSRF via caller input.
- Provider raw response is stripped of traveler names, PII, payments,
  card data, ticket numbers and fare details; response includes only
  a coarse reservation status and schedule-change indicator.
- Every response sets `amendmentExecutionVerified=false`.
  Observed reservation status never proves ticket issuance, reissue,
  refund or a requested date/flight change.
- No writes to booking, flight, finance, supplier or messages.
- Missing provider keys, wrong organization, invalid locator and unsupported
  Amadeus Enterprise contract all fail closed.

## Server-only feature flags (all OFF by default)

```text
AIR_GDS_VERIFY_ENABLED=true
AIR_GDS_VERIFY_ALLOWED_ORG_ID=<exact UUID of staging company>
TRAVELPORT_VERIFY_ENABLED=true
TRAVELPORT_VERIFY_ENV=preproduction
TRAVELPORT_VERIFY_USERNAME=<provisioned identity>
TRAVELPORT_VERIFY_PASSWORD=<provisioned secret>
TRAVELPORT_VERIFY_CLIENT_ID=<provisioned client id>
TRAVELPORT_VERIFY_CLIENT_SECRET=<provisioned secret>
TRAVELPORT_VERIFY_ACCESS_GROUP=<provisioned Travelport access group>
```

The production environment requires:
`TRAVELPORT_VERIFY_ENV=production` and
`TRAVELPORT_VERIFY_PRODUCTION_ACK=REVIEWED`.

Only one company can use the configured credentials. Never set secrets
inside a frontend env var, GitHub repository file, screenshot or prompt.
Real multi-tenant operation needs encrypted per-organization secret vault,
distributed rate limit and auditable supplier access policy.

## CI tests

- Fixed Travelport preproduction/production URL builders, path injection
  rejection, original company/booking/ref and supplier identity checks.
- Correct parsing of HK, TK/UN, XX, pending and waitlisted segments;
  mismatch, duplicate locators, missing receipts and PII discard.
- Amadeus Enterprise refuses legacy Self-Service without verified contract.
- Static checks: JWT platform validation, getUser, active company membership,
  RLS client, no service role, no DB writes, provider GET-only, and UI warning.
- Integrated frontend typecheck/build and existing PostgreSQL fixture
  suites for Trip File amendments, finance and quote snapshots.

## Mandatory release gates

1. Live Lovable Cloud metadata confirms `flight_bookings` original ref,
   org, booking and supplier fields; staged amendments/handoffs tables and
   RPCs were **absent** as of 12 Nov 2026. Do not deploy the new UI before
   those migrations are reviewed and accepted on an isolated clone.
2. Real signed-in two-company tests: owner, staff, inactive user and
   other company's known PNR; no cross-tenant GDS credential access.
3. Travelport test credentials, actual preproduction reservations, and
   access group/PCC; confirm token authentication and response structure.
4. Amadeus Enterprise contract/API entitlement and customer-specific
   PNR retrieval authentication need separate technical onboarding.
5. Audit logging and globally shared rate limits, plus webhook/credential
   rotation policy, before scaling.
6. Actual ticket status/itinerary changes require independent ticket
   APIs and comparison against a structured, approved before/after
   amendment target. This phase is **booking-status observation only**.

**No provider booking has been queried, changed, ticketed or refunded.**
