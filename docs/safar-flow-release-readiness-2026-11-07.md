# Safar ERP 2.0 / Safar Flow — Release Readiness Gate

**State:** Development branches only. No merge, migration, scheduling or deployment to live Safar ERP.

## Why a release gate now

The cumulative development chain PR #17 to PR #24 adds operation fixes,
workflow previews, quote follow-ups, a private task queue, monitoring,
incident alerts, SOP approval hardening and a pre-travel reliability fix.

The previous integration tests used **isolated PostgreSQL fixtures** rather
than the actual hosted Lovable Cloud schema. This is deliberate but means
we cannot certify production RLS, notification policies, plugin configuration,
data migrations, company-specific time zones or real cron schedules.

## Deliverables

1. `scripts/verify-safar-flow-queue-release-gate.sql`:
   - **READ ONLY; fails closed** when any required queue, monitoring or alert
     table/function is missing.
   - Detects browser EXECUTE access to private functions.
   - Requires private schema to be inaccessible to `anon`/`authenticated`.
   - Requires RLS on public bookings, booking_tasks, domain_events,
     organization_members, notifications and private queue tables.
   - Requires server-side deduplication constraints on jobs and alerts.
   - Requires signed-in-only permission on read-only monitoring RPCs.
2. `scripts/verify-safar-flow-sop-release-gate.sql`:
   - **READ ONLY; fails closed** on direct INSERT/UPDATE/DELETE grants on
     SOP approvals, disabled RLS, anonymous decision RPC access or outdated
     decision code lacking row locks / self-approval / decided-state checks.
3. **Negative tests** intentionally open an unsafe schema or regrant direct
   SOP table writes **inside transactions on disposable CI databases**.
   The release gate must reject them, and the transaction is rolled back.
4. CI applies the release gates after PostgreSQL V1–V6 integration tests.
   Successful source and CI tests are *not* evidence of a successful hosted
   Lovable rollout.

## Mandatory human-reviewed deployment sequence

1. **Restore readable staging Lovable/Supabase access.** Confirm the
   exact tenant project ID and migration state. Don't enable a new DB
   or spend paid resources automatically merely to clear the test.
2. Clone or provision an isolated test environment **without real customer
   records, credentials or production messaging connections**.
3. Verify schema and actual `pg_policies`, `pg_proc`, `cron.job` state
   before applying changes. The existing SELECT-only audit is in
   `scripts/audit-safar-flow-staging-readonly.sql`.
4. Apply PRs in dependency order #17 → #18 → #19 → #20 → #21 → #22 →
   #23 → #24 → this release gate. Do not cherry-pick a dependent stage.
5. Apply staged SQL in reviewed order to the test DB, **not** automatically
   during frontend build: explicit company KPI function, quote followups,
   task queue, monitoring RPC, incident dispatcher, SOP decision guard,
   pretravel date-based scan.
6. Run **both release gates as a read-only authenticated DBA/operator**
   against staging. A missing or unsafe contract blocks the rollout.
7. With two real signed-in test companies, verify staff-role RLS, SOP
   decisions, booking tasks, quote response suppression, alert recipients,
   deletion/disabled staff and duplicate scheduler protection.
8. Review all existing workflow subscriptions/notification rules and
   existing scheduled automation jobs; do not enable another overlapping
   workflow without explicit conflict resolution.
9. Evaluate old bookings without domain events and trips affected by
   itinerary amendments; handle historical backfill separately.
10. Check business timezone policy; `CURRENT_DATE` is insufficient for
    flight ticketing cutoffs or exact departure-time notices.
11. Only after written release approval and smoke tests, enable any
    `pg_cron` schedule separately; historical overdue backlog must be
    estimated to avoid bulk notifications.
12. Publish frontend in a controlled release after server compatibility
    verification. Monitor errors and roll back **schedules first** on
    incident; do not delete original transaction or audit records.

## Explicit non-goals

- No automatic WhatsApp/email sends, supplier payments, refunds or
  booking confirmations as part of this release gate.
- No service-role keys in browser bundles, CI logs, or user-facing
  documentation.
- A green PR check is not permission to deploy over existing users.
- A production DB with *partially applied migrations* must be repaired in
  staging first; do not bypass the gate to unblock a frontend release.

## Remaining unknowns

- Lovable Cloud reports its project database enabled but direct read-only
  SELECT was unavailable at the last check. Root cause is **not verified**.
- No proof that the intended SQL versions are applied to the hosted DB.
- No real JWT/session, supplier API, WhatsApp/WABA, or payment callback
  end-to-end testing is complete for these new branches.
- Existing SOP approval policies and direct-write call sites must be
  reviewed before applying privilege revocation to a live organization.

**Release status remains BLOCKED pending hosted staging/database validation.**
