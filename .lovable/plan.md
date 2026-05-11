# تقرير مراجعة العملات (Currency Audit)

تم فحص الكود (الـ Frontend) وقاعدة البيانات (الـ Backend) — في ما يلي الأخطاء الحالية المؤكدة، والأخطاء المتوقعة (Time bombs)، وخطة الإصلاح.

---

## 1) الأخطاء الحالية المؤكدة (Bugs موجودة الآن)

### 🔴 A. استدعاءات `formatCurrency` بدون تمرير العملة (43 استدعاء)
`useCurrencyHelper.formatCurrency(amount, currency)` تتطلب وسيطين، لكن في 43 موضع يُستدعى بوسيط واحد فقط، فيظهر للمستخدم نص مثل `"5,000 undefined"` أو يحدث Crash.

أهم الملفات المتأثرة:
- `components/dashboard/EnhancedStatsCards.tsx` (3 مواضع)
- `components/reports/FinancialReports.tsx` (6 مواضع)
- `components/reports/ProfitLossReport.tsx` (5 مواضع)
- `components/expenses/salary/SalaryCalculation.tsx` (10 مواضع)
- `components/expenses/salary/ImprovedSalaryCalculation.tsx`
- `components/customers/*` (CustomerCard, CustomerSmartAnalytics, CustomerTableView)
- `components/crm/analytics/*` (AnalyticsKPIs, AdvancedMetrics, SegmentAnalysis)
- `components/crm/segmentation/*` (SmartSegmentGrid, ExistingSegments)
- `components/flight-bookings/FlightBookingStats.tsx`

### 🔴 B. لافتات "ج.م" مكتوبة Hardcoded
في `EnhancedStatsCards.tsx` يتم لصق `ج.م` بعد القيمة يدوياً، فحتى لو كانت العملة USD ستظهر "5,000 ج.م" — مضلِّل للمستخدم.

### 🔴 C. عدم تطابق العملات بين الجداول المرتبطة
نتيجة استعلام مباشر على قاعدة البيانات الحالية:
- `bookings.currency`: EGP, EUR, USD
- `invoices.currency`: USD فقط
- `hotel_bookings.currency`: USD فقط
- `journal_entries.currency`: EGP, USD

→ يعني أن فاتورة قد تُصدَر بـ USD لحجز قيمته EUR (أو العكس) دون أي تحقق، وقد تنشأ قيود محاسبية بعملة لا تطابق المصدر.

### 🟡 D. عدم وجود عمود `currency` في عدة جداول مالية
الجداول التالية في DB ليس لها قيمة عملة محفوظة فعلياً (NULL أو فارغ):
- `flight_bookings`
- `expense_transactions`
- `rent_payments`

→ تظهر في التقارير كأنها EGP افتراضياً، وقد تختلط بـ USD.

### 🟡 E. كود تحويل قديم لا يزال موجود
`useMultiCurrency.ts` و `useExchangeRates.convertToPrimaryCurrency` لا تزال تستخدم في:
- `useRentPayments.tsx`, `useRentPaymentsImproved.tsx`, `useRentPaymentOperations.tsx`
- `useAutoCalculations.tsx`
- `components/expenses/ExpenseOverview.tsx`

→ يتعارض مع قرار "كل عملة تظهر بنفسها" ويُحدث تحويل غير مرغوب فيه إلى EGP.

---

## 2) الأخطاء المتوقعة (Time Bombs لتجنبها)

1. **اختلاط مبالغ بعملات مختلفة في تقرير واحد** — أي `SUM(amount)` بدون `GROUP BY currency` سيعطي رقماً بلا معنى (مثل جمع 100 USD + 100 EGP = 200).
2. **حسابات الأرباح بين سعر بيع وسعر تكلفة بعملتين مختلفتين** — مثلاً سعر بيع USD وتكلفة مورد EGP → الربح خاطئ تماماً.
3. **رصيد الحسابات البنكية** — تحويل من حساب USD لعميل EGP بدون تطبيق سعر الصرف يُفسِد الرصيد.
4. **العمولات والرواتب** — إذا كان الحجز USD والعمولة محسوبة كنسبة، يجب أن تُسجَّل بنفس عملة الحجز لا بـ EGP.
5. **PDF الفواتير** — حالياً قد تطبع `ج.م` بشكل ثابت بدلاً من عملة الفاتورة.
6. **الفلاتر في صفحات Bookings/Invoices** — لا يوجد فلتر بالعملة، فالمستخدم لا يستطيع عزل تقاريره.
7. **CHECK constraint على عملة journal مقابل عملة المصدر** — غير موجود، مما يسمح بأخطاء صامتة في القيود.
8. **تحويل تلقائي للعملة في الـ triggers** — لو أحد الـ triggers لا يمرر `currency`، يقع Default على EGP بصمت.

---

## 3) خطة الإصلاح المقترحة (Fix Plan)

### Phase 1 — إصلاحات حرجة (UI لا يعرض undefined)
1. تعديل `useCurrencyHelper.formatCurrency` لتقبل عملة افتراضية اختيارية وتعرض رمز افتراضي بدل undefined، مع تحذير في الكونسول.
2. تمرير `currency` فعلياً في كل الـ 43 استدعاء (من المصدر: `invoice.currency`, `booking.currency`, `payment.currency`, إلخ).
3. حذف لاحقة `ج.م` المكتوبة يدوياً في `EnhancedStatsCards`.

### Phase 2 — استكمال البيانات
4. Migration: إضافة عمود `currency text NOT NULL DEFAULT 'EGP'` للجداول الناقصة (`flight_bookings`, `expense_transactions`, `rent_payments`) + Backfill من الجداول الأم.
5. Migration: Trigger يمنع إنشاء `invoice` بعملة مختلفة عن `booking` المرتبط (أو على الأقل WARNING في log).

### Phase 3 — عزل العملة في التقارير
6. في كل صفحة ملخصات (Dashboard, CFO, CRM Analytics, FlightBookingStats, ProfitLossReport, FinancialReports): إضافة Tabs/Selector للعملة مثل ما سبق عمله في `FinancialOverview`.
7. كل `SUM` في الـ Hooks يجب أن يُجمَّع `GROUP BY currency` ويرجع `Record<Currency, number>`.

### Phase 4 — تنظيف الكود القديم
8. حذف/Deprecate `useMultiCurrency` و `convertToPrimaryCurrency` من المسارات التي لا تحتاج تحويل (الإيجارات والعمليات اليومية).
9. الإبقاء على `convertCurrency` فقط للحالات الصريحة (Invoice multi-currency conversion عند طلب العميل).

### Phase 5 — PDF والـ Exports
10. مراجعة `pdfGenerator.ts` ليستخدم `formatCurrency(amount, doc.currency)` بدل النص الثابت.

### Phase 6 — Validations
11. منع حفظ Booking/Invoice بدون `currency` صريحة في الـ Form (بدل الاعتماد على Default).
12. Linter rule (ESLint custom) أو على الأقل تعليق في `useCurrencyHelper` يمنع المراجعين من تمرير وسيط واحد.

---

## أسئلة للمستخدم قبل التنفيذ

- هل تبدأ بـ **Phase 1 فقط** (إصلاح عرض undefined — أسرع وأوضح للمستخدم)؟
- أم تنفذ **Phases 1–3** دفعة واحدة (إصلاح + تكملة + Tabs)؟
- أم **الكل (1–6)** بما في ذلك الـ Validations والـ PDF؟
