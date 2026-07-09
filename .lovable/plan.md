## إصلاح تنزيل وعرض الرسائل الصوتية في WhatsApp

### السبب الجذري
عند وصول voice note من واتساب، `mime_type` يكون `"audio/ogg; codecs=opus"`. الكود لا يفصل معامل `codecs=...` قبل:
- بحث الامتداد في جدول `MIME_EXT` (فيفشل ويقع للـ fallback)
- استخدامه في اسم الملف داخل Storage (فيحوي `;` و مسافة → upload يفشل)
- تخزينه في `media_mime_type` (فعنصر `<audio>` قد لا يشغّله في بعض المتصفحات)

النتيجة: `media_storage_path = null` → الواجهة تعرض «الملف غير متاح».

### التعديلات

**1) `supabase/functions/whatsapp-webhook/index.ts`**
- إضافة دالة `normalizeMime(m)` ترجع الجزء قبل `;` وبحروف صغيرة (`audio/ogg; codecs=opus` → `audio/ogg`).
- تطبيقها على `mediaMime` القادم من الـ payload قبل الحفظ.
- داخل `downloadAndStoreMedia`: تطبيقها على `meta.mime_type` قبل بحث `MIME_EXT` وقبل تمريرها كـ `contentType` للـ Storage.
- تعقيم الـ extension كخط دفاع ثانٍ: `ext.replace(/[^a-z0-9]/gi, '') || 'bin'`.
- إضافة تسجيل واضح عند فشل التنزيل يوضح: mediaId، الحالة، السبب — لتسهيل التشخيص لاحقاً.
- تحديث `MIME_EXT` ليشمل `audio/webm` و `audio/wav` احتياطاً.

**2) `src/components/whatsapp/WhatsAppMediaMessage.tsx`**
- عند اكتشاف نوع `audio`/`voice` بدون `media_storage_path`، عرض رسالة أوضح: «جاري معالجة الملف الصوتي… حدّث بعد لحظات» بدلاً من «الملف غير متاح».
- توحيد فحص الـ mime عبر `mime.split(';')[0].trim()` قبل مطابقة `image/`, `audio/`, `video/`.
- تعيين `type="audio/ogg"` صراحةً على عنصر `<audio>` عند وصول voice note، لضمان تشغيله في Safari/iOS.

**3) إعادة معالجة الرسائل الفاشلة سابقاً (اختياري لكن مستحسن)**
- زر «إعادة تنزيل» صغير بجانب الرسائل الصوتية التي `media_storage_path IS NULL` يستدعي edge function جديدة `whatsapp-retry-media` تأخذ `message_id` وتعيد تشغيل نفس مسار التنزيل. هذا يستعيد كل الصوتيات التي فُقدت من قبل دون انتظار رسائل جديدة.

### الملفات المتأثرة
- `supabase/functions/whatsapp-webhook/index.ts` (تعديل)
- `src/components/whatsapp/WhatsAppMediaMessage.tsx` (تعديل)
- `supabase/functions/whatsapp-retry-media/index.ts` (جديد، اختياري)

### تحقق بعد التنفيذ
- إرسال voice note جديدة من واتساب ورؤيتها تُشغَّل داخل `/whatsapp-inbox`.
- فحص `edge-function-logs` للتأكد من عدم وجود «media download failed».
- فحص جدول `whatsapp_messages` بأن `media_storage_path` مُعبّأ لرسائل النوع `audio`.

هل أضمّن خطوة **إعادة معالجة الرسائل الصوتية القديمة** (النقطة 3) أم أكتفي بالإصلاح للرسائل الجديدة فقط؟
