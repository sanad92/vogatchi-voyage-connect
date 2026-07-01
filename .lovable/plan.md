## المشكلة
`useCustomerData` بيقرأ الحجوزات من الجداول القديمة (`hotel_bookings`, `flight_bookings`, `transport_bookings`, `car_rentals`)، لكن الحجوزات الفعلية اتسجلت في جدول `bookings` الموحّد. النتيجة: تاريخ الحجوزات في صفحة تفاصيل العميل بيظهر فاضي.

## الحل
تحويل مصدر بيانات الحجوزات في `useCustomerData` لجدول `bookings` الموحّد، وتقسيم النتيجة حسب `booking_type` بنفس الـ shape اللي بتتوقعه صفحة `CustomerDetails` عشان مفيش تعديل لازم في واجهة الصفحة.

## التغييرات

### 1. `src/hooks/useCustomerData.tsx`
- استبدال الـ 4 استعلامات المنفصلة باستعلام واحد على `bookings` مفلتر بـ `customer_id` و `organization_id` مع join على:
  - `booking_hotel_details`, `booking_flight_details`, `booking_car_details`, `booking_transport_details`
  - `booking_statuses` للحالة
- تطبيع كل حجز لنفس الحقول اللي بتستخدمها `CustomerDetails.tsx` حالياً (مثلاً `hotel_name`, `check_in_date`, `check_out_date`, `total_cost_customer`, `currency`, `status`) عشان مفيش تغيير في الـ UI.
- تقسيم النتيجة لـ `hotel_bookings` / `flight_bookings` / `transport_bookings` / `car_rentals` حسب `booking_type`.

### 2. إحصائيات العميل
حساب `totalBookings` و `lastBookingDate` و `totalSpent` من النتيجة الموحّدة (مع الإبقاء على القيم المخزّنة على `customers` كـ fallback) عشان الكروت العلوية تطابق الـ tabs.

## خارج النطاق
- مفيش تغيير في schema قاعدة البيانات.
- مفيش تغيير في `CustomerDetails.tsx`، communications، notes، follow-ups، loyalty.

## التحقق
فتح عميل عنده حجوزات معروفة (مثلاً عميل Vogatchi بالدولار) والتأكد إن tab "الحجوزات" بيعرضهم بأنواعهم وعملتهم الصحيحة، وإن الكروت العلوية بتعكس نفس العدد.