-- إنشاء جدول محتوى صفحة الهبوط
CREATE TABLE landing_content (
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
CREATE TABLE service_requests (
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
CREATE TABLE landing_images (
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
CREATE TABLE site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إضافة بيانات افتراضية
INSERT INTO landing_content (section, title, content, section_type, order_index) VALUES
('hero', 'رحلتك المميزة تبدأ من هنا', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', 'hero', 1),
('services', 'خدماتنا المميزة', 'نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك', 'section', 2),
('hotels', 'فنادق القاهرة الفاخرة', 'اكتشف أفضل الفنادق الخمس نجوم في القاهرة مع إمكانية الدفع عند الوصول', 'section', 3),
('contact', 'تواصل معنا', 'نحن هنا لخدمتك على مدار الساعة', 'section', 4);

INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'فوجاتشي للسياحة', 'text', 'اسم الشركة'),
('primary_phone', '201103442881', 'text', 'رقم الهاتف الأساسي'),
('whatsapp_number', '201103442881', 'text', 'رقم الواتساب'),
('email', 'info@vogatchi.com', 'email', 'البريد الإلكتروني'),
('address', 'القاهرة، مصر', 'text', 'العنوان'),
('primary_color', '#3B82F6', 'color', 'اللون الأساسي'),
('secondary_color', '#8B5CF6', 'color', 'اللون الثانوي');