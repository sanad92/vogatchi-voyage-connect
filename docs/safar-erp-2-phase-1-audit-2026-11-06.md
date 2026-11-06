# Safar ERP 2.0 — Phase 1 Audit & Delivery

Date: 2026-11-06
Project: Lovable 49aa510d-479d-4612-891c-0963e841fe97
Repository: sanad92/vogatchi-voyage-connect

## Verified in source
- Vite + React + TypeScript, not Next.js: package.json, src/App.tsx.
- Unified bookings and /bookings/:id/workspace exist.
- Workspace already includes overview, linked itinerary services, finance, documents, WhatsApp, tasks, timeline, automation and SOP tabs.
- /operations/command-center and /operations/queue exist.
- Existing automation rules, event bus, WhatsApp automation, quote and itinerary tools should be extended, not duplicated.
- booking_tasks schema in 20260716104944 migration has statuses open/in_progress/done/cancelled and a timeline trigger for done.
- In previous code, OperationsQueue wrote completed, while BookingWorkspace wrote done. The old ops queue also filtered for pending, and the old KPI RPC excluded only completed.
- get_ops_command_center SQL chooses the *first* membership organization, while UI query key uses selected orgId. This is not sufficient to certify metrics for users with access to multiple companies.

## Implemented on this feature branch
1. Operations queue reads only the selected organization, uses correct task states, correct completed_at for completion filters, and local date boundaries.
2. Task completion uses done, checks affected row, prevents double clicks, surfaces errors, and refreshes company-scoped queries and booking tasks.
3. BookingWorkspace add/complete task mutations refresh both Workspace and Operations queries; completion is additionally scoped by booking and organization.
4. Linked-service loading now surfaces provider-table query errors, rather than wrongly claiming a trip has no services.
5. Operations dashboard displays errors/retry and distinguishes cash collected today from revenue. No financial formulas changed.
6. Added static contract regression and TypeScript/build CI configuration.

## Important blockers (NOT implemented or verified)
- Lovable Cloud DB SELECT was unavailable during this audit; no live schema change, data write, seed, publish, or payment was performed.
- SQL get_ops_command_center requires an explicit, authenticated organization argument and task state correction, followed by cross-tenant verification. Do not treat legacy KPI figures as certified multi-org numbers.
- Waiting customer/supplier/payment filters currently rely on Arabic task title text, because structured waiting reasons are absent from the original schema. Replace with enum/category fields in a later migration.
- A full Trip File / amendment ledger is not yet introduced. Existing BookingWorkspace remains the foundation for this work.
- Safar Flow reliable server-side orchestration, queues, retries, deduplication and AI approvals remain in future sprints.
- No live browser, cross-tenant, payment, or supplier integration testing was possible.

## Acceptance tests after cloud recovery
- Create a task in test org A, verify it appears only in org A's queue and booking workspace.
- Complete it in either screen; it must show done in the other and emit task_completed once.
- Check overdue/today/completed_today by local business time, including midnight/DST boundaries.
- Cause a service query failure and verify an error is shown, never a false empty itinerary.
- Select org A vs org B from the same user; compare KPIs and queue results after backend RPC migration.
- Run CI TypeScript/build tests, then signed-in mobile/desktop review before merging.

## Next sprint
- Explicit-org RPC + secure tenancy checks.
- Structured action center buckets; reliable due dates and assignee role actions.
- Formal trip amendment and versioned quotation lifecycle.
- Safar Flow event contract and worker design, without external n8n runtime dependency.
