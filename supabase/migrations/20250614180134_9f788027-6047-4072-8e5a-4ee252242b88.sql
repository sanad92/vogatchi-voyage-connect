
-- تحديث جدول الموردين (إزالة العمولة وإضافة حقول جديدة)
ALTER TABLE public.suppliers 
DROP COLUMN IF EXISTS commission_rate,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS tax_number TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- تحديث جدول الخدمات لإزالة السعر الثابت ونضع نظام مرن
ALTER TABLE public.services
DROP COLUMN IF EXISTS base_price,
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'other' CHECK (service_category IN ('hotel', 'flight', 'transfer', 'car_rental', 'local_tour', 'other'));

-- إنشاء جدول بنود الفاتورة
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تحديث جدول الفواتير وإضافة المزيد من التفاصيل
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '30 days',
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 14.00,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal * vat_rate / 100) STORED;

-- إنشاء جدول الأسعار المرنة للعملاء
CREATE TABLE IF NOT EXISTS public.customer_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  custom_price DECIMAL(10,2) NOT NULL,
  profit_margin DECIMAL(5,2) DEFAULT 0.00,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, service_id, valid_from)
);

-- إنشاء جدول أوامر الدفع التلقائية
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  order_number TEXT UNIQUE NOT NULL DEFAULT ('PAY-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(EXTRACT(DOY FROM now())::TEXT, 3, '0') || '-' || LPAD(EXTRACT(HOUR FROM now())::TEXT, 2, '0') || LPAD(EXTRACT(MINUTE FROM now())::TEXT, 2, '0')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cash', 'credit_card', 'check')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  due_date DATE NOT NULL,
  payment_date DATE,
  bank_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول تسلسل أرقام الفواتير
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  prefix TEXT DEFAULT 'INV',
  UNIQUE(year)
);

-- إدراج السنة الحالية في جدول التسلسل
INSERT INTO public.invoice_sequences (year, last_number, prefix)
VALUES (EXTRACT(YEAR FROM now())::INTEGER, 0, 'INV')
ON CONFLICT DO NOTHING;

-- دالة لإنتاج رقم فاتورة تلقائي
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::INTEGER;
  
  -- التأكد من وجود السنة في الجدول
INSERT INTO public.invoice_sequences (year, last_number, prefix)
  VALUES (current_year, 0, 'INV')
  ON CONFLICT DO NOTHING;
  
  -- الحصول على الرقم التالي وتحديثه
  UPDATE public.invoice_sequences
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;
  
  -- تكوين رقم الفاتورة
  invoice_number := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$;

-- تفعيل Row Level Security للجداول الجديدة
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Enable all access for now" ON public.invoice_items FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.customer_pricing FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.payment_orders FOR ALL USING (true);
CREATE POLICY "Enable all access for now" ON public.invoice_sequences FOR ALL USING (true);

-- إدراج بيانات تجريبية للأسعار المرنة
-- INSERT INTO public.customer_pricing (customer_id, service_id, custom_price, profit_margin)
-- SELECT 
--   (SELECT id FROM public.customers LIMIT 1),
--   s.id,
--   CASE 
--     WHEN s.type = 'hotel' THEN 2000.00
--     WHEN s.type = 'flight' THEN 1500.00
--     WHEN s.type = 'transfer' THEN 250.00
--     ELSE 600.00
--   END,
--   15.00
-- FROM public.services s
-- WHERE EXISTS (SELECT 1 FROM public.customers);






