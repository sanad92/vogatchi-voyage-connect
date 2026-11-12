# Safar ERP / Trip File 2.0 — Sprint 11: Amadeus Enterprise & Travelport air reservation lookup

**Status: draft code only. No deployment, booking lookups, production key configuration, payments or ticket changes.**

## Official provider findings (checked November 12, 2026)

Travelport TripServices Flights Air v11 has a read-only Reservation Retrieve endpoint:
- Pre-production GET https://api.pp.travelport.net/11/air/book/reservation/reservations/{LocatorCode}
- Production GET https://api.travelport.net/11/air/book/reservation/reservations/{LocatorCode}
- API reference: https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/Air11/Book/APIRef_ReservationRetrieve.htm
- Authentication: https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/GeneralProject/Oauth.htm
- Common Headers: https://support.travelport.com/webhelp/jsonapis/airv11/content/air11/General/CommonAirHeaders.htm

Travelport login is **POST /oauth/token** with grant_type=password, client_id, client_secret,
username and password. The returned OAuth token is cached per Edge instance within
its server-side lifetime (not fetched on every PNR lookup). The actual reservation
request is **GET only**, not a ticketing or amendment operation. Access group
comes from the private server environment and must be provisioned by Travelport.

Amadeus Self-Service developer portal was **decommissioned July 17, 2026**.
Current official portal directs Enterprise partners to access-specific contracts:
https://developers.amadeus.com/api-catalog
Legacy PoweredPNR Retrieve documentation shows PNR retrieval by record locator,
but does NOT establish your live Enterprise web-service URL, authentication or
office permissions:
https://api.dev.amadeus.net/api/Development/XML/Transaction/PoweredPNR/PoweredPNR_Retrieve.htm

**Do not target the old test.api.amadeus.com Flight Order Management endpoint.**
It also retrieves a proprietary Self-Service flight-order ID rather than
providing generic Amadeus Enterprise PNR access.

## Implemented

- A common air-provider classification and source-reference contract for
  `travelport` and `amadeus_enterprise`. Uses strict six-character PNR
  and an exact original `flight_bookings` row (organization + booking +
  supplier_reference or booking_reference + supplier_name).
- Travelport's **read-only** PNR lookup Edge Function at
  `trip-file-air-reservation-status`, requiring valid Supabase user JWT,
  active company membership, `bookings_view` and `financial_view`,
  approved flight amendment and active unblocked supplier handoff.
- Client sends **only the amendment request UUID**. Organization, PNR
  and provider are derived on server from organization-scoped database rows.
- Fixed Travelport preproduction/production domains and GET path. No arbitrary
  URLs, path injection, redirects, PNR lists or request-supplied credentials.
- Server-only OAuth access group and credentials, response length guard,
  request timeout, per-user in-memory rate limit, opt-in one-company whitelist.
- Provider parser confirms one *Travelport* ReceiptConfirmation Locator matches
  the original PNR and maps StatusAir values conservatively. Mixed statuses are
  **not** "confirmed"; unknown remains unknown.
- Response strips all passenger, contact, ticket-number, pricing, payment,
  fare and raw supplier response data. Response returns only PNR observation,
  state, check timestamp and environment.
- The UI adds a manual "check PNR" action to existing Trip File supplier
  handoff, alongside Hotelbeds. No background polling or auto-execution.
- Amadeus Enterprise is visible as a provider family but **always returns
  enterprise_contract_required and performs ZERO Amadeus network calls** until
  an approved Enterprise API package and office/PCC credentials are available.

## Explicit server-only opt-in (Travelport, one org only)

```
TRAVELPORT_VERIFY_ENABLED=true
TRAVELPORT_VERIFY_ALLOWED_ORG_ID=<organization UUID exactly>
TRAVELPORT_VERIFY_ENV=preproduction
TRAVELPORT_VERIFY_USERNAME=<provisioned username>
TRAVELPORT_VERIFY_PASSWORD=<secret>
TRAVELPORT_VERIFY_CLIENT_ID=<provisioned client ID>
TRAVELPORT_VERIFY_CLIENT_SECRET=<secret>
TRAVELPORT_VERIFY_ACCESS_GROUP=<Travelport access group>
```

Production additionally requires `TRAVELPORT_VERIFY_ENV=production`
and `TRAVELPORT_VERIFY_PRODUCTION_ACK=REVIEWED`. Keep these as server
secrets, **never** in GitHub, frontend, `VITE_` variables or logs. This
is one organization and one access group only; true SaaS multitenant
provider vault/security is NOT delivered.

## Critical operational truth

- Travelport's `ReceiptConfirmation` may include one or more
  `OfferStatus.StatusAir` values. It can also contain ticket details,
  but **this version does not verify ticket issuance**.
- PNR status Confirmed **does not prove a requested flight change succeeded**.
  Names, itinerary, schedule change handling, original versus amended flight,
  ticket number and actual issuance need a separately approved comparison
  against trustworthy structured amendment targets and original ticket data.
- A source `supplier_name` like "Travelport" or "Amadeus" is only a
  label and cannot by itself prove that an agency's GDS/PCC owns that PNR.
  The present authorization restricts access to **one explicitly whitelisted
  company**, same booking, validated local ref and signed-in finance user.
  Do not provide shared credentials to other organizations.
- The PNR parser requires a unique Travelport-authored ReceiptConfirmation
  with the expected locator. If provider data differs, it fails closed.
- In-memory rate limiting and token cache are per Edge instance, not
  globally durable controls. Add distributed quotas and audited metadata
  for customer rollout.

## Mandatory Amadeus Enterprise work

Obtain from Amadeus or the agency's authorized office:

1. Enterprise PNR Retrieve product and supported interface (SOAP/XML or
   provisioned modern enterprise endpoints), exact host and version.
2. Contractual authority/office profile, permitted PNR scope, authentication,
   session and credential rotation scheme.
3. Sanitized TEST retrieval response from an owned PNR, XML fault and
   split-PNR test cases.
4. Booking/PNR ownership controls and independent check of ticket
   issuance, itinerary, schedule changes and traveler matching.
5. Official enterprise security requirements, audit retention and quotas.

Until then Amadeus returns a truthful not-configured/contract-required
state, **not a simulated success**.

## Live Lovable state & release blockers

On November 12, target Lovable Cloud SELECT metadata succeeded.
The five draft Trip File tables and five RPCs were still **ABSENT**
from live schema; see `docs/trip-file-live-schema-audit-2026-11-12.md`.
No staged migrations or provider functions are published to live Lovable.

Before enabling either provider:
- Apply versioned migrations to a disposable staging clone and validate
  PostgreSQL RLS with two authorized organizations and independent employee roles.
- Use Travelport pre-production credentials and *real authorized test
  PNR* to verify OAuth, headers and parser against actual response.
- Use provider audit data without revealing passenger PII in logs/UI.
- Introduce durable cross-worker throttling, secret isolation by tenant,
  IP/origin protection and security approval.
- Keep supplier booking writes, ticket issuance, refund/payment, and
  messages disabled.

**Passing GitHub Actions proves fixture/source compatibility, not a live
provider connection or an issued flight ticket.**
