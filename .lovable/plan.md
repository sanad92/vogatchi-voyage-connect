

## المشكلة
الكود في `RegisterOrganization.tsx` يحاول إدخال حقل `created_by` في جدول `organizations`، لكن هذا العمود غير موجود في الجدول.

## الحل

### 1. إزالة `created_by` من عملية الإدخال
- **ملف**: `src/pages/RegisterOrganization.tsx`
- حذف `created_by: user.id` من الـ insert في السطر 59

هذا التغيير بسيط وسيحل المشكلة مباشرة.

