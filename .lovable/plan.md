# Phase 8 – Workflow Orchestrator & Integration Layer

Connect all existing engines (Bookings, Automation, Finance, GL, WhatsApp, Notifications, AI, Audit) through a centralized, idempotent, event-driven bus. No UI redesign. No rebuild of existing modules.

## What already exists (reuse, do not touch)
- `automation_rules` / `automation_actions` / `automation_logs` + `useAutomationEngine`
- `booking_automation_runs` / `_steps` + `run_booking_automation` RPC
- `booking_timeline_events` (already the per-booking timeline)
- `finance_transactions` (append-only) + Phase 6 GL auto-post trigger on `customer_payments`
- `notifications` table + `useNotifications`
- `email_queue` + `process-email-queue`
- WhatsApp send functions + templates
- `admin_audit_log` (immutable) + `ai_assistant_*` tables

## What Phase 8 adds (net-new only)

### 1. Database — the Event Bus
- `domain_events` table (append-only)
  - `id uuid pk`, `organization_id uuid`, `event_type text`, `aggregate_type text`,
    `aggregate_id uuid`, `payload jsonb`, `idempotency_key text unique`,
    `occurred_at timestamptz`, `emitted_by uuid`, `correlation_id uuid`
- `event_subscriptions` table — routes an `event_type` to a `handler_key` with config
- `event_deliveries` table — one row per (event × handler); status pending/succeeded/failed/skipped, attempts, last_error, next_retry_at
- Indexes: `(event_type, occurred_at)`, `(aggregate_type, aggregate_id)`, unique `idempotency_key`
- RLS: org-scoped read; writes only via SECURITY DEFINER RPCs

### 2. Core RPCs
- `emit_event(p_type, p_aggregate_type, p_aggregate_id, p_payload, p_idempotency_key)`
  - Inserts into `domain_events` (dedup on idempotency_key → no-op if exists)
  - Fan-out inserts one `event_deliveries` row per matching active subscription
- `process_event_deliveries(p_limit)` — SECURITY DEFINER worker RPC
  - Picks pending deliveries, dispatches to in-DB handlers, updates status, exponential backoff on failure (max 5 attempts, then dead-letter)
- `dead_letter_event_deliveries` view for the Ops UI

### 3. In-DB Handlers (all idempotent, all take `payload jsonb`)
- `handler_timeline_append` — insert into `booking_timeline_events` (dedup on `(booking_id, event_type, source_event_id)`)
- `handler_run_booking_automation` — call existing `run_booking_automation`
- `handler_finance_post` — thin wrapper that reads booking/invoice/payment and ensures GL entries exist (delegates to existing Phase 6 logic; unique key = source event id)
- `handler_notify_in_app` — insert into `notifications`
- `handler_enqueue_email` — insert into `email_queue`
- `handler_enqueue_whatsapp_suggestion` — insert into `messaging_suggestions`
- `handler_audit_write` — insert into `admin_audit_log`
- `handler_ai_summary_refresh` — mark AI thread stale (queue only; real refresh is client)

### 4. Producers — one trigger per source table, emits standardized events
- `bookings` → `booking.created`, `booking.stage_changed`, `booking.completed`
- `quotes` → `quote.created`, `quote.accepted`, `quote.rejected`
- `invoices` → `invoice.created`, `invoice.paid`
- `customer_payments` → `customer.payment.recorded`
- `supplier_payment_orders` → `supplier.po.created`, `supplier.po.approved`
- `supplier_payments` → `supplier.payment.recorded`
- `booking_vouchers` → `voucher.generated`
- `refund_requests` → `refund.requested`, `refund.approved`, `refund.paid`
- All triggers build a deterministic `idempotency_key` = `event_type || ':' || row.id || ':' || coalesce(status,'')`, so retries and re-saves never duplicate.

### 5. Default subscriptions (seeded)
| event_type | handlers |
|---|---|
| booking.created | timeline, automation, notify, audit |
| booking.stage_changed | timeline, automation, notify, ai_summary |
| booking.completed | timeline, notify, email, whatsapp, audit |
| quote.accepted | timeline, automation (creates booking flow), notify |
| invoice.created | timeline, finance, notify |
| invoice.paid | timeline, finance, notify, whatsapp |
| customer.payment.recorded | timeline, finance (GL already exists — handler is no-op safe), notify |
| supplier.po.approved | timeline, notify, audit |
| supplier.payment.recorded | timeline, finance, audit |
| voucher.generated | timeline, email, whatsapp |
| refund.approved | timeline, finance, notify, audit |

### 6. Scheduler
- `pg_cron` job every minute → `select process_event_deliveries(200)`
- Second job every 5 min → retry `failed` deliveries whose `next_retry_at <= now()`

### 7. Notification Engine (thin, reuses existing tables)
- `dispatch_notification(user_ids[], channel, template_key, payload)` RPC that routes to `notifications` / `email_queue` / WhatsApp suggestion. Called only from handlers — no direct callers in app code required.

### 8. Report sync
- Reports already read live from `finance_transactions` / GL. Add materialized helper `refresh_finance_report_cache()` triggered from `handler_finance_post` (debounced via advisory lock so many events in a burst = one refresh).

### 9. Frontend (minimal — no redesign)
- `useDomainEvents(aggregate_id)` hook — powers existing Timeline tab if we want richer data (opt-in, existing timeline still works).
- **Ops page only:** `/platform-admin/event-bus` — list recent events, deliveries, dead-letter, "retry" button. Reuses existing table styles. No new design system.
- No changes to Booking Workspace, WhatsApp, Finance, or Sidebar beyond adding one Platform Admin link.

### 10. Backward compatibility
- Existing direct calls (e.g. `useAutomationEngine.executeTrigger`, direct `notifications` inserts, direct `email_queue` inserts) keep working.
- New triggers only *add* events; they never modify existing rows or block writes.
- If `process_event_deliveries` fails, business writes still succeed — the bus is best-effort with retries.

### 11. Idempotency guarantees
- `domain_events.idempotency_key` is UNIQUE → producer retries are safe.
- Each handler computes its own dedup key from `(handler_key, source_event_id)` before writing.
- `event_deliveries` has UNIQUE `(event_id, handler_key)`.

### 12. Validation
- Playwright script `/tmp/browser/phase8/`:
  1. Create booking → assert `booking.created` event + timeline row + automation run + notification.
  2. Record customer payment → assert `customer.payment.recorded` + GL entry + timeline + notification, and that re-saving the same payment does NOT duplicate.
  3. Approve supplier PO → assert audit + timeline.
  4. Open `/platform-admin/event-bus`, verify deliveries all `succeeded`, dead-letter empty.
- Screenshots + a text report of counts before/after.

### 13. Deliverables
- Migration list, files changed, routes added (`/platform-admin/event-bus` only), Playwright results, remaining integration gaps (e.g. handlers we intentionally left as no-op for future phases).

## Confirm before I execute
1. **Scheduler**: OK to enable `pg_cron` + `pg_net`? (needed for the 1-min worker; already used elsewhere in project)
2. **Producer coverage**: the 9 source tables above — add/remove any?
3. **Ops UI scope**: single `/platform-admin/event-bus` page is enough, or do you also want per-booking "events" drawer in the Workspace? Default: platform page only, no Workspace changes.
4. **Dead-letter policy**: 5 attempts then park in dead-letter with manual retry — OK?

Reply "defaults OK" or with changes and I'll execute end-to-end in one pass.
