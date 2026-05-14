# خطة شاملة لإصلاح وتوحيد الـ ERP

بناءً على إجاباتك:
- **الموديولات الأساسية**: CRM، Itinerary Builder، Suppliers، Invoicing & Payments، Reports & Analytics، Staff Management
- **المستخدمين**: موظفي وكالات السفر
- **التصميم**: Dark & Professional (نمط Linear / Vercel)

---

## الخلاصة السريعة

النظام دلوقتي فيه كل الموديولات المطلوبة، بس فيه 3 مشاكل كبيرة:
1. **التصميم مش متناسق** — كل صفحة شكلها مختلف، ألوان hardcoded، مفيش design system موحّد بنمط Linear.
2. **منطق متضارب ومتكرر** — جداول حجوزات متوازية، تقارير قديمة وجديدة جنب بعض، hooks بتحسب نفس الحاجة بطرق مختلفة.
3. **الموديولات مش مترابطة** — العميل ما بيشوفش حجوزاته في مكان واحد، المورد مفيش له صفحة شاملة، البنوك مش متربوطة بالـ Payments تلقائياً.

الخطة على 6 مراحل، كل مرحلة نتيجتها واضحة وملموسة.

---

## Phase 1 — Design System موحّد بنمط Linear/Vercel (Foundation)

**الهدف**: شكل احترافي موحّد عبر كل الـ ERP قبل ما نلمس أي منطق.

- **Theme**: dark أساسي بـ accents بنفسجية/زرقاء، ألوان semantic (`success`, `warning`, `danger`, `info`, `muted`) في `index.css` بالـ HSL.
- **Typography**: Inter للنصوص + JetBrains Mono للأرقام والـ IDs (نمط Linear).
- **مكونات موحّدة جديدة في `components/layout/` و `components/common/`**:
  - `PageHeader` (عنوان + breadcrumb + actions)
  - `PageContainer` (spacing/padding ثابت)
  - `DataTable` (sorting, filters, pagination, empty state، column visibility)
  - `EmptyState`, `LoadingSkeleton`, `ErrorState`
  - `StatCard` موحّد (بدل 5 أشكال مختلفة دلوقتي)
  - `EntityDetailLayout` (header + tabs + side panel) — لصفحات تفاصيل العميل/المورد/الحجز
- **منع** أي `text-green-600` / `bg-blue-500` hardcoded — كله tokens.
- **Sidebar** موحّد (collapsible بنمط Linear) + Command Menu (Cmd+K).

النتيجة: المستخدم يحس فوراً إن الـ ERP "بقى احترافي".

---

## Phase 2 — تنظيف الأخطاء المنطقية الحالية

- إكمال شغل العملات: كل `formatCurrency` تمرّر العملة، حذف الـ "ج.م" hardcoded، حذف نهائي لـ `useMultiCurrency`.
- توحيد طبقة الحسابات المالية في `useFinancialCalculations` واحد (بدل 3 hooks بيحسبوا نفس الحاجة).
- إصلاح Quote → Booking conversion عشان ينقل كل البيانات.
- Trigger في الـ DB: لما الحجز يتعدّل، الفاتورة المربوطة بيه تتحدّث تلقائياً.
- مراجعة كل TanStack queries: استخدام `useOrgId` في الـ queryKey (multi-tenant safety).

---

## Phase 3 — توحيد الموديولات المتوازية

- اعتماد جدول `bookings` الموحّد كمصدر وحيد. صفحات Flight/Hotel/Car/Transport تبقى Filtered Views على نفس الجدول.
- اعتماد `ImprovedFinancialDashboard` كتقرير مالي وحيد، حذف `Reports.tsx` و `ProfitLossReport.tsx` القديمة.
- توحيد العمولات في hook واحد `useCommissions`.
- حذف الـ legacy hooks المعلّمة `@deprecated`.

---

## Phase 4 — Itinerary Builder (موديول مهم ناقص فعلياً)

- صفحة جديدة `/itinerary-builder` — drag & drop لبناء برنامج رحلة (طيران + فندق + مواصلات + أنشطة) خطوة بخطوة.
- ربطه بالـ Suppliers لاستيراد الأسعار تلقائياً.
- تصدير الـ Itinerary كـ PDF احترافي + إرسال WhatsApp/Email للعميل.
- تحويل الـ Itinerary لـ Quote → Booking بضغطة واحدة.

---

## Phase 5 — ربط الموديولات ببعضها (Customer 360 / Supplier 360)

- **Customer Details** كصفحة موحّدة بتبويبات:
  - Overview (KPIs + segment + loyalty)
  - Bookings (كل أنواع الحجوزات في timeline واحد)
  - Invoices & Payments (مع الرصيد المتبقّي)
  - Communication (WhatsApp + Email history)
  - Documents (جوازات سفر، تأشيرات)
  - Activity Log
- **Supplier Details** بتبويبات: Overview، Bookings، Payments الواجبة عليه، Allotments، Rates، Statement of Account.
- **ربط Bank Accounts بالـ Payments**: Trigger يحدّث الرصيد تلقائياً مع كل دفعة (مع مراعاة العملة).
- **توليد Journal Entries تلقائياً** من Invoice/Payment/Expense/Salary عبر Trigger موحّد.
- **Automation Engine**: ربط أحداث Booking confirmed، Payment received، Invoice overdue بـ WhatsApp/Email تلقائياً.

---

## Phase 6 — Staff Management & Permissions & Polish

- **Staff Management**: صفحة موحّدة فيها (الموظف + صلاحياته + رواتبه + عمولاته + حضوره).
- **Permissions UI**: الأزرار/الـ Menu items تختفي حسب صلاحية المستخدم فعلياً (مش بس الـ RLS في الـ DB).
- **Global Search (Cmd+K)**: customers + bookings + invoices + suppliers + pages.
- **Audit Trail UI** موحّد في كل صفحة Details.
- **Onboarding تجريبي**: Empty States ذكية للمؤسسة الجديدة فيها CTAs لإضافة أول عميل/مورد/حجز.
- مراجعة كل Edge Functions (JWT + input validation).
- Lazy loading للصفحات الكبيرة + Error Boundaries في الـ Routes.

---

## القرارات اللي محتاج أكّد عليها قبل ما أبدأ

1. **أبدأ بـ Phase 1 (Design System الجديد بنمط Linear) دلوقتي؟** هي أكتر مرحلة المستخدم هيحس بفرقها فوراً، ومش هتلمس أي بيانات.
2. **في Phase 3 — موافق نوحّد الحجوزات في جدول `bookings` ونحذف التقارير القديمة؟** ده قرار معماري كبير لكنه هيحلّ مشاكل كتير دفعة واحدة.
3. **Phase 4 (Itinerary Builder)** — ده موديول جديد فعلياً، تحب ابنيه بنفس أسلوب TripCreator (drag & drop visual) ولا أبسط (form-based)؟
