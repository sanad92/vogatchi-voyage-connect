-- تحديث جدول landing_content لدعم المزيد من الخصائص
ALTER TABLE landing_content 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS icon_name TEXT,
ADD COLUMN IF NOT EXISTS button_text TEXT,
ADD COLUMN IF NOT EXISTS button_link TEXT,
ADD COLUMN IF NOT EXISTS badge_text TEXT,
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS section_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}';

-- إنشاء جدول للصور المحملة
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

-- إنشاء جدول لإعدادات الموقع العامة
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

-- إدراج إعدادات افتراضية للموقع
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

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_landing_content_section_order ON landing_content(section, order_index);
CREATE INDEX IF NOT EXISTS idx_landing_images_section ON landing_images(section);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- سياسات الأمان
ALTER TABLE landing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- سياسات للصور
CREATE POLICY "Anyone can view active images" ON landing_images FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage images" ON landing_images FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    )
);

-- سياسات لإعدادات الموقع
CREATE POLICY "Anyone can view site settings" ON site_settings FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage site settings" ON site_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    )
);

-- تحديث محتوى المحتوى الموجود بترتيب
UPDATE landing_content SET 
    order_index = CASE 
        WHEN section = 'hero' THEN 1
        WHEN section = 'hero_subtitle' THEN 2
        WHEN section = 'services_title' THEN 3
        WHEN section = 'services_subtitle' THEN 4
        WHEN section = 'hotels_title' THEN 5
        WHEN section = 'hotels_subtitle' THEN 6
        ELSE 10
    END,
    section_type = CASE
        WHEN section LIKE '%title' THEN 'heading'
        WHEN section LIKE '%subtitle' THEN 'paragraph'
        ELSE 'text'
    END
WHERE order_index = 0;

-- trigger للـ updated_at
CREATE TRIGGER update_landing_images_updated_at BEFORE UPDATE ON landing_images FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();