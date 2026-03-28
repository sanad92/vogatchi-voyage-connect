

# هيكلة نظام صلاحيات موحد — Unified Permission System

## الوضع الحالي

النظام يحتوي بالفعل على بنية صلاحيات جيدة:
- **`useSupabasePermissions`**: مصفوفة صلاحيات كاملة لـ 5 أدوار (owner > admin > manager > agent > viewer)
- **`DashboardSidebar`**: يتحقق من الصلاحيات قبل عرض الروابط
- **`PermissionRouteGuard`**: يحمي معظم الـ Routes

## المشاكل المكتشفة

### 1. Routes غير محمية (12 route بدون Guard)
```text
/dashboard             — بدون حماية (مقبول)
/customers             — بدون حماية ❌
/duplicate-customers   — بدون حماية ❌
/new-customer          — بدون حماية ❌
/hotel-bookings        — بدون حماية ❌
/new-hotel-booking     — بدون حماية ❌
/flight-bookings       — بدون حماية ❌
/new-flight-booking    — بدون حماية ❌
/car-rentals           — بدون حماية ❌
/transport-bookings    — بدون حماية ❌
/invoices              — بدون حماية ❌
/new-invoice           — بدون حماية ❌
/daily-operations      — بدون حماية ❌
/bookings-calendar     — بدون حماية ❌
/customers/:id         — بدون حماية ❌
/quotes, /quotes/new   — بدون حماية ❌
```

### 2. ثلاثة Guards مختلفة بدون اتساق
- `PermissionRouteGuard` — يتحقق من permission string
- `AdminRouteGuard` — يتحقق من org role (owner/admin)
- `PlatformAdminGuard` — يتحقق من platform_roles

يمكن توحيد الأولين في Guard واحد.

### 3. Sidebar لا يعرض كل الأقسام المحمية بشكل صحيح
- قسم "الحجوزات" يعرض الحجوزات القديمة (hotel/flight/car/transport) بدون صلاحيات فردية

---

## خطة التنفيذ

### 1. حماية كل الـ Routes المكشوفة في `App.tsx`

إضافة `PermissionRouteGuard` لكل route غير محمي:

```text
/customers             → customers_view
/duplicate-customers   → customers_view
/new-customer          → customers_create
/customers/:id         → customers_view
/hotel-bookings        → bookings_view
/new-hotel-booking     → bookings_create
/flight-bookings       → bookings_view
/new-flight-booking    → bookings_create
/car-rentals           → bookings_view
/transport-bookings    → bookings_view
/invoices              → invoices_view
/new-invoice           → invoices_create
/daily-operations      → bookings_view
/bookings-calendar     → bookings_view
/quotes                → quotes_view
/quotes/new            → quotes_create
/quotes/:id            → quotes_view
```

### 2. توحيد `AdminRouteGuard` مع `PermissionRouteGuard`

حذف `AdminRouteGuard` واستبدال استخداماته بـ `PermissionRouteGuard` مع `requiredPermission="admin_settings"`:
```text
/admin-settings        → admin_settings
/landing-admin         → admin_settings
/admin-import-export   → admin_settings
/site-customization    → admin_settings
/whatsapp-admin        → whatsapp_admin
/admin/cms             → admin_settings
/monitoring            → admin_settings
```

### 3. إضافة صلاحيات ناقصة في `useSupabasePermissions`

إضافة `whatsapp_admin` و `admin_settings` لمصفوفة الـ admin فقط (owner يمتلك الكل تلقائياً).

### 4. تحسين Sidebar — صلاحيات فردية للحجوزات القديمة

إضافة `requiredPermission: 'bookings_view'` لكل رابط حجز قديم (hotel/flight/car/transport) بشكل فردي.

---

## ملخص الملفات

```text
ملفات تُعدّل:
  src/App.tsx                              — إضافة Guards لـ 16 route
  src/hooks/useSupabasePermissions.tsx      — إضافة whatsapp_admin, admin_settings
  src/components/layout/DashboardSidebar.tsx — requiredPermission للحجوزات القديمة

ملفات تُحذف:
  src/components/guards/AdminRouteGuard.tsx  — مُستبدل بـ PermissionRouteGuard
```

**النتيجة:** كل route محمي بصلاحية واضحة، Guard واحد موحد (+ PlatformAdminGuard للمنصة)، Sidebar متطابق مع الـ Routes.

