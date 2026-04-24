## إعادة تصميم نموذج حجز الفنادق — شامل وذكي

### الشكل الجديد: صفحة واحدة منظمة بـ Accordion

`Apple-style`، RTL، dark-mode-aware، 5 أقسام قابلة للطي/الفتح، اللي مفتوح افتراضياً = الأساسيات.

```text
┌─ شريط علوي: عنوان + موظف الحجز (chip) + زرار "نسخ من حجز سابق" + Cmd+S
├─ [مفتوح] العميل (ChooseExisting / +New) ────────── ✓ مكتمل
├─ [مفتوح] الفندق + التواريخ ─────────────────────── ✓ مكتمل
│   └─ Hotel combobox (من جدول hotels) | المدينة (autocomplete من السابق)
│   └─ Date Range Picker (تاريخ دخول + خروج + عدد ليالي مباشر)
│   └─ نوع الغرفة (Select: Single/Double/Triple/Suite/Family + custom)
│   └─ عدد الغرف | بالغين | أطفال | أعمار الأطفال
│   └─ نظام الوجبات | إطلالة (Optional)
├─ [مفتوح] التكلفة والربح ────────────────────────── ✓ مكتمل
│   └─ مورد (مع زر "جلب السعر" → find_supplier_rate RPC)
│   └─ عملة | تكلفة/ليلة | سعر بيع/ليلة | تكاليف إضافية
│   └─ كرت ملخّص live: إجمالي للعميل / تكلفة المورد / الربح / الهامش %
├─ [مفتوح] الدفع وحالة الحجز ─────────────────────── ✓ جديد
│   └─ حالة الحجز (Select: مؤكد/معلّق/ملغي)
│   └─ طريقة الدفع | المبلغ المدفوع | المتبقي (auto) | تاريخ استحقاق
├─ [مغلق] طلبات خاصة (50+ checkbox + نص حر)
├─ [مغلق] متقدم
│   └─ مرجع المورد | سياسة الإلغاء | ملاحظات داخلية | مصدر الحجز
│   └─ رفع مرفقات (voucher PDF + بطاقة العميل) → Supabase Storage
└─ شريط سفلي ثابت (sticky):
    [إلغاء]  [حفظ كمسوّدة]  [حفظ]  [حفظ + إنشاء فاتورة]  [حفظ + فاوتشر]
```

---

## ✨ الميزات الذكية

### 1. اقتراحات وذكاء
- **Hotel Combobox**: قائمة من جدول `hotels` (HotelsManager موجود) + اقتراحات من الحجوزات السابقة. لو الفندق مش موجود → "+ إضافة فندق جديد" يفتح quick-add dialog.
- **City Autocomplete**: من المدن المستخدمة سابقاً.
- **زر "جلب السعر"**: يستدعي RPC `find_supplier_rate(org_id, supplier_id, 'hotel', check_in_date)` ويملا التكلفة والسعر تلقائياً.
- **زر "نسخ من حجز سابق"** في الأعلى: dialog يعرض آخر 20 حجز للعميل المختار → ضغطة واحدة تنسخ كل البيانات (الفندق، الغرفة، التكلفة) ما عدا التواريخ.
- **Auto-save draft** في `localStorage` كل 5 ثواني، يستعاد تلقائياً عند فتح الصفحة.

### 2. كفاءة الإدخال
- **Keyboard shortcuts**: `Cmd+S` حفظ، `Esc` إلغاء، `Tab` انتقال طبيعي.
- **عدد الليالي يُحسب تلقائياً** ويظهر بجوار date picker مباشرة (مش حقل منفصل).
- **المتبقي = الإجمالي - المدفوع** يحدّث live.
- **ملخّص الربح بكرت ثابت** بألوان (أخضر/أحمر) + هامش الربح %.
- **Validation فورية بـ Zod** على كل التغييرات (مش بس عند submit).

### 3. تصميم نظيف
- استبدال `bg-blue-50` بـ semantic tokens (`bg-card`, `bg-muted`).
- Date picker موحّد (Shadcn Calendar).
- Combobox للفنادق/الموردين بدل Select بسيط.
- شريط سفلي ثابت (`sticky bottom-0`) بأزرار الحفظ.

