// أمثلة للمحتوى الحقيقي للصفحات المختلفة

export const createRealContentForPages = async () => {
  const pagesData = [
    {
      slug: 'contact',
      name: 'اتصل بنا',
      description: 'تواصل معنا للحصول على أفضل خدمات السياحة والسفر',
      seo_title: 'اتصل بنا - شركة فوجاتشي للتسويق السياحي',
      seo_description: 'تواصل مع شركة فوجاتشي للتسويق السياحي عبر الهاتف أو البريد الإلكتروني أو زيارة مكاتبنا. نحن هنا لخدمتك في جميع احتياجاتك السياحية.',
      seo_keywords: ['اتصل بنا', 'فوجاتشي', 'سياحة', 'سفر', 'تواصل', 'خدمة عملاء'],
      blocks: [
        {
          type: 'page_header',
          title: 'تواصل معنا',
          content: {
            title: 'تواصل معنا',
            subtitle: 'نحن هنا لخدمتك',
            description: 'فريقنا جاهز للإجابة على جميع استفساراتك وتقديم أفضل الخدمات السياحية'
          }
        },
        {
          type: 'company_info',
          title: 'معلومات التواصل',
          content: {
            show_address: true,
            show_phone: true,
            show_email: true,
            show_website: true,
            show_working_hours: true,
            working_hours: 'السبت - الخميس: 9:00 ص - 6:00 م\nالجمعة: مغلق',
            map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.4234!2d31.208!3d30.045!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzQyLjAiTiAzMcKwMTInMjguOCJF!5e0!3m2!1sar!2seg!4v1234567890!5m2!1sar!2seg'
          }
        },
        {
          type: 'contact_form',
          title: 'أرسل لنا رسالة',
          content: {
            form_title: 'أرسل لنا رسالة',
            form_description: 'املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن',
            form_fields: [
              {
                name: 'name',
                label: 'الاسم الكامل',
                type: 'text',
                required: true,
                placeholder: 'اكتب اسمك الكامل'
              },
              {
                name: 'email',
                label: 'البريد الإلكتروني',
                type: 'email',
                required: true,
                placeholder: 'مثال: your@email.com'
              },
              {
                name: 'phone',
                label: 'رقم الهاتف',
                type: 'tel',
                required: true,
                placeholder: 'مثال: +201234567890'
              },
              {
                name: 'subject',
                label: 'الموضوع',
                type: 'text',
                required: true,
                placeholder: 'موضوع الرسالة'
              },
              {
                name: 'message',
                label: 'الرسالة',
                type: 'textarea',
                required: true,
                placeholder: 'اكتب رسالتك هنا...'
              }
            ],
            submit_button_text: 'إرسال الرسالة',
            success_message: 'شكراً لتواصلك معنا! سنرد على رسالتك خلال 24 ساعة.'
          }
        }
      ]
    },
    {
      slug: 'about',
      name: 'عنا',
      description: 'تعرف على شركة فوجاتشي للتسويق السياحي وتاريخنا ورؤيتنا',
      seo_title: 'عن شركة فوجاتشي للتسويق السياحي - رحلات ووجهات مميزة',
      seo_description: 'تعرف على قصة شركة فوجاتشي للتسويق السياحي، مهمتنا ورؤيتنا في تقديم أفضل الخدمات السياحية والسفر إلى أجمل وجهات العالم.',
      seo_keywords: ['عن فوجاتشي', 'شركة سياحة', 'تاريخ الشركة', 'رؤية', 'مهمة', 'سفر'],
      blocks: [
        {
          type: 'page_header',
          title: 'عن شركة فوجاتشي',
          content: {
            title: 'عن شركة فوجاتشي للتسويق السياحي',
            subtitle: 'رحلتنا في عالم السياحة والسفر',
            description: 'اكتشف قصتنا وكيف نساعد آلاف المسافرين في تحقيق أحلامهم السياحية'
          }
        },
        {
          type: 'about_us',
          title: '',
          content: {
            main_title: 'مرحباً بكم في عالم فوجاتشي',
            main_description: 'نحن شركة رائدة في مجال السياحة والسفر، نقدم تجارب سياحية استثنائية ونساعد عملاءنا على اكتشاف أجمل وجهات العالم بأسعار تنافسية وخدمة متميزة.',
            company_story: 'تأسست شركة فوجاتشي للتسويق السياحي برؤية واضحة لتقديم خدمات سياحية متميزة تلبي احتياجات وتطلعات عملائنا. منذ انطلاقتنا، كنا نسعى لجعل كل رحلة تجربة لا تُنسى، ونفخر بأننا ساعدنا آلاف المسافرين في تحقيق أحلامهم السياحية.',
            mission_statement: 'مهمتنا هي تقديم أفضل الخدمات السياحية وتنظيم رحلات استثنائية تتجاوز توقعات عملائنا، مع الحرص على الجودة والاحترافية في كل تفصيل من رحلتك.',
            vision_statement: 'رؤيتنا أن نكون الخيار الأول للمسافرين في المنطقة العربية، ونساهم في تطوير صناعة السياحة من خلال الابتكار والتميز في الخدمة.',
            values: [
              'الجودة والاحترافية في كل خدمة',
              'خدمة العملاء المتميزة على مدار الساعة',
              'الشفافية والأمانة في التعامل',
              'الابتكار المستمر في الخدمات',
              'الالتزام بالمواعيد والوعود',
              'أسعار تنافسية وعادلة'
            ],
            show_statistics: true,
            statistics: [
              { number: '1500+', label: 'عميل سعيد', icon: 'users' },
              { number: '75+', label: 'وجهة سياحية', icon: 'map-pin' },
              { number: '8+', label: 'سنوات خبرة', icon: 'clock' },
              { number: '24/7', label: 'دعم العملاء', icon: 'award' }
            ]
          }
        }
      ]
    },
    {
      slug: 'booking-request',
      name: 'طلب حجز',
      description: 'احجز رحلتك القادمة معنا بسهولة ويسر',
      seo_title: 'طلب حجز - احجز رحلتك مع فوجاتشي للتسويق السياحي',
      seo_description: 'احجز رحلتك القادمة مع شركة فوجاتشي. نقدم خدمات حجز الفنادق، الطيران، تأجير السيارات، والرحلات السياحية بأفضل الأسعار.',
      seo_keywords: ['حجز رحلة', 'حجز فندق', 'حجز طيران', 'رحلات سياحية', 'فوجاتشي'],
      blocks: [
        {
          type: 'page_header',
          title: 'طلب حجز جديد',
          content: {
            title: 'احجز رحلتك القادمة',
            subtitle: 'خطوة واحدة نحو مغامرتك الجديدة',
            description: 'املأ النموذج أدناه وسيقوم فريقنا المتخصص بالتواصل معك لتأكيد الحجز وترتيب كافة التفاصيل'
          }
        },
        {
          type: 'booking_form',
          title: '',
          content: {
            form_title: 'نموذج طلب الحجز',
            form_description: 'يرجى ملء جميع البيانات المطلوبة بدقة لضمان معالجة طلبك بأفضل شكل ممكن',
            booking_types: ['flight', 'hotel', 'car_rental', 'tour_package'],
            success_message: 'تم إرسال طلب الحجز بنجاح! سنتواصل معك خلال ساعة واحدة لتأكيد الحجز.',
            whatsapp_integration: true
          }
        }
      ]
    }
  ];

  return pagesData;
};

