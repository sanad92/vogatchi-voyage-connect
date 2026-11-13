# Safar ERP 2.0 — Trip File Integration Sprint 7

**Status: integrated source for review/isolated QA, NOT approved for merge or
production deployment.**

## Purpose

The six earlier Trip File workstreams were staged across draft branches.
The Amendment chain was #26 → #29 → #30 → #31, while #27 (quote version
archive) and #28 (currency-safe service overview) were separate branches.
All three were tested independently, but not delivered as one front-end
bundle. This branch copies #27/#28 into the latest #31 code so compatibility
can be validated together before any production release.

## Unified Trip File surface

The existing application remains the system of record:

1. BookingWorkspace overview, linked service itinerary and task/finance tabs
2. BookingWorkspace amendment request, approval and timeline (#26)
3. Human supplier / independent finance / operations attestation (#29)
4. Original financial and generated-document evidence linking (#30)
5. Read-only invoice/payment allocation review using the original
   booking Profit Cockpit (#31)
6. QuoteDetails manual immutable quote snapshots (#27)
7. ItineraryTab service selling/cost grouping by currency (#28)

None of these paths auto-issues a ticket, amends a supplier reservation,
refunds a customer or posts financial entries. Approved proposals and
recorded handoff steps are not proof that an external operation happened.

## Merge integration strategy

- Integration branch: `feat/trip-file-integrated-qa-20261108` from #31.
- Copied additions/changes from #27 and #28. No PR merged to `main`.
- This is a **draft child PR targeting #31** so that the original
  amendment chain remains explicit and code reviewers can see only
  quote/archive + itinerary/currency and QA changes.
- Suggested review order: #26 → #29 → #30 → #31 → this integrated PR.
- #27/#28 are **duplicated** in this branch. If this integration PR is
  approved and merged into the main release path, do NOT separately merge
  #27/#28 again; retarget or close them with reviewer consent.
- Do not apply migrations blindly, since quote archive and Trip File
  source-evidence SQL were staged as standalone scripts (not yet applied
  to the actual Lovable Cloud database).

## CI verification

The single `trip-file-integrated.yml` workflow performs:

- Source integration contracts for actual BookingWorkspace amendment,
  handoff, finance evidence and allocation review, plus QuoteDetails
  snapshots and itinerary service totals.
- Three pure TypeScript tests for currency isolation, historical-source
  changes and allocation mismatch handling.
- TypeScript full project typecheck and the production frontend build.
- Two isolated PostgreSQL 16 databases: one exercises amendment → human
  handoff → finance evidence linking; the other tests immutable quote
  snapshots, duplicate detection and tenant/finance permissions.

This verifies combined **source-code compatibility**, not production
end-to-end Supabase auth/JWT, actual booking data or external providers.

## Mandatory release blockers

1. Current Lovable Cloud DB connection is enabled but repeatedly fails
   direct SELECT inspection. Root cause **not established**. Do not use
   a different Supabase project as a substitute for production truth.
2. Inspect real database schema, existing RLS policies and
   organizational permission codes against each staged SQL script.
3. Test two real, isolated, authenticated company accounts and staff
   permissions; test data must not contain real guest/payment secrets.
4. Verify all original bookings/quote items/finance records in a
   staging clone, including voided invoices, reversed payments, and
   multi-currency records.
5. Audit the "three independent people" authorization policy for
   agencies that have only one or two users.
6. Verify provider-specific booking amendments, issued refunds,
   supplier confirmations and accurate payment allocations with their
   original systems; **do not infer completion from an employee report**.
7. Confirm no unintended financial updates, payments, messages or
   external bookings can be triggered by opening or using review tabs.
8. Prepare explicit migration ordering and rollback instructions before
   any active-user rollout.
9. Review conflict with the independent Safar Flow draft branch chain
   (#17–#25), especially the booking service hook and itinerary tab.
   Safar Flow code was **not** silently merged into this branch.

## Acceptance definition

- Combined CI passes.
- All mandatory staging/security requirements checked and documented.
- Human reviewer approves final migration/deployment plan.
- Only then may the PR be considered for nonproduction deployment.

**A passing isolated CI status alone is not deployment approval.**
