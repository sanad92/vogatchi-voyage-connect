import type { BlockData } from '@/types/blocks';

export const getExampleBlocks = (): { [key: string]: BlockData[] } => {
  return {
    'auth': [
      {
        id: 'auth-form-1',
        type: 'auth_form',
        title: 'نموذج تسجيل الدخول',
        section: 'main',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          form_type: 'login_only',
          show_social_login: false,
          redirect_after_login: '/dashboard',
          terms_text: 'بتسجيل الدخول، أنت توافق على شروط الاستخدام وسياسة الخصوصية'
        },
        layout_settings: {
          container_width: 'narrow',
          padding_y: 'xl',
          text_align: 'center'
        },
        style_settings: {
          background_color: 'primary',
          text_color: 'primary-foreground'
        }
      }
    ],
    'about': [
      {
        id: 'about-header-1',
        type: 'page_header',
        title: 'رأس صفحة من نحن',
        section: 'header',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          title: 'من نحن',
          subtitle: 'تعرف على قصتنا ورؤيتنا',
          description: 'نحن شركة رائدة في مجال السياحة والسفر، نقدم خدمات متميزة لعملائنا منذ أكثر من 10 سنوات.',
          show_breadcrumb: true,
          breadcrumb_items: [
            { label: 'الرئيسية', url: '/' },
            { label: 'من نحن', url: '/about' }
          ]
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'center'
        },
        style_settings: {
          background_color: 'secondary',
          text_color: 'secondary-foreground'
        }
      },
      {
        id: 'about-content-1',
        type: 'text_content',
        title: 'محتوى صفحة من نحن',
        section: 'content',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          content_html: `
            <h2>رؤيتنا</h2>
            <p>أن نكون الوكالة السياحية الأولى في المنطقة، ونقدم تجارب سفر لا تُنسى لعملائنا.</p>
            
            <h2>مهمتنا</h2>
            <p>تقديم خدمات سياحية متكاملة وعالية الجودة تلبي احتياجات وتطلعات عملائنا.</p>
            
            <h2>قيمنا</h2>
            <ul>
              <li>الجودة والتميز في الخدمة</li>
              <li>الشفافية والصدق مع العملاء</li>
              <li>الابتكار في تقديم الحلول السياحية</li>
              <li>الاحترافية في التعامل</li>
            </ul>
          `,
          show_table_of_contents: true
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'right'
        },
        style_settings: {
          background_color: 'background',
          text_color: 'foreground'
        }
      }
    ],
    'contact': [
      {
        id: 'contact-header-1',
        type: 'page_header',
        title: 'رأس صفحة تواصل معنا',
        section: 'header',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          title: 'تواصل معنا',
          subtitle: 'نحن هنا لمساعدتك',
          description: 'تواصل معنا عبر الطرق التالية، وسنكون سعداء للرد على استفساراتك.',
          show_breadcrumb: true,
          breadcrumb_items: [
            { label: 'الرئيسية', url: '/' },
            { label: 'تواصل معنا', url: '/contact' }
          ]
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'center'
        },
        style_settings: {
          background_color: 'primary',
          text_color: 'primary-foreground'
        }
      },
      {
        id: 'contact-content-1',
        type: 'text_content',
        title: 'محتوى صفحة تواصل معنا',
        section: 'content',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          content_html: `
            <div class="grid md:grid-cols-2 gap-8">
              <div>
                <h3>معلومات الاتصال</h3>
                <div class="space-y-4">
                  <div class="flex items-center gap-3">
                    <span class="text-primary">📞</span>
                    <span>+966 11 123 4567</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-primary">📧</span>
                    <span>hello@vogantra.com</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-primary">📍</span>
                    <span>الرياض، المملكة العربية السعودية</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-primary">🕒</span>
                    <span>السبت - الخميس: 9:00 ص - 6:00 م</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3>خدماتنا</h3>
                <ul class="space-y-2">
                  <li>حجز الطيران</li>
                  <li>حجز الفنادق</li>
                  <li>تأجير السيارات</li>
                  <li>الرحلات السياحية</li>
                  <li>خدمات النقل</li>
                </ul>
              </div>
            </div>
          `,
          show_table_of_contents: false
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'right'
        },
        style_settings: {
          background_color: 'background',
          text_color: 'foreground'
        }
      }
    ],
    'booking-request': [
      {
        id: 'booking-header-1',
        type: 'page_header',
        title: 'رأس صفحة طلب حجز',
        section: 'header',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          title: 'طلب حجز',
          subtitle: 'احجز رحلتك الآن',
          description: 'املأ النموذج التالي وسنتواصل معك خلال 24 ساعة لتأكيد حجزك.',
          show_breadcrumb: true,
          breadcrumb_items: [
            { label: 'الرئيسية', url: '/' },
            { label: 'طلب حجز', url: '/booking-request' }
          ]
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'center'
        },
        style_settings: {
          background_color: 'primary',
          text_color: 'primary-foreground'
        }
      },
      {
        id: 'booking-form-1',
        type: 'booking_form',
        title: 'نموذج طلب الحجز',
        section: 'form',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: {
          form_title: 'نموذج طلب الحجز',
          form_description: 'يرجى ملء جميع البيانات المطلوبة بدقة لضمان معالجة طلبك بأفضل شكل ممكن.',
          booking_types: ['flight', 'hotel', 'car_rental', 'tour_package'],
          success_message: 'تم إرسال طلب الحجز بنجاح. سنتواصل معك قريباً!',
          whatsapp_integration: true
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'lg',
          text_align: 'center'
        },
        style_settings: {
          background_color: 'background',
          text_color: 'foreground'
        }
      }
    ]
  };
};

export const getExamplePage = (slug: string) => {
  const examples = getExampleBlocks();
  return examples[slug] || [];
};

// دليل استعمال CMS
export const cmsGuide = {
  blockTypes: {
    'hero': {
      name: 'بلوك البطل (Hero)',
      description: 'قسم رئيسي في أعلى الصفحة مع عنوان وصورة',
      useCase: 'مثالي للصفحة الرئيسية أو صفحات الهبوط'
    },
    'page_header': {
      name: 'رأس الصفحة',
      description: 'عنوان الصفحة مع التنقل التفصيلي (breadcrumb)',
      useCase: 'مثالي لجميع الصفحات الداخلية'
    },
    'text_content': {
      name: 'محتوى نصي',
      description: 'محتوى HTML كامل مع إمكانيات تنسيق متقدمة',
      useCase: 'للمقالات والصفحات النصية الطويلة'
    },
    'auth_form': {
      name: 'نموذج المصادقة',
      description: 'نموذج تسجيل الدخول والتسجيل',
      useCase: 'صفحة تسجيل الدخول'
    },
    'booking_form': {
      name: 'نموذج الحجز',
      description: 'نموذج طلب حجز متكامل',
      useCase: 'صفحات طلب الخدمات'
    },
    'feature_list': {
      name: 'قائمة المميزات',
      description: 'عرض المميزات والخدمات بشكل منظم',
      useCase: 'صفحات الخدمات وعرض المميزات'
    }
  },
  
  layoutSettings: {
    container_width: {
      'narrow': 'ضيق (مثالي للنماذج)',
      'container': 'عادي (الافتراضي)',
      'full': 'كامل العرض'
    },
    padding_y: {
      'none': 'بدون مسافة',
      'sm': 'صغير',
      'md': 'متوسط',
      'lg': 'كبير (الافتراضي)',
      'xl': 'كبير جداً'
    },
    text_align: {
      'left': 'يسار',
      'center': 'وسط',
      'right': 'يمين (الافتراضي)'
    }
  },
  
  tips: [
    'استعمل "page_header" في بداية كل صفحة للتناسق',
    'اختر عرض الحاوية المناسب: ضيق للنماذج، عادي للمحتوى',
    'استعمل المسافات المناسبة لفصل المحتوى بوضوح',
    'تأكد من تفعيل البلوكات بعد إنشائها',
    'يمكن إعادة ترتيب البلوكات بتغيير "order_index"'
  ]
};