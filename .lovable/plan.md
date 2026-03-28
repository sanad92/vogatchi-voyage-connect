

# تحسين أداء واجهة SaaS — Performance Optimization

## الوضع الحالي

**ما هو موجود وجيد:**
- React Query مُستخدم في كل الـ hooks مع `staleTime` و `gcTime` في `App.tsx` (5 دقائق / 10 دقائق)
- `useClientPagination` مُستخدم في 4 صفحات (Customers, FlightBookings, CarRentals, TransportBookings)
- `useUnifiedBookings` يدعم server-side pagination بالفعل
- Lazy Loading للصفحات مُطبق في `App.tsx`

**المشاكل:**
1. **Suppliers و Invoices بدون pagination** — يعرضان كل البيانات دفعة واحدة
2. **AuditLog** يجلب 200 سجل بدون pagination
3. **لا يوجد Virtualized Lists** — جداول كبيرة (50+ صف) تُنشئ DOM nodes لكل صف
4. **بعض الـ hooks بدون `staleTime`** — مثل `useSuppliers`, `useInvoicesData`, `useCustomers`
5. **UnifiedBookings** يحسب الإحصائيات من الصفحة الحالية فقط (غير دقيق)

---

## خطة التنفيذ

### 1. إضافة Pagination للصفحات الناقصة

**Suppliers (`SuppliersOverview.tsx`):**
- إضافة `useClientPagination` + `PaginationControlsUI`
- تمرير `paginatedItems` بدل `filteredSuppliers` لـ `SupplierGrid`

**Invoices (`src/pages/Invoices.tsx`):**
- فحص الصفحة الحالية وإضافة pagination إن لم تكن موجودة

**AuditLog (`AuditLogViewer.tsx`):**
- إضافة `useClientPagination` مع pageSize = 50

### 2. إضافة Virtualized Table

**ملف جديد: `src/components/ui/virtualized-table.tsx`**
- استخدام `@tanstack/react-virtual` للـ row virtualization
- يعرض فقط الصفوف المرئية في الـ viewport (+ buffer)
- واجهة متوافقة مع الـ Table الحالي (نفس الـ props)

**تطبيق على:**
- `UnifiedBookings.tsx` — الجدول الرئيسي
- `UserTable.tsx` — جدول المستخدمين
- `AuditLogViewer.tsx` — سجل التدقيق

### 3. تحسين React Query Caching

إضافة `staleTime` للـ hooks الناقصة:
```text
useSuppliers         → staleTime: 5 min
useInvoicesData      → staleTime: 3 min
useCustomers         → staleTime: 5 min
useAuditLog          → staleTime: 2 min
```

### 4. تصحيح إحصائيات UnifiedBookings

الإحصائيات السريعة تُحسب من `bookings` (الصفحة الحالية فقط) — يجب أن تستخدم `totalCount` وإضافة query منفصل للإحصائيات الكلية أو إزالة الإحصائيات المضللة.

---

## التفاصيل التقنية

### Virtualized Table
- مكتبة: `@tanstack/react-virtual` (خفيفة، ~3KB)
- تعرض فقط ~20 صف في الـ viewport بدل مئات
- تقلل DOM nodes بنسبة ~90% للجداول الكبيرة

---

## ملخص الملفات

```text
ملفات جديدة:
  src/components/ui/virtualized-table.tsx    — جدول افتراضي قابل لإعادة الاستخدام

ملفات تُعدّل:
  src/components/suppliers/SuppliersOverview.tsx — إضافة pagination
  src/components/audit/AuditLogViewer.tsx        — إضافة pagination
  src/pages/UnifiedBookings.tsx                  — virtualized table + إصلاح الإحصائيات
  src/components/admin/user-management/UserTable.tsx — virtualized table
  src/hooks/useSuppliers.tsx                     — إضافة staleTime
  src/hooks/invoices/useInvoicesData.tsx          — إضافة staleTime
  src/hooks/useCustomers.tsx                     — إضافة staleTime
  src/hooks/useAuditLog.ts                       — إضافة staleTime
  package.json                                   — إضافة @tanstack/react-virtual
```

