

# تحسين Automation Engine — إضافة Triggers جديدة + واجهة محسّنة

## الوضع الحالي

النظام يحتوي على بنية أتمتة جيدة:
- **جداول**: `automation_rules`, `automation_actions`, `automation_logs` موجودة
- **Hooks**: `useAutomationRules` (CRUD كامل) + `useAutomationEngine` (تنفيذ)
- **واجهة**: `AutomationRules.tsx` بها إنشاء قواعد + سجل تنفيذ
- **4 Triggers**: `booking_created`, `payment_confirmed`, `before_travel`, `booking_status_changed`
- **4 Actions**: `send_email`, `send_whatsapp`, `create_invoice`, `send_reminder`

## المشاكل

1. **`executeTrigger` غير مستخدم في أي مكان** — لا يتم استدعاؤه عند إنشاء حجز أو فاتورة
2. **لا يوجد triggers لـ**: `invoice_created`, `customer_registered`
3. **`CRMAutomation.tsx`** — placeholder فارغ بدون وظائف
4. **واجهة الإنشاء** بسيطة — لا تعرض إحصائيات أو ملخص

## خطة التنفيذ

### 1. إضافة Triggers جديدة

تحديث `useAutomationRules.ts` و `useAutomationEngine.ts`:
```text
Triggers جديدة:
  invoice_created      → عند إنشاء فاتورة
  customer_registered  → عند تسجيل عميل جديد
```

تحديث `TriggerContext` ليدعم حقول العميل والفاتورة (ليس فقط الحجز).

### 2. ربط `executeTrigger` بالعمليات الفعلية

استدعاء `executeTrigger` في:
- **`NewUnifiedBooking.tsx`** — بعد حفظ الحجز: `executeTrigger('booking_created', {...})`
- **إنشاء فاتورة** — بعد حفظ الفاتورة: `executeTrigger('invoice_created', {...})`
- **إنشاء عميل** — بعد حفظ العميل: `executeTrigger('customer_registered', {...})`

### 3. تحسين واجهة `AutomationRules.tsx`

- إضافة **إحصائيات سريعة** أعلى الصفحة (عدد القواعد النشطة، عدد التنفيذات الناجحة/الفاشلة)
- إضافة **فلترة السجلات** حسب الحالة (ناجح/فاشل) وحسب النوع
- إضافة **تعديل القاعدة** (الحالي يدعم فقط الإنشاء والحذف)
- تحديث القوائم المنسدلة لتشمل الـ Triggers الجديدة
- إضافة **حقول إعدادات ديناميكية** لكل Action (مثل: قالب البريد لـ `send_email` عند `customer_registered`)

### 4. استبدال `CRMAutomation.tsx`

تحويله من placeholder فارغ إلى ملخص يعرض القواعد النشطة وآخر التنفيذات.

---

## ملخص الملفات

```text
ملفات تُعدّل:
  src/hooks/useAutomationEngine.ts      — triggers جديدة + TriggerContext موسّع
  src/hooks/useAutomationRules.ts       — labels/icons للـ triggers الجديدة
  src/pages/AutomationRules.tsx         — إحصائيات + فلترة + تعديل القواعد
  src/pages/NewUnifiedBooking.tsx       — استدعاء executeTrigger
  src/components/crm/dashboard/CRMAutomation.tsx — ملخص بدل placeholder

ملفات يُحتمل تعديلها (حسب مكان إنشاء الفاتورة/العميل):
  src/hooks/useCustomerForm.tsx         — executeTrigger('customer_registered')
  src/hooks/invoices/useInvoicesData.tsx — executeTrigger('invoice_created')
```

