## المطلوب
عرض كل المعاملات والتقارير بعملتها الأصلية، مع تقارير منفصلة لكل عملة (مش تحويل للجنيه).

## المشكلة الحالية
- القيود المحاسبية في `journal_entries` بتتسجل بأرقام بدون عمود عملة → كل العملات بتتجمّع كأنها EGP.
- التقارير (Income Statement, Trial Balance, Revenue Breakdown) بترجع رقم واحد بدون تفصيل العملة.
- النتيجة: فاتورة 672$ بتظهر كـ 672 ج.م.

## الحل

### 1. تعديل قاعدة البيانات
**Migration جديدة:**
- إضافة عمود `currency text NOT NULL DEFAULT 'EGP'` على `journal_entries`.
- تحديث كل الـ triggers (الفواتير، الحجوزات بأنواعها، المصروفات، الإيجارات، العمولات، الرواتب، مدفوعات الموردين) عشان تمرّر `currency` من السجل المصدر للقيد.
- تحديث RPCs: `get_income_statement`, `get_trial_balance`, `get_balance_sheet`, `get_cash_flow` لتقبل بارامتر `_currency text` وترجع نتائج مفلترة، أو ترجع صف لكل عملة.
- Backfill: تحديث القيود الموجودة بحيث تأخذ عملة السجل المرجعي (`reference_id`) من جدوله الأصلي.

### 2. Hook جديد للعملات النشطة
`useActiveCurrencies()` → يجيب قائمة العملات اللي عندها حركة فعلية في `journal_entries` للمنظمة.

### 3. تحديث الواجهات
**`FinancialOverview.tsx` و `CFODashboard` و `AccountingReportsPage`:**
- إضافة Tabs أو Selector فوق التقارير لاختيار العملة (EGP / USD / EUR / SAR …).
- كل تبويب يعرض الإيرادات/المصروفات/صافي الربح بالعملة المختارة فقط.
- بطاقة ملخص علوية تعرض إجمالي كل عملة بشكل منفصل (مش مجموع كلي محوّل).

**`useFinancialReportsImproved.tsx`:**
- إزالة منطق `convertToPrimaryCurrency`.
- تجميع `revenueBreakdown` و `expenseBreakdown` بمفتاح مركّب `(booking_type/category, currency)` بدل `currency` واحدة.
- إرجاع `summaryByCurrency: Record<Currency, {revenue, expenses, salaries, rent, profit}>`.

**`FinancialOverview` cards:**
- عرض كروت متعددة (واحد لكل عملة فعّالة) أو تبويبات.

### 4. عرض المبالغ في القوائم
مراجعة الجداول (Invoices, Bookings, Expenses, Rent Payments, Commissions, Salaries) للتأكد إن كل صف يعرض `formatCurrency(amount, row.currency)` ومش بيستخدم EGP افتراضي.

## الملفات المتأثرة
**جديد:**
- `supabase/migrations/<ts>_per_currency_journal_and_reports.sql`
- `src/hooks/useActiveCurrencies.tsx`

**تعديل:**
- `src/hooks/useFinancialReports.ts` (إضافة بارامتر currency للـ RPC hooks)
- `src/hooks/useFinancialReportsImproved.tsx` (إزالة التحويل + تجميع per currency)
- `src/components/crm/financial/FinancialOverview.tsx` (Tabs + كروت لكل عملة)
- `src/pages/CFODashboard.tsx` و `src/pages/AccountingReportsPage.tsx` (Currency selector)
- `src/components/expenses/reports/dashboard/RevenueTab.tsx` و `ExpensesTab.tsx` و `ImprovedFinancialDashboard.tsx`

## ملاحظات
- المبالغ هتبقى `as-is` بعملتها — مفيش جمع بين عملات مختلفة في رقم واحد.
- `monthly_salaries.net_salary_egp` و `rent_payments.amount_egp` هيتم تجاهلهم لصالح `amount + currency` الأصلية.
- لو عملة مفيش ليها حركة، التبويب الخاص بيها مش هيظهر.