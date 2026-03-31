

# إصلاح خطأ تحميل بيانات العميل

## المشكلة
`useCustomerData.tsx` يستخدم FK hints غير موجودة:
```
profiles!customers_created_by_fkey  ← لا يوجد FK
profiles!customers_last_follow_up_by_fkey  ← لا يوجد FK
```

## الحل

### خطوة 1: إضافة Foreign Keys المفقودة (Migration)
```sql
ALTER TABLE public.customers
  ADD CONSTRAINT customers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.customers
  ADD CONSTRAINT customers_last_follow_up_by_fkey
  FOREIGN KEY (last_follow_up_by) REFERENCES public.profiles(id);
```

**مشكلة محتملة:** البيانات المستوردة تحتوي على `created_by = '55555555-5555-5555-5555-555555555555'` وهو UUID وهمي غير موجود في `profiles`. لذلك يجب تنظيف البيانات أولاً:
```sql
UPDATE public.customers SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM public.profiles);

UPDATE public.customers SET last_follow_up_by = NULL 
WHERE last_follow_up_by IS NOT NULL 
AND last_follow_up_by NOT IN (SELECT id FROM public.profiles);
```

### خطوة 2: (احتياطي) تعديل useCustomerData.tsx
إذا فشلت الـ Migration لأي سبب، نزيل الـ FK hints من الاستعلام ونحمّل بيانات الـ profile بشكل منفصل.

## الملفات
```text
Migration SQL                    — تنظيف بيانات + إضافة FK constraints
src/hooks/useCustomerData.tsx     — لا تعديل إذا نجحت الـ Migration
```

