## هدف الاختبار
التأكد أن أي رسالة واردة جديدة من واتساب تُحفظ في `whatsapp_messages` وتظهر فوراً في `/whatsapp-inbox` عبر Realtime، بعد إصلاح قيد التفرد.

## طريقة التحقق (بدون انتظار رسالة حقيقية)

1. **محاكاة Webhook**: إرسال POST إلى edge function `whatsapp-webhook` بنفس صيغة payload الحقيقي من Meta (رأيته سابقاً في السجلات) مع `message_id` جديد لتفادي الازدواج.
2. **قراءة السجلات** فور الإرسال للتأكد من عدم ظهور أي خطأ `42P10` (خطأ ON CONFLICT الذي أصلحناه).
3. **استعلام قاعدة البيانات** للتحقق من إدراج الصف الجديد في `whatsapp_messages` بقيمة `direction=inbound` والمحتوى المُرسل.
4. **التحقق من تفعيل Realtime على الجدول** — تشغيل استعلام على `pg_publication_tables` للتأكد أن `whatsapp_messages` ضمن publication `supabase_realtime`. إن لم يكن، إضافته بـ migration واحد سريع:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
   ```
5. **تقرير مختصر** للمستخدم يوضّح: تم استقبال الرسالة ✅ / تم الحفظ ✅ / Realtime مفعّل ✅، مع رقم الرسالة الاختبارية ووقت وصولها في الواجهة.

## ملاحظات
- لن يتم إرسال رسالة حقيقية إلى أي مستخدم خارجي، فقط payload اختباري مباشر للـ webhook داخل حسابك.
- لن يتم أي تعديل على الكود إلا في حالة اكتشاف أن Realtime غير مفعّل على الجدول (خطوة migration اختيارية).
