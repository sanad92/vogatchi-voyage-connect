# خطة ربط الإدارة المالية الكامل

## السياق
النظام عنده محرك محاسبي قوي (`journal_entries` + Chart of Accounts) وفي **8 triggers** بتولّد قيود تلقائياً من الفواتير والحجوزات والموردين والمصروفات والرواتب. لكن في **فجوات** بتسبّب تقارير غير دقيقة وذمم مفتوحة وهمياً.

---

## الإصلاحات المطلوبة

### 1. إضافة Triggers محاسبية ناقصة (Migration)

**أ. مدفوعات الفواتير (`invoice_payments`)**
- عند إضافة دفعة: قيد `مدين: نقدية / دائن: ذمم العملاء (1100)`
- يقفل الذمم تلقائياً ويحدّث رصيد البنك

**ب. مدفوعات الإيجار (`rent_payments`)**
- عند تحديث `status='paid'`: قيد `مدين: مصروف إيجار (6100) / دائن: نقدية`

**ج. عمولات الموظفين (`commission_payments`)**
- عند الدفع: قيد `مدين: مصروف عمولات (6010) / دائن: نقدية`

**د. تحديث رصيد البنك تلقائياً**
- عند `invoice_payment` → خصم من حساب البنك المحدد
- عند `supplier_payment` → خصم من حساب البنك
- عند `rent_payment` → خصم من حساب البنك

### 2. توحيد مصدر التقارير المالية

- **حذف الاعتماد على `useFinancialReportsImproved`** (deprecated بالفعل)
- توجيه `useExpenseBreakdown` و`FinancialDashboard` لاستخدام `useFinancialReports.ts` (يقرأ من `journal_entries` عبر `get_income_statement`)
- ضمان أن الأرقام في:
  - لوحة المالية
  - تقارير الأرباح والخسائر
  - تقارير المصروفات
  - الميزانية العمومية
  
  كلها تطلع من **مصدر واحد** = القيود المحاسبية

### 3. عرض الترابط للمستخدم في الواجهة

في صفحة تفاصيل أي حجز/فاتورة، إضافة قسم **"التأثير المحاسبي"** بيعرض:
- رقم القيد المرتبط
- الحسابات المتأثرة
- لينك للقيد في `JournalEntriesPage`

### 4. إصلاح اتساق البيانات الموجودة

- Script لمراجعة العمليات اللي اتعملت قبل تفعيل الـ triggers وتوليد قيود لها
- التحقق من توازن الذمم: مجموع ذمم العملاء = مجموع الفواتير غير المدفوعة

---

## التفاصيل التقنية

**الملفات اللي هتتغير:**
- `supabase/migrations/<new>.sql` — إضافة 4 triggers جديدة + backfill
- `src/hooks/useExpenseBreakdown.tsx` — يستخدم المحرك المحاسبي
- `src/hooks/useFinancialReports.ts` — التأكد من استخدامه في كل مكان
- `src/components/crm/financial/FinancialOverview.tsx` — مصدر بيانات موحد
- `src/components/invoices/InvoiceDetails.tsx` — عرض القيد المرتبط
- `src/components/hotel-bookings/HotelBookingDetails.tsx` — عرض القيد المرتبط

**Triggers الجديدة:**
```sql
-- 1. invoice_payment → journal
CREATE FUNCTION trg_invoice_payment_to_journal() ...
-- مدين 1000 (نقدية) / دائن 1100 (ذمم العملاء)

-- 2. rent_payment → journal  
CREATE FUNCTION trg_rent_payment_to_journal() ...
-- مدين 6100 (إيجار) / دائن 1000 (نقدية)

-- 3. commission_payment → journal
CREATE FUNCTION trg_commission_payment_to_journal() ...
-- مدين 6010 (عمولات) / دائن 1000 (نقدية)

-- 4. auto-update bank balance from payments
CREATE FUNCTION trg_payment_update_bank_balance() ...
```

**Backfill:**
```sql
-- توليد قيود للعمليات القديمة اللي معندهاش journal_entry
INSERT INTO journal_entries ... 
FROM invoice_payments WHERE NOT EXISTS (...)
```

---

## النتيجة المتوقعة

بعد التنفيذ:
- ✅ كل عملية مالية في النظام بتظهر في المحاسبة تلقائياً
- ✅ تقرير واحد موحد للأرباح والخسائر (مفيش تضارب)
- ✅ رصيد البنك بيتحدث لحظياً مع كل دفعة
- ✅ المستخدم يقدر يتتبّع أي عملية → قيدها المحاسبي
- ✅ تقارير CFO وProfit Analytics دقيقة 100%

هل تحب أبدأ التنفيذ؟
