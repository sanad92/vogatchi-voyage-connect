## الهدف
تجهيز نظام WhatsApp Cloud API multi-tenant عبر **Embedded Signup** بحيث كل منظمة (organization) تربط WABA + phone number الخاص بها من داخل المنصة بضغطة زر، ويتم تخزين credentials معزولة per-org، مع دعم webhook موحّد يوجّه الرسائل للمنظمة الصحيحة — بشكل يرضي متطلبات Meta App Review.

---

## المخرجات الرئيسية

```text
1. DB schema per-org WhatsApp credentials
2. Edge functions: OAuth exchange + register phone
3. Webhook multi-tenant routing (waba_id → org)
4. Frontend: زر "Connect WhatsApp" + Meta Embedded Signup SDK
5. Data Deletion Callback + Privacy endpoints (لـ App Review)
```

---

## 1) قاعدة البيانات

جدول `whatsapp_settings` حاليًا single-row/global. نحوّله per-org:

- إضافة أعمدة (لو غير موجودة):
  - `organization_id uuid not null references organizations(id) on delete cascade`
  - `waba_id text` — WhatsApp Business Account ID من Meta
  - `business_id text` — Meta Business ID
  - `phone_number text` — الرقم المعروض
  - `phone_number_id text` — من Meta
  - `access_token text` — long-lived system-user token per-org (encrypted at rest)
  - `token_expires_at timestamptz`
  - `onboarding_status text` — `pending | connected | failed | disconnected`
  - `connected_at timestamptz`
  - `disconnected_at timestamptz`
- Unique index على `(organization_id)` — منظمة واحدة = ربط واحد.
- Unique index على `waba_id` — لتوجيه الـ webhook.
- RLS: كل عضو منظمة يقرأ صف منظمته فقط (بدون `access_token` — نستبعده من الـ SELECT العام). الكتابة عبر edge functions فقط (service_role).
- GRANTs مطلوبة (authenticated للقراءة المفلترة، service_role للكل).

جدول جديد `whatsapp_connection_events` (audit خفيف): `id, organization_id, event_type, payload jsonb, created_at` لتتبّع الربط/الفصل/أخطاء التوكن.

---

## 2) Edge Functions

### أ) `whatsapp-oauth-exchange` (جديد)
- يستقبل `code` من Embedded Signup + `organization_id` (من JWT claims).
- يبادل الـ code بـ business token عبر:
  ```
  GET https://graph.facebook.com/{META_GRAPH_API_VERSION}/oauth/access_token
      ?client_id=META_APP_ID&client_secret=META_APP_SECRET&code=...
  ```
- يجلب معلومات WABA + phone numbers:
  ```
  GET /debug_token
  GET /{waba_id}/phone_numbers
  ```
- يخزّن الصف في `whatsapp_settings` بحالة `connected`.
- Secrets مطلوبة: `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION` (default `v22.0`), `META_CONFIG_ID` (Embedded Signup configuration ID).

### ب) `whatsapp-register-number` (جديد، اختياري)
- يستدعى فقط لو `code_verification_status !== 'VERIFIED'` أو الرقم `unregistered`.
- ينفّذ `POST /{phone_number_id}/register` مع PIN.
- يتجاهل خطأ "already registered" بأمان.

### ج) `whatsapp-webhook` (تعديل)
- Meta ترسل كل الرسائل لـ **URL واحد**؛ التمييز بين المنظمات يتم عبر `entry[].id` = WABA ID.
- عند POST: بعد التحقق من HMAC، لكل `entry` نبحث في `whatsapp_settings` عن الصف اللي `waba_id = entry.id` ونمرّر `organization_id` لـ `processMessage`.
- GET (verification): يبقى كما هو (env token).
- تحديث `processMessage` و RPC `auto_assign_conversation` لاستقبال `organization_id` وربط conversation بالمنظمة الصحيحة.

### د) `whatsapp-disconnect` (جديد)
- يمسح credentials للمنظمة الحالية ويحدّث `onboarding_status = disconnected`.

### هـ) `send-whatsapp-message` (تعديل)
- بدل قراءة توكن global، يقرأ per-org من `whatsapp_settings` بناءً على `organization_id` للمستخدم.

