تم ربط الرقم بنجاح ✅ (Vogatchi Trips / +20 11 03442882، WABA: 25036890362652380).

## تحقق سريع

1. من `/whatsapp-admin` → Settings يظهر الرقم كـ Connected.
2. جرّب إرسال رسالة تجريبية عبر Send Message.
3. تأكد أن الرسائل الواردة تصل (Webhook مشترك تلقائياً على WABA).

## خطوات اختيارية أقدر أنفذها لو تحب

- **A. تحديث `useWhatsAppSettings`**: الاستعلام الحالي يرجّع 406 لأنه يستخدم `.single()` بدون `organization_id`. أفلترها بالمنظمة وأستخدم `maybeSingle()`.
- **B. زر Disconnect** للربط اليدوي (يعتمد على `whatsapp-disconnect` الموجود).
- **C. اختبار Webhook**: إرسال رسالة من هاتف خارجي والتأكد من تسجيلها في `whatsapp_messages`.
- **D. إضافة قوالب رسائل (Templates)** من WhatsApp Manager وربطها.

قل لي أي البنود تحب أنفذه.
