-- إنشاء جدول محتوى صفحة الهبوط
CREATE TABLE IF NOT EXISTS landing_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    background_image_url TEXT,
    icon_name TEXT,
    button_text TEXT,
    button_link TEXT,
    badge_text TEXT,
    subtitle TEXT,
    section_type TEXT DEFAULT 'text',
    layout_config JSONB DEFAULT '{}',
    style_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول طلبات الخدمة
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    service_type TEXT NOT NULL,
    message TEXT,
    preferred_contact TEXT DEFAULT 'phone',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الصور
CREATE TABLE IF NOT EXISTS landing_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    section TEXT,
    is_active BOOLEAN DEFAULT true,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج المحتوى الافتراضي
INSERT INTO landing_content (section, title, content, section_type, order_index, is_active) VALUES
('hero', 'رحلتك المميزة تبدأ من هنا', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', 'hero', 1, true),
('services', 'خدماتنا المميزة', 'نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك', 'section', 2, true),
('hotels', 'فنادق القاهرة الفاخرة', 'اكتشف أفضل الفنادق الخمس نجوم في القاهرة مع إمكانية الدفع عند الوصول', 'section', 3, true),
('contact', 'تواصل معنا', 'نحن هنا لخدمتك على مدار الساعة', 'section', 4, true)
ON CONFLICT DO NOTHING;

-- إدراج إعدادات الموقع الافتراضية
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'فوجاتشي للسياحة', 'text', 'اسم الشركة'),
('company_logo_url', '', 'image', 'شعار الشركة'),
('primary_phone', '201103442881', 'text', 'رقم الهاتف الأساسي'),
('whatsapp_number', '201103442881', 'text', 'رقم الواتساب'),
('email', 'info@vogatchi.com', 'email', 'البريد الإلكتروني'),
('address', 'القاهرة، مصر', 'text', 'العنوان'),
('hero_background_image', '', 'image', 'صورة خلفية الصفحة الرئيسية'),
('primary_color', '#3B82F6', 'color', 'اللون الأساسي'),
('secondary_color', '#8B5CF6', 'color', 'اللون الثانوي')
ON CONFLICT (setting_key) DO NOTHING;

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_landing_content_section_order ON landing_content(section, order_index);
CREATE INDEX IF NOT EXISTS idx_landing_images_section ON landing_images(section);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- تفعيل RLS
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
-- محتوى صفحة الهبوط
CREATE POLICY "Anyone can view active content" ON landing_content FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage content" ON landing_content FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- طلبات الخدمة
CREATE POLICY "Anyone can insert service requests" ON service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view service requests" ON service_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can update service requests" ON service_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin'))
);

-- الصور
CREATE POLICY "Anyone can view active images" ON landing_images FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage images" ON landing_images FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- إعدادات الموقع
CREATE POLICY "Anyone can view site settings" ON site_settings FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage site settings" ON site_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Triggers للـ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_landing_content_updated_at BEFORE UPDATE ON landing_content FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_landing_images_updated_at BEFORE UPDATE ON landing_images FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();