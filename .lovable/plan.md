## Phase 9 — Workflow Engine + Operations Command Center

Additive layer over existing Booking Workspace, Event Bus, Automation and Finance engines. No redesign of shipped modules.

### 1. Database (single migration)

**Workflow definition tables**
- `workflow_definitions` (key, name, aggregate_type, active) — seed one row `booking_lifecycle`.
- `workflow_stages` (definition_id, key, label, order_index, category, required_fields jsonb, entry_events text[], exit_events text[]).
- `workflow_transitions` (definition_id, from_stage, to_stage, condition jsonb, auto boolean).
- `workflow_rules` (id, name, event_type, condition jsonb, action jsonb, priority, active, org_id nullable for platform defaults, last_run_at, last_duration_ms, failure_count).
- `workflow_rule_runs` (rule_id, event_id, status, duration_ms, error, ran_at) — observability.
- `ops_queue_items` view (union of overdue tasks, pending payments, pending POs, failed events, WhatsApp failures, approvals) scoped by org.

**RPCs**
- `get_workflow_progress(aggregate_type, aggregate_id)` → `{current, previous, next, progress_pct, blockers[], missing[]}`.
- `advance_workflow(aggregate_id, to_stage, reason)` → validates, updates `bookings.workflow_stage`, emits `workflow.stage_changed`.
- `run_workflow_rules(event_id)` → handler wired into event bus; iterates active rules matching event_type, records `workflow_rule_runs`, updates rule stats.
- `get_ops_command_center(org_id, date)` → aggregated counts + top items.
- `get_business_health_kpis(org_id, from, to)` → conversion, gross margin %, avg response min, receivables, payables, backlog, revenue, profit, top consultant, top destination.

**Event bus wiring**
- Insert subscription `workflow_rules_engine` bound to `*` event types via new handler `handler_workflow_rules` — reuses existing `process_event_deliveries`.
- Emit `workflow.stage_changed` on `bookings.workflow_stage` UPDATE via new trigger.

Idempotency: rule runs keyed by `(rule_id, event_id)` unique.

### 2. Hooks (`src/hooks/`)

- `useWorkflowProgress(aggregateType, aggregateId)` → progress card data.
- `useAdvanceWorkflow()` → mutation.
- `useOpsCommandCenter(date?)` → dashboard payload.
- `useOpsQueue(filter)` → assigned/today/overdue/waiting/completed.
- `useBusinessHealthKpis(range)`.
- `useWorkflowRules()` + `useToggleWorkflowRule()` + `useRetryWorkflowRule()`.

### 3. UI (new pages, existing sidebars)

- `/operations` — **Operations Command Center**: 4 KPI rows (Today, Money, Ops, Health) + panels: arrivals/departures, pending customer/supplier payments, check-ins/outs, visa/ticket tasks, late follow-ups, WhatsApp failures, failed events (link to event explorer), approvals, org health.
- `/operations/queue` — **Daily Operations Queue**: tabs assigned-to-me / today / overdue / waiting-customer / waiting-supplier / waiting-payment / completed-today. Each row: one-click actions (mark done, snooze, open booking, open WhatsApp) + context strip.
- `/reports/business-health` — KPI dashboard with sparklines (reuse Recharts).
- `/platform/workflow-rules` — Platform Owner only: table (name, event, priority, active toggle, last run, duration, failures, retry). Uses `PlatformSidebar` gate.
- **Booking Workspace** — add `WorkflowProgressBar` above stepper (previous/current/next + %). Extend `SmartNextActionCard` to consume workflow blockers/missing from RPC (dynamic beyond current rule set).
- **Customer & Quote lists** — add small `WorkflowBadge` component (stage + progress %).
- **Unified Business Timeline** — new `<BusinessTimeline aggregateId>` reading `domain_events` filtered by aggregate + related refs; drop into Workspace timeline tab (keeps existing timeline as fallback).

### 4. Smart Next Action expansion

Extend `src/lib/bookingWorkflow.ts` `recommendNextAction` to accept blockers/missing from RPC and prefer them over static heuristics. No breaking change to callers.

### 5. Sidebar entries

- Dashboard sidebar: "العمليات" group → Operations Command Center, Daily Queue, Business Health.
- Platform sidebar (owner only): "Workflow Rules".

### 6. Validation

- `tsgo` typecheck.
- Playwright E2E script under `/tmp/browser/phase9/` using restored Supabase session: walk one booking Lead→Completed via advance_workflow RPC, assert `domain_events` count matches expected, no duplicates by `idempotency_key`, no rows leaked across org via `organization_id` filter, screenshot Ops Center + Queue + Workflow Rules + Business Health.

### 7. Deliverables

- Migration file with all tables, RPCs, trigger, subscription seed, GRANTs, RLS.
- ~10 new files (hooks, pages, components); 3-4 edited files (App.tsx, sidebars, BookingWorkspace, bookingWorkflow.ts).
- Final report: what shipped, migration summary, routes added, Playwright results, Workflow Gap Report, Production Readiness score (0-100 with sub-scores: data model, automation coverage, observability, security, UX completeness, test coverage).

### Non-goals (explicit)

- No redesign of Booking Workspace, WhatsApp cockpit, Finance pages, Event Bus explorer.
- No new accounting posting logic (Phase 6 remains authoritative).
- No new notification channels (uses existing Notification Engine from Phase 8 hardening).
- Rule condition/action DSL kept minimal (JSON with `{when, emit|task|notify|advance_stage}`); full visual builder deferred.

Approve to proceed with the migration first, then frontend in one batch.
