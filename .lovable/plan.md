

# ربط إعدادات المؤسسة بالمؤسسة الحالية + إزالة إعدادات الموقع

## المشاكل الحالية

1. **AuditLogTab** — لا يفلتر بـ `organization_id` (يعرض كل السجلات لكل المؤسسات)
2. **UnifiedUserEmployeeManagement** — يتحقق من `isSuperAdmin()` فقط بدل أن يكون متاحاً لـ admin/owner المؤسسة
3. **PerformanceMonitorTab** — يعرض بيانات وهمية (mock) غير مرتبطة بأي مؤسسة
4. **SiteSettings** — تبويب خاص بالسوبر أدمن موجود في صفحة إعدادات المؤسسة (يجب إزالته)

## خطة التنفيذ

### 1. إزالة تبويب "إعدادات الموقع" من AdminSettings

- حذف تبويب `site` من مصفوفة `tabs`
- إزالة import لـ `SiteSettings` و `TabsContent` الخاص به
- تغيير grid من `grid-cols-4` إلى `grid-cols-3`

### 2. ربط AuditLogTab بالمؤسسة الحالية

- إضافة `useOrgId()` للحصول على `organizationId`
- إضافة `.eq('organization_id', orgId)` للـ query
- إضافة `orgId` لـ `queryKey` (تحديث تلقائي عند تبديل المؤسسة)

### 3. تعديل صلاحيات UnifiedUserEmployeeManagement

- تغيير فحص `isSuperAdmin()` إلى فحص دور المؤسسة (`owner` أو `admin`) باستخدام `useOrganization().orgRole`
- هذا يجعل كل admin/owner يدير مستخدمي مؤسسته فقط

### 4. ربط PerformanceMonitorTab بالمؤسسة

- إضافة `useOrgId()` وعرض اسم المؤسسة الحالية في الـ header
- البيانات حالياً mock — إضافة ملاحظة بأن الإحصائيات خاصة بالمؤسسة الحالية

---

## الملفات

```text
ملفات تُعدّل:
  src/pages/AdminSettings.tsx                    — إزالة تبويب site + تعديل grid
  src/components/admin/AuditLogTab.tsx            — فلترة بـ organization_id
  src/components/admin/UnifiedUserEmployeeManagement.tsx — فحص orgRole بدل isSuperAdmin
  src/components/admin/PerformanceMonitorTab.tsx  — إضافة سياق المؤسسة
```

