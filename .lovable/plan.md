

# فصل لوحة التحكم الإدارية — Organization Admin vs Platform Admin

## المشكلة الحالية

صفحة `/admin-settings` تخلط بين:
- **إعدادات المؤسسة** (إدارة المستخدمين، إعدادات الموقع، سجل العمليات) — يجب أن تكون متاحة لـ admin/owner داخل المؤسسة
- **إعدادات المنصة** (النسخ الاحتياطي، الأمان، إعدادات النظام، الصلاحيات، صفحة الهبوط، Database Manager) — يجب أن تكون حصرية لـ Platform Admin (سوبر أدمن)

حالياً يتم إخفاء التبويبات عن غير السوبر أدمن بـ `disabled` فقط، لكنها تظل مرئية ومربكة.

---

## خطة التنفيذ

### 1. فصل الصفحات

**`/admin-settings`** — إعدادات المؤسسة (Organization Admin)
- متاحة لأدوار: owner, admin, manager
- التبويبات:
  - إدارة المستخدمين والموظفين (unified-management)
  - إعدادات الموقع (site)
  - سجل العمليات (audit)
  - مراقبة الأداء (performance)
- عنوان الصفحة: "إعدادات المؤسسة"

**`/platform-admin/settings`** — إعدادات المنصة (Platform Admin)
- متاحة فقط لـ Platform Admin عبر `PlatformAdminGuard`
- التبويبات:
  - النسخ الاحتياطي (backup)
  - الأمان (security)
  - إعدادات النظام (system)
  - الصلاحيات (permissions)
  - صفحة الهبوط (landing)
  - Database Manager (db-manager)
- عنوان الصفحة: "إعدادات المنصة"

### 2. تحديث Sidebar

- رابط "الإعدادات" في مجموعة "الإدارة" يبقى يشير إلى `/admin-settings` (إعدادات المؤسسة)
- إضافة رابط "إعدادات المنصة" في مجموعة "إدارة المنصة" يشير إلى `/platform-admin/settings`

### 3. تحديث الـ Routes

- إضافة route جديد `/platform-admin/settings` محمي بـ `PlatformAdminGuard`
- إزالة التبويبات الخاصة بالسوبر أدمن من صفحة `/admin-settings`

---

## الملفات

```text
ملفات تُعدّل:
  src/pages/AdminSettings.tsx                    — إزالة تبويبات المنصة، تغيير العنوان
  src/components/admin/EnhancedAdminTabs.tsx      — إزالة مجموعة "إعدادات النظام المتقدمة"
  src/components/layout/DashboardSidebar.tsx      — إضافة رابط إعدادات المنصة
  src/App.tsx                                    — إضافة route جديد

ملفات جديدة:
  src/pages/platform-admin/PlatformAdminSettings.tsx — صفحة إعدادات المنصة
```

