-- Create general pages
INSERT INTO public.pages (slug, name, description, is_active, seo_title, seo_description, seo_keywords) VALUES 
('auth', 'تسجيل الدخول', 'صفحة تسجيل الدخول والتسجيل الجديد', true, 'تسجيل الدخول - وكالة السفر', 'قم بتسجيل الدخول للوصول لحسابك أو إنشاء حساب جديد', ARRAY['تسجيل دخول', 'حساب جديد', 'دخول']),
('about', 'من نحن', 'معلومات عن الشركة وخدماتها', true, 'من نحن - وكالة السفر', 'تعرف على وكالة السفر وخبرتنا في مجال السياحة والسفر', ARRAY['من نحن', 'الشركة', 'خبرة', 'سفر']),
('contact', 'اتصل بنا', 'طرق التواصل مع وكالة السفر', true, 'اتصل بنا - وكالة السفر', 'تواصل معنا للاستفسار عن خدماتنا أو للحصول على المساعدة', ARRAY['اتصل بنا', 'تواصل', 'استفسار', 'مساعدة']),
('booking-request', 'طلب حجز', 'نموذج طلب حجز جديد', true, 'طلب حجز - وكالة السفر', 'قدم طلب حجز للفنادق والطيران مع أفضل الأسعار', ARRAY['طلب حجز', 'حجز فندق', 'حجز طيران', 'أسعار'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords;

-- Create auth page blocks
INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'page_header',
  'مرحباً بك',
  jsonb_build_object(
    'main_title', 'تسجيل الدخول',
    'subtitle', 'ادخل إلى حسابك أو أنشئ حساب جديد',
    'show_breadcrumb', false
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'lg',
    'text_align', 'center',
    'background_type', 'gradient'
  ),
  jsonb_build_object(
    'background_color', 'from-primary/10 to-secondary/10'
  ),
  true,
  0,
  'header'
FROM public.pages p WHERE p.slug = 'auth'
ON CONFLICT DO NOTHING;

INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'auth_form',
  'نموذج المصادقة',
  jsonb_build_object(
    'form_type', 'login_register',
    'show_social_login', true,
    'redirect_after_login', '/dashboard',
    'terms_text', 'بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية'
  ),
  jsonb_build_object(
    'container_width', 'narrow',
    'padding_y', 'xl',
    'text_align', 'center'
  ),
  jsonb_build_object(),
  true,
  1,
  'main'
FROM public.pages p WHERE p.slug = 'auth'
ON CONFLICT DO NOTHING;

-- Create about page blocks
INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'page_header',
  'من نحن',
  jsonb_build_object(
    'main_title', 'وكالة السفر الرائدة',
    'subtitle', 'خبرة تمتد لسنوات في خدمة عملائنا الكرام',
    'description', 'نحن نقدم أفضل خدمات السفر والسياحة مع ضمان الجودة والأسعار التنافسية'
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl',
    'text_align', 'center',
    'background_type', 'gradient'
  ),
  jsonb_build_object(
    'background_color', 'from-primary/5 to-secondary/5'
  ),
  true,
  0,
  'header'
FROM public.pages p WHERE p.slug = 'about'
ON CONFLICT DO NOTHING;

INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'text_content',
  'قصتنا',
  jsonb_build_object(
    'content', '<h2>تأسست وكالتنا لتقديم خدمات سفر متميزة</h2><p>منذ تأسيسها، تسعى وكالة السفر لتقديم أفضل الخدمات في مجال السياحة والسفر. نحن نؤمن بأن السفر ليس مجرد انتقال من مكان لآخر، بل تجربة تثري الحياة وتوسع الآفاق.</p><p>فريقنا المتخصص يعمل على مدار الساعة لضمان حصولكم على أفضل العروض والخدمات، سواء كان ذلك في حجز الفنادق، الطيران، أو تنظيم الرحلات السياحية.</p>',
    'heading_level', 2
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'lg'
  ),
  jsonb_build_object(),
  true,
  1,
  'content'
FROM public.pages p WHERE p.slug = 'about'
ON CONFLICT DO NOTHING;

INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'feature_list',
  'خدماتنا المتميزة',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('title', 'خبرة متميزة', 'description', 'سنوات من الخبرة في مجال السفر والسياحة', 'icon', 'award'),
      jsonb_build_object('title', 'أسعار تنافسية', 'description', 'نقدم أفضل الأسعار في السوق مع ضمان الجودة', 'icon', 'dollar-sign'),
      jsonb_build_object('title', 'خدمة عملاء 24/7', 'description', 'فريق دعم متاح على مدار الساعة لخدمتكم', 'icon', 'headphones'),
      jsonb_build_object('title', 'حجز سريع وآمن', 'description', 'نظام حجز إلكتروني آمن وسهل الاستخدام', 'icon', 'shield')
    )
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl',
    'columns', 2,
    'grid_gap', 'lg'
  ),
  jsonb_build_object(),
  true,
  2,
  'features'
