# Trip File 2.0 — Sprint 4: Supervised Change Handoff

**Staged code only. No production migrations, cron activation, supplier actions, refunds or financial entries.**

## Built on Sprint 1 (#26)
- The existing `booking_change_requests` table has a proposal lifecycle:
  `pending → approved | rejected`.
- An approval is administrative only; it does not change inventory or finance.
- This sprint adds an **independent, auditable human-evidence handoff** for
  `approved` requests; it never changes the original request or booking.

## Handoff stages
1. **Supplier confirmation recorded**: operations user with `bookings_edit`
   and `financial_view` records a supplier confirmation reference
2. **Finance review recorded**: a *different* user with `financial_edit`
   records a finance control / reconciliation reference
3. **Execution attestation recorded**: active manager/owner/admin with
   `bookings_confirm` records a reference to the work actually carried
   out in the original booking/service module. This must be a different
   user from the finance reviewer and original request submitter
4. **Blocked**: an authorized manager may stop a pending handoff, including
   before supplier confirmation, with a reason. Once blocked, a new amendment
   proposal is required; the same request cannot be restarted

**These are attestations, not independently validated external events.**
Even an `execution_reported` handoff is NOT confirmation that the supplier
actually changed a reservation, the customer was refunded or the accounting
ledger was reconciled. The operator must inspect the original data.

## Safety
- Only after an approved amendment; rejected/pending requests are refused.
- Server-side DB locks serialize transitions and enforce the exact sequence;
  retries with the same reference do not duplicate updates/events.
- Company ID comes from original request and membership + permission checks.
- Cancelled booking cannot advance; a manager can still block an existing
  handoff to document closure.
- Finance-sensitive supplier/finance evidence is readable only to active
  members with `bookings_view` and `financial_view` via RLS.
- No direct browser INSERT/UPDATE/DELETE grants on the handoff or evidence log.
- Each accepted step records an append-only event with actor + time + external
  evidence reference and a sanitized booking timeline milestone.
- Timeline has no financial amounts, raw supplier references or notes.
- A failed downstream timeline write rolls back the stage and evidence insert
  in the same transaction.

## Integration
- `BookingAmendmentHandoffPanel` is part of the existing
  `BookingWorkspace → تعديلات الرحلة` tab, following the existing
  amendment proposal history.
- The panel only reads supplier/finance details for permitted staff.
- Error/permission states are explicit; absence of migration must never
  look like an empty approved queue.
- All stage action buttons use an authenticated RPC, not direct table writes.

## Automated tests
- Reuses Sprint 1 regression suite on ephemeral PostgreSQL 16.
- Tests ordered transitions, wrong-organization access by known request ID,
  independence of supplier vs finance vs manager, replay prevention,
  cancellation, immediate blocking, direct-table grant protection, and
  rollback on simulated timeline storage failure.
- Frontend TypeScript and application build run in GitHub Actions.

## Deployment blockers
- PR #26 must be reviewed before this child PR can merge.
- Hosted Lovable Cloud DB has not yet been accessible for read-only schema
  verification. No live migration has been attempted.
- Reconcile real schema, role overrides, grants, timelines and Supabase JWT
  behavior against an isolated staging clone. Inspect source modules for
  existing cancellation and refund workflows.
- A three-person segregation policy may be too strict for small agencies.
  Define an explicit, logged exception/second-factor policy before rollout;
  do not silently allow self-approval.
- Actual supplier change + accounting settlement must be implemented and
  verified separately, based on the real provider and ledger contracts.
- PRs #27 and #28 were authored independently and must be reconciled before
  bringing all Trip File components into one release.
