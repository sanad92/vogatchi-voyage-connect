## المشكلة

الحجوزات الجديدة بتتسجل في الجدول الموحد `bookings` + جداول التفاصيل (`booking_hotel_details`, `booking_flight_details`, …). لكن صفحات النماذج المخصصة (حجوزات الفنادق، الطيران، النقل، إيجار السيارات) لسه بتقرأ من الجداول القديمة (`hotel_bookings`, `flight_bookings`, `transport_bookings`, `car_rentals`) — والأرقام الفعلية فيها:

| المصدر | عدد السجلات |
|---|---|
| `bookings` (الموحد) | 186 |
| `hotel_bookings` | 5 |
| `flight_bookings` | 0 |
| `transport_bookings` | 0 |
| `car_rentals` | 0 |

عشان كده القائمة في كل نموذج بتطلع فاضية أو ناقصة جداً.

## الحل المقترح

### 1) إنشاء Views موحّدة في قاعدة البيانات
أعمل 4 views بنفس أسماء وأعمدة الجداول القديمة الي الواجهة متوقعاها، بس مصدرها `bookings` + `booking_*_details`:

- `hotel_bookings_unified`
- `flight_bookings_unified`
- `transport_bookings_unified`
- `car_rentals_unified`

كل view يدمج: العميل، الموظف، المورّد، السعر، العملة، الحالة، التواريخ من `bookings`، وتفاصيل الجدول المخصص من `booking_*_details`، مع تطبيق `organization_id` و RLS عبر `security_invoker=on`.

### 2) تعديل الـ Hooks/الصفحات لتقرأ من الـ Views
- `src/pages/HotelBookings.tsx` → يقرأ من `hotel_bookings_unified`.
- `src/hooks/useFlightBookings.tsx` → يقرأ من `flight_bookings_unified` (مع join airlines/airports/flight_classes زي ما هو).
- `src/hooks/useTransportBookings.tsx` → يقرأ من `transport_bookings_unified`.
- `src/hooks/useCarRentals.tsx` → يقرأ من `car_rentals_unified`.

الـ mutations (إضافة/تعديل/حذف) تفضل على الجداول القديمة كما هي مؤقتاً، أو يتم توجيهها للنموذج الموحد لاحقاً — مش جزء من الإصلاح ده عشان نتجنب كسر النماذج.

### 3) ضمان التزامن للسجلات القديمة
بما إن جداول التفاصيل ممكن تكون ناقصة لبعض السجلات المستوردة (مثلاً `booking_transport_details` فيه 0 سجل بينما `bookings` فيه نوع transport؟ نتأكد ونعمل backfill من `bookings.notes`/الأعمدة الموحدة لو الواجهة محتاجة حقول مفقودة).

### 4) التحقق
- فتح كل صفحة نموذج بعد التعديل والتأكد إن الـ 186 حجز ظاهرة موزعة على أنواعها الصحيحة.
- مقارنة العدد مع `SELECT booking_type, count(*) FROM bookings GROUP BY booking_type`.

## نطاق التعديل

**Migration واحدة** لإنشاء 4 views + GRANT SELECT للـ authenticated.
**4 ملفات Frontend** فقط — استبدال اسم الجدول واسماء الأعمدة في الـ SELECT.
**صفر تغيير** في النماذج، الـ mutations، أو منطق المحاسبة/الفواتير.