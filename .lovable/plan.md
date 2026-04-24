## المشكلة

المطارات وشركات الطيران مش ظاهرة في نموذج حجز الطيران لأن قاعدة البيانات العالمية لسه فاضية:
- جدول `airports`: **0 سجل**
- جدول `airlines`: **0 سجل**

البنية التحتية كلها جاهزة (Edge Function + صفحة الإدارة + الـ Comboboxes الذكية)، بس عملية الاستيراد لسه ما اتنفذتش.

## الحل المقترح

### الخيار الأفضل: تشغيل الاستيراد تلقائياً الآن

أستدعي Edge Function `seed-global-travel-data` مباشرة من الـ backend لتعبئة الجداول مرة واحدة بـ:
- ~9,500 مطار من **OurAirports** (كل المطارات اللي ليها كود IATA)
- ~1,200 شركة طيران من **OpenFlights**

العملية تستغرق 30-60 ثانية وتشتغل مرة واحدة فقط، وبعدها كل المطارات والشركات هتظهر في كل النماذج لكل المؤسسات.

### تحسينات إضافية على نموذج الطيران

1. **التحقق من تمرير البيانات**: أتأكد إن `FlightDataSelectionSection` بيجيب `airports` و `airlines` من الـ query بشكل صحيح ويمررها للـ `AirportSelectionField` و `AirlineSelectionField`.

2. **رسالة واضحة للمستخدم**: لو القائمة فاضية، أعرض رسالة "جاري تحميل البيانات العالمية..." بدل قائمة فارغة بدون سياق.

3. **Loading state**: أضيف skeleton أثناء جلب البيانات (لأن 9000+ سجل يستغرق ثوان قليلة في أول تحميل).

## الملفات المتأثرة

- تشغيل Edge Function `seed-global-travel-data` مرة واحدة (مش تعديل كود)
- `src/components/flight-bookings/sections/AirportSelectionField.tsx` — إضافة empty state
- `src/components/flight-bookings/sections/AirlineSelectionField.tsx` — إضافة empty state
- `src/components/flight-bookings/sections/FlightDataSelectionSection.tsx` — التحقق من الـ query

## بعد التنفيذ

هتشوف فوراً في نموذج حجز الطيران:
- 🌍 كل مطارات العالم بكود IATA (CAI, JED, DXB, LHR, ...)
- 🌍 كل شركات الطيران الكبرى (MS, SV, EK, QR, ...)
- 🏢 + إمكانية إضافة مطارات/شركات خاصة بمؤسستك بزرار +
