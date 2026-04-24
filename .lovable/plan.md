## الخطة: استيراد قاعدة بيانات الفنادق العالمية من Kaggle (TBO Dataset)

نفس فكرة المطارات/شركات الطيران بالظبط — بيانات مرجعية مشتركة لكل المؤسسات، ظاهرة في نموذج حجز الفنادق مع بحث ذكي.

---

### 1. تجهيز جدول `hotels` للبيانات العالمية (Migration)

تعديلات على الجدول الحالي بدون كسر البيانات الموجودة:

- إضافة `is_global boolean DEFAULT false` (الفنادق العالمية)
- إضافة `city text`, `country text`, `country_code text` (للبحث والتصفية)
- إضافة `latitude numeric`, `longitude numeric` (للإحداثيات)
- إضافة `tbo_hotel_code text` (كود فريد من TBO لمنع التكرار)
- جعل `organization_id` nullable (الفنادق العالمية بدون مؤسسة)
- Partial unique index على `tbo_hotel_code WHERE is_global = true`
- تحديث RLS:
  - الفنادق العالمية (`is_global = true`) → SELECT لكل أعضاء أي مؤسسة، لا UPDATE/DELETE
  - الفنادق الخاصة بالمؤسسة → نفس السلوك الحالي

### 2. آلية الاستيراد من Kaggle

ملف TBO فيه ~1M+ فندق وحجمه كبير (~200MB+). الـ Edge Functions عندها حدود ذاكرة ووقت، فالاستراتيجية:

**الخيار العملي:** استيراد على دفعات عبر Edge Function:
- إنشاء Edge Function جديد: `seed-global-hotels`
- يستقبل `chunk` و `offset` كمعاملات
- يحمّل الـ CSV من mirror مباشر (مش Kaggle API لأنه يحتاج auth)
- يعالج 5000 فندق في كل استدعاء و يـ insert فيها
- الـ frontend في صفحة Platform Admin يستدعيه في حلقة (loop) مع progress bar

**ملاحظة مهمة:** Kaggle نفسها تحتاج API key ولا تسمح بتحميل مباشر. سأستخدم mirror عام (HuggingFace أو GitHub) أو نطلب من المستخدم رفع ملف CSV مرة واحدة. **سأبدأ بالبحث عن mirror مفتوح للـ TBO dataset؛ إن لم يتوفر سأطلب رفع الملف يدوياً مرة واحدة فقط.**

### 3. صفحة إدارة الفنادق العالمية (Platform Admin)

تحديث `PlatformAdminGlobalData.tsx`:
- إضافة قسم ثالث "الفنادق العالمية"
- زر "استيراد الفنادق" مع شريط تقدم (progress bar) لأنه عملية طويلة
- إحصائيات: إجمالي الفنادق / عدد العالمية / عدد المؤسسات

### 4. دمج في نموذج حجز الفنادق

تحديث `HotelCombobox.tsx`:
- جلب الفنادق بـ `.range(0, 49999)` لتجاوز حد 1000
- بحث ذكي بالاسم الإنجليزي + المدينة + الدولة
- إضافة aliases عربية (الرياض، دبي، القاهرة → Riyadh, Dubai, Cairo) من ملف `travel-search-aliases.ts` الموجود
- ترتيب: فنادق المؤسسة أولاً → فنادق الدول الإقليمية → باقي العالم
- عرض: `اسم الفندق ⭐⭐⭐⭐ — المدينة، الدولة`
- `staleTime: 5 دقائق` للأداء

### 5. التحديات والحلول

| التحدي | الحل |
|---|---|
| حجم البيانات الكبير | استيراد على دفعات + index على `country_code` و `city` |
| أداء البحث في مليون صف | Postgres trigram index على `name` + `city` |
| استهلاك الـ frontend | تحميل الفنادق المطلوبة فقط حسب الدولة (lazy loading) في v2 |

---

### ملاحظة حرجة حول مصدر البيانات

`kagglehub` Python library تحتاج Kaggle API credentials وتعمل في بيئة Python محلية — مش متاحة في Edge Functions. لذلك الخطوات الفعلية ستكون:

1. **محاولة 1:** البحث عن mirror مفتوح للـ TBO dataset على GitHub/HuggingFace
2. **محاولة 2 (احتياطي):** لو مفيش mirror، أطلب منك رفع ملف CSV مرة واحدة فأخزنه في Supabase Storage ثم أستورده على دفعات

**هل تريد المتابعة بهذه الخطة؟** بمجرد الموافقة سأبدأ بفحص الـ mirrors المتاحة وأخبرك بالنتيجة قبل البدء في الاستيراد الفعلي.