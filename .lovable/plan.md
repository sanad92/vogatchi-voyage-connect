# خطة الإصلاح الشامل لنظام إدارة المصروفات

## المشاكل المكتشفة

### 1. مشاكل قاعدة البيانات (الأخطر)
بعد فحص الجداول، اكتشفت أن **3 جداول رئيسية تفتقد عمود `organization_id`**:
- `monthly_salaries` (الرواتب الشهرية)
- `rent_contracts` (عقود الإيجار)
- `rent_payments` (مدفوعات الإيجار)

**النتيجة:** كل المؤسسات ترى بيانات بعضها، أو لا تظهر البيانات بعد فلترة RLS، وتقارير المصروفات/الرواتب/الإيجار غير صحيحة وتختلط بين المؤسسات.

### 2. مشاكل في الـ Hooks (الواجهة)
- `useRentPayments` و `useRentContracts` و `useEmployeeCommissions` و `useSalaries` لا تستخدم `useOrgId` ولا تفلتر بالمؤسسة، ولا تمرر `organization_id` عند الإدخال.
- `useEmployeeCommissions` لا يفلتر العمولات حسب المؤسسة عند الجلب.
- `useExpenseCategories` يحتاج تأكيد الفلترة بالمؤسسة.

### 3. أخطاء حسابية في النظرة العامة والتقارير
- `ExpenseOverview` يحسب فقط المعاملات `approved` بشكل غير متسق ويتجاهل الإيجارات تماماً (TODO معلق في الكود).
- يستخدم `created_at` بدلاً من `transaction_date` للفلترة الزمنية في بعض المواضع.
- التقارير في `useFinancialReportsImproved` تستخدم `created_at` للفواتير بدلاً من `invoice_date`.
- صفحة الإحصائيات تعرض "0 دفعة إيجار" ثابتة بدون قراءة فعلية.

### 4. مشاكل عرض البيانات
- بسبب نقص `organization_id`، RLS قد يحجب كل البيانات أو يعرض بيانات مؤسسات أخرى.
- لا يوجد فلتر بالمؤسسة الحالية عند جلب الرواتب/الإيجار/العمولات.

### 5. مشاكل واجهة وأخطاء حفظ
- نموذج المعاملات يستخدم قيمة `"none"` كقيمة وهمية للفئة وقد يسبب فشل الإدراج.
- فقدان رسائل الخطأ التفصيلية (toast generic فقط بدون عرض تفاصيل الخطأ من Supabase).
- حقل `created_by` في `expense_transactions` يأخذ `user.id` لكن نوعه قد يكون `employee_id` (عدم اتساق).

---

## خطة الإصلاح

### المرحلة 1: إصلاح قاعدة البيانات (Migration)

**أ) إضافة `organization_id` للجداول الناقصة:**
- إضافة العمود إلى `monthly_salaries` و `rent_contracts` و `rent_payments`.
- ملء البيانات الموجودة عبر الربط بـ `employees.organization_id` (للرواتب) ومن المنشئ (للإيجارات).
- جعل العمود `NOT NULL` بعد الملء.
- إضافة فهارس على `organization_id`.

**ب) تحديث سياسات RLS:**
- إضافة سياسات SELECT/INSERT/UPDATE/DELETE معتمدة على `user_belongs_to_org()` لكل من الجداول الثلاثة.
- مراجعة سياسات `expense_transactions` و `expense_categories` و `employee_commissions` للتأكد.

**ج) Trigger تلقائي لملء `organization_id`:**
- Trigger BEFORE INSERT يملأ `organization_id` تلقائياً من المؤسسة النشطة للمستخدم إذا كان فارغاً (احتياط).

### المرحلة 2: إصلاح الـ Hooks

| الملف | الإصلاح |
|---|---|
| `useRentPayments.tsx` | إضافة `useOrgId`، فلترة بـ `organization_id`، تمريره عند insert، تحسين رسائل الأخطاء |
| `useRentContracts.tsx` | نفس الشيء |
| `useEmployeeCommissions.tsx` | فلترة `commissions` و `commission_payments` بالمؤسسة + تمرير `organization_id` |
| `useSalaries.tsx` | فلترة الرواتب بالمؤسسة + التحقق من تمرير `organization_id` |
| `useExpenseCategories.tsx` | تأكيد الفلترة بـ `organization_id` |
| `useExpenseTransactionsOptimized.tsx` | عرض رسالة الخطأ الفعلية من Supabase في الـ toast |

### المرحلة 3: إصلاح الحسابات والتقارير

**`ExpenseOverview.tsx`:**
- استخدام `transaction_date` بدلاً من إعادة بناء التاريخ.
- إضافة حساب فعلي لمدفوعات الإيجار من `useRentPayments`.
- عرض عدد دفعات الإيجار الفعلي بدل الصفر الثابت.
- معالجة القسمة على صفر في حساب النسب (NaN حالياً).
- فلترة المعاملات بـ `status === 'approved'` بشكل واضح أو إظهار خيار للجميع.

**`useFinancialReportsImproved.tsx`:**
- التغيير من `created_at` إلى `invoice_date` للفواتير.
- فلترة بالمؤسسة (orgId) في كل الاستعلامات.
- تطبيق `convertToPrimaryCurrency` فعلياً للإيرادات (حالياً تستخدم `final_amount` مباشرة بدون تحويل).

### المرحلة 4: إصلاح النموذج (Form)

**`ExpenseTransactionForm.tsx`:**
- منع إرسال `category_id = ""` (تحقق قبل submit).
- إضافة validation أوضح.
- إصلاح `created_by` ليكون `user.id` بشكل صحيح وحفظ `created_by_employee_id` منفصلاً عند الحاجة.

**`useExpenseTransactionsOptimized.tsx`:**
- عرض رسائل الخطأ التفصيلية بدل "حدث خطأ" العام.
- التحقق من وجود `orgId` قبل الإدراج.

### المرحلة 5: التحقق والاختبار

- التأكد من عدم كسر بيانات الاختبار.
- مراجعة أي مكون آخر يستهلك هذه الـ hooks (مثل `EnhancedExpenseReports`, `RentManagement`, `SalaryManagementImproved`, `CommissionManagement`).

---

## التفاصيل التقنية

### Migration SQL (مختصر):
```sql
-- إضافة organization_id للجداول الناقصة
ALTER TABLE monthly_salaries ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE rent_contracts ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE rent_payments ADD COLUMN organization_id uuid REFERENCES organizations(id);

-- ملء البيانات الموجودة
UPDATE monthly_salaries ms SET organization_id = e.organization_id 
  FROM employees e WHERE ms.employee_id = e.id;
UPDATE rent_payments rp SET organization_id = rc.organization_id 
  FROM rent_contracts rc WHERE rp.contract_id = rc.id;

-- جعلها NOT NULL + فهارس + RLS policies
```

### النطاق الكامل للملفات المعدلة (~12 ملف):
- 1 migration جديدة
- 6 hooks
- 3 مكونات (ExpenseOverview, ExpenseTransactionForm, ExpenseTransactionsOptimized)
- مراجعة 2-3 مكونات تابعة (Reports, Rent, Salary, Commission)

---

## النتيجة المتوقعة
- كل مؤسسة ترى بياناتها فقط (موظفين، رواتب، إيجار، عمولات، مصروفات).
- الأرقام والإحصائيات في النظرة العامة دقيقة وتشمل الإيجارات.
- التقارير تستخدم تواريخ صحيحة وتحويل عملات سليم.
- رسائل الخطأ توضح السبب الفعلي بدل النص العام.
- لا فشل خفي في الحفظ بسبب `organization_id` ناقص.