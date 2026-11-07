# Safar Flow V2 — Transactional Booking Task Queue

**Status: staged code only. No production DB writes, no cron activation, no event auto-wiring.**

## Purpose

Build a small, owned PostgreSQL queue for **DB-local booking tasks** rather than
adding another general-purpose automation engine or depending on n8n.

The existing CRM, booking, quote and workflow dispatchers remain authoritative;
this queue is an optional **action executor**, not an alternative source of truth.

## Scope

- Private `safar_flow` schema, no authenticated/anon access.
- Internal service-only `enqueue_booking_task(eventId, template, delay)`.
- Enqueue validates trusted `domain_events` record, matching booking and org,
  and exact template-to-event mapping. Unique org+booking+template prevents
  duplicating the same task on retried event delivery.
- `process_due_booking_tasks(limit)` uses `FOR UPDATE SKIP LOCKED`
  and SQL transaction atomicity for local task creation.
- Only two templates allowed for live SQL queue:
  1. `supplier_confirmation` on `booking.created` while pending.
  2. `pretravel_checklist` on `booking.pre_travel` for departure in 7 days.
- Rechecks booking status and tenant ownership when executing.
- Retry with bounded 5/10/20-minute backoff (default 3 attempts) and
  `dead` terminal status; internal manual retry function for dead jobs.
- Optional five-minute processing cron **not automatically activated**.
- No WhatsApp/email, third-party HTTP, payments, refunds, or ticket issuance.

## Deliberate limitations

- No automatic event subscription is connected yet: simply creating a booking
  does **not** enqueue a job. A later trusted adapter must wire relevant
  domain events into `enqueue_booking_task` after production DB QA.
- This executor performs SQL-only task writes within the same transaction;
  therefore it is not a generic external worker with leases. For outside
  services, use an outbox/action-key and idempotent provider integration later.
- Database tables are private; UI doesn't show the queue yet. The separate
  quote-followup health panel from PR #19 remains read-only.
- Recurrence is intentionally off: one task per booking per template.
- Organization time zones are not yet modeled for per-company travel-day
  thresholds; do not use this for precise ticketing deadlines.
- A failed trigger or constraint is retried; if the business context is
  permanently invalid, the job may remain `dead` until corrected.
- Data retention and internal alerting for dead-letter jobs require a later
  operational implementation.

## SQL deployment order (ONLY after test DB recovery)

1. Validate PRs #17, #18, #19 in order.
2. Inspect real schema for `domain_events`, `bookings`,
   `booking_tasks`, and latest RLS policies.
3. Apply `scripts/deploy-safar-flow-job-queue.sql` to staging.
4. Run tenant/service-role tests and data integrity checks.
5. Ensure no duplicate queue, cron, or externally triggered workflows.
6. Review job backlog, verify job status transitions, and only then choose
   whether to run `scripts/activate-safar-flow-task-queue-cron.sql`.
7. On rollback, run `scripts/disable-safar-flow-task-queue-cron.sql`.
   Do not delete history or force-reset successfully processed jobs.

## Automated tests

The `scripts/test-safar-flow-job-queue.sql` PostgreSQL test runs in its
**own ephemeral database**, never connected to customer data. It exercises:
- unique idempotent enqueue
- org mismatch and event/template authorization denial
- status/travel-day recheck, cancellation and skipped jobs
- exactly one internal task per action on repeated dispatch
- simulated insert failure, bounded retry, dead-letter state
- manual retry after recovery without duplicate side effects
- no direct authenticated schema/function access

**Live tests not performed**: Lovable Cloud SQL is not reachable at the time of
this work. Isolated successful tests do not authorize production deployment.
