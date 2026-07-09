
# خطة تحويل واتساب من مجرد Inbox إلى CRM سياحي احترافي

الهدف: نظام يشبه Intercom/Zendesk لكن مخصص لشركات السياحة، مع طبقة AI متخصصة في السفر. سنبدأ بإصلاح جذور المشاكل الحالية (الميديا) ثم ننفذ المرحلة 1 كاملة على عدة سبرنتات.

---

## سبرنت 0 — إصلاح جذري للميديا والصوت (قبل أي شيء)

المشكلة الحقيقية: مسارات الميديا لا تُخزَّن أو تُقرأ بشكل صحيح، ولا يوجد fallback واضح. المستخدم يرى دائماً "الملف غير متاح".

سنقوم بـ:
1. **تدقيق قاعدة البيانات**: قراءة سجلات `whatsapp_messages` الفعلية من نوع media/audio لمعرفة أي حقل مملوء فعلاً (`media_url` vs `media_storage_path` vs `media_provider_id`) وما هو الفاشل.
2. **تدقيق bucket التخزين**: التحقق من وجود `whatsapp-media`، سياساته، وهل الملفات فعلاً مرفوعة أم لا.
3. **إعادة كتابة `downloadAndStoreMedia`** في `whatsapp-webhook`:
   - Retry logic (3 محاولات مع backoff) عند فشل تنزيل الميديا من Meta
   - Logging مفصل لكل خطوة (fetch meta → fetch binary → upload → update row)
   - حفظ `media_download_status` (`pending`/`success`/`failed`) و `media_download_error` في الرسالة
   - تحويل صيغ الصوت غير المدعومة (opus/ogg) عند الحاجة أو تركها كما هي مع MIME صحيح
4. **زر إعادة تحميل الميديا يدوياً**: Edge function `retry-whatsapp-media` تُستدعى من زر "إعادة المحاولة" في `WhatsAppMediaMessage`، تعيد التنزيل باستخدام `media_provider_id`.
5. **رسائل خطأ واضحة للمستخدم** بدل "جاري معالجة..." الأبدية:
   - `pending` → "جاري تحميل الملف..."
   - `failed` → "تعذر تحميل الملف - [زر إعادة المحاولة]"
   - `success` بدون مسار → خطأ برمجي، log للـ console
6. **دعم الميديا الصادرة (Outbound)**: التأكد أن الصور/الصوت/الملفات التي يرفعها الموظف تُحفظ في bucket وتظهر فوراً في المحادثة (optimistic update).

مخرجات: كل رسالة ميديا واردة/صادرة تظهر وتشتغل، أو تعطي خطأ واضحاً مع زر إعادة محاولة.

---

## سبرنت 1 — Inbox احترافي (Intercom-style)

### قاعدة البيانات (migration واحدة)
- إضافة أعمدة على `whatsapp_conversations`:
  - `assigned_to uuid` (موظف)
  - `status` enum: `open`, `pending`, `resolved`, `closed`, `archived`
  - `is_starred boolean`
  - `priority` enum: `low`, `normal`, `high`, `urgent`
  - `last_activity_at`, `first_response_at`, `resolved_at`
- جداول جديدة:
  - `conversation_tags` (id, org_id, name, color)
  - `conversation_tag_assignments` (conversation_id, tag_id)
  - `conversation_internal_notes` (id, conversation_id, author_id, body, mentions[], created_at)
  - `conversation_assignments_history` (audit)
- RLS + GRANT كاملة لكل الجداول، محدودة بالـ `organization_id` وباستخدام `has_role`.
- Realtime على الجداول الجديدة.

### الواجهة (Inbox)
- Sidebar بفلاتر: All / Assigned to me / Unassigned / Starred / Archived / Closed / by Tag / by Assignee
- Header للمحادثة يحتوي:
  - Assign / Reassign (dropdown بالموظفين)
  - Transfer (مع سبب اختياري)
  - Tags multi-select
  - Star / Unstar
  - Status buttons: Resolve / Close / Reopen / Archive
  - Priority selector
- تبويب "Internal Notes" داخل المحادثة (لا تُرسل للعميل، مع @mentions للموظفين)
- Toast + إشعار داخلي عند assignment جديد

---

## سبرنت 2 — Contact 360°

