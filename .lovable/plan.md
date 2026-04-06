

# تحسين نماذج الحجوزات الموحدة لتطابق النماذج القديمة

## المشكلة

نموذج الحجز الموحد (`NewUnifiedBooking.tsx`) مبسط جداً مقارنة بالنماذج القديمة. الفروقات الرئيسية:

### الفندق — ينقصه:
- تصنيف الفندق (نجوم)، المدينة، عدد البالغين/الأطفال/أعمارهم
- نظام الوجبات (7 خيارات: RO, BB, HB, FB, ALL, UAI, SAL)
- الطلبات الخاصة (من جدول `special_request_types`)
- سياسة الإلغاء، مرجع حجز المورد
- اختيار المورد من قاعدة البيانات (بدل حقل نصي)
- حساب عدد الليالي تلقائي + سعر الليلة × الليالي

### الطيران — ينقصه:
- اختيار المطارات/شركات الطيران/درجة السفر من الجداول الموجودة
- تاريخ ووقت الوصول، وقت المغادرة
- عدد المسافرين، سعر التذكرة للفرد، الضرائب
- رحلة ذهاب وعودة، رقم PNR
- تفضيلات المقعد والوجبات

### تأجير السيارات — ينقصه:
- التأمين (حقل موجود بالجدول لكن مش بالنموذج)

### عام — ينقصه:
- اختيار العميل بالبحث (CustomerSelection component)
- اختيار المورد من قاعدة البيانات (SupplierSelection component)
- معلومات موظف الحجز التلقائية
- Validation بـ react-hook-form أو Zod

---

## الخطة

### 1. Migration — إضافة أعمدة ناقصة لجداول التفاصيل

```sql
-- Hotel: star_rating, city, adults, children, children_ages, meal_plan, 
--        cancellation_policy, booking_reference, supplier_id
ALTER TABLE booking_hotel_details ADD COLUMN star_rating integer;
ALTER TABLE booking_hotel_details ADD COLUMN city text;
ALTER TABLE booking_hotel_details ADD COLUMN adults integer DEFAULT 2;
ALTER TABLE booking_hotel_details ADD COLUMN children integer DEFAULT 0;
ALTER TABLE booking_hotel_details ADD COLUMN children_ages text;
ALTER TABLE booking_hotel_details ADD COLUMN meal_plan text;
ALTER TABLE booking_hotel_details ADD COLUMN cancellation_policy text;
ALTER TABLE booking_hotel_details ADD COLUMN booking_reference text;

-- Flight: arrival_date, departure_time, arrival_time, flight_class, 
--         passengers_count, ticket_price, taxes, is_round_trip, pnr, 
--         seat_preferences, meal_preferences
ALTER TABLE booking_flight_details ADD COLUMN passengers_count integer DEFAULT 1;
ALTER TABLE booking_flight_details ADD COLUMN flight_class text;
ALTER TABLE booking_flight_details ADD COLUMN ticket_price_per_person numeric DEFAULT 0;
ALTER TABLE booking_flight_details ADD COLUMN taxes_and_fees numeric DEFAULT 0;
ALTER TABLE booking_flight_details ADD COLUMN is_round_trip boolean DEFAULT false;
ALTER TABLE booking_flight_details ADD COLUMN seat_preferences text;
ALTER TABLE booking_flight_details ADD COLUMN meal_preferences text;
```

### 2. إعادة بناء Step 2 (البيانات الأساسية)
- استبدال Select العميل البسيط بـ `CustomerSelection` component الموجود (بحث ذكي)
- إضافة `SupplierSelection` component بدل حقل نصي
- إضافة معلومات موظف الحجز التلقائية
- استخدام `CurrencySelector` component الموجود

### 3. إعادة بناء Step 3 (التفاصيل) — نموذج مخصص لكل نوع

بدل الـ generic loop الحالي، إنشاء 4 components متخصصة:

- **`UnifiedHotelFields.tsx`**: اسم الفندق، تصنيف النجوم، المدينة، تواريخ + ليالي تلقائية، نوع الغرفة، بالغين/أطفال، نظام الوجبات (Select بالخيارات السبعة)، سياسة الإلغاء، مرجع المورد، سعر الليلة (تكلفة + بيع)
- **`UnifiedFlightFields.tsx`**: اختيار المطارات من DB، شركة الطيران من DB، درجة السفر من DB، رقم الرحلة، تاريخ ووقت المغادرة/الوصول، عدد المسافرين، سعر التذكرة + ضرائب، ذهاب وعودة، PNR، تذكرة
- **`UnifiedCarFields.tsx`**: نوع السيارة، مواقع استلام/تسليم، تواريخ + سعر يومي، تأمين
- **`UnifiedTransportFields.tsx`**: نوع المركبة، المسار، نقطة التقاط/توصيل، عدد الركاب

### 4. تحسين Step 4 (المراجعة)
- عرض كل الحقول الجديدة بشكل منظم
- حسابات الربح التفصيلية (سعر الليلة × الليالي مثلاً)

### 5. تحسين الـ Validation
- إضافة validation أقوى لكل نوع حجز (الحقول المطلوبة حسب النوع)

---

## الملفات

```text
Migration SQL — إضافة أعمدة للجداول التفصيلية

ملفات جديدة:
  src/components/bookings/unified-fields/UnifiedHotelFields.tsx
  src/components/bookings/unified-fields/UnifiedFlightFields.tsx
  src/components/bookings/unified-fields/UnifiedCarFields.tsx
  src/components/bookings/unified-fields/UnifiedTransportFields.tsx

ملفات تُعدّل:
  src/pages/NewUnifiedBooking.tsx — إعادة بناء الخطوات 2+3+4
  src/hooks/useUnifiedBookings.ts — تحديث NewBookingData type
```

