
# Launch Preparation Sprint — V1 Feature Freeze

## Objective
Freeze new features. Ship a stable, professional V1 by simplifying navigation, hiding incomplete modules, polishing UI, and validating the demo flow: **Customer → Quote → Booking → Invoice → Payment → WhatsApp → Dashboard**.

---

## Scope of Changes (Frontend/Nav only — no business-logic edits, no DB changes, no route deletions)

### 1. Simplified Sidebar (Core V1 Modules Only)
Rebuild `src/components/layout/DashboardSidebar.tsx` to expose only the 10 approved modules, grouped cleanly:

```
الرئيسية
  • لوحة التحكم              /dashboard
  • المساعد الذكي (AI)        /ai-assistant
  • العمليات اليومية          /daily-operations

المبيعات
  • عروض الأسعار             /quotes
  • الحجوزات                 /bookings
  • الفواتير                 /invoices
  • المدفوعات                /bank-accounts   (renamed: "المدفوعات والحسابات البنكية")

العملاء والتواصل
  • CRM                     /crm
  • واتساب                   /whatsapp-inbox

تحليلات
  • التقارير                 /reports

الإعدادات
  • الإعدادات                /admin-settings
```

All other menu entries (accounting deep pages, supplier rates, allotments, KPIs, site customization, database, monitoring, page blocks, duplicate customers, data quality, bookings-calendar, hotel/flight/car/transport detail lists, export center, automation, audit-log) will be **removed from the sidebar** but their **routes stay intact** (accessible via direct URL, deep links from other pages, or Command Palette for admins).

### 2. Route Audit
- Keep every existing route registered in `App.tsx`.
- Remove/redirect any nav entry that points to a route that doesn't exist.
- Verify `NotFound` page renders for unknown paths (already present).

### 3. Command Palette (Cmd+K)
- Keep the full advanced module list available in Command Palette for power users and admins (so hidden modules remain discoverable without cluttering the sidebar).
- Gate advanced/deep entries behind admin/owner role.

### 4. Role-Based Hiding
- `viewer` and `agent` roles: sidebar limited to Dashboard, CRM, WhatsApp, Quotes, Bookings, Invoices, Reports (no Settings, no AI Assistant).
- `manager`: adds Daily Operations, Payments.
- `admin`/`owner`: full V1 sidebar including AI Assistant + Settings.

### 5. UI Polish Pass
- **Empty states**: Add consistent empty state (icon + title + subtitle + CTA) to Quotes, Bookings, Invoices, CRM, WhatsApp Inbox if missing.
- **Loading states**: Unify skeleton usage; PageLoader is already consistent.
- **Buttons**: Ensure primary action buttons use `variant="default"` with consistent labels (e.g., "إنشاء", "حفظ", "إلغاء").
- **Spacing**: Verify `container mx-auto p-6 space-y-6` pattern on top-level pages.
- No hardcoded colors — audit with grep for `text-white`, `bg-black`, `#hex` in components touched.

### 6. Demo/Test Content Removal
- Search UI for hardcoded demo strings like "Test", "Demo", "Lorem", "example.com" placeholders in labels/headings (not in seed data or DB).
- Leave `generate-demo-data` edge function intact (admin-triggered only).

### 7. Demo Flow Validation
Manually trace via Playwright headless:
1. Create customer → `/customers` → `/new-customer`
2. Create quote → `/quotes/new` (from customer)
3. Convert quote → booking `/bookings`
4. Generate invoice `/invoices` from booking
5. Record payment
6. Send WhatsApp follow-up `/whatsapp-inbox`
7. Verify Dashboard reflects new data

Capture screenshots at each step. Log broken links / dead CTAs.

### 8. Launch Readiness Report
Deliverable file: `LAUNCH_READINESS.md` at project root with:
- ✅ Completed V1 modules
- 🟡 Hidden-but-functional modules (available via URL/Cmd+K)
- 🔴 Blockers (bugs, missing data, incomplete flows)
- 📋 Recommended hidden modules list with justifications
- 🚦 **Go / No-Go recommendation** for V1 launch

---

## Files to Modify
- `src/components/layout/DashboardSidebar.tsx` — full rewrite of `navGroups` (simplified, role-aware).
- `src/components/common/CommandPalette.tsx` — extend with advanced entries.
- `LAUNCH_READINESS.md` — new file (deliverable).

## Files NOT Modified
- `src/App.tsx` (all routes preserved).
- No page-level code, no hooks, no DB migrations, no edge functions.
- No component logic changes.

## Verification
- `tsgo` typecheck.
- Playwright walkthrough of demo flow with screenshots.
- Manual visual review of sidebar in each role state.

---

## Out of Scope
- New features, new modules, new pages.
- Deleting any code/routes/tables.
- Refactoring business logic.
- Backend changes.
