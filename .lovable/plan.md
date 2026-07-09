## خطة اختبار ربط WhatsApp Business عبر Embedded Signup

القيم اتحطت (`.env` + backend secrets). قبل ما تضغط زر "Connect" على `/whatsapp-admin`، محتاج نتأكد من الإعدادات في Meta App Dashboard علشان الاختبار ينجح من أول مرة.

### 1) تحقق من إعدادات Meta App Dashboard

**Facebook Login for Business → Configurations** (نفس `META_CONFIG_ID = 1833848214262321`):
- Login variation: **WhatsApp Embedded Signup**
- Assets: WhatsApp Business Account + Phone numbers
- Permissions: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`

**App Settings → Basic**:
- App Domains يحتوي: `vogatchi-voyage-connect.lovable.app` و `id-preview--49aa510d-479d-4612-891c-0963e841fe97.lovable.app`
- Privacy Policy URL: `https://vogatchi-voyage-connect.lovable.app/privacy`
- Data Deletion Callback URL: `https://gvozalurfthzxpuasplo.supabase.co/functions/v1/whatsapp-data-deletion`

**Facebook Login for Business → Settings**:
- Valid OAuth Redirect URIs: `https://vogatchi-voyage-connect.lovable.app/` و `https://id-preview--49aa510d-479d-4612-891c-0963e841fe97.lovable.app/`

**WhatsApp → Configuration → Webhook**:
- Callback URL: `https://gvozalurfthzxpuasplo.supabase.co/functions/v1/whatsapp-webhook`
- Verify Token: نفس القيمة الموجودة في `WHATSAPP_VERIFY_TOKEN` عندنا
- Subscribed fields: `messages`, `message_template_status_update`

**App Mode**: لو التطبيق لسه Development، ضيف حسابك كـ Tester (Roles → Testers) — بدون كده الـ Embedded Signup هيرفض.

### 2) سيناريو الاختبار

1. سجل دخول في المعاينة → افتح `/whatsapp-admin` → تبويب Connect.
2. اضغط **ربط حساب WhatsApp Business** → نافذة Meta تفتح.
3. اختر (أو أنشئ) WABA + رقم هاتف → Finish.
4. المفروض تشوف toast "تم ربط حساب WhatsApp بنجاح" + الكارت يعرض: الرقم، Phone Number ID، WABA ID، وBadge أخضر "متصل".

### 3) نقاط المراقبة (لو حصل خطأ)

أنا هراقب أثناء الاختبار:
- **Browser console** — أخطاء SDK / postMessage.
- **Edge Function logs** لـ `whatsapp-oauth-exchange` — استجابة `debug_token` و `oauth/access_token` و `phone_numbers`.
- **جدول `whatsapp_connection_events`** — أي حدث فشل (`oauth_exchange_failed`, `oauth_waba_missing`, `no_phone_number`).

### 4) اختبار رسالة واردة (بعد نجاح الربط)

- أرسل رسالة WhatsApp من رقم شخصي إلى الرقم اللي ربطته.
- تابع Edge Function logs لـ `whatsapp-webhook` — يجب يلاقي `waba_id` ويوجه للمنظمة الصح.
- افتح `/whatsapp` → المحادثة الجديدة تظهر.

### 5) اختبار رسالة صادرة

- من نفس المحادثة، ابعت رد → `send-whatsapp-message` يستخدم `access_token` الخاص بالمنظمة.

---

**قبل ما نبدأ**: أكدلي إن الـ 4 نقاط في القسم (1) مضبوطة، وقلي دخلت `/whatsapp-admin` وضغطت الزر، وأنا هراقب الـ logs مباشرة.
