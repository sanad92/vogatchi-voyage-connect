
# Phase 3 — Booking Workspace as Operational Command Center

Goal: turn `/bookings/:id/workspace` from a passive tab shell into the daily driver for consultants: an executive header, live money picture, smart guidance for the next step, focused task buckets, unified documents, and embedded WhatsApp context — validated end-to-end across the full Lead→Completed flow.

Scope is UI + light data plumbing only. No schema changes unless a check reveals a missing column (then a single additive migration). All logic reuses existing hooks: `useBookingWorkspace`, `useBookingFinancials`, `useInvoicePayments`, `useDocuments`, `useWhatsAppMessages`, `useWhatsAppWindow`, `useSuppliers`, `useOrgMembers`.

## Deliverables

### 1. Executive Header (`WorkspaceExecutiveHeader.tsx` — replaces current `WorkspaceHeader`)
- Row 1: booking number • booking type icon • workflow stage pill (color-coded from stage enum) • booking status • payment status (`paid / partial / unpaid / refunded`) • profit status (`healthy / thin / loss`).
- Row 2: customer name (linked) • destination (from itinerary hotel/flight) • travel dates (check-in→check-out or dep→ret) • assigned consultant (avatar) • SLA indicator (green/amber/red based on hours-to-travel and open tasks).
- Reuses stage colors from tokens (`--primary`, `--success`, `--warning`, `--destructive`); no hardcoded hex.

### 2. Financial Summary Strip (`FinancialSummaryStrip.tsx`)
Fixed 8-cell grid, always visible above tabs:
```
Selling | Supplier Cost | Gross Profit | Margin %
Customer Paid | Customer Balance | Supplier Paid | Supplier Balance
```
Data sources: `workspace.financials` + `useInvoicePayments(bookingId)` + `supplier_payments` filtered by `booking_id`. Colored deltas via semantic tokens.

### 3. Smart Next Action Panel (`SmartNextActionCard.tsx`)
Deterministic recommender keyed off `workflow_stage` + financial state:
- `lead/qualified` → "Create Quote" (link to `/quotes/new?bookingId=…`)
- `quoted` (no invoice) → "Convert to Invoice"
- `confirmed` + unpaid → "Record Payment"
- `paid` + no voucher doc → "Generate Voucher"
- `operations`/`traveling` → "Send Pre-Travel WhatsApp"
- `completed` → "Request Review"
Each card: one-line rationale + primary CTA + secondary "Skip / Mark Done" that advances stage.

### 4. Task Buckets (upgrade `TasksTab.tsx`)
Split `workspace.tasks` into 4 collapsible sections by `due_at` vs now: **Overdue** (red), **Today** (amber), **Upcoming** (default), **Completed** (muted, last 10). Retain existing add/complete actions. Add priority chips.

### 5. Business Timeline (upgrade `TimelineTab.tsx`)
Map raw `kind` values to business milestones with meaningful labels+icons+colors:
`lead_created`, `quote_sent`, `quote_accepted`, `booking_confirmed`, `invoice_issued`, `payment_received`, `supplier_paid`, `voucher_issued`, `travel_started`, `travel_completed`, `review_requested`. Unknown kinds fall through to current generic renderer. Keep existing filter chips.

### 6. Unified Documents Tab (`DocumentsTab.tsx` upgrade)
Single grouped list with 6 categories: **Passport & Visa**, **Tickets**, **Hotel Vouchers**, **Invoices**, **Confirmations**, **Other**. Sources:
- Invoices from `invoices` by `booking_id`
- Passport/visa from `customer` fields + `useDocuments(customerId)`
- Tickets/vouchers/confirmations from `booking.attachments` filtered by inferred `doc_type` or filename hint
Each row: category icon, name, date, download/open. Empty state per group with an "Upload" placeholder button (opens existing document upload path if present; otherwise disabled with tooltip — no new backend this phase).

### 7. Embedded WhatsApp Context (upgrade `OverviewTab.tsx`)
Add compact panel: `WindowStatusBadge` + last 3 messages preview (from `useWhatsAppMessages(conversationId, { limit: 3 })`) + "Open Conversation" + quick-send template button. Full WA tab remains.

### 8. Profit Widget (`ProfitWidget.tsx`)
Small card on Overview: profit amount, margin %, tiny sparkline placeholder (bar of paid vs outstanding), traffic-light health dot. Uses only existing `workspace.financials`.

## Files

Create:
- `src/components/bookings/workspace/WorkspaceExecutiveHeader.tsx`
- `src/components/bookings/workspace/FinancialSummaryStrip.tsx`
- `src/components/bookings/workspace/SmartNextActionCard.tsx`
- `src/components/bookings/workspace/ProfitWidget.tsx`
- `src/components/bookings/workspace/timelineMilestones.ts` (kind→meta map)
- `src/lib/bookingWorkflow.ts` (pure recommender + payment/profit status derivers)

Edit:
- `src/pages/BookingWorkspace.tsx` — swap header, mount Financial strip + SmartNextAction above tabs
- `src/components/bookings/workspace/OverviewTab.tsx` — add ProfitWidget + WA embed
- `src/components/bookings/workspace/TasksTab.tsx` — bucket layout
- `src/components/bookings/workspace/TimelineTab.tsx` — milestone map
- `src/components/bookings/workspace/DocumentsTab.tsx` — grouped categories

No migration expected. If `supplier_payments.booking_id` is missing when queried, fall back to `null` and log a gap in the report (do not add a column silently).

## Validation (must pass before marking complete)

Use Playwright against localhost with the injected Supabase session. Prereq: seed or select an existing test org with at least one customer.

End-to-end script (`/tmp/browser/phase3/e2e.py`):
1. **Lead** — create CRM lead via UI, capture screenshot.
2. **Quote** — build quote from that lead, send.
3. **Revision** — edit quote line, resend.
4. **Acceptance** — mark quote accepted → confirms booking exists.
5. **Booking** — open `/bookings/:id/workspace`, verify header + strip render with real numbers.
6. **Invoice** — click SmartNextAction "Convert to Invoice", confirm invoice appears in Documents.
7. **Payment** — record payment via SmartNextAction; verify Customer Balance updates.
8. **Voucher** — trigger voucher generation; verify it appears under Hotel Vouchers.
9. **Completed** — advance stage to `completed`; verify timeline shows all milestones in order.

Each step: screenshot + assertion on visible text. Console errors captured.

## Report format (delivered in chat after run)
- Screenshots (attached paths)
- Pass/fail per workflow step
- Remaining gaps (features referenced but not wired)
- Technical debt (fallbacks used, missing columns, mock data points)
- Explicit "Phase 3 complete" only if all 9 steps pass; otherwise "Phase 3 blocked at step N".

Proceed?
