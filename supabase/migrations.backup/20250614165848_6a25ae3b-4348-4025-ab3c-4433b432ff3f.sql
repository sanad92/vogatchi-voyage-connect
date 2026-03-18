
-- إنشاء جدول العملاء
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL,
  address TEXT,
  nationality TEXT,
  passport_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الموردين
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'airline', 'transport', 'tour')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الخدمات
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'flight', 'transfer', 'tour')),
  description TEXT,
  location TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الحجوزات
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  booking_reference TEXT UNIQUE NOT NULL,
  check_in_date DATE,
  check_out_date DATE,
  number_of_nights INTEGER,
  number_of_guests INTEGER DEFAULT 1,
  supplier_cost DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  profit_margin DECIMAL(10,2) GENERATED ALWAYS AS (selling_price - supplier_cost) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الفواتير
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  final_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issued_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول أوامر الدفع للموردين
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  payment_reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول المحادثات (للواتساب والتواصل)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  phone_number TEXT NOT NULL,
  platform TEXT DEFAULT 'whatsapp' CHECK (platform IN ('whatsapp', 'call', 'email')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الرسائل
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  message_content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'location')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- تفعيل Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان (مؤقتاً سنجعلها مفتوحة لحين إضافة المصادقة)
CREATE POLICY "Enable all access for now" ON public.customers FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.services FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.supplier_payments FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.conversations FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.messages FOR ALL USING (true);

-- إدراج بيانات تجريبية للموردين
INSERT INTO public.suppliers (name, type, contact_person, email, phone, commission_rate) VALUES
('فندق سونستا الأقصر', 'hotel', 'أحمد محمد', 'reservations@sonesta-luxor.com', '01001234567', 15.00),
('مصر للطيران', 'airline', 'سارة أحمد', 'corporate@egyptair.com', '01009876543', 8.00),
('شركة النقل السياحي المتميز', 'transport', 'محمد علي', 'info@premium-transport.com', '01005554321', 20.00),
('رحلات الأهرامات السياحية', 'tour', 'فاطمة حسن', 'tours@pyramids-tours.com', '01007778899', 25.00);

-- إدراج خدمات تجريبية
INSERT INTO public.services (supplier_id, name, type, description, location, base_price) VALUES
((SELECT id FROM public.suppliers WHERE name = 'فندق سونستا الأقصر'), 'غرفة مزدوجة - إطلالة على النيل', 'hotel', 'غرفة فاخرة بإطلالة رائعة على نهر النيل مع إفطار', 'الأقصر', 2500.00),
((SELECT id FROM public.suppliers WHERE name = 'مصر للطيران'), 'رحلة القاهرة - الأقصر', 'flight', 'رحلة طيران مباشرة من القاهرة إلى الأقصر', 'القاهرة - الأقصر', 1800.00),
((SELECT id FROM public.suppliers WHERE name = 'شركة النقل السياحي المتميز'), 'نقل من المطار إلى الفندق', 'transfer', 'خدمة نقل فاخرة بسيارة مكيفة', 'الأقصر', 300.00),
((SELECT id FROM public.suppliers WHERE name = 'رحلات الأهرامات السياحية'), 'جولة معابد الأقصر', 'tour', 'جولة شاملة لمعابد الكرنك والأقصر مع مرشد سياحي', 'الأقصر', 800.00);
