-- إنشاء محتوى حقيقي للصفحات الديناميكية
-- إدراج الصفحات إذا لم تكن موجودة

-- صفحة التواصل
INSERT INTO public.pages (slug, name, description, seo_title, seo_description, seo_keywords, is_active)
VALUES (
  'contact',
  'اتصل بنا',
  'تواصل معنا للحصول على أفضل خدمات السياحة والسفر',
  'اتصل بنا - شركة فوجاتشي للتسويق السياحي',
  'تواصل مع شركة فوجاتشي للتسويق السياحي عبر الهاتف أو البريد الإلكتروني. نحن هنا لخدمتك في جميع احتياجاتك السياحية.',
  '["اتصل بنا", "فوجاتشي", "سياحة", "سفر", "تواصل", "خدمة عملاء"]'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();

-- صفحة عنا
INSERT INTO public.pages (slug, name, description, seo_title, seo_description, seo_keywords, is_active)
VALUES (
  'about',
  'عنا',
  'تعرف على شركة فوجاتشي للتسويق السياحي وتاريخنا ورؤيتنا',
  'عن شركة فوجاتشي للتسويق السياحي - رحلات ووجهات مميزة',
  'تعرف على قصة شركة فوجاتشي للتسويق السياحي، مهمتنا ورؤيتنا في تقديم أفضل الخدمات السياحية.',
  '["عن فوجاتشي", "شركة سياحة", "تاريخ الشركة", "رؤية", "مهمة", "سفر"]'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();

-- صفحة طلب الحجز
INSERT INTO public.pages (slug, name, description, seo_title, seo_description, seo_keywords, is_active)
VALUES (
  'booking-request',
  'طلب حجز',
  'احجز رحلتك القادمة معنا بسهولة ويسر',
  'طلب حجز - احجز رحلتك مع فوجاتشي للتسويق السياحي',
  'احجز رحلتك القادمة مع شركة فوجاتشي. نقدم خدمات حجز الفنادق، الطيران، تأجير السيارات بأفضل الأسعار.',
  '["حجز رحلة", "حجز فندق", "حجز طيران", "رحلات سياحية", "فوجاتشي"]'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();