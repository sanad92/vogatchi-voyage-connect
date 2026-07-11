
# دعم أرقام واتساب متعددة لكل مؤسسة (Multi-Inbox)

الهدف: تفعيل أكثر من رقم WhatsApp Business نشط داخل نفس المؤسسة، مع صندوق وارد ومحادثات وقوالب مستقلة لكل رقم، وتوجيه صحيح للويبهوك.

## 1) تعديلات قاعدة البيانات (migration واحد)

### أ. إزالة قيد الرقم الواحد لكل مؤسسة
- إسقاط أي `UNIQUE(organization_id)` على `whatsapp_settings`.
- جعل `(organization_id, phone_number_id)` مفتاح فريد.
- إضافة أعمدة اختيارية: `label text` (اسم مستعار للرقم مثل "المبيعات")، `is_default boolean default false`.
- Trigger يضمن رقم افتراضي واحد فقط لكل مؤسسة.

### ب. ربط باقي جداول واتساب برقم محدد
إضافة العمود `whatsapp_settings_id uuid references whatsapp_settings(id) on delete cascade` مع فهرس مركب `(organization_id, whatsapp_settings_id)` على الجداول التالية:

- `whatsapp_conversations`
- `whatsapp_messages`
- `whatsapp_broadcasts`
- `whatsapp_broadcast_recipients`
- `whatsapp_templates`
- `whatsapp_followups`
- `whatsapp_automation_rules_v2`
- `whatsapp_chatbot_settings`
- `whatsapp_sla_settings`

### ج. Backfill آمن للبيانات الحالية
لكل مؤسسة عندها صف واحد فقط في `whatsapp_settings` (الحالة الحالية: مؤسسة واحدة، إعداد واحد)، نملأ `whatsapp_settings_id` في الجداول أعلاه بمعرّف هذا الصف. بعد الـ backfill نجعل العمود `NOT NULL`.

### د. RLS
تحديث السياسات لتشمل تحقق `organization_id` كما هو، مع إضافة قراءة/كتابة على الأعمدة الجديدة (بدون تغيير منطق العزل).

## 2) الويبهوك (`whatsapp-webhook`)
- الاستعلام الحالي يستعمل `waba_id` فقط. يتم التغيير إلى:
  `select id, organization_id from whatsapp_settings where phone_number_id = <metadata.phone_number_id>`
  (الرقم المستهدف يأتي داخل حمل Meta لكل رسالة).
- تمرير `whatsapp_settings_id` عند إنشاء/تحديث المحادثة والرسالة.
- توجيه ردود الأتمتة والقوالب لنفس الرقم المستقبل.

## 3) دوال الإرسال
- `send-whatsapp-message`, `retry-whatsapp-media`, `whatsapp-list-templates`: قبول `whatsapp_settings_id` من العميل، وتحميل الإعدادات (token/phone_number_id/waba_id) من هذا الصف بدل `maybeSingle()` على المؤسسة.
- التحقق من أن `whatsapp_settings_id` يخص نفس مؤسسة المستخدم.

## 4) الواجهة

### أ. صفحة إدارة الأرقام (`/whatsapp-admin` — موجودة)
- عرض جدول بكل الأرقام المربوطة: `display_phone_number`, `label`, `waba_id`, `is_active`, `is_default`, `connected_at`, أزرار (تعيين افتراضي، تعديل التسمية، فصل).
- زر "ربط رقم جديد" يفتح `WhatsAppConnectCard` في وضع "إضافة" (لا يستبدل الحالي).
- بعد الربط: يُنشأ صف جديد بدل تحديث الصف الموجود.

### ب. صندوق الوارد
- إضافة محدد (Tabs أو Select) في أعلى شاشة المحادثات لاختيار الرقم النشط.
- تخزين آخر رقم مختار في `localStorage`.
- كل استعلامات `whatsapp_conversations`/`whatsapp_messages`/`whatsapp_broadcasts`/`whatsapp_templates` تُفلتَر بـ `whatsapp_settings_id` المختار، بجانب `organization_id`.
- عند إنشاء محادثة/بث/قالب جديد: يُحفظ `whatsapp_settings_id` الحالي.

### ج. `useWhatsAppSettings`
- تحويلها من "إعداد واحد" إلى قائمة + إعداد نشط. توفير:
  - `settingsList` (كل الأرقام)
  - `activeSettings` (الافتراضي أو المختار)
  - `setActiveSettingsId(id)`
- ملاحظة توافقية: الاستخدامات القديمة التي تتوقع صفًا واحدًا ستحصل على `activeSettings`.

## 5) القيود المقبولة في V1
- الأتمتة والـ chatbot والـ SLA تُخزَّن لكل رقم (نسخة لكل inbox). سيتم توفير زر "نسخ إلى رقم آخر".
- توجيه الرسائل الصادرة من الحملات يستخدم رقم الحملة نفسها فقط.

## تفاصيل تقنية

- Migration يفعل: DROP unique، ADD columns، ADD FK, backfill عبر subquery، NOT NULL، indexes، policies، trigger `ensure_single_default_whatsapp_number`.
- `whatsapp-webhook` يتوقف عن الاعتماد على `waba_id` للتوجيه ويستخدم `metadata.phone_number_id` من Meta.
- تحديث `src/integrations/supabase/types.ts` يتم تلقائيًا بعد الـ migration.
- كل تغييرات الفرونت يتم بعد اعتماد الـ migration للحفاظ على مطابقة الأنواع.

## ملفات ستتأثر (رئيسي)
- `supabase/migrations/<new>.sql`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/retry-whatsapp-media/index.ts`
- `supabase/functions/whatsapp-list-templates/index.ts`
- `supabase/functions/whatsapp-disconnect/index.ts`
- `supabase/functions/whatsapp-manual-connect/index.ts`
- `supabase/functions/whatsapp-oauth-exchange/index.ts`
- `src/hooks/useWhatsAppSettings.tsx`
- `src/pages/WhatsAppAdmin.tsx` (أو ما يعادلها)
- `src/components/whatsapp/WhatsAppConnectCard.tsx`
- شاشات المحادثات/الحملات/القوالب (إضافة فلتر الرقم النشط)

## خطة التنفيذ
1. تشغيل الـ migration وانتظار الموافقة.
2. تحديث دوال الحافة (webhook أولًا لضمان استلام رسائل صحيح).
3. تحديث `useWhatsAppSettings` وصفحة إدارة الأرقام.
4. تحديث شاشات الوارد/البث/القوالب لتحترم الرقم النشط.
5. اختبار: ربط رقم ثانٍ → إرسال رسالة من كل رقم → استلام رسالة على كل رقم → التحقق من الفصل التام.
