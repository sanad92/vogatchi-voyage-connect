-- حذف البيانات الموجودة وإعادة إدخالها
DELETE FROM landing_content WHERE section IN ('hero', 'services', 'cities', 'contracts', 'contact');
DELETE FROM site_settings WHERE setting_key IN ('company_name', 'company_name_ar', 'phone_number', 'email', 'whatsapp_number', 'hero_background_image', 'primary_color', 'secondary_color', 'accent_color', 'website_title', 'website_description', 'facebook_url', 'instagram_url', 'twitter_url');

-- إدخال البيانات الأساسية لصفحة الهبوط
-- INSERT INTO landing_content (section, section_type, title, content, subtitle, badge_text, button_text, button_link, image_url, icon_name, is_active, order_index, layout_config, style_config) VALUES
-- قسم البطل الرئيسي
-- ('hero', 'hero', 'رحلتك المميزة تبدأ من هنا', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', 'Vogatchi Travel - وجهتك للسفر المميز', NULL, 'ابدأ المحادثة الآن', 'whatsapp', NULL, 'MessageSquare', true, 1, '{"background": "gradient", "layout": "centered"}', '{"textColor": "primary", "backgroundColor": "gradient-primary"}'),

-- شارات المصداقية
-- ('hero', 'badges', 'مرخص رسمياً', NULL, NULL, 'مرخص رسمياً', NULL, NULL, NULL, 'Shield', true, 2, '{}', '{"variant": "secondary"}'),
-- ('hero', 'badges', '+10,000 عميل راضي', NULL, NULL, '+10,000 عميل راضي', NULL, NULL, NULL, 'Users', true, 3, '{}', '{"variant": "secondary"}'),
-- ('hero', 'badges', 'تعاقد مباشر مع الفنادق', NULL, NULL, 'تعاقد مباشر مع الفنادق', NULL, NULL, NULL, 'Building2', true, 4, '{}', '{"variant": "secondary"}'),
-- ('hero', 'badges', 'خدمة 24/7', NULL, NULL, 'خدمة 24/7', NULL, NULL, NULL, 'Clock', true, 5, '{}', '{"variant": "secondary"}'),

-- الخدمات الرئيسية
-- ('services', 'service', 'حجز الفنادق', 'احجز أفضل الفنادق في مصر والعالم بأسعار تنافسية', NULL, NULL, 'احجز الآن', '/hotel-bookings', NULL, 'Hotel', true, 6, '{"columns": 3}', '{"iconColor": "blue-500"}'),
-- ('services', 'service', 'حجز الطيران', 'رحلات جوية مريحة لجميع الوجهات العالمية', NULL, NULL, 'احجز الآن', '/flight-bookings', NULL, 'Plane', true, 7, '{"columns": 3}', '{"iconColor": "green-500"}'),
-- ('services', 'service', 'تأجير السيارات', 'سيارات حديثة ومريحة لرحلتك', NULL, NULL, 'احجز الآن', '/car-rentals', NULL, 'Car', true, 8, '{"columns": 3}', '{"iconColor": "purple-500"}'),

-- قسم المدن
-- ('cities', 'section', 'اكتشف أجمل المدن', 'نقدم لك رحلات مميزة لأفضل الوجهات السياحية في مصر والعالم', NULL, NULL, 'استكشف المزيد', '/destinations', NULL, 'MapPin', true, 9, '{"background": "white"}', '{}'),

-- العقود المباشرة  
-- ('contracts', 'section', 'تعاقد مباشر مع أفضل الفنادق', 'نضمن لك أفضل الأسعار من خلال تعاقدنا المباشر مع الفنادق العالمية', NULL, NULL, 'تواصل معنا', 'whatsapp', NULL, 'Handshake', true, 10, '{"background": "gradient"}', '{}'),

-- نموذج الاتصال
-- ('contact', 'form', 'تواصل معنا', 'نحن هنا لمساعدتك في تخطيط رحلتك المثالية', 'احصل على استشارة مجانية', NULL, 'إرسال الرسالة', '/contact', NULL, 'Phone', true, 11, '{"background": "blue-50"}', '{}');

-- إعدادات الموقع الأساسية
-- INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
-- ('company_name', 'Vogatchi Travel', 'text', 'اسم الشركة', 'company', true),
-- ('company_name_ar', 'فوجاتشي للسياحة والسفر', 'text', 'اسم الشركة بالعربية', 'company', true),
-- ('phone_number', '+20 110 344 2881', 'text', 'رقم الهاتف الرئيسي', 'contact', true),
-- ('email', 'ops@vogatchitrips.com', 'email', 'البريد الإلكتروني', 'contact', true),
-- ('whatsapp_number', '201103442881', 'text', 'رقم الواتساب', 'contact', true),
-- ('hero_background_image', '/api/placeholder/1920/1080', 'url', 'صورة خلفية القسم الرئيسي', 'design', true),
-- ('primary_color', '#3B82F6', 'color', 'اللون الأساسي', 'design', true),
-- ('secondary_color', '#6366F1', 'color', 'اللون الثانوي', 'design', true),
-- ('accent_color', '#10B981', 'color', 'لون التمييز', 'design', true),
-- ('website_title', 'Vogatchi Travel - رحلتك تبدأ من هنا', 'text', 'عنوان الموقع', 'seo', true),
-- ('website_description', 'شركة Vogatchi للسياحة والسفر - نقدم أفضل العروض للفنادق والطيران وتأجير السيارات', 'text', 'وصف الموقع', 'seo', true),
-- ('facebook_url', 'https://facebook.com/vogatchitravel', 'url', 'رابط الفيسبوك', 'social', true),
-- ('instagram_url', 'https://instagram.com/vogatchitravel', 'url', 'رابط الانستغرام', 'social', true),
-- ('twitter_url', 'https://twitter.com/vogatchitravel', 'url', 'رابط تويتر', 'social', true);
