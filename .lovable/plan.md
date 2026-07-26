# Phase 10 – Product Readiness

Phase 10 is a launch-readiness milestone spanning marketing, onboarding, no-code tooling, ops surfaces, marketing automation and a final quality pass. To keep quality high and each shipment reviewable, I'll deliver it in **4 sequential sprints**, each ending with a runnable checkpoint. I will not touch working engines (Workflow, Event Bus, Finance, Automation) unless a specific gap surfaces.

Confirm the sprint order below (or reshuffle) and I start Sprint 10.1 immediately.

---

## Sprint 10.1 – Growth Surface (public + first-run)
Goal: everything a prospect or brand-new org touches.

1. **Premium Marketing Landing Page** (`/`)
   - Reuse existing `LandingHero`, `ServicesSection`, `IndustriesSection`; add:
     - `PricingSection` (3 tiers pulled from `subscription_plans`, monthly/yearly toggle)
     - `FeatureComparisonTable` (Starter / Pro / Enterprise)
     - `SecurityTrustSection` (RLS, encryption, audit, RBAC, MFA, GDPR-ready qualifier)
     - `TestimonialsCarousel` (placeholder data, ready for real logos)
     - `FinalCTASection` with WhatsApp + signup
   - AR/EN via existing dir="rtl" pattern; add `useLanguage` toggle wired to `i18n` skeleton (no full translation, but scaffold ready).
2. **Interactive Onboarding Wizard** (`/onboarding`)
   - Multi-step: Company → Branches → Invite Users → WhatsApp Connect → Finance (currency + first bank account) → Branding (logo/color) → Templates (pick starter set).
   - Progress persisted in `organization_settings.onboarding_state` (jsonb).
   - Replace the current `RegisterOrganization` skip flow entrypoint.
3. **Demo Mode with Safe Reset**
   - Toggle in Organization Center → "Load demo data".
   - Edge function `seed-demo-data` reuses `generate-demo-data` and tags rows with `is_demo=true` (new column on customers, bookings, invoices, payments, suppliers).
   - "Reset demo" button deletes only `is_demo=true` rows for that org, transactional.

---

## Sprint 10.2 – Content & Ops surfaces
Goal: tools consultants live in daily.

4. **Visual Workflow Rule Builder** (`/platform/workflow-rules`)
   - Replace JSON editor with:
     - Trigger picker (event catalog dropdown)
     - Conditions builder (field / operator / value rows, AND/OR)
     - Actions builder (send WhatsApp / email / create task / update stage / notify)
   - Serializes to the same `workflow_rules.condition_json` + `action_json` — backend untouched.
   - "Test rule" runs against last 10 matching events without emitting.
5. **Unified Template Center** (`/templates`)
   - Extends existing `TemplateCenter` (WhatsApp) to also cover Email, Voucher, Quote, Invoice, Marketing.
   - Categories tabs; variable palette with autocomplete from `whatsappVariables.ts`.
   - Preview panel per channel.
6. **Travel Calendar** (`/calendar`)
   - Month/week/day; overlays: arrivals, departures, visa deadlines, payment due, ops tasks.
   - Uses existing `bookings`, `booking_tasks`, `hotel_bookings`, `flight_bookings`, `customer_payments`.
   - Click event → deep link to Booking Workspace.

---

## Sprint 10.3 – Supplier & Document 360
7. **Supplier Workspace + Supplier 360** (`/suppliers/:id/workspace`)
   - Header: name, category, rating, currency, balance.
   - Tabs: Overview, Bookings, Purchase Orders, Payments, Invoices, Documents, Notes, Timeline.
   - Reuses `useSupplierLedger`, `supplier_payment_orders`, `supplier_invoices`.
8. **Unified Document Center** (`/documents`)
   - New table `documents` (org_id, entity_type, entity_id, category, url, expiry, uploaded_by).
   - Filters by entity (booking / customer / supplier), category (passport/visa/ticket/voucher/invoice/contract), expiring soon.
   - Embed on Booking / Customer / Supplier workspaces via `<DocumentsPanel entity="booking" id=... />`.

---

## Sprint 10.4 – Automation, Quality, Launch report
9. **Marketing Automation Journeys**
   - New tables `journeys`, `journey_steps`, `journey_enrollments`.
   - Prebuilt journeys: Welcome, Follow-up (no reply 48h), Abandoned Quote (7d), Pre-Travel (T-7/T-1), Post-Travel (T+2), Loyalty (repeat customer).
   - Executed by existing event bus + worker; steps use Template Center.
10. **Final Quality Pass**
    - Perf: route-level `React.lazy` for heavy pages, image `loading="lazy"`, Vite build report.
    - Responsive audit: run Playwright at 375 / 768 / 1440 across top 15 routes, capture screenshots.
    - A11y audit: token contrast sweep, `aria-label` on all icon-only buttons, single `<main>`, keyboard nav on wizard/builder.
    - Playwright regression: Lead → Completed happy path + Onboarding wizard + Rule Builder save.
    - Deliver `LAUNCH_READINESS.md` v2 with **remaining blockers only**.

---

## Technical notes

- New migrations expected: `is_demo` columns, `documents` table + policies + GRANTs, `journeys*` tables + policies, `organization_settings.onboarding_state`.
- All new tables follow the four-step public-schema pattern (CREATE → GRANT → ENABLE RLS → POLICIES) with org scoping via `has_role`/membership.
- No changes to `domain_events`, `workflow_rules` schema, or Event Bus dispatch — Rule Builder only writes JSON the existing handler already understands.
- i18n stays scaffolded (keys ready) — a full translation pass is out of scope; call it out in the readiness report.
- Estimated total: ~40 new files, 4 migrations, 3 edge functions. Each sprint ends with a typecheck + preview screenshot.

Reply with **"go"** to start Sprint 10.1, or tell me which sprint to prioritize first.
