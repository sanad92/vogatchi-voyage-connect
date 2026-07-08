
## سبب الخطأ الحالي (تحقّقتُ منه فعليًا)

فحصتُ `supabase/functions/whatsapp-webhook/index.ts` وقاعدة البيانات. الكود يتعامل مع `GET` بشكل صحيح ويرجّع `challenge` كنص عادي، لكن هناك **مشكلتان حقيقيتان** تمنعان نجاح التحقق:

1. **لا يوجد ولا صف واحد في `whatsapp_settings`** (`SELECT` رجع 0 rows). الكود يبحث عن `webhook_verify_token` من الجدول:
   ```ts
   .from('whatsapp_settings').select('webhook_verify_token').eq('is_active', true).single()
   ```
   النتيجة `settings = null` → المقارنة `token === undefined` تفشل → يرجّع 403.

2. **Supabase Edge Functions تُفعّل JWT verification افتراضيًا.** طلب Meta لا يحمل `Authorization: Bearer ...`، فترفض المنصّة الطلب بـ 401 قبل أن يصل أصلًا للكود. الملف `supabase/config.toml` حاليًا يحتوي على سطر واحد فقط ولا يوجد به `[functions.whatsapp-webhook] verify_jwt = false`.

بالإضافة لذلك، الاعتماد على قراءة الـ verify token من قاعدة البيانات هش (dependency على وجود صف نشط، ومشكلة multi-tenant)؛ الأفضل استخدام **secret** ثابت للـ verification.

---

## الإصلاحات المطلوبة

### 1) تعطيل JWT verification للـ webhook
تحديث `supabase/config.toml`:
```toml
project_id = "gvozalurfthzxpuasplo"

[functions.whatsapp-webhook]
verify_jwt = false
```

### 2) إضافة secret ثابت للتحقق
إضافة `WHATSAPP_VERIFY_TOKEN` (مثال: `vogatchi2026`) كـ secret. نفس القيمة تُدخل حرفيًا في حقل Verify Token في Meta Developer Console.

### 3) تحديث كود الـ webhook
تعديل `supabase/functions/whatsapp-webhook/index.ts` بحيث:

- **يقرأ الـ verify token من env أولًا**، ثم يقع على DB كـ fallback (يدعم multi-tenant لاحقًا):
  ```ts
  const envToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
  let expected = envToken;
  if (!expected) {
    const { data } = await supabase
      .from('whatsapp_settings')
      .select('webhook_verify_token')
      .eq('is_active', true)
      .not('webhook_verify_token','is',null)
      .limit(1)
      .maybeSingle();
    expected = data?.webhook_verify_token;
  }
  ```
- **مقارنة صارمة** ورجوع `challenge` كـ `text/plain` (موجود بالفعل — سيبقى كما هو).
- **logging** واضح عند الفشل يوضّح إن كان السبب mode/token/missing config لتسهيل debugging.
- **الـ POST handler يبقى كما هو** (HMAC signature validation + processMessage) بدون تغيير.

### 4) خطوات التحقق بعد النشر
1. الانتظار حتى تنتشر الـ function (redeploy تلقائي).
2. اختبار يدوي من المتصفح/curl:
   ```
   GET https://gvozalurfthzxpuasplo.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=vogatchi2026&hub.challenge=12345
   ```
   المتوقع: status 200 والجسم = `12345` فقط.
3. إذا نجح → إدخال نفس Callback URL و Verify Token في Meta → يفترض يقبل مباشرة.

---

## إعادة ترتيب باقي المسار (بعد نجاح الـ webhook)

بناءً على ملاحظاتك، مسار العمل الصحيح:

```text
1. إصلاح Webhook Verification  ← نحن هنا
2. اختبار يدوي (curl/browser) للتأكد من 200 + challenge
3. إدخال الـ webhook في Meta ونجاح Save
4. Embedded Signup (Phase 2)
5. App Review
6. Multi-tenant للـ verify token (نقله من env إلى DB per-org)
```

### تحفظات على Phase 2 التي أثرتها (سأطبقها لاحقًا)

- **OAuth code exchange:** بدل الاعتماد على شكل ثابت `/oauth/access_token?...`، سأستخدم Graph API version من env (`META_GRAPH_API_VERSION`، افتراضي `v22.0`) وأتبع أحدث Flow في وثائق Meta وقت التنفيذ.
- **`POST /{phone_number_id}/register`:** سأجعلها اختيارية — نستدعيها فقط إذا رجع `code_verification_status` من WABA أن الرقم غير مسجّل، ونتعامل مع الخطأ "already registered" بأمان (نتجاهله).
- **`WHATSAPP_VERIFY_TOKEN`:** ثابت في env حاليًا؛ عند تفعيل multi-tenant لاحقًا نرجع نقرأ من `whatsapp_settings.webhook_verify_token` per-org عبر مسار مختلف (مثلاً `/whatsapp-webhook/{org_slug}`).

---

## ما ستراه بعد الموافقة

1. تعديل `supabase/config.toml` (سطرين إضافيين).
2. تعديل `supabase/functions/whatsapp-webhook/index.ts` (منطق قراءة الـ verify token فقط).
3. طلب إضافة secret `WHATSAPP_VERIFY_TOKEN` (ستُدخل قيمته يدويًا).
4. تعليمات نصية للاختبار اليدوي عبر المتصفح.

بعد تأكيدك أن الـ webhook نجح في Meta، ننتقل مباشرة لتنفيذ Phase 2 (Embedded Signup + Edge functions + UI) كما هو في الخطة السابقة مع التعديلات أعلاه.
