## المشكلة

- الرسائل موجودة في قاعدة البيانات (3 محادثات + رسائل واردة/صادرة على رقمك).
- لكن `useWhatsAppMessages` يستخدم embed غير صحيح:
  ```ts
  sender:profiles!sent_by(full_name)
  ```
  لا يوجد Foreign Key من `whatsapp_messages.sent_by` إلى `profiles`، فـ PostgREST يرجّع خطأ علاقة → الاستعلام يفشل → الشاشة تعرض "لا توجد رسائل" وتُعيد المحاولة كل 5 ثوانٍ (اللي شفناه في session replay).

## الإصلاح

### 1. `src/hooks/useWhatsAppMessages.tsx`
- إزالة embed الخاص بـ `sender` (اختياري للعرض فقط).
- إضافة فلترة بـ `organization_id` وضمّه في `queryKey` عبر `useOrgId`.

### 2. `src/hooks/useWhatsApp.tsx`
- إضافة فلترة بـ `organization_id` وضمّه في `queryKey` (دفاعي — الـ RLS يعمل لكن الكاش يتلوّث بين المنظمات).

### 3. (اختياري لاحقاً) إضافة FK
هجرة تضيف `ALTER TABLE whatsapp_messages ADD CONSTRAINT ... FOREIGN KEY (sent_by) REFERENCES profiles(id)` — تمكّننا من إعادة embed الـ sender لعرض اسم الموظف اللي بعت.

## الخطوة التالية بعد الإصلاح

بعد ظهور المحادثات والرسائل بشكل صحيح:

- **A. Realtime**: تفعيل Supabase Realtime على `whatsapp_messages` عشان الرسائل الجديدة تظهر فوراً بدون polling 5s.
- **B. ربط العميل تلقائياً**: عند وصول رسالة جديدة من رقم غير معروف، إنشاء/ربط `customer` تلقائياً بالمحادثة.
- **C. إنشاء قالب WhatsApp**: عشان تقدر تبدأ محادثات جديدة (خارج نافذة 24 ساعة). قالب ترحيبي بسيط (`welcome_ar`) يتم اعتماده من Meta.
- **D. Quick Replies + Auto-Assignment**: تفعيل التوزيع التلقائي للمحادثات على الموظفين.

هبدأ بـ (1) و(2) فقط في التنفيذ الحالي، بعدها تختار البند التالي.
