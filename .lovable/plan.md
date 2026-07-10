# خطة تفعيل مساعد Vogatchi AI الذكي

## الهدف
مساعد ذكي داخل المنصة (للإدارة: Admin / CFO / Manager فقط) يقدر يعمل:
1. **تحليل مالي وتشغيلي**: يقرأ تقارير المنصة الحالية (P&L، Ledgers، Receivables، Payables، KPIs) ويجاوب بلغة طبيعية.
2. **اقتراحات تحسين**: يرصد فرص لرفع الهامش، تحسين التحصيل، إعادة الاستهداف.
3. **Actions تشغيلية**: ينفذ إجراءات فعلية بعد تأكيد المستخدم (إنشاء عرض سعر، رسالة واتساب، تسجيل دفعة، إنشاء فاتورة، إضافة مصروف).
4. **صياغة محتوى**: ردود عملاء، إيميلات، عروض أسعار، ملخصات.

## شكل التفاعل
- **صفحة كاملة** `/ai-assistant` على شكل ChatGPT بـ Threads محفوظة في قاعدة البيانات.
- **Floating Widget** في كل صفحة (زر ثابت أسفل يمين + اختصار `Cmd+K`) يفتح شات مصغّر يفهم سياق الصفحة الحالية (حجز / عميل / تقرير) ويقدر يفتح المحادثة كاملة في الصفحة الرئيسية.

## البنية التقنية

### 1. Backend — Edge Function `ai-assistant-chat`
- Streaming chat عبر **AI SDK** + **Lovable AI Gateway** (`openai/gpt-5.5` افتراضي).
- Tool Calling (بحد `stepCountIs(50)`) بأدوات معرّفة على السيرفر تقرأ/تكتب في Supabase بسياق المستخدم (JWT).
- كل tool ينفذ RLS تلقائي (نفس صلاحيات المستخدم) + فحص إضافي لدور Admin/CFO/Manager قبل الأدوات الحساسة.

**أدوات القراءة (Read Tools):**
- `get_financial_summary` — P&L، Cash Position، AR/AP، خلال فترة.
- `get_customer_360` — بيانات عميل + رصيد + حجوزات + تفاعلات.
- `get_supplier_position` — رصيد مورد + مستحقات.
- `get_booking_details` — تفاصيل حجز + ربحيته + مدفوعاته.
- `search_bookings` — بحث بمرشحات (تاريخ، حالة، عميل، مورد).
- `get_kpis` — Take-rate، ADR، Cancellation Rate، Cash Conversion Cycle.
- `get_overdue_invoices` / `get_supplier_dues`.
- `get_gl_account` — حركة حساب من دفتر الأستاذ.

**أدوات كتابة (Write Tools — كل واحدة تتطلب `needsApproval: true`):**
- `create_quote_draft`
- `send_whatsapp_message`
- `record_customer_payment`
- `create_invoice_draft`
- `add_expense_draft`
- `create_customer_note`

### 2. قاعدة البيانات — جداول جديدة
- `ai_assistant_threads` (id, organization_id, user_id, title, created_at, updated_at, pinned).
- `ai_assistant_messages` (id, thread_id, role, parts JSONB, created_at) — يخزن `UIMessage[]` بصيغة AI SDK.
- `ai_assistant_actions_log` (id, thread_id, user_id, tool_name, input JSONB, output JSONB, approved_by, executed_at) — Audit trail كامل.
- RLS صارم: كل سجل مربوط بـ `organization_id` + المستخدم، ومحصور على Admin/CFO/Manager عبر `has_role`.

### 3. Frontend
- **صفحة**: `src/pages/AIAssistant.tsx` مع Thread list جانبي + Chat window (AI Elements: Conversation, Message, MessageResponse, PromptInput, Tool, Shimmer).
- **Route**: `/ai-assistant` و `/ai-assistant/:threadId` — كل thread له URL ثابت.
- **Widget عائم**: `src/components/ai/AssistantFloatingWidget.tsx` — زر + Sheet جانبي، يفتح Thread جديد أو يكمل الأخير، يمرر Context الصفحة (route + entity id) كـ system hint.
- **Command Palette Integration**: إضافة أمر "اسأل المساعد الذكي" في `CommandPalette`.
- **Sidebar**: عنصر جديد "المساعد الذكي" في `DashboardSidebar` (يظهر للإدارة فقط).
- **Tool UI**: كل tool call يظهر بـ AI Elements `<Tool>` مطويًا افتراضيًا؛ الـ Write Tools تعرض بطاقة "موافقة" واضحة قبل التنفيذ.

### 4. الصلاحيات
- Gate على مستوى:
  - **Route**: guard يفحص `has_role('admin')` أو `has_role('cfo')` أو `has_role('manager')`.
  - **Edge Function**: نفس الفحص server-side قبل أي tool.
  - **UI**: إخفاء الويدجت والسايدبار للأدوار الأخرى.

### 5. Context Awareness
كل رسالة تُرسل مع:
- Organization ID، User ID، User Role.
- Current route + entity IDs من الصفحة الحالية (لو موجود).
- تاريخ اليوم + العملة الافتراضية.
- آخر 20 رسالة من نفس الـ thread.

### 6. الأمان
- كل write tool: `needsApproval` + سجل في `ai_assistant_actions_log`.
- Rate limiting على Edge Function (100 req/user/day).
- منع أي tool من تجاوز RLS (استخدام JWT الخاص بالمستخدم، ليس service role).
- منع الأدوات من قراءة/كتابة بيانات مؤسسة أخرى.

## Roadmap تنفيذي (على 3 مراحل)

**Phase A — الأساس (Foundation)**
1. جداول DB + RLS + policies + grants.
2. Edge Function `ai-assistant-chat` مع 3 Read Tools أساسية (financial_summary, customer_360, booking_details).
3. صفحة `/ai-assistant` بـ Threads + Chat عبر AI Elements.
4. Sidebar entry + route guards.

**Phase B — التوسع**
5. باقي Read Tools (KPIs, GL, overdue, suppliers, search).
6. Floating Widget + Command Palette integration + Context passing.
7. Prompt engineering متخصص لتحليل بيانات وكالة سفر.

**Phase C — Actions**
8. Write Tools مع `needsApproval` UI.
9. جدول `ai_assistant_actions_log` + شاشة عرضه ضمن Audit Log.
10. قوالب صياغة (رد عميل، إيميل تأكيد، عرض سعر).

## ملاحظات
- استخدام **Lovable AI Gateway** (لا يحتاج API key من المستخدم).
- الموديل الافتراضي: `openai/gpt-5.5` (يمكن التبديل لـ `google/gemini-2.5-flash` للسرعة/التوفير في محادثات قصيرة).
- لن يتم تعديل أي منطق مالي موجود؛ المساعد **يقرأ ويقترح ويطبّق عبر Actions موافق عليها** فقط.
