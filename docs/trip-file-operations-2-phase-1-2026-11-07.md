# Safar ERP 2.0 — Trip File & Booking Operations — Sprint 1

**Status: source staged, not merged or deployed.**

## Baseline from repository inspection

Safar ERP already has a `BookingWorkspace` for unified bookings, linked
hotel/flight/transport/car service bookings, financial panels, documents,
tasks, SOP and an append-only booking timeline. These are reused.

Source search found no dedicated `booking_amendments` or `quote_versions`
implementation on the current main branch. This Sprint adds *amendment
proposals and manager decisions* only. It does not rewrite existing bookings
or replace SOP approvals.

## New code

- `src/components/bookings/workspace/BookingAmendmentsTab.tsx`: an Arabic
  `تعديلات الرحلة` tab for proposing and reviewing amendments per booking.
- `src/hooks/useBookingChangeRequests.ts`: selected-company read queries
  and protected `create_booking_change_request` /
  `decide_booking_change_request` RPC mutations, plus timeline invalidation.
- `scripts/deploy-trip-file-amendments.sql`: staged schema and server-side
  authorization functions. **Manual staging rollout only**.
- `scripts/test-trip-file-amendments.sql`: PostgreSQL 16 isolated tests.
- `.github/workflows/trip-file-amendments.yml`: TypeScript, app build,
  and SQL integration checks.

## Change lifecycle

1. Authorized employee submits a change proposal with description, optional
   service type/reference and *optional* estimated signed selling/cost deltas
   in exactly one currency.
2. Request enters **pending** state, linked to the booking and organization,
   with employee identity and a single timeline entry.
3. Active owner/admin/manager with `bookings_confirm` permission, **other
   than the requester**, may approve or reject; rejection needs a reason.
4. Review is locked/atomic, cannot be repeated or overwritten, adds a
   single timeline entry, and preserves the proposal and decision.
5. **Approval is operational only. It never updates a booking, supplier
   service, invoice, customer payment, refund or supplier settlement.**
   Existing SOP/financial authorization continues to apply to execution.
6. Retried network submissions with the same client-generated request key
   return the same request without duplicate timeline entries; reused keys
   with inconsistent payloads are rejected.

## Financial safety

- The optional amounts are **proposed deltas**, never posted to finance.
- Profit delta is shown in the browser **only when both** estimated selling
  and estimated supplier cost deltas are provided.
- No exchange-rate guesses or cross-currency addition is performed.
- Currency is a mandatory ISO-like 3-letter reference if a delta is given.
- Supplier reference is a free-text annotation; it is **not** independently
  verified against linked service booking IDs yet. The actual operator must
  verify it before execution.

## Security

- Bookings and organization IDs are resolved server side. The user cannot
  supply a trusted organization ID.
- Organization membership must be active; employee requires bookings_edit
  and manager requires bookings_confirm + manager/admin/owner role.
- Reading proposal records requires RLS, active org membership and
  bookings_view. Direct browser INSERT/UPDATE/DELETE table grants are removed.
- SECURITY DEFINER RPCs pin search_path to empty and explicitly check
  authenticated identity, membership, org permissions, status and reviewer.
- Service-role credentials are never supplied to the browser.
- History timeline only contains request ID/type and decision state, not
  price deltas or free-text notes.
- A one-manager company cannot self-approve; define a separate reviewed
  exception policy before production rollout, rather than bypassing this.

## Acceptance and rollout (still outstanding)

- Lovable Cloud database previously returned an inaccessible query despite
  enabled status; **no live migration or customer data change was made**.
- Confirm production schema, organization_members policies, permission helper,
  booking workflow status, booking_timeline_events, generated database
  typings and current branch before deployment.
- Deploy staged SQL to a disposable/staging database with real Supabase
  JWT sessions; test active/inactive staff and two companies.
- Verify role customizations, self-approval restrictions, concurrent decisions,
  RLS grants, mobile UI and finance side effects.
- Verify a pending change on a cancelled booking should be handled according to
  policy before enabling operational actions.
- Test that an approved *proposal* cannot be construed as a confirmed refund,
  changed ticket, booked room or legally binding supplier change.
- Migrate SQL through the project's official migration process when hosted
  DB is reachable; do not run standalone script blindly on production.

## Next sprint (not implemented by this PR)

- Quote Versions: immutable quotation revisions, line-item snapshot and
  separate acceptance lifecycle.
- Per-service amendment validation against original supplier booking IDs.
- Approved proposal → supervised service change with before/after snapshots,
  refund/charge consequences and supplier confirmation.
- Currency-aware costing with verified exchange-rate source at booking time.
