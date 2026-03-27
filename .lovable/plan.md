

# نظام حساب الأرباح الاحترافي — Profit Analytics System

## الوضع الحالي

**موجود بالفعل:**
- كل جداول الحجوزات تحتوي `total_profit` (hotel, flight, car_rental, transport)
- جدول `employee_commissions` موجود مع `booking_id`, `commission_rate`, `commission_amount`
- جدول `invoices` مربوط بـ `booking_id` + `booking_type`
- هوك `useProfitLossCalculations` يحسب P&L لكن بشكل إجمالي فقط
- `RevenueChart` يستخدم بيانات ثابتة (hardcoded) وليس من قاعدة البيانات

**غير موجود:**
- لا توجد صفحة Dashboard مخصصة للأرباح
- لا يوجد عرض أرباح لكل حجز / عميل / موظف
- لا يوجد ربط بين `hotel_bookings` وموظف مسؤول (لا يوجد عمود `employee_id`)
- `RevenueChart` لا يعرض بيانات حقيقية

---

## المطلوب تنفيذه

### 1. تعديل قاعدة البيانات (Migration)

```sql
-- إضافة عمود الموظف المسؤول لجداول الحجوزات التي تفتقده
ALTER TABLE hotel_bookings ADD COLUMN employee_id uuid REFERENCES employees(id);
ALTER TABLE flight_bookings ADD COLUMN employee_id uuid REFERENCES employees(id);
ALTER TABLE car_rentals ADD COLUMN employee_id uuid REFERENCES employees(id);
ALTER TABLE transport_bookings ADD COLUMN employee_id uuid REFERENCES employees(id);

-- إضافة عمود مصاريف إضافية لو غير موجود
ALTER TABLE hotel_bookings ADD COLUMN additional_costs numeric DEFAULT 0;
ALTER TABLE flight_bookings ADD COLUMN additional_costs numeric DEFAULT 0;
```

### 2. هوك موحد لحساب الأرباح `useProfitAnalytics.ts`

يجلب بيانات الأرباح من كل أنواع الحجوزات ويوفر:
- **أرباح لكل حجز**: قائمة بكل الحجوزات مع (سعر بيع، تكلفة، ربح، عمولة مورد، عمولة موظف)
- **أرباح لكل عميل**: تجميع الأرباح حسب `customer_id`
- **أرباح لكل موظف**: تجميع حسب `employee_id` مع العمولات
- **تقارير شهرية**: بيانات حقيقية بدل الـ hardcoded
- **أفضل موظف / عميل**: ترتيب حسب إجمالي الربح

### 3. صفحة Profit Analytics Dashboard `/profit-analytics`

صفحة جديدة تحتوي:

**الكروت الرئيسية (4 كروت):**
- إجمالي الإيرادات
- إجمالي التكاليف  
- صافي الربح
- هامش الربح %

**Tabs:**
1. **نظرة عامة**: رسم بياني شهري حقيقي + أفضل موظف + أفضل عميل
2. **أرباح الحجوزات**: جدول لكل حجز مع (النوع، العميل، سعر البيع، التكلفة، الربح، الموظف)
3. **أرباح العملاء**: جدول مجمع لكل عميل (عدد الحجوزات، إجمالي الإيرادات، إجمالي الربح)
4. **أرباح الموظفين**: جدول مجمع لكل موظف (عدد الحجوزات، الإيرادات، الربح، العمولات)

**فلاتر**: تاريخ من/إلى، نوع الحجز، بحث

### 4. تحديث `RevenueChart` ببيانات حقيقية

استبدال البيانات الثابتة بجلب بيانات شهرية حقيقية من قاعدة البيانات.

### 5. تحديث Dashboard الرئيسي

إضافة كارت "صافي الربح" و"هامش الربح" في `EnhancedStatsCards`.

---

## الملفات المطلوبة

```text
ملفات جديدة:
  src/hooks/useProfitAnalytics.ts         — هوك موحد للأرباح
  src/pages/ProfitAnalytics.tsx           — صفحة Dashboard الأرباح
  src/components/profits/
    ProfitSummaryCards.tsx                 — الكروت الأربعة
    ProfitOverviewTab.tsx                 — رسم بياني + أفضل موظف/عميل
    BookingProfitsTab.tsx                 — جدول أرباح لكل حجز
    CustomerProfitsTab.tsx                — جدول أرباح لكل عميل
    EmployeeProfitsTab.tsx                — جدول أرباح لكل موظف

ملفات مُعدّلة:
  src/App.tsx                             — إضافة route
  src/components/layout/DashboardSidebar  — إضافة رابط
  src/components/navbar/NavigationItems   — إضافة رابط
  src/components/dashboard/RevenueChart   — بيانات حقيقية
  src/hooks/useOptimizedDashboard         — إضافة صافي الربح
  src/components/dashboard/EnhancedStatsCards — إضافة كارت الربح
```

### 6. التحديث التلقائي

الأرباح محسوبة بالفعل عند إنشاء/تعديل الحجوزات (عبر `calculationHelpers`). سنتأكد أن الـ `queryKey` في `useProfitAnalytics` يتم invalidate عند أي mutation على الحجوزات.

