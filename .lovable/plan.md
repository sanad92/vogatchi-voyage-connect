
# خطة: قاعدة بيانات مرجعية عالمية للسفر

## 🎯 الهدف
إضافة بيانات **مطارات + شركات طيران** عالمية تظهر تلقائياً في النماذج لكل المؤسسات، بدون أي خطوة استيراد من المستخدم.

## 📊 المصادر المختارة (مجانية ومفتوحة)

| البيانات | المصدر | العدد المتوقع |
|----------|--------|---------------|
| المطارات | OurAirports CSV | ~9,500 مطار له IATA code |
| شركات الطيران | OpenFlights airlines.dat | ~1,200 شركة نشطة |
| الفنادق | ❌ لا يوجد مصدر مجاني شامل | يبقى Quick Add الحالي |

> **ملاحظة الفنادق:** البيانات العالمية للفنادق تجارية (Amadeus/Booking). نقترح الإبقاء على آلية "Quick Add" الحالية، أو لاحقاً نضيف Amadeus API لو حبيت (يحتاج API Key مجاني).

---

## 🏗️ التصميم التقني

### 1. تعديل الجداول
الجداول الحالية (`airports`, `airlines`) فيها `organization_id` (nullable) - ده مثالي:
- **بيانات عالمية** → `organization_id = NULL` + `is_global = true`
- **بيانات المؤسسة الخاصة** → `organization_id = <org_id>` (الـ Quick Add القديم)

نضيف عمود واحد:
```sql
ALTER TABLE airports ADD COLUMN is_global boolean DEFAULT false;
ALTER TABLE airlines ADD COLUMN is_global boolean DEFAULT false;
ALTER TABLE airports ADD COLUMN icao_code text; -- مفيد كمان
ALTER TABLE airports ADD COLUMN latitude numeric;
ALTER TABLE airports ADD COLUMN longitude numeric;
```

### 2. تحديث RLS
السياسة تصبح:
```
SELECT: organization_id IS NULL  OR  organization_id IN (user_orgs)
INSERT/UPDATE/DELETE: organization_id IN (user_orgs)  -- لا يمكن لأي حد يعدل البيانات العالمية
```

### 3. الاستيراد لمرة واحدة (Migration)
- تحميل CSV من OurAirports + OpenFlights
- تنظيف: استبعاد المطارات بدون IATA + شركات الطيران المغلقة
- إدراج كـ `is_global = true, organization_id = NULL`
- استخدام `ON CONFLICT (iata_code) DO NOTHING` لتجنب التكرار

### 4. تحديث الـ Frontend
- الـ Combobox الحالي بيـ `SELECT * FROM airports` → هيرجع البيانات العالمية + الخاصة تلقائياً ✅
- نضيف **Badge "🌍 عالمي"** بجانب اسم المطار العالمي للتمييز
- نضيف **بحث ذكي**: السماح للمستخدم يكتب "CAI" أو "القاهرة" أو "Cairo" ويظهر النتيجة
- نضيف **Pagination/Virtualization** في الـ Combobox (بسبب 9,500 سجل)

---

## 📋 خطوات التنفيذ

### الخطوة 1: Migration للهيكلة
- إضافة `is_global`, `icao_code`, `latitude`, `longitude` للمطارات
- إضافة `is_global`, `country` لشركات الطيران
- تحديث RLS policies للسماح بقراءة البيانات العالمية لكل المستخدمين المسجّلين

### الخطوة 2: Edge Function للاستيراد
- `supabase/functions/seed-global-travel-data/index.ts`
- يقوم بـ:
  1. تحميل `airports.csv` من OurAirports
  2. تحميل `airlines.dat` من OpenFlights
  3. التصفية والتنظيف
  4. الإدراج بـ batches من 500 سجل
  5. حماية: لا يمكن استدعاؤه إلا من Platform Admin
- نشغّله مرة واحدة من زر في صفحة Platform Admin

### الخطوة 3: زر "تشغيل الاستيراد" في Platform Admin
- صفحة جديدة: `/platform-admin/global-data`
- أزرار: "استيراد المطارات", "استيراد شركات الطيران", "تحديث (مزامنة)"
- يعرض عدد السجلات الحالية + آخر مزامنة

### الخطوة 4: تحسين الـ Comboboxes في النماذج
**الملفات المتأثرة:**
- `src/components/flight-bookings/sections/AirportSelectionField.tsx`
- `src/components/flight-bookings/sections/AirlineSelectionField.tsx`
- `src/components/flight-bookings/sections/FlightDataSelectionSection.tsx`

**التغييرات:**
- استبدال `<Select>` بـ Combobox (cmdk) للبحث السريع
- بحث ثنائي اللغة (عربي/إنجليزي) + IATA code
- Badge "🌍" للبيانات العالمية، "🏢" للبيانات الخاصة بالمؤسسة
- زر "➕ إضافة جديد" يبقى للـ org-specific فقط

### الخطوة 5: تطبيق نفس المنطق على نموذج الفنادق (مستقبلاً)
- نفس الفكرة لو قررت تشترك في Amadeus API
- حالياً: نخلي زر "Quick Add" زي ما هو

---

## ⚙️ تفاصيل تقنية للقارئ التقني

### الأداء
- **Index على iata_code** (موجود؟ نتحقق ونضيفه لو لازم)
- **Index على (is_global, is_active)** للفلترة السريعة
- **Full-text search index** على `name + city` للبحث الذكي
- استخدام `react-window` أو `cmdk` للـ Virtualized Combobox

### حماية البيانات
- RLS: `WITH CHECK (organization_id IS NOT NULL)` - أي insert/update لازم يكون لمؤسسة محددة
- Edge function للاستيراد: تحقق من `is_platform_admin(auth.uid())`

### حجم البيانات
- ~9,500 مطار × ~200 bytes = **~2 MB** (مقبول جداً)
- ~1,200 شركة طيران × ~150 bytes = **~180 KB**
- Total: أقل من 3 MB في الـ database

### تحديث البيانات
- زر يدوي في Platform Admin للمزامنة (مرة كل 6 شهور كافية)
- لا حاجة لـ cron job - البيانات نادراً ما تتغير

---

## 🤔 سؤال قبل التنفيذ

**هل تريد إضافة الفنادق دلوقتي عبر Amadeus API (مجاني للتجربة - 2000 طلب/شهر)، أم نكتفي بالمطارات وشركات الطيران؟**

الفنادق عبر Amadeus هتحتاج:
1. تسجيل في [developers.amadeus.com](https://developers.amadeus.com) (مجاني)
2. الحصول على API Key + Secret
3. إضافتهم كـ secrets في Lovable Cloud

**توصيتي:** نبدأ بالمطارات وشركات الطيران دلوقتي (مجاني 100%، فوري)، والفنادق نضيفها في خطوة منفصلة لو حبيت.
