# Vogatchi — Final Product Polish Sprint (Pre-Launch)

Goal: elevate Vogatchi from an ERP feel to a premium SaaS product (HubSpot / Linear / Intercom / Stripe caliber) **without touching business logic, workflows, DB schema, migrations, APIs, or removing features**. All work is presentational and additive/backward-compatible.

The scope is very large, so I'll execute it as **6 sequential waves**, each independently shippable and verifiable. After each wave I'll do a QA pass (Playwright screenshots on key routes) before moving on. If mid-sprint you want to stop at any wave, the app is still in a better state than before.

---

## Wave 1 — Design System Hardening (foundation)

No page changes yet — just tighten the primitives every later wave depends on.

- Audit `src/index.css` tokens and confirm all color/shadow/gradient usage flows through semantic tokens (no `text-white` / `bg-black` / hex leftovers). Fix any offenders discovered while working on later waves as we touch them.
- Consolidate the two `EmptyState` implementations (`src/components/common/EmptyState.tsx` and `src/components/ui/empty-state.tsx`) into one canonical import path with a shim so existing imports keep working.
- Standardize primitives used everywhere:
  - `PageHeader` (already exists) — adopt across pages that still roll their own header.
  - `SectionHeader`, `PageSkeleton`, `EmptyState` — enforce as the only allowed variants.
  - Unify Badge status colors via `.status-active / -pending / -error / -info / -inactive` (already in `index.css`) — replace ad-hoc colored badges as we touch each page.
- Add a shared `StatCard`, `KpiCard`, `TimelineItem`, `DetailRow`, `Toolbar` (search + filters + bulk actions), `PageContainer` primitive so subsequent waves are pure composition.
- Refine motion tokens: standard `fade-in`, `slide-in-from-bottom-4`, hover-lift, focus-ring are already defined — document usage and apply consistently.

Deliverable: no visual regression, but every later wave is a 1-line composition instead of bespoke markup.

---

## Wave 2 — Navigation & Shell

- **Sidebar** (`src/components/layout/DashboardSidebar.tsx`): regroup items into a smaller number of semantic sections (Workspace / Sales / Operations / Finance / Admin), collapse rarely-used items under a "More" group, keep icon-only collapsed state polished, active-route highlight refined, pinned/favorite section for the user's frequent modules (client-side localStorage — no schema change).
- **Topbar** (`DashboardTopbar.tsx`): tighten spacing, add global search (⌘K style trigger — opens a client-side quick-nav palette over existing routes only, no new backend), notifications bell polish, org switcher polish, breadcrumb refinement.
- **Breadcrumbs**: standardize `BreadcrumbNav` usage across every page (already exists on CRM etc.).
- **Page titles**: audit `document.title` via a small `usePageTitle` hook applied per route (presentational only).

---

## Wave 3 — Dashboard as Executive Control Center

Rework `src/pages/OptimizedIndex.tsx` and `src/components/dashboard/*` composition only — same data sources, same hooks.

Layout blocks (top → bottom):
1. Hero greeting (already improved) + today's date + org name.
2. KPI row: Revenue (period), Bookings, Active Quotes, Outstanding Invoices, WhatsApp Open Conversations — all from existing hooks.
3. Two-column: **Today's work** (tasks, follow-ups, unpaid invoices due) + **Recent activity** (recent bookings, recent messages, recent payments).
4. **Business health** chart strip (revenue trend, bookings trend) — reuse existing chart data.
5. **Quick actions** dock (New Quote, New Booking, New Customer, Open Inbox).

All from existing hooks — no new queries.

---

## Wave 4 — CRM as Customer Workspace + WhatsApp as Inbox

- **Customer profile page** → workspace layout: left rail (identity + KPIs + next actions), main area with tabs (Timeline / Quotes / Bookings / Invoices / Payments / WhatsApp / Notes / Files). All data already wired via `useCustomer360`.
- **CRM list** (`CRMDashboard.tsx`): tighten tab bar, card-based customer rows on the customers tab, better empty & loading states, saved-filter chips (client-side).
- **WhatsApp** (`WhatsAppDashboard.tsx`, `ConversationRightPanel.tsx`, `WhatsAppCRMPanel.tsx`): 3-pane Intercom-style layout on desktop (Conversations | Chat | Customer context), quick actions in the right pane (Open Customer, Create Quote, Create Booking, Open Invoice — all link to existing routes). Mobile keeps the current stacked layout.

---

## Wave 5 — Quotes / Bookings / Invoices Polish

For each, no logic changes — only presentation:
- **Quotes**: cleaner pricing block, clearer primary action (Send / Convert), collapsible secondary fields, refined PDF preview drawer.
- **Bookings**: scannable header (customer, dates, status, total), collapsible sections for supplier/pax/financials, prominent status badge, financial summary card.
- **Invoices**: outstanding balance hero, payment status badge, "Record payment" primary CTA, cleaner line-items table.

---

## Wave 6 — Tables, Forms, States, Accessibility, Final QA

- **Tables**: shared `DataTable` polish — sticky header, zebra off, better row hover, bulk-action toolbar, empty state, skeleton rows, saved filters (client-side).
- **Forms**: group related fields into cards, inline validation styling, consistent field spacing, keyboard/tab order review, helpful placeholders.
- **States**: audit every page for consistent Loading (`PageSkeleton`), Empty (`EmptyState`), Error (with Retry), Success (toast) patterns. Any TanStack Query hook without error+retry gets one.
- **Accessibility**: aria-labels on icon-only buttons, focus-visible rings via `.focus-ring`, contrast pass, 44px tap targets on mobile, `prefers-reduced-motion` already handled globally — verify.
- **Responsive**: desktop-first verification then tablet & mobile check with Playwright screenshots at 1440 / 1024 / 390.
- **Final QA**: Playwright pass on Dashboard, CRM, Customer 360, WhatsApp, Quotes, Bookings, Invoices, Reports — screenshots + console/network error check.

---

## Technical section

- Files primarily touched (all presentational):
  - `src/index.css`, `src/components/ui/*`, `src/components/common/*`, `src/components/layout/*`
  - `src/components/dashboard/*`, `src/pages/OptimizedIndex.tsx`
  - `src/components/crm/**`, `src/pages/CRM.tsx`, customer-detail components
  - `src/components/whatsapp/**`, `src/pages/WhatsAppAdmin.tsx`
  - Quote / Booking / Invoice **view** components only (not their hooks or submission logic)
- No files touched: `src/integrations/supabase/*`, any hook under `src/hooks/*` that owns mutations/queries (read-only refactor of loading/error rendering is allowed at the component layer), `supabase/**`, `.env`.
- No new dependencies unless strictly required (framer-motion is not currently installed; I'll use existing tailwind animation utilities + `animate-in` classes already defined to avoid adding a dep).
- Every change guarded so existing props/exports keep working (shims where needed).

---

## Deliverable

At the end I'll produce the requested **Product Polish Report**: what changed per wave, UX / Visual / Navigation / Consistency / A11y improvements, remaining opportunities, and honest scores for UX / UI / Product Maturity / Enterprise Readiness / SaaS Design Quality (out of 100).

---

## Confirmation needed before I start

This sprint is large (est. multi-turn execution). Two quick calls:

1. **Global search (⌘K palette) in Wave 2** — client-side navigation only (jump to routes / customers already in cache). OK to add? It's a big UX win but is a small new surface.
2. **Framer-motion**: I plan to **not** add it and rely on existing Tailwind/`animate-in` utilities. Confirm that's fine, or say "add framer-motion" if you want richer transitions.

If you just say "go", I'll assume yes to (1) and no framer-motion for (2), and start with Wave 1.