### البيانات
- Hook `useCustomer360(phone)` يجمع بالتوازي من:
  - `customers` (البيانات الأساسية)
  - `bookings` + `flight_bookings` + `hotel_bookings` + `transport_bookings`
  - `payment_transactions` (إجمالي الإنفاق)
  - `customer_satisfaction`, `loyalty_points`
  - `whatsapp_conversations` (سجل التواصل)
- حساب `Customer Score` مبني على: عدد الحجوزات، إجمالي الإنفاق، معدل الرضا، تكرار التواصل.

### الواجهة
- Panel جانبي يمين المحادثة (قابل للطي) يعرض:
  - الاسم، الرقم، الدولة (من `airports`/`countries`)
  - آخر رحلة (تاريخ + وجهة)
  - إجمالي الإنفاق (بعملة المنظمة)
  - آخر فندق / آخر حجز / آخر تأشيرة
  - Customer Score (نجوم أو شارة)
  - Quick actions: إنشاء Lead، إنشاء Quote، فتح ملف العميل الكامل
- إذا كان الرقم غير مربوط بعميل: زر "ربط بعميل موجود" أو "إنشاء عميل جديد" (مع ملء تلقائي من اسم واتساب).

---

## سبرنت 3 — طبقة AI (Lovable AI Gateway)

كلها Edge Functions تستخدم `openai/gpt-5.5` عبر Lovable AI Gateway، بدون مفاتيح خارجية.

### 1. AI Extractor (`ai-extract-lead`)
- عند وصول رسالة عميل، تُحلَّل تلقائياً (خلفياً في webhook أو عند فتح المحادثة).
- Structured output باستخدام `Output.object` لاستخراج:
  - المدينة/الوجهة، تواريخ السفر، عدد المسافرين (كبار/أطفال)، الميزانية، نوع الخدمة (فندق/طيران/باقة)، عدد الليالي.
- يُعرض في panel جانبي "AI Insights" مع زر "تحويل إلى Lead" (يملأ فورم Lead تلقائياً).

### 2. Smart Reply (`ai-smart-reply`)
- يقترح 3 ردود بناءً على آخر ~20 رسالة + بيانات العميل من Contact 360.
- تظهر فوق مربع الكتابة كـ chips قابلة للنقر (تملأ المربع، لا تُرسل تلقائياً).
- Refresh button لتوليد اقتراحات جديدة.

### 3. Summarize Conversation (`ai-summarize-conversation`)
- زر "تلخيص" أعلى المحادثة.
- يُلخّص كل الرسائل في 4-6 نقاط: ماذا يريد العميل، الميزانية، ما تم رفضه، الحالة الحالية، الخطوة التالية المقترحة.
- يُخزَّن في `whatsapp_conversations.ai_summary` مع timestamp، ويُعاد توليده عند الطلب.

### 4. AI Assistant Panel
- Panel قابل للطي يجمع: AI Insights (المستخرج) + Smart Reply + Summary + "Draft Reply" (يولّد رد كامل جاهز للتحرير).

---

## التفاصيل التقنية (للمهتم)

- **AI**: Lovable AI Gateway + `@ai-sdk/openai-compatible` + `openai/gpt-5.5` كـ default، مع fallback لـ `google/gemini-2.5-flash` للتلخيصات الطويلة.
- **Realtime**: Supabase Realtime على `whatsapp_messages`, `whatsapp_conversations`, `conversation_internal_notes`.
- **Types**: `as any` للـ Supabase client حسب معايير المشروع.
- **RTL**: كل الواجهات الجديدة تدعم RTL بشكل كامل.
- **Multi-tenant**: كل الاستعلامات مقيدة بـ `organization_id` عبر `useOrgId`.
- **Pagination**: للـ tags/notes/history عبر `usePagination`.
- **Edge Functions الجديدة**:
  - `retry-whatsapp-media`
  - `ai-extract-lead`
  - `ai-smart-reply`
  - `ai-summarize-conversation`

---

## تسلسل التنفيذ المقترح

```text
سبرنت 0: إصلاح الميديا           ← نبدأ هنا
    │
سبرنت 1: Inbox احترافي (Assign/Notes/Tags/Status)
    │
سبرنت 2: Contact 360°
    │
سبرنت 3: طبقة AI (Extract/Smart Reply/Summary)
    │
    ▼
جاهز للإطلاق → المرحلة 2 (Quote Builder + Follow-up + Broadcast)
```

بعد موافقتك سأبدأ بسبرنت 0 (الميديا) وأنتقل تدريجياً. كل سبرنت مستقل قابل للاستخدام بمفرده.
