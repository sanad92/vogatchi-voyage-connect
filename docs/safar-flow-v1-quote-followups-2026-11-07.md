# Safar Flow V1 — Quote follow-up runtime adapter

Status: **source staged, not deployed**. Base branch: `feat/safar-flow-studio-20261107`.
Date: 2026-11-07.

## What exists already in Safar ERP
- `public.quote_followups` schedules per-company reminders upon quotation send,
  with configurable `organization_settings.quote_followup_days` (default 1/3/7 days).
- WhatsApp inbound message trigger sets pending/notified quote followups to responded.
- Quote lifecycle trigger cancels followups on acceptance/rejection/expiry/conversion/cancellation.
- `public.dispatch_quote_followups()` creates IN-APP reminders, NOT outbound WhatsApp.
- `QuoteFollowupsPanel`, `QuoteFollowupSettingsDialog`, `QuoteWhatsAppFollowupButton`
  already expose reviewable manual operation.
- Searching repository migrations found no cron schedule invoking `dispatch_quote_followups`.
  This is a source-only observation, not a live cron status claim.

## Changes in this PR
1. `useSafarFlowFollowups`: per-active-company read-only counts and next 12 open
   reminders, including unassigned reminders; errors are shown, not treated as zero.
2. `SafarFlowLiveFollowups`: observability panel added to Safar Flow Studio.
3. `scripts/deploy-safar-flow-followup-dispatch.sql`: staged SQL for
   (a) scheduling quotes initially INSERTed as sent, (b) verifying quote still
   sent/not expired and employee still a member before dispatching,
   (c) taking row locks with SKIP LOCKED, (d) committing notification and
   status together, (e) limiting each batch to 250, (f) removing public execution.
4. `scripts/activate-safar-flow-followup-cron.sql`: **separate manual opt-in**
   every-five-minute cron schedule. It is not automatically deployed.
5. `scripts/disable-safar-flow-followup-cron.sql`: rollback schedule, preserving data.
6. CI source guards, TypeScript validation and build.
7. Ephemeral PostgreSQL 16 integration test `scripts/test-safar-flow-followup-dispatch.sql`
   exercises draft->sent, initial sent insert, cross-organization notifications,
   due selection, duplicate run, expired quote, invalid owner, accepted/cancelled quotes.
   The GitHub Actions run succeeded; this does NOT verify the user's live database.

## Operations & safety notes
- The message templates are manual WhatsApp drafts, not automatic sends.
- This first runtime does **not** execute the five preview templates.
- The existing quote_followups subsystem is reused as the first practical backend;
  other templates remain preview-only pending secure general orchestration.
- No live database schema or cron was changed through this PR.
- Running cron may immediately notify employees for many old pending reminders;
  review overdue counts and member assignments before opt-in.
- Owners who are missing or no longer organization members are left pending
  rather than silently marked notified without a recipient. Assign/reconcile
  those reminders before enabling cron.
- Multi-tenancy: the monitoring query uses the selected orgId and RLS;
  dispatch checks matching organization_ids on quote/followup/member.
- The cron service runs inside the database as a privileged scheduler;
  its function must not be exposed as user-invokable RPC.

## Acceptance checklist for the user's hosted test database (NOT YET VERIFIED)
1. Confirm latest existing quote_followup migrations have actually been applied.
2. Review current `cron.job` before adding a new schedule (avoid duplicate dispatchers).
3. Execute deploy script on test DB, then verify trigger/function permissions.
4. Insert approved test quote with `status='sent'`; confirm one reminder per configured day.
5. Transition a draft test quote to sent; assert no duplicates on subsequent status updates.
6. Record customer WhatsApp response; assert remaining followups are marked responded.
7. Change quote status to accepted/cancelled; assert pending and notified reminders cancel.
8. Set a due timestamp on a test followup (using test-only data); call dispatch once as
   scheduler and confirm exactly one in-app notification and status notified.
9. Call dispatch twice and concurrently; confirm no double-notification.
10. Quote expires or is converted before dispatch: no new notification.
11. Employee removed from organization: pending remains visible, no ghost notification.
12. Authenticate as org A and org B; each can read only its own followups and no
    authenticated client can EXECUTE dispatch_quote_followups().
13. Validate the report for accessible vs inaccessible DB states and small screens.
14. Only if all tests pass, run manual activation SQL in test, inspect cron job
    run logs, and repeat with a controlled production rollout.
15. For rollback run disable script, then inspect queued followups, leave audit intact.

## Follow-on scope
- Shared Safar Flow event envelope and isolated, authenticated tenant executor.
- A durable queue with idempotent action keys, lease expiry, DLQ and retries;
  avoid treating existing client-side useAutomationEngine as trusted execution.
- Quote followup row ownership/assignment remediation.
- Separate booking, supplier-payment and WhatsApp draft workflows.