### و) `whatsapp-data-deletion` (جديد — مطلوب لـ App Review)
- Endpoint عام يستقبل Meta data deletion request، يفكّ الـ signed_request، يحذف بيانات المستخدم/المنظمة المرتبطة، ويرجّع confirmation URL + code.

---

## 3) Frontend

### تعديل `src/pages/WhatsAppAdmin.tsx` + مكوّن جديد `WhatsAppConnectCard.tsx`
- لو `onboarding_status !== connected`: عرض زر **"ربط حساب WhatsApp Business"** يفتح Meta Embedded Signup:
  ```ts
  FB.login(callback, {
    config_id: META_CONFIG_ID,
    response_type: 'code',
    override_default_response_type: true,
    extras: { setup: { ... } }
  });
  ```
- عند نجاح الـ callback: نستدعي `supabase.functions.invoke('whatsapp-oauth-exchange', { body: { code } })`.
- بعد النجاح: عرض معلومات الحساب المربوط (business name, phone, WABA ID) + زر "فصل".
- تحميل Facebook SDK ديناميكيًا في المكوّن (بدون تعديل `index.html`).
- `META_APP_ID` و `META_CONFIG_ID` publishable — تُضاف كـ `VITE_META_APP_ID` / `VITE_META_CONFIG_ID` في `.env` (مقبول، مش secrets).

### تعديل `useWhatsAppSettings.tsx`
- إزالة الحقول اليدوية للـ `access_token` / `phone_number_id` (تأتي من OAuth).
- الحقول اليدوية تبقى فقط للـ business metadata (name, description, website, email).

---

## 4) صفحات قانونية (لـ App Review)

- `src/pages/PrivacyPolicy.tsx` (route `/privacy`) — نص عربي/إنجليزي يوضّح استخدام بيانات WhatsApp.
- `src/pages/DataDeletion.tsx` (route `/data-deletion`) — تعليمات + رابط للـ deletion endpoint.
- إضافة روابطهما في الفوتر.

---

## 5) Secrets المطلوبة (سأطلبها بعد الموافقة)

- `META_APP_ID` (publishable — لكن نخزّنه secret للاتساق مع edge functions)
- `META_APP_SECRET`
- `META_GRAPH_API_VERSION` (اختياري، default `v22.0`)
- `META_CONFIG_ID` (Embedded Signup configuration ID من Meta dashboard)
- `WHATSAPP_APP_SECRET` (موجود مسبقًا للـ HMAC — تأكّد)

---

## 6) خطوات ما بعد التنفيذ

1. رفع الـ migrations + deploy الـ functions.
2. في Meta Dashboard:
   - إعداد **Embedded Signup configuration** والحصول على `config_id`.
   - إضافة webhook URL (نفس الحالي) و subscribe لـ `messages` + `message_template_status_update`.
   - إضافة Privacy Policy URL + Data Deletion Callback URL.
3. طلب permissions في App Review: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`.
4. تسجيل screencast يعرض: تسجيل دخول مستخدم → صفحة الإعدادات → زر Connect → Embedded Signup → استقبال/إرسال رسالة.

---

## تفاصيل تقنية للمرجع

- الـ webhook multi-tenant لا يحتاج مسارات مختلفة per-org؛ Meta لا تدعم dynamic URLs لكل WABA. التمييز عبر `entry[].id` هو النمط الرسمي.
- `access_token` من Embedded Signup هو **long-lived system user token** يدوم ~60 يومًا؛ نضيف cron لاحقًا لتجديده (خارج نطاق هذه الخطة).
- بعد Embedded Signup، Meta تشترك تلقائيًا في الـ webhook للـ WABA الجديد إذا الـ app configured صح.
- الـ HMAC signature في POST يتحقق بـ `WHATSAPP_APP_SECRET` (نفس App Secret) — يعمل global لكل الـ tenants.

---

## Deliverables عند الموافقة
1. Migration واحدة لتعديل `whatsapp_settings` + إنشاء `whatsapp_connection_events`.
2. 5 edge functions جديدة/معدّلة.
3. مكوّن `WhatsAppConnectCard` + تعديل `WhatsAppAdmin` + hook.
4. صفحتان قانونيتان + روابط فوتر.
5. طلب Secrets الجديدة.
6. تعليمات مكتوبة لخطوات Meta Dashboard.