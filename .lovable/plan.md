
# Vogatchi Operational Workflow — Implementation Plan

This is a very large refactor. To keep it production-safe and reviewable, I'll ship it in **7 incremental phases**, each independently deployable and backward compatible. Nothing existing gets removed; new surfaces sit alongside and gradually become the primary entry point.

## Guiding principles

- **Additive only.** All current pages (`/bookings`, `/crm`, `/whatsapp-admin`, `/invoices`, etc.) keep working. New unified surfaces are added and linked from the sidebar.
- **One source of truth per entity.** Reuse `bookings`, `customers`, `invoices`, `whatsapp_conversations`, `whatsapp_templates`, `customer_follow_ups`, `automation_rules`. No parallel tables unless strictly needed.
- **Backend-safe.** New DB objects only where a workflow demands it (workflow stages, booking tasks, booking attachments-index, timeline). Everything RLS-scoped by `organization_id` + role.
- **Validate each phase** with a Playwright smoke run before moving to the next.

---

## Phase 1 — Foundations (workflow spine)

Goal: give every booking a lifecycle stage and a unified timeline that all other phases plug into.

Backend (single migration):
- `booking_workflow_stages` enum + `bookings.workflow_stage` column, default `lead`. Stages: `lead → qualified → quoted → confirmed → paid → operations → traveling → completed → post_travel`.
- `booking_tasks` (booking_id, title, due_at, assignee, status, source).
- `booking_timeline_events` (booking_id, kind, actor, payload jsonb, occurred_at) — append-only audit + activity feed.
- `booking_attachments_index` view unifying existing attachment URLs from `bookings`, `hotel_bookings`, `flight_bookings`, invoices, WhatsApp media.
- Triggers: writing to `bookings`, `invoices`, `whatsapp_messages`, `customer_follow_ups`, `payment_transactions` emits into `booking_timeline_events` when a `booking_id` is resolvable.
- RLS + GRANTs per platform conventions.

Frontend:
- `useBookingWorkspace(bookingId)` hook: aggregates booking, customer, supplier, hotel/flight/transport detail, invoices, payments, WA conversation, notes, tasks, timeline, profit.
- No UI change yet — hook is the substrate for phase 2.

## Phase 2 — Unified Booking Workspace

Route: `/bookings/:id/workspace` (existing `/bookings/:id` keeps working; workspace link added on booking rows and detail page).

Tabbed single-page workspace using the phase-1 hook:
- **Overview** — customer card, stage stepper, profit summary, next task, quick actions (WhatsApp, invoice, payment, voucher).
- **Itinerary** — hotel / flight / transport / visa sub-cards editable inline.
- **Financials** — invoices, payments, supplier costs, profit, currency, outstanding balance; "Record payment" and "Send invoice" actions.
- **Documents** — attachments-index + upload (voucher, passport, visa, contract).
- **WhatsApp** — embedded conversation panel (reuses `useCustomerWhatsApp`) with template picker and 24h window badge.
- **Notes & Tasks** — `booking_tasks` + existing `customer_notes` scoped to booking.
- **Timeline & Audit** — `booking_timeline_events` reversed feed.

Stage stepper updates `workflow_stage`; each transition writes a timeline event and can trigger automation (phase 5).

## Phase 3 — WhatsApp Operational Cockpit

Enhance the existing WhatsApp inbox so agents rarely need to leave a conversation.

- Right-hand **Customer Context Drawer** on every conversation: customer profile, open bookings with stage badges, last invoice + balance, loyalty, quick tags.
- **In-conversation Action Bar**:
  - Create Quote (opens quote drawer prefilled with customer)
  - Create Booking (opens NewHotel/Flight quick form, prefilled)
  - Send Invoice (picks/creates invoice, sends PDF link via WA template)
  - Record Payment (payment dialog, links to conversation + booking)
  - Send Voucher (attaches voucher PDF)
  - Convert to Lead / CRM (creates `customer_follow_ups` + tags)
- Uses existing edge functions (`send-whatsapp-message`, template center) — no schema change beyond a `whatsapp_conversations.active_booking_id` FK (nullable) for context pinning.

## Phase 4 — Lead → Quote → Decision funnel

