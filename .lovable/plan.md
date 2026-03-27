

# إعادة هيكلة نظام الحجوزات — Unified Booking System

## تحليل الوضع الحالي

**33 ملف** يستخدمون الجداول القديمة مباشرة. تغيير كل شيء دفعة واحدة سيكسر النظام. لذلك سنتبع **نهج تدريجي آمن**.

---

## الاستراتيجية: Progressive Migration (3 مراحل)

```text
المرحلة 1: إنشاء البنية الجديدة (بدون كسر القديم)
   └─ جدول bookings + جداول التفاصيل + VIEW موحد

المرحلة 2: صفحات جديدة موحدة
   └─ /bookings (قائمة) + /bookings/new (إنشاء) + /bookings/:id (تفاصيل)

المرحلة 3: ربط الأنظمة الموجودة
   └─ تحديث Profit Analytics + Automation + Invoices + Dashboard
```

**الجداول القديمة تبقى تعمل** — لا يتم حذفها. النظام الجديد يعمل بالتوازي.

---

## المرحلة 1: Database Schema

### جدول `bookings` (الرئيسي)

```sql
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  booking_number text NOT NULL,
  booking_type text NOT NULL, -- hotel, flight, car_rental, transport
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  employee_id uuid REFERENCES employees(id),
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  status text DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  selling_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  currency text DEFAULT 'EGP',
  start_date date,
  end_date date,
  notes text,
  quote_id uuid REFERENCES quotes(id),
  legacy_table text,        -- المصدر القديم
  legacy_id uuid,           -- ID في الجدول القديم
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### جداول التفاصيل (4 جداول)

```sql
-- booking_hotel_details
  booking_id, hotel_name, room_type, board_type, 
  check_in, check_out, nights, rooms

-- booking_flight_details
  booking_id, airline, flight_number, departure_airport, 
  arrival_airport, departure_date, departure_time

-- booking_car_details
  booking_id, car_type, pickup_location, dropoff_location, 
  pickup_date, dropoff_date

-- booking_transport_details
  booking_id, vehicle_type, route, pickup_point, dropoff_point
```

### Data Migration (نقل البيانات)

- SQL script ينقل البيانات من الـ 4 جداول القديمة إلى `bookings` + جداول التفاصيل
- كل صف يحصل على `legacy_table` و `legacy_id` للتتبع
- توليد `booking_number` تلقائي (BK-2026-00001)
- RLS + Indexes على `organization_id`, `booking_type`, `status`, `customer_id`

---

## المرحلة 2: الصفحات والواجهة

### صفحة `/bookings` — القائمة الموحدة
- جدول يعرض كل الحجوزات من كل الأنواع
- فلترة: نوع الحجز، الحالة، التاريخ، بحث نصي
- أيقونة مختلفة لكل نوع (فندق/طيران/سيارة/نقل)
- Pagination

### صفحة `/bookings/new` — إنشاء حجز جديد
- Step 1: اختيار نوع الحجز
- Step 2: بيانات أساسية (عميل، مورد، سعر بيع، تكلفة)
- Step 3: تفاصيل خاصة بالنوع (form ديناميكي)
- Step 4: مراجعة وحفظ
- يتم الحفظ في `bookings` + جدول التفاصيل المناسب

### صفحة `/bookings/:id` — التفاصيل
- عرض البيانات العامة + التفاصيل الخاصة بالنوع
- أزرار: تعديل الحالة، إنشاء فاتورة، عرض سجل التدقيق

---

## المرحلة 3: تحديث الأنظمة المرتبطة

### Hook موحد `useUnifiedBookings.ts`
- CRUD كامل على جدول `bookings`
- Join مع جداول التفاصيل حسب النوع
- يحل محل الاستعلامات المكررة في الملفات الـ 33

### تحديث `useProfitAnalytics.ts`
- استعلام واحد على `bookings` بدل 4 استعلامات منفصلة
- نفس النتيجة، أداء أفضل

### تحديث `useAutomationEngine.ts`
- Trigger واحد `booking_created` يعمل على `bookings`

### تحديث `useOptimizedDashboard.tsx`
- إحصائيات من جدول واحد بدل 4

---

## الملفات المطلوبة

```text
ملفات جديدة:
  supabase/migrations/...               — Schema + Data migration + RLS
  src/hooks/useUnifiedBookings.ts       — CRUD موحد
  src/pages/UnifiedBookings.tsx         — قائمة الحجوزات
  src/pages/NewUnifiedBooking.tsx       — إنشاء حجز
  src/pages/UnifiedBookingDetails.tsx   — تفاصيل حجز
  src/components/bookings/
    BookingTypeSelector.tsx             — اختيار النوع
    BookingBaseForm.tsx                 — البيانات الأساسية
    HotelDetailsForm.tsx               — تفاصيل فندق
    FlightDetailsForm.tsx              — تفاصيل طيران
    CarDetailsForm.tsx                 — تفاصيل سيارة
    TransportDetailsForm.tsx           — تفاصيل نقل
    BookingStatusBadge.tsx             — شارة الحالة

ملفات مُعدّلة:
  src/App.tsx                          — إضافة routes
  src/components/layout/DashboardSidebar — إضافة رابط "الحجوزات الموحدة"
  src/hooks/useProfitAnalytics.ts      — استعلام موحد
  src/hooks/useOptimizedDashboard.tsx   — إحصائيات موحدة
  src/hooks/useAutomationEngine.ts     — trigger موحد
```

### ما لن يتغير (في هذه المرحلة):
- صفحات الحجوزات القديمة تبقى تعمل (HotelBookings, FlightBookings, CarRentals, TransportBookings)
- الجداول القديمة تبقى موجودة
- يمكن إزالتها لاحقاً بعد التأكد من استقرار النظام الجديد

