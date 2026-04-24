## المشكلة الحقيقية

تأكدت إن **كل المطارات الكبيرة موجودة فعلاً** في قاعدة البيانات:

| IATA | المطار | المدينة |
|------|--------|---------|
| RUH | King Khalid International | الرياض |
| DXB | Dubai International | دبي |
| JED | King Abdulaziz International | جدة |
| DMM | King Fahd International | الدمام |
| AUH | Zayed International | أبو ظبي |
| DOH | Hamad International | الدوحة |
| CAI | Cairo International | القاهرة |
| KWI, BAH, MCT, SSH, HRG... | ✅ كلهم موجودين |

**السبب الحقيقي للمشكلة**: Supabase بيرجع **1000 صف كحد أقصى افتراضياً**. عندنا 4719 مطار مرتبين أبجدياً بـ `name`، فأول 1000 كلهم مطارات تبدأ بحرف A فقط (Aalborg, Aarhus...) — **والمطارات المهمة زي RUH/DXB/JED مش بتوصل أصلاً للـ frontend!**

## خطة الإصلاح

### 1. رفع حد الجلب من Supabase (الإصلاح الأساسي)

في `FlightDataSelectionSection.tsx`:
- إضافة `.range(0, 19999)` للمطارات لجلب كل الـ 4,719 مطار
- إضافة `.range(0, 9999)` لشركات الطيران (992 شركة)
- إضافة `staleTime: 5 minutes` عشان نتجنب إعادة الجلب المتكررة (تحسين الأداء)

### 2. تحسين البحث متعدد اللغات

دلوقتي البحث بيشتغل بالإنجليزي فقط (Riyadh, Dubai). محتاج أضيف خريطة ترجمة سريعة للمدن الشهيرة عشان البحث بالعربي يشتغل:
- "الرياض" → Riyadh
- "دبي" → Dubai  
- "جدة" → Jeddah
- "القاهرة" → Cairo
- وهكذا للمدن الخليجية والعربية الكبرى

### 3. ترتيب أذكى للمطارات الشائعة

بدل الترتيب الأبجدي العام، نعرض **المطارات الإقليمية أولاً** (الشرق الأوسط ومصر والسعودية) لما المستخدم يفتح القائمة لأول مرة بدون بحث، ثم باقي العالم.

### 4. تطبيق نفس الإصلاح على باقي الأماكن

نتأكد إن أي مكان تاني بيستعلم عن `airports` أو `airlines` (لو موجود) يستخدم نفس الـ range عشان البيانات تتسق.

## الملفات المتأثرة

- `src/components/flight-bookings/sections/FlightDataSelectionSection.tsx` — رفع حد الجلب + cache
- `src/components/flight-bookings/sections/AirportSelectionField.tsx` — إضافة بحث عربي + ترتيب إقليمي
- `src/components/flight-bookings/sections/AirlineSelectionField.tsx` — نفس التحسينات
- البحث في باقي الكود عن أي query آخر للجداول دي وإصلاحه

## بعد التنفيذ

- ✅ كل المطارات الـ 4,719 ستكون متاحة في القائمة
- ✅ البحث بـ "الرياض" أو "Riyadh" أو "RUH" → يظهر King Khalid International
- ✅ البحث بـ "دبي" أو "Dubai" أو "DXB" → يظهر Dubai International
- ✅ المطارات الإقليمية تظهر أولاً عند فتح القائمة
- ✅ تحسين الأداء بفضل الـ caching
