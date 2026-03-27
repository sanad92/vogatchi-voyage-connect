

# نظام عروض الأسعار (Quotes) — Quote → Booking → Invoice

## الوضع الحالي

النظام يحتوي بالفعل على:
- **جداول الحجوزات**: `hotel_bookings`, `flight_bookings`, `car_rentals`, `transport_bookings`
- **جدول الفواتير**: `invoices` مرتبط بالحجوزات عبر `booking_id` + `booking_type`
- **العملاء والموردين**: `customers`, `suppliers`
- **Multi-tenant**: كل الجداول تحتوي `organization_id`

**المطلوب**: إضافة كيان "عرض سعر" (Quote) كنقطة بداية قبل الحجز، مع تدفق تلقائي: Quote → Booking → Invoice.

---

## 1. Database Schema

### جدول `quotes` (عروض الأسعار)

```sql
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  status text DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
  travel_date date,
  return_date date,
  destination text,
  number_of_travelers integer DEFAULT 1,
  notes text,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  vat_rate numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  valid_until date,
  assigned_employee_id uuid REFERENCES employees(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### جدول `quote_items` (عناصر العرض)

```sql
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- hotel, flight, transport, car_rental, service
  description text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  cost_price numeric DEFAULT 0,    -- تكلفة المورد
  selling_price numeric DEFAULT 0, -- سعر البيع للعميل
  quantity integer DEFAULT 1,
  total_cost numeric DEFAULT 0,
  total_selling numeric DEFAULT 0,
  details jsonb DEFAULT '{}',      -- تفاصيل إضافية حسب النوع
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### إضافة أعمدة ربط

```sql
-- ربط الحجوزات بعرض السعر
ALTER TABLE hotel_bookings ADD COLUMN quote_id uuid REFERENCES quotes(id);
ALTER TABLE flight_bookings ADD COLUMN quote_id uuid REFERENCES quotes(id);
ALTER TABLE car_rentals ADD COLUMN quote_id uuid REFERENCES quotes(id);
ALTER TABLE transport_bookings ADD COLUMN quote_id uuid REFERENCES quotes(id);

-- ربط الفاتورة بعرض السعر
ALTER TABLE invoices ADD COLUMN quote_id uuid REFERENCES quotes(id);
```

### RLS + Indexes

- سياسات RLS مبنية على `organization_id` مع `user_belongs_to_org`
- فهارس على `organization_id`, `customer_id`, `status`, `quote_id`

---

## 2. الصفحات المطلوبة (4 صفحات)

### صفحة 1: قائمة عروض الأسعار `/quotes`
- جدول بالعروض مع فلترة (حالة، تاريخ، عميل)
- بحث بالرقم أو اسم العميل
- Pagination
- أزرار: إنشاء عرض جديد، عرض التفاصيل

### صفحة 2: إنشاء عرض سعر `/quotes/new`
- اختيار العميل (أو إنشاء جديد)
- إضافة عناصر (فندق/طيران/نقل/خدمة) مع سعر التكلفة وسعر البيع
- حساب تلقائي للإجمالي والربح والضريبة
- تعيين موظف مسؤول
- حفظ كمسودة أو إرسال

### صفحة 3: تفاصيل عرض السعر `/quotes/:id`
- عرض كامل للبيانات والعناصر
- أزرار تغيير الحالة (إرسال / قبول / رفض)
- **زر "تحويل لحجز"** — ينشئ حجوزات + فاتورة تلقائياً
- عرض الحجوزات والفواتير المرتبطة

### صفحة 4: تعديل عرض السعر `/quotes/:id/edit`
- نفس نموذج الإنشاء مع بيانات العرض الحالي

---

## 3. تدفق التحويل (Quote → Booking → Invoice)

عند الضغط على "تحويل لحجز":
1. تحديث حالة العرض إلى `accepted`
2. لكل عنصر في `quote_items`:
   - إنشاء حجز في الجدول المناسب (`hotel_bookings` / `flight_bookings` / إلخ) مع `quote_id`
3. إنشاء فاتورة واحدة مجمعة مرتبطة بـ `quote_id`
4. كل هذا في transaction واحد

---

## 4. الملفات المطلوب إنشاؤها

```text
src/pages/Quotes.tsx              — قائمة العروض
src/pages/NewQuote.tsx            — إنشاء عرض
src/pages/QuoteDetails.tsx        — تفاصيل + تحويل
src/hooks/useQuotes.ts            — CRUD + فلترة
src/hooks/useQuoteConversion.ts   — تحويل عرض → حجز + فاتورة
src/components/quotes/
  QuoteForm.tsx                   — نموذج الإنشاء/التعديل
  QuoteItemsEditor.tsx            — محرر العناصر
  QuoteStatusBadge.tsx            — شارة الحالة
  QuotesList.tsx                  — جدول العروض
  ConvertQuoteDialog.tsx          — تأكيد التحويل
```

### تعديل ملفات موجودة:
- **`App.tsx`**: إضافة routes للصفحات الجديدة
- **Sidebar/Navigation**: إضافة رابط "عروض الأسعار" في القائمة الجانبية

---

## 5. ملخص العلاقات

```text
Customer ──┐
           ├── Quote ──── Quote Items (hotel/flight/transport/service)
Employee ──┘      │
                  │ [تحويل]
                  ▼
           ┌── Bookings (hotel_bookings, flight_bookings, etc.)
           │      │
           └── Invoice
```

