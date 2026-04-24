# إضافة سريعة للفنادق والموردين داخل نموذج الحجز

## المشكلة الحالية

1. **الفنادق**: لا توجد فنادق مسجّلة بعد — الكومبوبوكس يعرض رسالة "لا توجد فنادق" فقط، والإضافة الحالية تستخدم اسم الفندق كنص حر بدون ربطه بجدول `hotels`.
2. **المورد**: حقل "مورد الفندق" يستخدم `SupplierSelection` القديم الذي يعرض Select بسيط + حقل "اسم مورد مخصص" نص حر — مش حلو ولا يربط بجدول `suppliers`.

## الحل

### 1) HotelCombobox — زر "+ إضافة فندق جديد" دائم

- إضافة زر **"➕ إضافة فندق جديد"** في أسفل قائمة الكومبوبوكس (يظهر دائماً، حتى مع وجود فنادق) بدلاً من ظهوره فقط لما القائمة فاضية.
- لما القائمة فاضية تماماً، يكون الزر بارز في منتصف الـ Empty state.
- الزر يفتح `QuickAddHotelDialog` جديد.

### 2) `QuickAddHotelDialog` (مكوّن جديد)

Dialog مختصر بالحقول الأساسية فقط:
- **اسم الفندق** (مطلوب) — يأتي مُعبّأ مسبقاً بنص البحث الحالي
- **التصنيف** (1-5 نجوم) — اختياري
- **المدينة/العنوان** — اختياري
- **رقم الهاتف** — اختياري

عند الحفظ:
- `INSERT` في جدول `hotels` مع `organization_id` الحالي و `is_active=true`
- يُحدّث الكاش (`react-query invalidate`) ويختار الفندق الجديد تلقائياً في النموذج
- يقفل الـ Dialog ويرجّع للنموذج الرئيسي

### 3) استبدال SupplierSelection بـ SupplierCombobox جديد

مكوّن `HotelSupplierCombobox` على نفس نمط `HotelCombobox`:
- Popover + Command بحث ذكي بين الموردين (filtered بـ `supplier_type='hotel'`)
- Badge يعرض نوع المورد والعملة الأساسية
- زر **"➕ إضافة مورد جديد"** أسفل القائمة دائماً
- يفتح `QuickAddSupplierDialog` بحقول مختصرة:
  - الاسم * | النوع (افتراضي: hotel) | الهاتف | البريد | شروط الدفع (اختياري)
- يستخدم `useSuppliers().addSupplier` الموجود

### 4) إزالة الحقل النص الحر للمورد

حذف خانة "أو أدخل اسم مورد مخصص" — المورد لازم يكون من القائمة (مع إمكانية الإضافة السريعة بزر +).

## الملفات

| الملف | العملية |
|---|---|
| `src/components/hotel-bookings/QuickAddHotelDialog.tsx` | جديد |
| `src/components/hotel-bookings/QuickAddSupplierDialog.tsx` | جديد |
| `src/components/hotel-bookings/HotelSupplierCombobox.tsx` | جديد |
| `src/components/hotel-bookings/HotelCombobox.tsx` | تعديل: زر "+" دائم + ربط بـ Dialog |
| `src/components/hotel-bookings/sections/SupplierCostSection.tsx` | استبدال `SupplierSelection` بـ `HotelSupplierCombobox` |

## النتيجة

- المستخدم يقدر يضيف فندق أو مورد جديد في **3 ثواني** دون مغادرة نموذج الحجز.
- البيانات تنحفظ مباشرة في جدول `hotels` و `suppliers` ومتاحة لكل الحجوزات القادمة.
- اختفاء النصوص الحرة الفوضوية = بيانات أنظف وتقارير أدق.

هل أنفذ؟