- **CRM Qualification view** at `/crm` gains a "Qualify" action producing a `booking` row in stage `qualified` (draft, no supplier yet), linked to the lead.
- **AI Travel Concierge**: extend existing `ai-smart-reply` / `ai-generate-template` with a new `ai-travel-concierge` edge function — given customer prefs + budget + dates, returns a suggested itinerary (hotel/flight/transfer picks from `hotels`, `airlines`, `suppliers` tables). Rendered inside the Workspace → Itinerary tab and in WhatsApp Action Bar.
- **Quote Builder**: reuse `quotes` + `quote_items`; add "Convert to Booking" already present in `useQuoteConversion` — surface it in the workspace and WA action bar. Track customer decision (`accepted` / `rejected` / `expired`) — already supported.

## Phase 5 — Automation & Notifications

Reuse `automation_rules` + `whatsapp-automation-engine` — no new engine.

Seed rule templates (idempotent seeder in a migration) for:
- **Follow-ups**: quote sent + no reply in 24h/72h → WA template.
- **Payment reminders**: invoice due in 3 days / overdue → WA + email.
- **Before travel**: T-7d voucher, T-3d packing tips + check-in info, T-1d wishes.
- **During travel**: T+1d "how is everything?" auto-check-in.
- **After travel**: T+2d thank-you + review request, T+30d re-engagement offer.

Rules key off `bookings.check_in_date` / `check_out_date` / stage transitions. Scheduler: use existing `whatsapp-sla-monitor` cron pattern; add a `booking-automation-cron` edge function invoked by pg_cron every 15 minutes (setup instructions to user for the cron insert since it embeds project ref + anon key).

## Phase 6 — Financial Workspace inside Booking

- Financials tab (phase 2) is upgraded with:
  - Multi-currency conversion using `useMultiCurrency` + `exchange_rates`.
  - Supplier payables sub-panel (auto-links `supplier_payments` by `booking_id`).
  - Profit realtime calc via `useBookingFinancials`.
  - Zatca e-invoice trigger button (existing `zatca_invoice_data` table) when org is KSA.
- Adds a `/finance/bookings` roll-up view: outstanding customer balances + supplier payables grouped by workflow stage.

## Phase 7 — Operations, Documents, Post-Travel

- **Operations tab** for ops role: filter workspace list by stage `confirmed`/`paid`/`operations` — bulk send vouchers, mark supplier confirmed, upload confirmation numbers.
- **Documents**: unify passport, visa, voucher, contract uploads (Supabase storage buckets exist; add `booking-documents` bucket if missing) — accessible from workspace and WA drawer.
- **Post-travel engagement**: automation phase 5 handles messaging; new `/crm` widget "Re-engagement queue" surfaces completed bookings without a follow-up in 30 days.

---

## Validation per phase

Each phase ends with:
1. `bun run build` / typecheck via harness.
2. Playwright script hitting the new route with the injected Supabase session, screenshotting the new surface.
3. Verifying: RLS reads succeed, no console errors, timeline events written where expected.

## Assumptions

- Sidebar/nav can gain 1 new item ("Workspace" as default booking action) without removing the current Bookings/CRM/WhatsApp/Finance items.
- `bookings` table is the correct spine (vs `hotel_bookings`/`flight_bookings`/`transport_bookings`), consistent with the unified booking migration already in the codebase.
- The user is fine with pg_cron setup requiring a manual SQL step (project ref + anon key can't ship in a migration).

## What I need from you before starting

This is easily 15–25 hours of coordinated work. Please confirm:

1. **Proceed phase-by-phase**, reviewing at the end of each phase? (recommended) — or ship phases 1–2 first and re-plan the rest based on what you see?
2. **Sidebar/nav**: OK to add a "Workspace" entry and make it the default click target from a booking row, while keeping the legacy detail page reachable?
3. **Automation seeding**: OK to seed default rule templates (disabled by default, you toggle on) rather than enabling automations silently?
4. **AI Concierge model**: use the current Lovable AI Gateway default (Gemini flash-tier) unless you specify otherwise?

Once you answer, I'll start with **Phase 1 (foundations migration + `useBookingWorkspace` hook)** and report back with the Playwright validation before touching UI.
