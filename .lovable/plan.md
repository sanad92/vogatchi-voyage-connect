# الخطة

## 1) إصلاح إرسال حملات واتساب

**السبب الجذري:** `whatsapp-send-broadcast` يستدعي `send-whatsapp-message` بجسم غير متوافق (`{ phone, message, organization_id, template_id }`) بينما الدالة الأخرى تتطلّب `{ conversationId, messageType, content, ... }` مع Authorization header لمستخدم مسجّل. النتيجة: 401/400 لكل مستلم، فتُسجَّل الحملة كـ failed دون أي رسالة واضحة في الواجهة.

**الحل:** جعل `whatsapp-send-broadcast` يُرسل مباشرة إلى Meta Graph API بدل الاعتماد على `send-whatsapp-message`:
- قراءة `whatsapp_settings` النشطة للمؤسسة (`phone_number_id`, `access_token`, `api_version`, و `app_secret` إن وُجد لحساب `appsecret_proof`).
- لكل مستلم: `POST https://graph.facebook.com/{v}/{phone_number_id}/messages` مع body `text` (أو `template` إذا `broadcast.template_id` موجود مع اسم القالب واللغة).
- تسجيل الرسالة الناجحة في `whatsapp_messages` و ربطها/إنشاء `whatsapp_conversations` للرقم (اختياري لكن مفيد).
- عند الفشل: حفظ نص الخطأ الفعلي القادم من Meta في `whatsapp_broadcast_recipients.error_message` وتحديث `failed_count`.
- إبقاء throttle 250ms.
- تحسين رسالة الخطأ في `useWhatsAppBroadcasts.sendBroadcast` لعرض `error.context` بدل النص العام.

## 2) تفعيل إضافة الموظفين في WhatsApp

**السبب:** `WhatsAppEmployeeManagement.tsx` واجهة ساكنة — الأزرار بدون `onClick` ولا تجلب/تعرض أي بيانات.

**الحل:** استبدال المكوّن بواجهة وظيفية تعتمد على البنية الموجودة:
- استخدام `useOrgMembers` لعرض أعضاء المؤسسة وأدوارهم (`agent` = موظف خدمة عملاء).
- زر «إضافة موظف» يفتح `AddTeamMemberWizard` (الموجود مسبقاً) مع تمرير الدور الافتراضي `agent`.
- جدول يعرض: الاسم، البريد، الهاتف، الدور، حالة الجلسة (من `whatsapp_sessions` عبر join خفيف)، وزر تحديث الدور / إزالة عبر `useOrgMembers.updateRole` و `removeMember`.
- الاحتفاظ بحالة فارغة عندما لا يوجد أعضاء بدور `agent/manager/admin`.

## تفاصيل تقنية

**ملفات ستُعدَّل:**
- `supabase/functions/whatsapp-send-broadcast/index.ts` — إعادة كتابة منطق الإرسال ليتحدث مع Graph API مباشرة، مع دعم `appsecret_proof` (crypto HMAC-SHA256 لـ access_token باستخدام `META_APP_SECRET`).
- `src/hooks/useWhatsAppBroadcasts.tsx` — استخراج رسالة الخطأ من `error.context` في `sendBroadcast.onError`.
- `src/components/whatsapp/WhatsAppEmployeeManagement.tsx` — إعادة بناء المكوّن ليستخدم `useOrgMembers` + `AddTeamMemberWizard`.

**لا حاجة لتغييرات قاعدة بيانات** — الجداول (`whatsapp_settings`, `whatsapp_broadcasts`, `whatsapp_broadcast_recipients`, `organization_members`) موجودة بالفعل.

**سِرّ مطلوب:** `META_APP_SECRET` يُستخدم بالفعل في دوال أخرى؛ نفس القيمة تُقرأ هنا.
