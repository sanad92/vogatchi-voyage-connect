
-- نظام الإعدادات
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage system_settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- طلبات إنشاء المستخدمين
CREATE TABLE IF NOT EXISTS public.user_creation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  department TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  requested_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage user_creation_requests" ON public.user_creation_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- جداول CMS
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  success_message TEXT DEFAULT 'تم الإرسال بنجاح',
  failure_message TEXT DEFAULT 'فشل في الإرسال',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage forms" ON public.forms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  options JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage form_fields" ON public.form_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- إضافة عمود payment_status للفواتير
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- إضافة أعمدة مفقودة لمدفوعات الموردين
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS amount_in_egp DECIMAL(12,2);

-- إضافة بيانات إعدادات افتراضية
-- INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
--   ('site_name', 'Vogatchi CRM', 'string', 'اسم الموقع', true),
--   ('site_description', 'نظام إدارة وكالة السفر', 'string', 'وصف الموقع', true),
--   ('company_name', 'Vogatchi Trips', 'string', 'اسم الشركة', true),
--   ('company_phone', '01103442881', 'string', 'هاتف الشركة', true),
--   ('company_email', 'ops@vogatchitrips.com', 'string', 'بريد الشركة', true),
--   ('company_address', 'القاهرة، مصر', 'string', 'عنوان الشركة', true)
-- ON CONFLICT (setting_key) DO NOTHING;

-- وظيفة تحديث حالة الحجز
CREATE OR REPLACE FUNCTION public.update_booking_status(
  booking_id_param UUID,
  booking_type_param TEXT,
  new_status_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF booking_type_param = 'hotel' THEN
    UPDATE public.hotel_bookings SET status_id = new_status_id, updated_at = now() WHERE id = booking_id_param;
  ELSIF booking_type_param = 'flight' THEN
    UPDATE public.flight_bookings SET status_id = new_status_id, updated_at = now() WHERE id = booking_id_param;
  ELSIF booking_type_param = 'transport' THEN
    UPDATE public.transport_bookings SET status_id = new_status_id, updated_at = now() WHERE id = booking_id_param;
  ELSIF booking_type_param = 'car_rental' THEN
    UPDATE public.car_rentals SET status_id = new_status_id, updated_at = now() WHERE id = booking_id_param;
  END IF;
  RETURN TRUE;
END;
$$;

-- وظيفة توليد رقم فاتورة
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.invoices;
  new_number := 'INV-' || to_char(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$;

-- وظيفة تحديث إعداد النظام
DROP FUNCTION IF EXISTS public.update_system_setting(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_system_setting(
  setting_key_param TEXT,
  setting_value_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
-- INSERT INTO public.system_settings (setting_key, setting_value)
--   VALUES (setting_key_param, setting_value_param)
--   ON CONFLICT (setting_key) DO UPDATE SET setting_value = setting_value_param, updated_at = now();
  RETURN TRUE;
END;
$$;

-- وظيفة الحصول على العملاء المكررين
CREATE OR REPLACE FUNCTION public.get_duplicate_customers()
RETURNS TABLE(phone TEXT, count BIGINT, customer_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.phone, COUNT(c.id) as count, ARRAY_AGG(c.id) as customer_ids
  FROM public.customers c
  WHERE c.phone IS NOT NULL AND c.phone != ''
  GROUP BY c.phone
  HAVING COUNT(c.id) > 1;
END;
$$;
