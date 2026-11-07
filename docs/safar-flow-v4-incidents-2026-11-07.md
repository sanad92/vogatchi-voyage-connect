# Safar Flow V4 — Failure Escalation & Incident Alerts

**Status: staged in source. Not deployed or scheduled on Lovable Cloud.**

## Delivered

- `safar_flow.job_alerts` private, append-only incident marker table,
  unique on `(job_id, alert_kind)`.
- Internal `safar_flow.dispatch_failure_alerts(limit, overdue_minutes)`
  creates a single in-app notification for each eligible job+kind.
- Incidents:
  - `dead`: job exhausted its permitted retries
  - `overdue`: a scheduled/retrying job passed its available_at by 30+ minutes
- A deterministic active organization **owner or admin** receives the
  notification. No cross-organization recipient, no inactive recipient.
- When there is no active eligible recipient, the incident remains unrouted
  and is not falsely marked notified; subsequent runs can retry routing.
- Notification write and unique incident marker are atomic. Simulated
  notification failure rolls back both; next run can recover.
- Notification content and browser audit deliberately omit `last_error`,
  supplier secrets, source event payloads and sensitive customer details.
- A tenant/permission-gated read-only RPC
  `get_safar_flow_alert_health(org_id, limit)` exposes counts and latest
  incident references, not messages or recipient identities.
- Safar Flow Studio now shows latest incidents and a link to related bookings.
- SQL for alert cron (every 10 minutes) is **manual opt-in**, with independent
  disable/rollback SQL. It is NOT part of the app deployment.

## What is explicitly NOT included

- No automatic WhatsApp or email alerts.
- No direct booking-status changes, payment actions or ticket issuance.
- No automatic retry of dead-letter jobs by UI. Retry remains a privileged
  operational action after reviewing the failure.
- No general-purpose workflow-builder executor.
- No guarantee cron is active; historical alert counts do not prove scheduler
  health. The queue runtime itself is still protected behind earlier staged PRs.
- No escalation to all admins, SMS delivery, SLA compliance dashboards, or
  acknowledgments/resolutions. Those are separate, later controls.

## Safety and tenancy

- `safar_flow` is private. Staff cannot call the internal alert dispatcher
  or query `job_alerts` through the Data API.
- Browser RPC requires current `auth.uid()`, **active membership** in the
  requested organization and `automation_view` permission.
- Internal dispatcher uses bounded batches, row locks with `SKIP LOCKED`
  plus a DB uniqueness constraint to prevent duplicates across retries.
- Owners/admins are chosen only from that job's company.
- The database notifications table may have its own broader organization
  read policy; the notification content intentionally avoids customer
  details and internal exceptions until those policies are reviewed.
- Existing notification rules/handlers are not replaced or modified.

## Tests

- Existing V2/V3 tests run on PostgreSQL 16 ephemeral database.
- V4 SQL integration test covers:
  - dead and overdue incident generation
  - correct organization recipient
  - no owner/admin (unrouted)
  - deduplication on re-run and by alert kind
  - downstream notification failure rollback/recovery
  - no error/secret leakage into notifications and read-only RPC
  - active member vs inactive, wrong company, missing permission,
    anonymous user, Data API role privilege checks
- Source/UI build and TypeScript checks are in GitHub Actions.
- PostgreSQL fixtures are simplified and **do not replace** real Supabase
  JWT/RLS/production-schema acceptance tests.

## Manual staged rollout

1. Confirm previous PRs #17–#21 are approved and applied in order.
2. Inspect live notifications, organization_members and safar_flow.jobs
   schema/policies, including subscription/role changes.
3. Apply `scripts/deploy-safar-flow-failure-alerts.sql` to **test** DB only.
4. Test multiple tenants and revoked owner/admin roles.
5. Validate notification counter and private alert history under concurrent
   execution and simulated service failure.
6. Review pre-existing dead and overdue jobs to avoid a sudden alert flood
   at opt-in.
7. Consider company-level throttling and confirmation before production
   activation of `scripts/activate-safar-flow-alert-cron.sql`.
8. Rollback only the schedule with
   `scripts/disable-safar-flow-alert-cron.sql`; never delete audit history.

**Live database note:** A source-code and isolated-PostgreSQL test passing
does not prove the current Lovable Cloud database is reachable or this
stage is running in production.
