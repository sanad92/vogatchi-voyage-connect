# Safar Flow V3 — Queue Monitoring

**Status:** staged in GitHub. Not installed on the live Lovable Cloud database, and not published to customers.

## What this phase adds

- A read-only Safar Flow job monitoring panel inside the existing `/safar-flow` Studio screen.
- Per-company counters for scheduled, retrying, succeeded, skipped, dead, cancelled and due jobs.
- The latest 15 task records, with template, attempts, scheduling/processing dates and links to the booking workspace.
- A restricted RPC `public.get_safar_flow_job_health(p_organization_id, p_limit)`.
- Explicit error UI if the database is inaccessible, the RPC is not installed, or access is denied.
- No user controls to enqueue, execute, retry, cancel or modify jobs.
- No raw `last_error`, source-event payload, supplier credentials or client information returned to browser.

## Authorization and exposure model

- `safar_flow.jobs` remains in the private `safar_flow` schema.
- Authenticated users receive EXECUTE only on the dedicated read-only function in `public`; anonymous/public callers do not.
- The RPC requires both **active organization membership** and
  `public.has_org_permission(p_organization_id, 'automation_view')`.
- `p_organization_id` cannot authorize itself. An unrelated company request is rejected (SQLSTATE 42501).
- Function uses a fixed query with bounded `p_limit` (1 to 50) and empty `search_path`; no dynamic SQL.
- Platform admins who are not active members of a company are also denied by design; they must use separately reviewed platform tooling.
- No user-facing capability to change queue state was added.

## Test strategy

The existing GitHub Actions PostgreSQL job now runs, in order:
1. Existing quote follow-up integration suite (separate ephemeral database).
2. Safar Flow V2 booking task queue integration suite (separate ephemeral database).
3. Safar Flow V3 read-only monitoring permission suite on the V2 test fixtures.

The V3 suite verifies:
- active member with permission can view only their own organization
- active member without `automation_view` denied
- inactive membership denied
- unauthenticated caller denied
- wrong organization denied
- invalid pagination denied
- `anon` has no RPC EXECUTE and `authenticated` has no private schema usage
- no `last_error`, `source_event_id`, or synthetic secret leaks into JSON

This is **not** an authentication test against the hosted Supabase service, and does not verify RLS/permissions on the current live database.

## Manual rollout gate

1. Merge and deploy prior phases in order: #17, #18, #19, #20, with each phase's SQL applied and QA completed.
2. Inspect the actual current `organization_members`, permission catalog, `safar_flow.jobs` schema, and Supabase Data API settings.
3. Deploy `scripts/deploy-safar-flow-monitor.sql` to an isolated test instance.
4. With two signed-in test companies, confirm the RPC returns only the selected company's records.
5. Test user role changes (revoked permission, inactive employee, platform admin without membership).
6. Review empty/loading/error UI on mobile and desktop.
7. Verify failed task count and scheduler status against database operations.
8. Only after approval, deploy to production behind the existing automation feature gate.
9. Queue dispatch and cron activation remain **independent** manual approvals.

## Known limitations

- Monitoring snapshots do not prove the scheduler is online: pending and due counts can increase while cron is disabled.
- No SLA alert thresholds, historical graphs, worker heartbeats or dead-letter bulk recovery UI yet.
- Only DB-local booking tasks are included. WhatsApp, financial automations and quote followups are separate.
- Pagination is intentionally bounded and the UI shows only the latest 15 records; counts cover all rows in the company.
- Retry and dead-letter details are not displayed verbatim to protect potentially sensitive exception messages.

**No actual live data writes occurred as part of this phase.**
