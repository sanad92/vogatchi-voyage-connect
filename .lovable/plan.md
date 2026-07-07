
# دليل تفعيل WhatsApp Cloud API عبر Embedded Signup

الدليل مقسم لجزئين:
- **الجزء الأول:** خطوات تعملها أنت في حساب Meta (ما ينفعش أنا أعملها).
- **الجزء الثاني:** الخطة اللي هنفذها أنا في السيستم بعد ما تجهز الـ App.

---

## الجزء الأول: إعداد Meta App (خطوة بخطوة)

### 1. إنشاء Business Portfolio
1. ادخل [business.facebook.com](https://business.facebook.com)
2. لو مش عندك Business Portfolio → أنشئ واحد باسم مؤسستك
3. تحقق من الـ Business (Business Verification) — بيطلب سجل تجاري + إثبات عنوان + رقم تليفون. **دي شرط أساسي** عشان تقدر تطلع من Test Mode.

### 2. إنشاء Meta App
1. ادخل [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**
2. اختار **Use case: Other** ← ثم **App type: Business**
3. اكتب اسم App (مثلاً "Vogatchi WhatsApp") واختار الـ Business Portfolio من فوق
4. اضغط Create — هيدخلك على Dashboard الـ App

### 3. إضافة منتج WhatsApp
1. من Dashboard → **Add Product** → اختار **WhatsApp** → Set up
2. اختار الـ Business Portfolio
3. Meta هيدي WABA (WhatsApp Business Account) تجريبي + رقم تجريبي (للتيست بس)
4. من WhatsApp → **API Setup** خد نظرة على الـ Phone Number ID والـ Temporary Token (24 ساعة — للتجربة المبدئية بس)

### 4. إضافة منتج Facebook Login for Business
1. من Dashboard → **Add Product** → **Facebook Login for Business** → Set up
2. من **Facebook Login for Business → Configurations** → **Create configuration**:
   - **Login variation:** `Business login`
   - **Assets:** WhatsApp accounts + Business portfolios
   - **Permissions:**
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `business_management`
3. احفظ — هتاخد **Configuration ID** (شكله رقم طويل مثلاً `1234567890123456`). احتفظ بيه.

### 5. إعداد App Settings الأساسية
1. **App Settings → Basic:**
   - **App Domains:** أضف `lovable.app` والدومين المخصص لو موجود
   - انسخ **App ID** و **App Secret**
   - **Privacy Policy URL:** لازم (ينفع صفحة على موقعك)
   - **Business Use:** اختار المؤسسة
2. **App Settings → Advanced → Security:**
   - فعّل **Require App Secret**
3. أضف Platform → **Website** → Site URL: `https://vogatchi-voyage-connect.lovable.app`

### 6. تسجيل Webhook (يدوي مؤقتاً للتيست)
- من **WhatsApp → Configuration → Webhook**:
  - Callback URL: `https://gvozalurfthzxpuasplo.supabase.co/functions/v1/whatsapp-webhook`
  - Verify Token: أي نص عشوائي (هنحطه في السيستم برضه)
  - Subscribe: `messages`, `message_status`, `message_template_status_update`
- **بعد ما نفعّل الـ Embedded Signup، ده هيتم أوتوماتيك لكل عميل جديد.**

### 7. App Review (ضروري للإنتاج)
- من **App Review → Permissions and Features**:
  - اطلب **Advanced Access** للـ 3 permissions اللي فوق
  - Meta هتطلب:
    - فيديو Screencast يبين الـ Flow كامل من زرار "Connect" لحد إرسال رسالة
    - وصف تفصيلي للاستخدام
    - App Verification (Business Verification لازم تكون خلصت)
  - المراجعة بتاخد **من 3 لـ 14 يوم شغل**
- قبل ما تعدي المراجعة: السيستم يشتغل بس مع **Admins/Developers/Testers** المضافين على الـ App.

---

## الجزء الثاني: خطة التنفيذ في السيستم (بعد ما تجهز الـ App)

### الـ Secrets اللي هحتاجها منك
| Secret | نوعه | مصدره |
|---|---|---|
| `META_APP_ID` | Public | App Settings → Basic |
| `META_APP_SECRET` | 🔒 Secret | App Settings → Basic |
| `META_LOGIN_CONFIG_ID` | Public | Facebook Login for Business → Configurations |
| `META_GRAPH_API_VERSION` | Public (اختياري) | افتراضي `v21.0` |
| `WHATSAPP_APP_SECRET` | 🔒 Secret | نفس `META_APP_SECRET` — للتحقق من HMAC للـ Webhook |

### التغييرات في قاعدة البيانات
- إضافة أعمدة على `whatsapp_settings`:
  - `waba_id` (WhatsApp Business Account ID)
  - `business_id`
  - `phone_numbers` (JSONB — لو المؤسسة عندها أكتر من رقم)
  - `embedded_signup_completed_at`
  - `token_expires_at` (System User tokens دائمة بس بنسجل الوقت للمراقبة)
- تأكد إن `access_token` مخزّن مشفّر (موجود حالياً بس هنراجع الـ RLS).

### الـ Edge Functions الجديدة
1. **`whatsapp-embedded-signup-exchange`**
   - يستقبل `code` من الـ Frontend بعد نجاح Facebook Login
   - يبدّله بـ **System User Access Token دائم** عبر Graph API:
     - `GET /oauth/access_token?client_id=...&client_secret=...&code=...`
   - يجيب الـ WABA ID والـ Phone Numbers:
     - `GET /{waba_id}/phone_numbers`
   - يسجّل الـ Webhook أوتوماتيك على الـ WABA:
     - `POST /{waba_id}/subscribed_apps`
   - يعمل Register للرقم على Cloud API:
     - `POST /{phone_number_id}/register` بـ PIN
   - يحفظ كل ده في `whatsapp_settings` للمؤسسة الحالية
2. **`whatsapp-disconnect`**
   - يمسح الاشتراك ويفضّي البيانات لما المستخدم يقطع الاتصال

### التغييرات في الـ Frontend
1. **`/whatsapp-admin`:**
   - كارت جديد **"Connect with Facebook"** بزرار Meta الرسمي
   - يفتح Popup باستخدام **Facebook JS SDK** مع `FB.login({config_id, response_type: 'code', override_default_response_type: true})`
   - بعد النجاح: يبعت الـ `code` للـ edge function
   - يعرض حالة الاتصال: WABA name, Phone Number, Verified Status
   - زرار **Disconnect** + زرار **Send Test Message**
2. **إخفاء الحقول اليدوية القديمة** (Phone ID / Access Token / Verify Token) خلف Toggle "Advanced Manual Setup" — تفضل موجودة كـ Fallback بس مش الافتراضي.
3. **Session Message Extension Handler:** لو مفيش محادثة نشطة (خارج 24 ساعة) → يبعت Template Message بدلاً من نص.

### حاجات مهمة لازم أعرفك بيها الأول
- **قبل App Review:** التكامل هيشتغل بس معاك أنت (كـ Admin على الـ App). أي مؤسسة تانية على السيستم مش هتقدر تربط.
- **رسوم Meta:** WhatsApp Cloud API بيحسب حسب فئة المحادثة (Marketing / Utility / Authentication / Service). أول 1000 محادثة Service مجاناً شهرياً.
- **Multi-tenant:** كل مؤسسة هيبقى ليها WABA + Token مستقل، مخزنين في `whatsapp_settings` مربوطين بـ `organization_id`.

---

## التسلسل المقترح

1. ✅ **أنت:** خلّص خطوات 1-6 من الجزء الأول (يومين تقريباً + انتظار Business Verification)
2. ✅ **أنت:** تديني الـ 3 secrets (`META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`)
3. 🔨 **أنا:** أنفذ الجزء الثاني كامل (Edge functions + UI + DB migration)
4. 🧪 **نجرب سوا:** ربط حسابك الشخصي كـ Admin — إرسال رسالة تجريبية
5. 📝 **أنت:** تقدم App Review لميتا (بمساعدة Screencast من السيستم الشغال)
6. 🚀 **بعد الموافقة:** أي مؤسسة تقدر تربط حسابها

---

## سؤال قبل ما نبدأ

قوللي في أي مرحلة أنت دلوقتي:
- **(أ)** لسه ما بدأتش خالص → أستنى لحد ما تجهز
- **(ب)** عندي Meta App جاهز والـ Business متحقق → ابعت الـ secrets ونبدأ Phase 2
- **(ج)** عايز أبدأ بالطريقة اليدوية دلوقتي (Phone ID + Access Token) وأضيف Embedded Signup بعدين
