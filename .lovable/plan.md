

# نظام Wizard Forms موحد — Step-by-Step Forms with Validation & Draft

## الوضع الحالي

- **NewUnifiedBooking**: يحتوي على 4 خطوات لكن بدون validation بين الخطوات وبدون حفظ مؤقت
- **NewQuote**: فورم واحد طويل بدون خطوات
- **OnboardingWizard**: wizard بسيط لكن بدون validation حقيقي
- **EnhancedFormField**: كومبوننت موجود للـ validation لكن غير مستخدم في الـ wizards
- لا يوجد نظام Draft/حفظ مؤقت في أي فورم

## خطة التنفيذ

### 1. إنشاء Wizard Engine قابل لإعادة الاستخدام

**ملف جديد: `src/components/wizard/StepWizard.tsx`**
- كومبوننت عام يقبل خطوات كـ children
- Step Indicator مع أيقونات وألوان
- أزرار التنقل (التالي / السابق)
- يستدعي `validateStep()` قبل الانتقال للخطوة التالية
- يحفظ البيانات في `localStorage` تلقائياً (Draft)
- يعرض زر "استكمال مسودة" عند فتح الفورم إذا وُجدت مسودة

**ملف جديد: `src/hooks/useWizardForm.ts`**
- يدير الـ state لكل الخطوات
- `currentStep`, `goNext()`, `goBack()`, `goToStep()`
- `validateCurrentStep()` — يتحقق من الحقول المطلوبة
- `saveDraft()` / `loadDraft()` / `clearDraft()` — حفظ/استرجاع من localStorage
- `errors` لكل حقل مع رسائل واضحة بالعربي
- Auto-save كل 30 ثانية

**ملف جديد: `src/components/wizard/WizardStepIndicator.tsx`**
- شريط الخطوات المرئي (رقم + عنوان + أيقونة)
- خطوة حالية / مكتملة / قادمة

### 2. تحويل NewUnifiedBooking إلى Wizard محسّن

**تعديل: `src/pages/NewUnifiedBooking.tsx`**
- استخدام `useWizardForm` بدل الـ state اليدوي
- إضافة validation لكل خطوة:
  - Step 1: نوع الحجز مطلوب
  - Step 2: العميل + سعر البيع + التكلفة مطلوبين
  - Step 3: حسب النوع (مثلاً: اسم الفندق مطلوب للفنادق)
  - Step 4: مراجعة فقط
- رسائل خطأ واضحة بالعربي تحت كل حقل
- حفظ مؤقت تلقائي

### 3. تحويل NewQuote إلى Wizard بـ 3 خطوات

**تعديل: `src/pages/NewQuote.tsx`**
- **Step 1**: بيانات العميل (العميل، الوجهة، التواريخ، عدد المسافرين)
- **Step 2**: عناصر العرض (QuoteItemsEditor الموجود)
- **Step 3**: مراجعة + إرسال أو حفظ كمسودة
- Validation: العميل والوجهة مطلوبين في Step 1، عنصر واحد على الأقل في Step 2

### 4. تحويل فورم العميل (EnhancedCustomerForm) إلى خطوتين

**تعديل: `src/components/customers/EnhancedCustomerForm.tsx`**
- **Step 1**: البيانات الأساسية (الاسم، الهاتف، البريد)
- **Step 2**: بيانات إضافية (العنوان، النوع، الملاحظات) + مراجعة
- Validation: الاسم والهاتف مطلوبين في Step 1

---

## التفاصيل التقنية

### Validation Schema (بدون Formik/Yup — نستخدم النمط الموجود)
```text
validateStep(stepNumber, formData) → { valid: boolean, errors: Record<string, string> }
```
كل خطوة لها قواعد validation خاصة. الرسائل بالعربي.

### Draft System
```text
localStorage key: `draft_${formType}_${orgId}`
Auto-save: كل 30 ثانية + عند تغيير الخطوة
Load: عند فتح الفورم يسأل "هل تريد استكمال المسودة؟"
Clear: عند الحفظ الناجح
```

### ملخص الملفات

```text
ملفات جديدة:
  src/components/wizard/StepWizard.tsx          — Wizard container
  src/components/wizard/WizardStepIndicator.tsx — شريط الخطوات
  src/hooks/useWizardForm.ts                    — منطق الـ wizard + draft

ملفات تُعدّل:
  src/pages/NewUnifiedBooking.tsx               — استخدام wizard + validation
  src/pages/NewQuote.tsx                        — تحويل لـ 3 خطوات
  src/components/customers/EnhancedCustomerForm.tsx — تحويل لخطوتين
```

