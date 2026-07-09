## المشكلة
الرسائل الصوتية والميديا لا تعمل لأن:
1. **الاستقبال (webhook):** WhatsApp Cloud لا يُرسل رابطاً مباشراً للميديا؛ يرسل `media_id` فقط. الكود الحالي يقرأ `message.image.link` وهو دائماً `undefined`. النتيجة: رسائل الميديا تُحفظ بدون رابط، وأحياناً بدون محتوى.
2. **التخزين:** لا يوجد Bucket لملفات واتساب.
3. **العرض:** واجهة `WhatsAppInbox` لا ترسم صور/صوت/فيديو/مستندات — تعرض النص فقط أو "[قالب]".
4. **الإرسال:** الـ Composer نصّي فقط، لا يدعم مرفقات.

## الخطة (نظام محترم لدعم كامل الميديا)

### 1) قاعدة البيانات
Migration واحد يضيف أعمدة الميديا الناقصة على `whatsapp_messages`:
- `media_storage_path text` (المسار داخل bucket بعد التنزيل)
- `media_file_name text`
- `media_caption text`
- `media_duration_seconds int` (للصوت/الفيديو)

### 2) Storage Bucket
- إنشاء bucket `whatsapp-media` (private).
- سياسات RLS على `storage.objects` تسمح لأعضاء المنظمة (`organization_members`) بالقراءة/الكتابة لملفات تحت `<organization_id>/...` فقط.

### 3) استقبال الميديا (`whatsapp-webhook`)
عند وصول رسالة نوعها `image | audio | voice | video | document | sticker`:
- استدعاء Graph API: `GET /{media_id}` مع `Authorization: Bearer <access_token>` (من `whatsapp_settings.access_token`) للحصول على `url` مؤقت + `mime_type`.
- تنزيل الملف كـ blob بنفس التوكن.
- رفعه إلى `whatsapp-media/<org_id>/<conversation_id>/<message_id>.<ext>`.
- حفظ `media_storage_path` و`media_mime_type` و`media_file_name` و`content` (caption للصور/الفيديو).
- دعم `location` (حفظ إحداثيات في `content` JSON)، و`interactive` (button/list reply → حفظ نص الاختيار)، و`reaction` (تحديث الرسالة المشار إليها).

### 4) واجهة العرض (`WhatsAppInbox.tsx` + مكوّن جديد `WhatsAppMediaMessage.tsx`)
- Hook مساعد `useSignedMediaUrl(path)` يُنتج Signed URL صلاحيته ساعة.
- رسم حسب `message_type`:
  - `image` → `<img>` قابلة للفتح على شاشة كاملة.
  - `audio` / `voice` → `<audio controls>` مع مؤشر مدة.
  - `video` → `<video controls>` بعرض مصغّر.
  - `document` → بطاقة باسم الملف + أيقونة + زر تنزيل (blob download لتفادي مشاكل CORS).
  - `sticker` → `<img>` بحجم صغير.
  - `location` → رابط خرائط جوجل.
  - `template` / `interactive` → عرض العنوان + الأزرار كنص.
- Caption يظهر أسفل الميديا.

### 5) إرسال الميديا (Composer + `send-whatsapp-message`)
- زرّ 📎 في الـ Composer يفتح اختيار ملف (صورة/فيديو/صوت/مستند) — يعرض معاينة وحقل caption.
- الرفع أولاً إلى `whatsapp-media/<org>/<conv>/outbound-<uuid>.<ext>`.
- استدعاء edge function `send-whatsapp-message` مع `{ conversationId, mediaPath, mimeType, caption, fileName }`.
- الـ edge function:
  1. تنزيل الملف من Storage.
  2. رفعه إلى Meta: `POST /{phone_number_id}/media` (multipart) → استلام `media_id`.
  3. إرسال الرسالة: `POST /{phone_number_id}/messages` بـ `type` المناسب و`id: media_id`.
  4. حفظ الرسالة الصادرة في `whatsapp_messages` مع `media_storage_path` (نفس المسار للعرض الفوري).

### 6) نقاط جودة إضافية
- عرض حالة التسليم (✓/✓✓/✓✓ أزرق) بجانب كل رسالة صادرة اعتماداً على `status`/`delivered_at`/`read_at`.
- Skeleton أثناء تحميل الميديا الكبيرة.
- حد أقصى لحجم الملف (16MB صوت/فيديو، 100MB مستند وفق حدود WhatsApp Cloud).
- Toast خطأ واضح عند فشل تنزيل/رفع.

## الملفات المتأثرة
- Migration جديد (أعمدة + bucket + policies).
- `supabase/functions/whatsapp-webhook/index.ts` — منطق تنزيل الميديا.
- `supabase/functions/send-whatsapp-message/index.ts` — منطق رفع + إرسال الميديا.
- `src/hooks/useWhatsAppMedia.tsx` (جديد) — signed URL + upload helper.
- `src/components/whatsapp/WhatsAppMediaMessage.tsx` (جديد) — عرض حسب النوع.
- `src/components/whatsapp/WhatsAppMessageComposer.tsx` — زرّ المرفقات.
- `src/pages/WhatsAppInbox.tsx` — استبدال بلوك عرض المحتوى بمكوّن الميديا الجديد + مؤشرات حالة التسليم.

## ملاحظة قبل التنفيذ
هذه خطة كاملة (استقبال + عرض + إرسال). لتفادي جولة طويلة جداً، أقترح تقسيمها إلى مرحلتين:

- **المرحلة 1 (فورية):** DB + Bucket + استقبال + عرض الميديا الواردة (بنود 1–4 + مؤشرات التسليم).
- **المرحلة 2:** إرسال الميديا من الـ Composer (بنود 5).

هل تريد تنفيذ المرحلتين معاً أم البدء بالمرحلة 1 فقط؟
