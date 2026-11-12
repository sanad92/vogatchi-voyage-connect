# Trip File 2.0 — Amadeus and Travelport flight reservation verification

**Status: provider adapter foundation in draft PR; not a live API integration.**

## Confirmed official API families

Amadeus Self-Service Flight Order Management can retrieve an order that was
created through Amadeus Flight Create Orders. Its lookup uses the Amadeus
**flight order ID**, not a generic PNR locator. Official Amadeus FAQ:
https://admin.developers.amadeus.com/self-service/apis-docs/guides/developer-guides/faq/

Travelport JSON Air v11 Reservation Retrieve supports GET
`/11/air/book/reservation/reservations/{LocatorCode}` using a Travelport
reservation locator. Its preproduction host is api.pp.travelport.net.
Official Travelport docs:
https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/Air11/Book/APIRef_ReservationRetrieve.htm

These APIs are NOT interchangeable with Amadeus Enterprise PNR retrieval
or Travelport Universal API (uAPI). We must identify the actual contracted
API family and credentials before enabling a live integration.

## Implemented in this PR

- Pure no-I/O reference validation and fixed provider GET URLs for
  Amadeus Self-Service flight-order retrieval and Travelport JSON Air v11.
- Reference binding to the same organization and parent booking in
  the existing `flight_bookings` schema.
- Amadeus order ID must match `flight_bookings.supplier_reference`;
  a PNR in `booking_reference` is **not** silently treated as an order ID.
- Travelport locator may match `supplier_reference` or `booking_reference`
  only if the source row identifies Travelport and matches org/booking.
- Strict response reference checks and privacy-minimal observation outputs.
  Traveler names, contacts, fare and ticket numbers are not emitted.
- Every observation hardcodes `ticketingVerified=false` and
  `amendmentExecutionVerified=false`, even if a booking exists.
- Pure tests cover both hosts/environments, traversal/URL injection,
  wrong tenant, wrong booking, wrong provider, reference mismatch and
  stripping personal data.
- Integrated GitHub Actions executes the adapter tests.

## Not implemented / blocked

- **No live Amadeus/Travelport request or token acquisition**. There is
  no Edge Function route, secrets, provider-specific OAuth flow or UI button
  in this PR. These need to be implemented after confirming the user's
  actual contracted API family.
- Travelport JSON Air v11 authentication and PCC/branch access must be
  configured from the actual contract. Amadeus Enterprise SOAP/XML
  workflows are not covered by this Self-Service adapter.
- No ticket verification, EMD, SSR, seat, baggage, schedule-change
  acceptance, reissue, void, refund, cancellation or PNR modification.
- Provider response parsers use synthetic minimal fixtures only; validate
  against authorized non-production provider payloads before deployment.
- Existing Trip File amendment tables and RPCs are still absent in the
  live Lovable Cloud schema per the read-only audit on 12 Nov 2026.
- Before enabling any multi-tenant supplier access: active user JWT,
  per-company credentials, authorization, globally enforced quotas,
  provider audit trails and two-organization staging isolation are required.

## Next engineering step

Confirm whether the business has **Amadeus Self-Service vs Enterprise**
and **Travelport JSON Air v11 vs uAPI**, and obtain sandbox access
without sharing keys in chat or GitHub. Then implement a user-triggered
read-only server proxy with the same company/booking authorization model
as the staged Hotelbeds function. Only later compare ticket numbers,
segment statuses and approved structured amendment targets with an
independent provider response.