FROM public.pages p WHERE p.slug = 'about'
ON CONFLICT DO NOTHING;

-- Create contact page blocks
INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'page_header',
  'اتصل بنا',
  jsonb_build_object(
    'main_title', 'تواصل معنا',
    'subtitle', 'نحن هنا لمساعدتك في جميع احتياجاتك',
    'description', 'لا تتردد في التواصل معنا للاستفسار أو الحصول على المساعدة'
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl',
    'text_align', 'center',
    'background_type', 'gradient'
  ),
  jsonb_build_object(
    'background_color', 'from-primary/5 to-secondary/5'
  ),
  true,
  0,
  'header'
FROM public.pages p WHERE p.slug = 'contact'
ON CONFLICT DO NOTHING;

INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'contact',
  'نموذج التواصل',
  jsonb_build_object(
    'section_title', 'راسلنا',
    'section_description', 'أرسل لنا رسالة وسنرد عليك في أقرب وقت',
    'form_fields', jsonb_build_array(
      jsonb_build_object('name', 'name', 'label', 'الاسم', 'type', 'text', 'required', true, 'placeholder', 'أدخل اسمك الكامل'),
      jsonb_build_object('name', 'email', 'label', 'البريد الإلكتروني', 'type', 'email', 'required', true, 'placeholder', 'your@email.com'),
      jsonb_build_object('name', 'phone', 'label', 'رقم الهاتف', 'type', 'tel', 'required', false, 'placeholder', '+966xxxxxxxxx'),
      jsonb_build_object('name', 'subject', 'label', 'الموضوع', 'type', 'text', 'required', true, 'placeholder', 'موضوع الرسالة'),
      jsonb_build_object('name', 'message', 'label', 'الرسالة', 'type', 'textarea', 'required', true, 'placeholder', 'اكتب رسالتك هنا...')
    ),
    'submit_button_text', 'إرسال الرسالة',
    'success_message', 'تم إرسال رسالتك بنجاح، سنتواصل معك قريباً'
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl',
    'columns', 2,
    'grid_gap', 'xl'
  ),
  jsonb_build_object(),
  true,
  1,
  'main'
FROM public.pages p WHERE p.slug = 'contact'
ON CONFLICT DO NOTHING;

-- Create booking request page blocks
INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'page_header',
  'طلب حجز',
  jsonb_build_object(
    'main_title', 'طلب حجز جديد',
    'subtitle', 'احصل على أفضل العروض والأسعار',
    'description', 'املأ النموذج وسنتواصل معك خلال 24 ساعة بأفضل العروض المتاحة'
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl',
    'text_align', 'center',
    'background_type', 'gradient'
  ),
  jsonb_build_object(
    'background_color', 'from-primary/5 to-secondary/5'
  ),
  true,
  0,
  'header'
FROM public.pages p WHERE p.slug = 'booking-request'
ON CONFLICT DO NOTHING;

INSERT INTO public.blocks (page_id, type, title, content, layout_settings, style_settings, is_active, order_index, section) 
SELECT 
  p.id,
  'booking_form',
  'نموذج طلب الحجز',
  jsonb_build_object(
    'form_title', 'تفاصيل طلب الحجز',
    'form_description', 'يرجى ملء جميع البيانات المطلوبة للحصول على أفضل عرض',
    'booking_types', jsonb_build_array('فندق', 'طيران', 'فندق + طيران', 'عمرة', 'حج', 'رحلة سياحية'),
    'success_message', 'تم إرسال طلبك بنجاح! سنتواصل معك خلال 24 ساعة',
    'whatsapp_integration', true
  ),
  jsonb_build_object(
    'container_width', 'container',
    'padding_y', 'xl'
  ),
  jsonb_build_object(),
  true,
  1,
  'main'
FROM public.pages p WHERE p.slug = 'booking-request'
ON CONFLICT DO NOTHING;