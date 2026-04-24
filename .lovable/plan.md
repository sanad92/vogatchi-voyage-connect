

# تطوير Vogatchi لنظام ERP سياحي متكامل

أنت بتقارن نظامك بدفترة وعايز تتطور لنظام ERP متخصص في السياحة. الخبر الحلو إن **80% من اللي وصفته موجود فعلاً عندك** — بس محتاج ترتيب وربط أحسن.

## التقييم الحالي للنظام

| الموديول | الحالة الحالية | التقييم |
|---------|---------------|---------|
| CRM (العملاء) | ✅ موجود | كامل |
| حجوزات الفنادق | ✅ موجود | كامل |
| حجوزات الطيران | ✅ موجود | كامل |
| الفواتير | ✅ موجود | كامل |
| الموردين | ⚠️ جزئي | ناقص contracts/markups |
| المصروفات | ✅ موجود | كامل |
| الموظفين والعمولات | ✅ موجود | كامل |
| **محرك المحاسبة (Accounting Engine)** | ❌ مفقود | **الفجوة الأكبر** |
| التقارير الموحدة | ⚠️ جزئي | محتاج dashboard موحد |

## الفجوة الرئيسية: محرك المحاسبة التلقائي

**المشكلة:** عندك فواتير ومصروفات منفصلة، لكن **مفيش قيود محاسبية تلقائية** (Double Entry) تربط كل عملية بشجرة الحسابات.

**يعني إيه؟** لما تعمل حجز فندق دلوقتي:
- بتسجل الحجز ✅
- بتعمل فاتورة ✅  
- لكن **مفيش قيد محاسبي تلقائي** يقول: "إيراد +1000، تكلفة +800، نقدية +500، ذمم مدينة +500"

ده اللي يخلي دفترة قوية: **كل حدث = قيد محاسبي تلقائي**.

## الخطة المقترحة (4 مراحل)

### المرحلة 1: محرك المحاسبة (الأهم)

**جداول جديدة:**
```text
chart_of_accounts        — شجرة الحسابات (أصول/خصوم/إيرادات/مصروفات)
journal_entries          — القيود المحاسبية (header)
journal_entry_lines      — سطور القيد (debit/credit)
account_balances         — أرصدة الحسابات (محسوبة)
```

**Triggers تلقائية:**
- إصدار فاتورة → قيد: مدين ذمم عملاء / دائن إيرادات + ضريبة
- تسجيل دفعة → قيد: مدين نقدية / دائن ذمم عملاء
- إضافة مصروف → قيد: مدين مصروف / دائن نقدية
- حجز جديد → قيد تكلفة: مدين تكلفة المبيعات / دائن ذمم موردين

**RPC Function:** `post_journal_entry(reference_type, reference_id)` يستدعى من triggers.

### المرحلة 2: تطوير إدارة الموردين

```text
supplier_contracts       — عقود الموردين (تواريخ، أنواع)
supplier_rates           — أسعار net/markup حسب الموسم
supplier_allocations     — البلوكات والـ allotments للفنادق
supplier_balances        — أرصدة مستحقة لكل مورد
```

تفعيل ربط كل حجز بمورد محدد + سعر تكلفة + هامش ربح واضح.

### المرحلة 3: Dashboard ERP موحد

صفحة واحدة `/erp-dashboard` تعرض:
- **Real-time P&L** (الإيرادات / التكاليف / الربح اليومي/الشهري)
- **Cash Flow** (التدفقات النقدية)
- **Top Performers** (أفضل موظف، أفضل وجهة، أفضل مورد)
- **Aging Reports** (ذمم العملاء/الموردين حسب تواريخ الاستحقاق)
- **Booking Performance** (معدل التحويل، متوسط قيمة الحجز)

### المرحلة 4: تقارير ERP احترافية

- ميزان المراجعة (Trial Balance)
- قائمة الدخل (Income Statement)
- الميزانية العمومية (Balance Sheet)
- تقرير الأرباح حسب الحجز/الموظف/المورد/الوجهة
- تصدير PDF/Excel بالعربي

## الملفات المتأثرة

```text
Migration جديد:
  - chart_of_accounts + seed default accounts
  - journal_entries + journal_entry_lines
  - triggers على invoices/payments/expenses/bookings
  - RPC: post_journal_entry, calculate_account_balance

ملفات جديدة:
  src/pages/ERPDashboard.tsx
  src/pages/ChartOfAccounts.tsx
  src/pages/JournalEntries.tsx
  src/pages/AccountingReports.tsx
  src/components/accounting/TrialBalance.tsx
  src/components/accounting/IncomeStatement.tsx
  src/components/accounting/BalanceSheet.tsx
  src/components/accounting/CashFlowReport.tsx
  src/components/suppliers/SupplierContracts.tsx
  src/components/suppliers/SupplierRates.tsx
  src/hooks/useAccounting.ts
  src/hooks/useChartOfAccounts.ts
  src/hooks/useFinancialReports.ts

ملفات تُعدّل:
  src/App.tsx — routes جديدة
  src/components/layout/DashboardSidebar.tsx — قسم "المحاسبة" جديد
  src/components/crm/financial/FinancialDashboard.tsx — يستهلك المحرك الجديد
```

## السؤال قبل ما نبدأ

المرحلة 1 (محرك المحاسبة) كبيرة وحساسة جداً — لو فيها خطأ هتأثر على كل الأرقام المالية. عشان كده محتاج أعرف:
