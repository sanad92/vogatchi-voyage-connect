-- تحديث الصفحة الرئيسية بمحتوى فوجاتشي الحقيقي

-- تحديث معلومات الصفحة الرئيسية
UPDATE public.pages 
SET 
  name = 'الرئيسية - فوجاتشي للتسويق السياحي',
  description = 'شركة فوجاتشي للتسويق السياحي - وجهتك المثالية للسفر والسياحة',
  seo_title = 'فوجاتشي للتسويق السياحي - رحلات مميزة وخدمات سياحية شاملة',
  seo_description = 'اكتشف العالم مع فوجاتچي للتسويق السياحي. نقدم أفضل العروض للفنادق، الطيران، تأجير السيارات والرحلات السياحية بأسعار منافسة.',
  seo_keywords = ARRAY['فوجاتچي', 'سياحة', 'سفر', 'حجز فنادق', 'حجز طيران', 'رحلات سياحية', 'تأجير سيارات', 'عروض سفر'],
  updated_at = now()
WHERE slug = 'home';

-- حذف البلوك التجريبي القديم
DELETE FROM public.blocks WHERE page_id = (SELECT id FROM public.pages WHERE slug = 'home');

-- إضافة بلوك Hero الرئيسي
INSERT INTO public.blocks (page_id, type, content, layout_settings, style_settings, order_index, is_active)
VALUES (
  (SELECT id FROM public.pages WHERE slug = 'home'),
  'hero',
  '{
    "title": "مرحباً بك في فوجاتچي للتسويق السياحي",
    "subtitle": "رحلتك المثالية تبدأ من هنا",
    "description": "اكتشف العالم معنا واستمتع بأفضل العروض السياحية والخدمات المتميزة. فريقنا المختص يضمن لك تجربة سفر لا تُنسى.",
    "primary_button_text": "احجز رحلتك الآن",
    "primary_button_link": "/p/booking-request",
    "secondary_button_text": "تعرف علينا أكثر",
    "secondary_button_link": "/p/about",
    "background_image": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    "stats": [
      {"number": "15+", "label": "سنة خبرة"},
      {"number": "5000+", "label": "عميل سعيد"},
      {"number": "100+", "label": "وجهة سياحية"},
      {"number": "24/7", "label": "دعم فني"}
    ]
  }'::jsonb,
  '{
    "background_color": "transparent",
    "text_color": "white",
    "padding": "py-20",
    "container": "max-w-7xl"
  }'::jsonb,
  '{}'::jsonb,
  1,
  true
);

-- إضافة بلوك الخدمات الرئيسية
INSERT INTO public.blocks (page_id, type, content, layout_settings, style_settings, order_index, is_active)
VALUES (
  (SELECT id FROM public.pages WHERE slug = 'home'),
  'services',
  '{
    "section_title": "خدماتنا المتميزة",
    "section_description": "نقدم مجموعة شاملة من الخدمات السياحية لضمان رحلة مريحة وممتعة",
    "services": [
      {
        "id": "hotel-booking",
        "title": "حجز الفنادق",
        "description": "أفضل الفنادق في جميع أنحاء العالم بأسعار تنافسية ومواصفات عالية الجودة",
        "icon": "Building2",
        "button_text": "احجز الآن",
        "button_link": "/p/booking-request"
      },
      {
        "id": "flight-booking",
        "title": "حجز الطيران",
        "description": "رحلات جوية مريحة مع أفضل شركات الطيران وأسعار مناسبة لجميع الوجهات",
        "icon": "Plane",
        "button_text": "ابحث عن رحلات",
        "button_link": "/p/booking-request"
      },
      {
        "id": "car-rental",
        "title": "تأجير السيارات",
        "description": "استأجر سيارتك المثالية واستكشف وجهتك بحرية تامة وراحة كاملة",
        "icon": "Car",
        "button_text": "استأجر سيارة",
        "button_link": "/p/booking-request"
      },
      {
        "id": "tour-packages",
        "title": "الباقات السياحية",
        "description": "برامج سياحية متكاملة مصممة خصيصاً لتناسب احتياجاتك وميزانيتك",
        "icon": "MapPin",
        "button_text": "اكتشف الباقات",
        "button_link": "/p/booking-request"
      },
      {
        "id": "visa-services",
        "title": "خدمات التأشيرات",
        "description": "نساعدك في الحصول على التأشيرات المطلوبة بسهولة وسرعة",
        "icon": "FileCheck",
        "button_text": "طلب تأشيرة",
        "button_link": "/p/contact"
      },
      {
        "id": "travel-insurance",
        "title": "التأمين السياحي",
        "description": "احم نفسك ورحلتك بأفضل برامج التأمين السياحي الشامل",
        "icon": "Shield",
        "button_text": "اطلب التأمين",
        "button_link": "/p/contact"
      }
    ]
  }'::jsonb,
  '{
    "background_color": "background",
    "padding": "py-16",
    "container": "max-w-7xl"
  }'::jsonb,
  '{}'::jsonb,
  2,
  true
);

-- إضافة بلوك الإحصائيات
INSERT INTO public.blocks (page_id, type, content, layout_settings, style_settings, order_index, is_active)
VALUES (
  (SELECT id FROM public.pages WHERE slug = 'home'),
  'statistics',
  '{
    "section_title": "أرقام تتحدث عن نجاحنا",
    "stats": [
      {
        "number": "15+",
        "label": "سنة من الخبرة",
        "description": "في مجال السياحة والسفر"
      },
      {
        "number": "5,000+",
        "label": "عميل راضٍ",
        "description": "حول العالم"
      },
      {
        "number": "100+",
        "label": "وجهة سياحية",
        "description": "في قارات العالم الست"
      },
      {
        "number": "24/7",
        "label": "دعم فني",
        "description": "طوال أيام الأسبوع"
      },
      {
        "number": "98%",
        "label": "نسبة الرضا",
        "description": "من عملائنا الكرام"
      },
      {
        "number": "500+",
        "label": "شريك موثوق",
        "description": "من الفنادق وشركات الطيران"
      }
    ]
  }'::jsonb,
  '{
    "background_color": "secondary/10",
    "padding": "py-16",
    "container": "max-w-7xl"
  }'::jsonb,
  '{}'::jsonb,
  3,
  true
);

-- إضافة بلوك التواصل السريع
INSERT INTO public.blocks (page_id, type, content, layout_settings, style_settings, order_index, is_active)
VALUES (
  (SELECT id FROM public.pages WHERE slug = 'home'),
  'contact',
  '{
    "section_title": "هل تحتاج مساعدة؟ تواصل معنا الآن",
    "section_description": "فريق خدمة العملاء لدينا جاهز لمساعدتك في أي وقت",
    "contact_info": {
      "phone": "+966 50 123 4567",
      "whatsapp": "+966 50 123 4567",
      "email": "info@fugacity.com",
      "address": "الرياض، المملكة العربية السعودية",
      "working_hours": "السبت - الخميس: 9:00 ص - 6:00 م"
    },
    "show_contact_form": true,
    "show_map": false,
    "cta_text": "احجز استشارة مجانية",
    "cta_link": "/p/contact"
  }'::jsonb,
  '{
    "background_color": "primary/5",
    "padding": "py-16",
    "container": "max-w-7xl"
  }'::jsonb,
  '{}'::jsonb,
  4,
  true
);