---

## 🗄️ تغييرات قاعدة البيانات (Migration)

أعمدة جديدة على `hotel_bookings`:

| العمود | النوع | الغرض |
|---|---|---|
| `hotel_id` | uuid (FK → hotels) | ربط بالفندق المسجّل |
| `number_of_rooms` | int default 1 | عدد الغرف |
| `room_view` | text nullable | الإطلالة (بحرية/جبلية/...) |
| `additional_costs_breakdown` | jsonb nullable | تفصيل التكاليف الإضافية |
| `vat_amount` | numeric default 0 | قيمة الضريبة |
| `vat_included` | boolean default false | هل السعر شامل الضريبة |
| `booking_source` | text nullable | مصدر الحجز (Walk-in/WhatsApp/...) |
| `internal_notes` | text nullable | ملاحظات داخلية مش للعميل |
| `attachment_urls` | text[] nullable | روابط المرفقات |
| `commission_amount` | numeric default 0 | عمولة الموظف |

**ملاحظة**: `additional_costs`, `payment_method`, `paid_amount`, `payment_due_date`, `status_id` موجودين بالفعل في DB لكن مش في الفورم — هنضيفهم في UI فقط.

---

## 📁 الملفات اللي هتتعدّل

### جديدة
- `src/components/hotel-bookings/sections/PaymentStatusSection.tsx` — قسم الدفع وحالة الحجز
- `src/components/hotel-bookings/sections/AdvancedSection.tsx` — متقدم (مرفقات، ملاحظات داخلية، مصدر)
- `src/components/hotel-bookings/CopyFromPreviousDialog.tsx` — نسخ من حجز سابق
- `src/components/hotel-bookings/HotelCombobox.tsx` — اختيار فندق ذكي
- `src/components/hotel-bookings/QuickAddHotelDialog.tsx` — إضافة فندق سريع
- `src/components/hotel-bookings/StickyFormActions.tsx` — شريط حفظ سفلي
- `src/hooks/useHotelBookingDraft.ts` — auto-save في localStorage
- `src/hooks/useSupplierRateLookup.ts` — جلب السعر من RPC
- `src/lib/schemas/hotelBookingSchema.ts` — Zod schema موحّد
- migration SQL لإضافة الأعمدة الجديدة

### معدّلة (إعادة كتابة)
- `src/components/hotel-bookings/HotelBookingForm.tsx` — accordion + sticky bar
- `src/components/hotel-bookings/sections/CustomerSection.tsx` — تنظيف، إزالة blue bg
- `src/components/hotel-bookings/sections/HotelInfoSection.tsx` — combobox + DateRangePicker + عدد غرف + إطلالة
- `src/components/hotel-bookings/sections/RoomDetailsSection.tsx` — Select لنوع الغرفة، تنظيف
- `src/components/hotel-bookings/sections/SupplierCostSection.tsx` — زر "جلب السعر" + كرت ربح live + VAT
- `src/components/hotel-bookings/sections/SpecialRequestsSection.tsx` — accordion مغلق افتراضياً
- `src/components/hotel-bookings/sections/FormActionsSection.tsx` — يحوّل لـ sticky bar مع 4 أزرار حفظ
- `src/types/hotelBooking.ts` — إضافة الحقول الجديدة في NewHotelBooking
- `src/hooks/useHotelBookingForm.ts` — Zod resolver، draft، حفظ مع redirect حسب الزر
- `src/hooks/useHotelBookingSubmission.ts` — دعم save+invoice / save+voucher
- `src/pages/NewHotelBooking.tsx` — تحديث layout

---

## 📝 ملاحظة على "حفظ + إنشاء فاتورة"

بعد الحفظ الناجح، نتنقّل تلقائياً لـ `/hotel-bookings/{id}` ونفتح `HotelInvoiceDialog` (موجود بالفعل) جاهز بالبيانات. نفس الفكرة لـ "حفظ + فاوتشر" مع `HotelVoucherDialog`.
