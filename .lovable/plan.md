## المشكلتان

### 1) الرسائل الواردة لا تُحفظ (السبب الجذري)
سجلات edge function `whatsapp-webhook` تُظهر خطأ عند كل رسالة واردة:

```
message upsert error: 42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification
```

السبب: الـ webhook يستخدم `upsert(..., onConflict: 'organization_id,message_id')`، لكن الفهرس الفريد الذي أنشأناه في آخر migration **جزئي** (`WHERE message_id IS NOT NULL`). Postgres لا يقبل `ON CONFLICT` مع فهرس جزئي إلا بشرط WHERE مطابق، وهو ما لا يدعمه عميل supabase-js. النتيجة: كل رسالة واردة تفشل بالحفظ، بينما الرسائل الصادرة تُدخل من مسار مختلف فتظهر.

**الإصلاح:**
- Migration: حذف الفهرس الجزئي القديم واستبداله بقيد فريد كامل `UNIQUE (organization_id, message_id)` (كل الرسائل من واتساب لها `message_id`، وقيمنا نحن نضعها لأي outbound نُدخله، فالقيد الكامل آمن). سنملأ أي `message_id NULL` بقيمة مصطنعة قبل إضافة القيد لضمان عدم فشل الإنشاء.
- بعد ذلك ستعمل `upsert onConflict` كما هو دون تعديل الكود.

### 2) وجود صفحتين لواجهة واتساب
- `/whatsapp` → `WhatsAppDashboard` القديم (تبويبات معقّدة).
- `/whatsapp-inbox` → الصفحة الجديدة المخصصة للمحادثات.

**الإصلاح:**
- توحيد الواجهة على `/whatsapp-inbox` كواجهة رئيسية.
- تحويل `/whatsapp` إلى **Redirect** إلى `/whatsapp-inbox` (بدون حذف الكود القديم، فقط تعطيل المسار كنقطة دخول) للحفاظ على أي روابط قديمة/بريد/بوكماركس.
- تحديث أي رابط في القائمة الجانبية (`Sidebar/Layout`) بحيث يشير إلى `/whatsapp-inbox` فقط.
- الإدارة تبقى على `/whatsapp-admin` كما هي (صفحة الإعدادات/القوالب — مختلفة الغرض).

## الملفات المتأثرة
- `supabase/migrations/<new>.sql` — استبدال الفهرس الجزئي بقيد فريد كامل على `(organization_id, message_id)`.
- `src/App.tsx` — تحويل مسار `/whatsapp` إلى `<Navigate to="/whatsapp-inbox" replace />`.
- عنصر التنقّل الجانبي (سأحدد الملف بدقة عند التنفيذ) — إخفاء/توحيد رابط "WhatsApp" ليؤدي لصفحة واحدة.

## نتيجة متوقعة
- الرسائل الواردة تُخزَّن فور وصول الـ webhook وتظهر مباشرة في `/whatsapp-inbox` (بفضل Realtime المفعّل مسبقاً).
- واجهة واتساب واحدة فقط ظاهرة للمستخدم.
