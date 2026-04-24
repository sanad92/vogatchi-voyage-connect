
# خطة التنظيف: حذف المكررات والقديم

## الفلسفة
تنظيف **آمن على مرحلتين**: المرحلة 1 حذف فوري للملفات الميتة (صفر مخاطر)، المرحلة 2 توحيد الأزواج المستخدمة (نُبقي النسخة الأحدث ونعيد توجيه الاستيرادات).

---

## المرحلة 1: حذف فوري — ملفات بلا استخدام (آمن 100%)

| الملف | السبب |
|-------|-------|
| `src/pages/BookingRequestStatic.tsx` | غير مرتبط بأي route |
| `src/hooks/useCustomerValidation.tsx` | صفر مستوردين (الكل يستخدم `useEnhancedCustomerValidation`) |
| `src/hooks/useCarRentalForm.tsx` | صفر مستوردين (الكل يستخدم `useEnhancedCarRentalForm`) |
| `src/components/suppliers/SuppliersAnalytics.tsx` | Wrapper بسطر واحد — استبدال الاستخدام في `SuppliersTabs.tsx` بـ `SupplierAnalytics` مباشرة |
| `src/components/forms/BookingRequestForm.tsx` | تكرار مع `src/components/booking-request/BookingRequestForm.tsx` (نتأكد قبل الحذف) |

**خطوات إضافية:**
- إزالة سطر import + Route الخاص بـ `BookingRequestStatic` من `App.tsx` (لو موجود)
- استبدال `<SuppliersAnalytics />` في `SuppliersTabs.tsx` بـ `<SupplierPermissionCheck action="view"><SupplierAnalytics /></SupplierPermissionCheck>`

---

## المرحلة 2: توحيد الأزواج Improved/Enhanced (تدريجي)

القاعدة: **النسخة الأحدث (Improved/Enhanced) هي المرجع** — نُعيد توجيه استيرادات النسخة القديمة إليها ثم نحذف القديمة.

### الأزواج المالية (الأهم — مصدر الازدواجية في الأرقام)

| القديم (يُحذف) | الجديد (يبقى) | عدد الاستيرادات |
|----------------|---------------|-----------------|
| `useFinancialReports.ts` | `useFinancialReportsImproved.tsx` | 2 → 1 |
| `useSalaries.tsx` | `useSalariesImproved.tsx` | 1 → 2 |
| `useRentPayments.tsx` | `useRentPaymentsImproved.tsx` | 2 → 2 |
| `useFinancialData.tsx` + `useFinancialSummary.tsx` + `useFinancialCalculations.tsx` | يُدمج تحت `useFinancialReportsImproved` | 5 |
| `useProfitLossCalculations.tsx` | يُحذف لصالح المحرك المحاسبي الجديد (`useFinancialReports`) | 2 |

**تحذير**: `useFinancialReports.ts` (الجديد من المرحلة 1 من المحاسبة) **مختلف عن** `useFinancialReportsImproved.tsx` القديم. الأول يستخدم RPCs المحاسبية، الثاني حساب يدوي.
**القرار**: نُبقي `useFinancialReports.ts` (المحرك الجديد) ونحذف `useFinancialReportsImproved.tsx` بعد ترقية مستهلكيه.

### أزواج الموظفين/المستخدمين

| القديم | الجديد | الاستيرادات |
|--------|--------|--------------|
| `useCurrentEmployee.tsx` | `useCurrentEmployeeEnhanced.tsx` | 4 → 5 |
| `useUserEmployeeMapping.tsx` + `useUnifiedUserEmployee.tsx` + `hooks/user-employee-mapping/*` | يبقى `useUnifiedUserEmployee.tsx` فقط | 6 |

### أزواج البيانات الموحدة

| القديم | الجديد |
|--------|--------|
| `src/hooks/useUnifiedData.tsx` | `src/hooks/unified-data/useUnifiedData.ts` (المجلد) |

### الصفحات/Dashboards

| القرار |
|--------|
| نُبقي `ERPDashboard.tsx` كصفحة `/dashboard` الرئيسية ونحذف `OptimizedIndex.tsx` بعد تحديث route في `App.tsx` |
| `CRMDashboard.tsx` يبقى كصفحة `/crm` متخصصة |
| ندمج `ProfitLossReports.tsx` + `ProfitAnalytics.tsx` تحت `AccountingReportsPage.tsx` (3 → 1) |

### Database functions

| القديم | الجديد |
|--------|--------|
| `is_platform_admin_v2` | `is_platform_admin` (نفس المنطق — migration لحذف v2) |

---

## المرحلة 3: تأكيد عدم الكسر

بعد كل مجموعة حذف:
1. `tsc --noEmit` للتحقق من عدم وجود imports مكسورة
2. مراجعة الـ console logs بعد التحميل
3. اختبار الصفحات المتأثرة (Financial, Employees, Bookings)

---

## التفاصيل التقنية

**ملفات تُحذف (المرحلة 1 — 5 ملفات):**
```
src/pages/BookingRequestStatic.tsx
src/hooks/useCustomerValidation.tsx
src/hooks/useCarRentalForm.tsx
src/components/suppliers/SuppliersAnalytics.tsx
src/components/forms/BookingRequestForm.tsx (بعد التأكد)
```

**ملفات تُعدّل (المرحلة 1):**
```
src/components/suppliers/SuppliersTabs.tsx — استبدال import
src/App.tsx — إزالة route لو موجود
```

**ملفات تُحذف (المرحلة 2 — 11 ملف):**
```
src/hooks/useFinancialReportsImproved.tsx
src/hooks/useSalaries.tsx
src/hooks/useRentPayments.tsx
src/hooks/useFinancialData.tsx
src/hooks/useFinancialSummary.tsx
src/hooks/useFinancialCalculations.tsx
src/hooks/useProfitLossCalculations.tsx
src/hooks/useCurrentEmployee.tsx
src/hooks/useUserEmployeeMapping.tsx
src/hooks/useUnifiedUserEmployee.tsx (نقل لمجلد)
src/hooks/useUnifiedData.tsx
src/pages/OptimizedIndex.tsx
src/pages/ProfitLossReports.tsx
src/pages/ProfitAnalytics.tsx
```

**Migration للـ DB:**
```sql
DROP FUNCTION IF EXISTS public.is_platform_admin_v2(uuid);
```

---

## النتيجة المتوقعة

```
قبل: ~200 hook + 67 صفحة
بعد: ~185 hook + 64 صفحة (-19 ملف ميت/مكرر)
الفائدة: مصدر حقيقة واحد للأرقام المالية + كود أنظف + بناء أسرع
```

## السؤال

تختار:
- **(1)** المرحلة 1 فقط الآن (5 ملفات آمنة) ثم نراجع
- **(2)** المرحلتين 1 + 2 معاً (تنظيف شامل في خطوة واحدة)
- **(3)** المرحلة 1 + الماليات فقط من المرحلة 2 (الأهم لتوحيد الأرقام)
