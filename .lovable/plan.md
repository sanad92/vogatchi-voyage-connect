## ربط WhatsApp Cloud يدوياً بالتوكن الدائم

عظيم — التوكن جاهز. هذه الخطة تضيف واجهة ربط يدوي في `/whatsapp-admin` تستقبل التوكن + Phone Number ID + WABA ID، تتحقق منهم مع Meta، وتحفظهم في القاعدة.

**⚠️ مهم:** لا تلصق التوكن في الشات — سنطلبه فقط داخل النموذج الآمن في التطبيق.

### الملفات

**1. Edge Function جديدة — `supabase/functions/whatsapp-manual-connect/index.ts`**
- تستقبل: `access_token`, `phone_number_id`, `waba_id`, `organization_id`
- تتحقق أن المستدعي owner/admin على المنظمة (عبر `organization_members`)
- تختبر التوكن بـ Graph API:
  - `GET /{phone_number_id}?fields=id,display_phone_number,verified_name`
  - `GET /{waba_id}?fields=id,name,currency,timezone_id`
- تشترك في webhooks: `POST /{waba_id}/subscribed_apps`
- Upsert في `whatsapp_settings` بنفس بنية `whatsapp-oauth-exchange` مع:
  - `connection_method = 'manual_token'`
  - `token_expires_at = null` (توكن دائم)
  - `onboarding_status = 'connected'`, `is_active = true`
- تسجّل النتيجة في `whatsapp_connection_events`

**2. Dialog جديد — `src/components/whatsapp/ManualConnectDialog.tsx`**
- حقول: Permanent Access Token (password)، Phone Number ID، WABA ID
- زر "اختبار وربط" يستدعي الـ edge function ويعرض اسم البزنس ورقم الهاتف عند النجاح
- عند النجاح يبطل الـ queries المتعلقة بـ whatsapp-settings ويقفل نفسه

**3. تعديل — `src/components/whatsapp/WhatsAppAdminTabs.tsx`**
- إضافة زر "ربط يدوي (Advanced)" في تبويب الإعدادات بجوار `WhatsAppConnectCard` يفتح الديالوج

### ملاحظات تقنية
- التوكن يُخزَّن في `whatsapp_settings.access_token` (نفس مكان مسار Embedded Signup) ولا يُرجَع للعميل أبداً
- نفس أسرار Meta الحالية (`META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`) — لا أسرار جديدة
- لا تغييرات على قاعدة البيانات ولا على `whatsapp-oauth-exchange` ولا على الـ webhook

### الاختبار
1. `/whatsapp-admin` → الإعدادات → "ربط يدوي"
2. إدخال التوكن + Phone Number ID + WABA ID
3. التحقق من ظهور اسم البزنس ورقم الهاتف
4. إرسال رسالة تجريبية من المحادثات
