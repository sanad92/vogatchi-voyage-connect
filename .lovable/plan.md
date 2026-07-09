# مشكلة: كل رسالة واردة تظهر كمحادثة/عميل جديد

## السبب الجذري

بعد الفحص وجدت سببين مباشرين:

1. **لا يوجد قيد فريد (unique constraint)** على `whatsapp_conversations(organization_id, phone_number)`. عند وصول عدة رسائل من نفس الرقم في نفس اللحظة، الـ webhook يعمل `SELECT` ثم `INSERT` بشكل غير ذري، فتُنشأ صفوف محادثة مكررة (تأكدت فعلياً: الرقم `201124891095` عنده 4 صفوف محادثة في نفس المؤسسة).
2. **لا يوجد قيد فريد على `whatsapp_messages.message_id`**، فإعادة تسليم Meta لنفس الـ webhook تُدرج نفس الرسالة أكثر من مرة.

نتيجة الاثنين: نفس العميل يظهر عدة مرات في صندوق الوارد، وكل رسالة تبدو "محادثة جديدة".

## الحل

### 1. تنظيف البيانات الحالية (migration)
- توحيد كل `phone_number` بإزالة أي رموز غير رقمية (استخدام `normalize_phone_digits` الموجودة بالفعل).
- لكل `(organization_id, phone_number)` مكرر: الإبقاء على أقدم محادثة، ونقل الرسائل + `customer_id` من المحادثات المكررة إليها، ثم حذف المكررات.
- إزالة أي رسائل مكررة لها نفس `message_id` داخل نفس المؤسسة (الاحتفاظ بالأقدم).

### 2. قيود فريدة تمنع التكرار مستقبلاً
- `CREATE UNIQUE INDEX ... ON whatsapp_conversations (organization_id, phone_number)`.
- `CREATE UNIQUE INDEX ... ON whatsapp_messages (organization_id, message_id) WHERE message_id IS NOT NULL`.

### 3. Trigger لتطبيع رقم الهاتف تلقائياً
`BEFORE INSERT OR UPDATE` على `whatsapp_conversations` يخزّن `phone_number` بصيغة أرقام فقط، حتى الأرقام القادمة بصيغ مختلفة (`+20…`, `0020…`, مسافات) تُطابَق كمحادثة واحدة.

### 4. تحديث `supabase/functions/whatsapp-webhook/index.ts`
- استبدال نمط SELECT-ثم-INSERT بـ `upsert` على `whatsapp_conversations` باستخدام `onConflict: 'organization_id,phone_number'` — عملية ذرية.
- استبدال `insert` الرسالة بـ `upsert` على `(organization_id, message_id)` لتجاهل إعادة التسليم من Meta.
- تطبيع رقم الهاتف قبل الاستعلام (نفس منطق `normalize_phone_digits`).

### 5. لا تغييرات في الواجهة
الـ hooks الحالية (`useWhatsApp`, `useWhatsAppMessages`, `useCustomerWhatsApp`) تعمل بشكل صحيح بعد فك التكرار، والـ Realtime سيعرض الرسائل الجديدة داخل نفس المحادثة الموحّدة تلقائياً.

## تفاصيل تقنية

**Migration (تنفيذ متسلسل داخل transaction):**
```sql
-- 1) توحيد صيغة الأرقام
UPDATE whatsapp_conversations
SET phone_number = normalize_phone_digits(phone_number)
WHERE phone_number IS DISTINCT FROM normalize_phone_digits(phone_number);

-- 2) دمج المحادثات المكررة (keep oldest)
WITH ranked AS (
  SELECT id, organization_id, phone_number,
         MIN(id) OVER (PARTITION BY organization_id, phone_number
                       ORDER BY created_at) AS keep_id
  FROM whatsapp_conversations
)
UPDATE whatsapp_messages m
SET conversation_id = r.keep_id
FROM ranked r
WHERE m.conversation_id = r.id AND r.id <> r.keep_id;

DELETE FROM whatsapp_conversations c
USING ranked r
WHERE c.id = r.id AND r.id <> r.keep_id;

-- 3) دمج رسائل message_id المكررة
DELETE FROM whatsapp_messages a
USING whatsapp_messages b
WHERE a.organization_id = b.organization_id
  AND a.message_id = b.message_id
  AND a.message_id IS NOT NULL
  AND a.ctid > b.ctid;

-- 4) القيود الفريدة
CREATE UNIQUE INDEX whatsapp_conversations_org_phone_uidx
  ON whatsapp_conversations (organization_id, phone_number);

CREATE UNIQUE INDEX whatsapp_messages_org_msgid_uidx
  ON whatsapp_messages (organization_id, message_id)
  WHERE message_id IS NOT NULL;

-- 5) trigger تطبيع
CREATE TRIGGER trg_wa_conversation_normalize_phone
BEFORE INSERT OR UPDATE OF phone_number ON whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION ... ;
```

**Edge function:** استخدام `.upsert(..., { onConflict: 'organization_id,phone_number', ignoreDuplicates: false }).select('id').single()` للمحادثة، و `.upsert(..., { onConflict: 'organization_id,message_id', ignoreDuplicates: true })` للرسالة.

## الملفات المتأثرة
- migration جديد ضمن `supabase/migrations/`
- `supabase/functions/whatsapp-webhook/index.ts`
