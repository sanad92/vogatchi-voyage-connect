# Safar Flow V6 — Pre-travel reliability and release preflight

Status: **staged on feature branch only; not applied to Lovable Cloud.**

## Critical finding

The main application records `booking.created` events when bookings are inserted
(`supabase/migrations/20260724023438_a1d1e5bd-be8c-46cf-89a9-61e62f6abc7b.sql`).
A repository search did **not** find a real producer of `booking.pre_travel`
(the V2 integration test inserts synthetic examples of it).

The staged V2 queue looked for `booking.pre_travel` in events created during
the **last day**, so a trip booked weeks before departure would not receive a
pre-travel task unless some external producer emitted that event.

This is a source-code finding, not a claim about all possible live production
database triggers/extensions.

## Fix delivered

- `scripts/deploy-safar-flow-pretravel-reliability.sql` provides a PRIVATE,
  service-role-only `enqueue_upcoming_pretravel_checklists(limit, days_before)`
  SQL function.
- It scans booking **start dates**, not event-created dates, for noncancelled
  pending or confirmed bookings starting within the next **3 calendar days**.
- It requires a matching `booking.created` event from the SAME organization
  as provenance, even when that event is weeks old.
- Only one job can exist for each (organization, booking, template), and the
  original worker re-checks booking status/dates before creating a task.
- The existing opt-in scheduler's `dispatch_booking_tasks` function is
  extended to call BOTH the recent-event scan and the upcoming-trip scan.
- No `booking.pre_travel` event is invented and no event bus subscription is
  rewritten. No WhatsApp, email, payments or bookings are executed.
- A separate **SELECT-only** `scripts/audit-safar-flow-staging-readonly.sql`
  allows an operator to check table columns, function availability, private
  schema access, cron presence and old approval-table write privileges.

## Automated regression

`scripts/test-safar-flow-pretravel-reliability.sql`, run after existing
V2/V3/V4 tests in an ephemeral PostgreSQL database, checks:
- a booking created 21 days ago but departing in 2 days gets a checklist
- two different organizations remain isolated
- cancelled / far-away / missing-provenance / wrong-tenant-event cases are skipped
- a cancellation between enqueue and dispatch prevents task creation
- repeated scanning and repeated dispatch do not duplicate the task
- browser roles cannot invoke the private functions
- invalid scan parameters are refused

These are simulated test bookings only. This does NOT certify the real
Lovable Cloud installation, real role/JWT behavior or business time zones.

## Remaining limitations (release blockers)

1. **Past bookings without a `booking.created` domain event** will not be
   selected; assess historical migration coverage on an isolated staging
   clone and implement a privileged, audited backfill if needed.
2. Date windows currently use database `CURRENT_DATE`. A precise per-agency
   time-zone and departure-time model must be introduced before using
   Safar Flow for ticket-issuance cutoffs or time-sensitive customer notices.
3. The unique key is per booking/template. A changed travel date AFTER a
   successful pre-travel checklist does not automatically create a new task.
   Handle amendments explicitly in the future Trip File change workflow.
4. The V2 new-booking scanner still has a 24-hour lookback; that is separate
   from the fixed upcoming-date scanner and can miss older supplier-confirmation
   events. Add a deliberate backfill policy only after verifying the live backlog.
5. When the date is inside the 3-day window, tasks are queued for immediate
   internal creation, **only if the optional scheduler has been activated**.
6. The live database remains inaccessible via the connector in prior checks;
   no migration, pg_cron schedule, payment, booking or messaging action has
   been applied on production.

## Deployment safety sequence

- Keep prior PRs #17-#23 in draft and review in order.
- Run the SELECT-only preflight against a **staging** copy; examine every
  missing field, grant mismatch and uninstalled function before deploying.
- Deploy V2 queue and V6 adjustment in order on staging, then run two-company
  authenticated and cancellation/duplicate acceptance tests.
- Confirm that no competing pretravel task engine already exists in the
  current production database; duplication must be investigated, not ignored.
- Test date boundaries and delayed-worker behavior with agency time zones.
- Activate the already-staged five-minute scheduler ONLY on an explicit
  reviewed release decision; it is not activated by V6 code.

## Suggested next engineering step

Focus on **hosted staging acceptance / delivery integration**, not another
standalone automation panel, before exposing Safar Flow to paying customers.
