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

-- تحديث landing_content إذا كان موجوداً وإضافة الأعمدة الجديدة
DO $$
BEGIN
    -- إضافة أعمدة جديدة إن لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'order_index') THEN
        ALTER TABLE landing_content ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'background_image_url') THEN
        ALTER TABLE landing_content ADD COLUMN background_image_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'icon_name') THEN
        ALTER TABLE landing_content ADD COLUMN icon_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'button_text') THEN
        ALTER TABLE landing_content ADD COLUMN button_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'button_link') THEN
        ALTER TABLE landing_content ADD COLUMN button_link TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'badge_text') THEN
        ALTER TABLE landing_content ADD COLUMN badge_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'subtitle') THEN
        ALTER TABLE landing_content ADD COLUMN subtitle TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'section_type') THEN
        ALTER TABLE landing_content ADD COLUMN section_type TEXT DEFAULT 'text';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'layout_config') THEN
        ALTER TABLE landing_content ADD COLUMN layout_config JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landing_content' AND column_name = 'style_config') THEN
        ALTER TABLE landing_content ADD COLUMN style_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- إضافة بيانات افتراضية إذا كانت الجداول فارغة
INSERT INTO landing_content (section, title, content, section_type, order_index)
SELECT 'hero', 'رحلتك المميزة تبدأ من هنا', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', 'hero', 1
WHERE NOT EXISTS (SELECT 1 FROM landing_content WHERE section = 'hero');

INSERT INTO landing_content (section, title, content, section_type, order_index)
SELECT 'services', 'خدماتنا المميزة', 'نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك', 'section', 2
WHERE NOT EXISTS (SELECT 1 FROM landing_content WHERE section = 'services');

INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
SELECT 'company_name', 'فوجاتشي للسياحة', 'text', 'اسم الشركة'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE setting_key = 'company_name');

INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
SELECT 'primary_phone', '201103442881', 'text', 'رقم الهاتف الأساسي'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE setting_key = 'primary_phone');