
-- إنشاء جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الإعدادات الافتراضية
-- INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description) VALUES
-- ('site_name', 'Vogatchi CRM', 'text', 'اسم الموقع'),
-- ('site_description', 'نظام إدارة علاقات العملاء', 'text', 'وصف الموقع'),
-- ('company_name', 'شركة Vogatchi للسياحة', 'text', 'اسم الشركة'),
-- ('company_address', 'القاهرة، مصر', 'text', 'عنوان الشركة'),
-- ('company_phone', '+20 110 344 2881', 'text', 'هاتف الشركة'),
-- ('company_email', 'ops@vogatchitrips.com', 'email', 'إيميل الشركة'),
-- ('logo_url', '', 'url', 'رابط لوجو الموقع');

-- إنشاء جدول طلبات الخدمة
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_type TEXT NOT NULL,
  message TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'phone',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS على الجداول
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول للإعدادات (قراءة عامة، كتابة للأدمن فقط)
DROP POLICY IF EXISTS "Allow read access to site settings" ON public.site_settings;
CREATE POLICY "Allow read access to site settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to manage site settings" ON public.site_settings;
CREATE POLICY "Allow admin to manage site settings" ON public.site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- سياسات الوصول لطلبات الخدمة (إدراج عام، إدارة للأدمن)
DROP POLICY IF EXISTS "Allow insert service requests" ON public.service_requests;
CREATE POLICY "Allow insert service requests" ON public.service_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to view service requests" ON public.service_requests;
CREATE POLICY "Allow admin to view service requests" ON public.service_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Allow admin to update service requests" ON public.service_requests;
CREATE POLICY "Allow admin to update service requests" ON public.service_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at 
    BEFORE UPDATE ON public.site_settings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER update_service_requests_updated_at 
    BEFORE UPDATE ON public.service_requests 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