// دالة لإنشاء محتوى تجريبي لصفحة معينة
export const createPageContent = (slug: string) => {
  const pagesData: any = {
    'contact': {
      blocks: [
        {
          type: 'company_info',
          title: 'معلومات التواصل',
          content: {
            show_address: true,
            show_phone: true,
            show_email: true,
            show_website: true,
            show_working_hours: true,
            working_hours: 'السبت - الخميس: 9:00 ص - 6:00 م',
            map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.4234!2d31.208!3d30.045!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1'
          }
        },
        {
          type: 'contact_form',
          title: 'تواصل معنا',
          content: {
            form_title: 'أرسل لنا رسالة',
            form_description: 'نحن هنا لخدمتك في أي وقت',
            form_fields: [
              { name: 'name', label: 'الاسم', type: 'text', required: true, placeholder: 'اسمك الكامل' },
              { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, placeholder: 'your@email.com' },
              { name: 'phone', label: 'الهاتف', type: 'tel', required: true, placeholder: '+20123456789' },
              { name: 'message', label: 'الرسالة', type: 'textarea', required: true, placeholder: 'اكتب رسالتك هنا...' }
            ],
            submit_button_text: 'إرسال الرسالة',
            success_message: 'شكراً لتواصلك معنا!'
          }
        }
      ]
    },
    'about': {
      blocks: [
        {
          type: 'about_us',
          title: 'عن شركة فوجاتشي',
          content: {
            main_title: 'شركة فوجاتشي للتسويق السياحي',
            main_description: 'رائدون في عالم السياحة والسفر',
            show_statistics: true
          }
        }
      ]
    }
  };

  return pagesData[slug] || { blocks: [] };
};