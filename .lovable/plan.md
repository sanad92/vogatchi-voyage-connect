# خطة إصلاح خطأ 401 عند تحميل الوسائط من Meta

## السبب الجذري

في `supabase/functions/retry-whatsapp-media/index.ts` نستدعي Meta في خطوتين:

1. **Lookup** على `graph.facebook.com/{media_id}` → نجح (رجع URL + mime).
2. **Download** على الـURL الراجع (عادةً `lookaside.fbsbx.com/whatsapp_business/...`) → يرجع **401 Authentication Error**.

السبب: نُلحق `appsecret_proof` بـ **كلا** الطلبين. لكن `lookaside.fbsbx.com` (شبكة CDN لتحميل الوسائط):
- يقبل فقط `Authorization: Bearer <token>` بدون `appsecret_proof`.
- إلحاق `appsecret_proof` بالـquery string كثيرًا ما يكسر التوقيع المُضمَّن مسبقًا في الـURL، فيرد بـ 401.

أيضًا نفس المشكلة موجودة في `whatsapp-webhook/index.ts` عند تنزيل الوسائط الواردة، وسنُصلحها بنفس الطريقة لتفادي فشل حفظ وسائط الرسائل الجديدة.

## التعديلات

### 1) `supabase/functions/retry-whatsapp-media/index.ts`
- تعديل `appendProof(url, proof)` بحيث يُلحق `appsecret_proof` **فقط** إذا كان الـhost هو `graph.facebook.com` أو `graph.whatsapp.com`.
- لا يُلحق شيئًا لطلبات `lookaside.fbsbx.com` أو أي CDN آخر.
- تحسين رسالة الخطأ: تضمين حالة الاستجابة + أول 300 حرف من الـbody، وإضافة `www-authenticate` header إن وُجد لتشخيص أسرع.
- الإبقاء على منطق تحديث الصف كما هو (status=failed, error, attempts+1).

### 2) `supabase/functions/whatsapp-webhook/index.ts`
- تطبيق نفس منطق `appendProof` المحصور على `graph.*` فقط، لتفادي 401 على الرسائل الواردة الجديدة.

### 3) الواجهة (اختياري تحسين تجربة المستخدم)
- في `WhatsAppMediaMessage.tsx` عندما تفشل إعادة المحاولة بسبب 401: عرض تلميح واضح "قد تكون بيانات اتصال Meta منتهية — يرجى إعادة ربط الرقم من إعدادات WhatsApp".

## التحقق بعد التطبيق

1. Deploy للـfunctions المعدَّلة.
2. الضغط على "إعادة المحاولة" على الرسالة `8909da47-...`:
   - المتوقع: `success: true` وحفظ الملف في `whatsapp-media` storage.
   - إن استمر 401 → التوكن نفسه غير صالح ويلزم إعادة الربط من `/whatsapp-admin`.
3. مراقبة `edge_function_logs` للتأكد من اختفاء `meta media download 401`.

## الملفات المتأثرة

- `supabase/functions/retry-whatsapp-media/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `src/components/whatsapp/WhatsAppMediaMessage.tsx` (تحسين رسالة الخطأ فقط)
