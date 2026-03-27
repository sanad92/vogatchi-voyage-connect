

# تقرير الصلاحيات — المشاكل الحالية وخطة الإصلاح

## المشاكل المكتشفة

### المشكلة 1: الـ Sidebar لا يتحقق من أي صلاحيات (خطيرة)
`DashboardSidebar.tsx` يعرض **كل الروابط لكل المستخدمين** بدون أي فحص. موظف بدور `viewer` يرى نفس القائمة التي يراها الـ `owner`. الروابط مثل "الإعدادات" و"الموظفين" و"سجل التدقيق" ظاهرة للجميع.

### المشكلة 2: `PermissionNavLink` يتجاهل `requiredPermissions`
الكومبوننت يفحص `allowedRoles` فقط ويتجاهل `requiredPermissions` تماماً. وبما أن معظم الـ items في `NavigationItems.tsx` تحدد `allowedRoles: []` (فارغة)، فكلها تظهر لأي مستخدم.

### المشكلة 3: معظم الصفحات بدون حماية على مستوى الـ Route
من App.tsx، فقط هذه الصفحات محمية بـ `AdminRouteGuard`:
- `/admin-settings`, `/landing-admin`, `/admin-import-export`, `/site-customization`
- `/team`, `/whatsapp-admin`, `/admin/cms`, `/monitoring`

**صفحات غير محمية** (أي مستخدم يقدر يدخلها بالرابط مباشرة):
- `/expense-management`, `/employees-enhanced`, `/bank-accounts`
- `/payment-orders`, `/profit-analytics`, `/audit-log`
- `/automation`, `/documents`, `/suppliers`
- `/bookings` (الموحد), `/quotes`

### المشكلة 4: تناقض بين نظامين
يوجد نظامان منفصلان يعملان بالتوازي:
1. **`hasRole(role)`** — يقارن مستوى الدور (hierarchy): owner > admin > manager > agent > viewer
2. **`useSupabasePermissions`** — نظام permissions دقيق (مثل `bookings_create`, `invoices_delete`)

لكن النظام الثاني **لا يُستخدم تقريباً** — لا في الـ Sidebar ولا في الـ Routes. فقط `SupplierPermissionCheck` يستخدمه.

### المشكلة 5: صلاحيات غير موجودة في القائمة
بعض `requiredPermissions` في `NavigationItems` غير معرّفة في `useSupabasePermissions`:
- `financial_view` (للبنوك وأوامر الدفع)
- `customer_service_view`
- `customer_portal_view`
- `whatsapp_view`, `whatsapp_admin`
- `admin_settings`

---

## خطة الإصلاح

### المرحلة 1: توحيد نظام الصلاحيات

**تحديث `useSupabasePermissions.tsx`:**
- إضافة الصلاحيات الناقصة (`financial_view`, `whatsapp_view`, إلخ)
- تحديد بالضبط كل دور يشوف إيه

### المرحلة 2: إصلاح الـ Sidebar

**تحديث `DashboardSidebar.tsx`:**
- إضافة `requiredPermission` لكل `NavItem`
- فحص الصلاحيات باستخدام `useSupabasePermissions` قبل عرض كل رابط
- إخفاء مجموعة "الإدارة" بالكامل عن الـ `viewer` و `agent`

### المرحلة 3: إصلاح `PermissionNavLink`

**تحديث `PermissionNavLink.tsx`:**
- إضافة فحص `requiredPermissions` بجانب `allowedRoles`
- استخدام `useSupabasePermissions().hasPermission()` للتحقق

### المرحلة 4: حماية الـ Routes

**إنشاء `PermissionRouteGuard.tsx`:**
- كومبوننت جديد يقبل `requiredPermission` ويمنع الوصول إذا المستخدم ما عنده الصلاحية
- تطبيقه على كل الصفحات الحساسة في `App.tsx`

### المرحلة 5: مصفوفة الصلاحيات النهائية

```text
الصفحة                  │ viewer │ agent │ manager │ admin │ owner
────────────────────────┼────────┼───────┼─────────┼───────┼──────
لوحة التحكم              │   ✓    │   ✓   │    ✓    │   ✓   │   ✓
العملاء                  │   ✓    │   ✓   │    ✓    │   ✓   │   ✓
الحجوزات (عرض)           │   ✓    │   ✓   │    ✓    │   ✓   │   ✓
الحجوزات (إنشاء/تعديل)   │   ✗    │   ✓   │    ✓    │   ✓   │   ✓
الفواتير                 │   ✓    │   ✓   │    ✓    │   ✓   │   ✓
الموردين                 │   ✓    │   ✓   │    ✓    │   ✓   │   ✓
المصروفات               │   ✗    │   ✗   │    ✓    │   ✓   │   ✓
الموظفين                │   ✗    │   ✗   │    ✓    │   ✓   │   ✓
الحسابات البنكية         │   ✗    │   ✗   │    ✓    │   ✓   │   ✓
التقارير                 │   ✗    │   ✓   │    ✓    │   ✓   │   ✓
تحليل الأرباح            │   ✗    │   ✗   │    ✓    │   ✓   │   ✓
الفريق                  │   ✗    │   ✗   │    ✗    │   ✓   │   ✓
الأتمتة                 │   ✗    │   ✗   │    ✗    │   ✓   │   ✓
سجل التدقيق             │   ✗    │   ✗   │    ✗    │   ✓   │   ✓
الإعدادات               │   ✗    │   ✗   │    ✗    │   ✗   │   ✓
واتساب إدارة             │   ✗    │   ✗   │    ✗    │   ✗   │   ✓
```

---

## الملفات

```text
ملفات مُعدّلة:
  src/hooks/useSupabasePermissions.tsx     — إضافة الصلاحيات الناقصة
  src/components/layout/DashboardSidebar.tsx — فحص الصلاحيات لكل رابط
  src/components/navbar/PermissionNavLink.tsx — فحص requiredPermissions
  src/components/navbar/NavigationItems.tsx  — تصحيح allowedRoles
  src/App.tsx                              — إضافة Guards للصفحات الحساسة

ملفات جديدة:
  src/components/guards/PermissionRouteGuard.tsx — حماية الـ Routes بالصلاحيات
```

