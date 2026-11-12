# Trip File 2.0 — Sprint 12: bounded Travelport JSON handling

**Status: draft code only. No provider requests, secrets, DB writes, migration, merge or production deployment.**

## Why
The first Travelport OAuth and PNR implementation checked Content-Length, but then used Response.text() and checked the *decoded string length after reading the entire response*. Chunked/no-Content-Length transfers and multi-byte UTF-8 could evade an early memory bound. The browser's JSON request was also parsed without a streaming size ceiling.

## New defense
- A reusable `readBoundedJsonBody(stream, byteLimit)` checks the **actual UTF-8 byte count before retaining each chunk**.
- Three enforced limits in the read-only air verification function: user request **2,000 bytes**; Travelport OAuth JSON **16,000 bytes**; Travelport reservation JSON **262,144 bytes**.
- Oversize/broken streams are cancelled. Empty, invalid UTF-8 and malformed JSON are rejected without exposing supplier details.
- Existing Content-Length guards, HTTPS fixed-host URLs, request timeouts, auth checks, no-redirect behavior, one-organization opt-in and no-write constraints remain intact.
- Unit tests cover exact boundary, chunking, Arabic UTF-8 bytes, oversize cancellation, empty body, malformed JSON and invalid UTF-8. The integrated GitHub workflow runs these tests; the source contract now rejects `request.json()` and unbounded `response.text()` in the air endpoint.

## Release restrictions unchanged
- **Do not merge or publish** the stacked Trip File PRs until the five missing Trip File tables and five RPCs pass an isolated staging migration, two-company RLS/JWT tests and operational signoff.
- Do not enable Travelport until authorized preproduction credentials, a known-owned test locator, receipt schema, durable rate limiting and auditable tenant-scoped secrets are validated.
- Amadeus Enterprise remains contract-gated with **no network requests**.
- This is input hardening only: an observed PNR is not proof of ticket issuance, completed amendment or refund.
