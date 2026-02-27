<?php
require_once 'config/database.php';
require_once 'classes/Database.php';

$db = Database::getInstance();

// جلب إعدادات الموقع
$settings = [];
$settingsData = $db->select("SELECT setting_key, setting_value FROM site_settings");
foreach ($settingsData as $setting) {
    $settings[$setting['setting_key']] = $setting['setting_value'];
}

// جلب محتوى صفحة الهبوط
$heroContent = $db->selectOne("SELECT * FROM landing_content WHERE section = 'hero' AND section_type = 'hero' AND is_active = 1");
$badges = $db->select("SELECT * FROM landing_content WHERE section = 'hero' AND section_type = 'badges' AND is_active = 1 ORDER BY order_index");
$services = $db->select("SELECT * FROM landing_content WHERE section = 'services' AND section_type = 'service' AND is_active = 1 ORDER BY order_index");
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $settings['website_title'] ?? 'Hostretor.online — Travel ERP System'; ?></title>
    <meta name="description" content="<?php echo $settings['website_description'] ?? ''; ?>">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    screens: {
                        mobile: '0px',
                        tablet: '768px',
                        laptop: '1024px',
                        desktop: '1280px',
                        ultrawide: '1600px'
                    },
                    colors: {
                        primary: '<?php echo $settings['primary_color'] ?? '#3B82F6'; ?>',
                        secondary: '<?php echo $settings['secondary_color'] ?? '#6366F1'; ?>',
                        accent: '<?php echo $settings['accent_color'] ?? '#10B981'; ?>'
                    }
                }
            }
        }
    </script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, <?php echo $settings['primary_color'] ?? '#3B82F6'; ?>, <?php echo $settings['secondary_color'] ?? '#6366F1'; ?>);
        }
        .hover-scale {
            transition: transform 0.3s ease;
        }
        .hover-scale:hover {
            transform: scale(1.05);
        }
        .animate-fade-in {
            animation: fadeIn 1s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="font-sans bg-gray-50 overflow-x-hidden">

    <!-- Header -->
    <header class="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 space-x-reverse">
                    <div class="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center shadow-lg">
                        <span class="text-white font-bold text-xl"><?php echo substr($settings['company_name'] ?? 'V', 0, 1); ?></span>
                    </div>
                    <span class="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        <?php echo $settings['company_name_ar'] ?? 'فوجاتشي للسياحة'; ?>
                    </span>
                </div>
                <div class="flex items-center space-x-4 space-x-reverse">
                    <div class="hidden tablet:flex items-center space-x-2 space-x-reverse text-gray-600">
                        <i class="fas fa-phone h-5 w-5"></i>
                        <span class="font-medium"><?php echo $settings['phone_number'] ?? ''; ?></span>
                    </div>
                    <div class="hidden tablet:flex items-center space-x-2 space-x-reverse text-gray-600">
                        <i class="fas fa-envelope h-5 w-5"></i>
                        <span class="font-medium"><?php echo $settings['email'] ?? ''; ?></span>
                    </div>
                    <button onclick="openWhatsApp()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <i class="fab fa-whatsapp h-4 w-4"></i>
                        واتساب
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="relative py-20 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10"></div>
        <div class="container mx-auto px-4 relative">
            <div class="text-center max-w-4xl mx-auto animate-fade-in">
                <h1 class="text-4xl tablet:text-5xl laptop:text-6xl font-bold text-gray-900 mb-6 break-words">
                    <?php echo $heroContent['title'] ?? 'رحلتك المميزة تبدأ من هنا'; ?>
                    <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent block">
                        <?php echo $settings['company_name_ar'] ?? 'فوجاتشي للسياحة'; ?>
                    </span>
                </h1>
                <p class="text-xl text-gray-600 mb-8 leading-relaxed">
                    <?php echo $heroContent['content'] ?? 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر'; ?>
                </p>
                
                <?php if (!empty($badges)): ?>
                <div class="flex flex-wrap justify-center gap-4 mb-12">
                    <?php foreach ($badges as $badge): ?>
                    <span class="bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                        <i class="fas fa-shield-alt text-blue-600"></i>
                        <?php echo $badge['badge_text'] ?? $badge['title']; ?>
                    </span>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
                
                <!-- WhatsApp CTA -->
                <div class="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
                    <div class="flex items-center justify-center gap-3 mb-3">
                        <i class="fab fa-whatsapp text-green-600 text-2xl"></i>
                        <i class="fas fa-bolt text-yellow-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-green-800 mb-2">
                        تواصل معنا عبر الواتساب الآن واحصل على خصم فوري!
                    </h3>
                    <p class="text-green-700 mb-4">
                        استشارة مجانية وعروض حصرية لعملاء الواتساب
                    </p>
                    <button onclick="openWhatsApp()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-lg">
                        <i class="fab fa-whatsapp mr-2"></i>
                        ابدأ المحادثة الآن
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section class="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div class="container mx-auto px-4">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">خدماتنا المميزة</h2>
                <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                    نقدم لك مجموعة شاملة من الخدمات السياحية لجعل رحلتك مثالية
                </p>
            </div>
            <div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 tablet:gap-8 max-w-5xl mx-auto">
                <?php foreach ($services as $service): ?>
                <div class="bg-white/80 backdrop-blur-sm rounded-lg p-8 text-center shadow-lg hover-scale">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-hotel text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4"><?php echo $service['title']; ?></h3>
                    <p class="text-gray-600 leading-relaxed mb-6"><?php echo $service['content']; ?></p>
                    <?php if ($service['button_text'] && $service['button_link']): ?>
                    <button onclick="handleServiceClick('<?php echo $service['button_link']; ?>')" class="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg">
                        <?php echo $service['button_text']; ?>
                    </button>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <!-- Contact Form Section -->
    <section class="py-16 bg-white">
        <div class="container mx-auto px-4">
            <div class="max-w-2xl mx-auto">
                <div class="text-center mb-12">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">تواصل معنا</h2>
                    <p class="text-xl text-gray-600">
                        نحن هنا لمساعدتك في تخطيط رحلتك المثالية
                    </p>
                </div>
                
                <form id="contactForm" class="space-y-6">
                    <div class="grid grid-cols-1 tablet:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-gray-700 font-semibold mb-2">الاسم</label>
                            <input type="text" name="name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-semibold mb-2">رقم الهاتف</label>
                            <input type="tel" name="phone" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
                        <input type="email" name="email" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">نوع الخدمة المطلوبة</label>
                        <select name="service_type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="">اختر نوع الخدمة</option>
                            <option value="hotel">حجز فنادق</option>
                            <option value="flight">حجز طيران</option>
                            <option value="car_rental">تأجير سيارات</option>
                            <option value="tour">رحلات سياحية</option>
                            <option value="general">استفسار عام</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">الرسالة</label>
                        <textarea name="message" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
                    </div>
                    
                    <button type="submit" class="w-full gradient-bg text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                        إرسال الطلب
                    </button>
                </form>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="container mx-auto px-4">
            <div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6 tablet:gap-8">
                <div>
                    <h3 class="text-xl font-bold mb-4"><?php echo $settings['company_name_ar'] ?? 'فوجاتشي للسياحة'; ?></h3>
                    <p class="text-gray-400">
                        <?php echo $settings['website_description'] ?? 'شركة رائدة في مجال السياحة والسفر'; ?>
                    </p>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">الخدمات</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li>حجز الفنادق</li>
                        <li>حجز الطيران</li>
                        <li>تأجير السيارات</li>
                        <li>الرحلات السياحية</li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">تواصل معنا</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><i class="fas fa-phone mr-2"></i><?php echo $settings['phone_number'] ?? ''; ?></li>
                        <li><i class="fas fa-envelope mr-2"></i><?php echo $settings['email'] ?? ''; ?></li>
                        <li><i class="fab fa-whatsapp mr-2"></i><?php echo $settings['whatsapp_number'] ?? ''; ?></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-4">روابط سريعة</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="/admin" class="hover:text-white">لوحة التحكم</a></li>
                        <li><a href="/login" class="hover:text-white">تسجيل الدخول</a></li>
                        <li><a href="#" class="hover:text-white">سياسة الخصوصية</a></li>
                        <li><a href="#" class="hover:text-white">شروط الاستخدام</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; <?php echo date('Y'); ?> <?php echo $settings['company_name_ar'] ?? 'فوجاتشي للسياحة'; ?>. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Fixed Button -->
    <div class="fixed bottom-6 left-6 z-50">
        <button onclick="openWhatsApp()" class="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all">
            <i class="fab fa-whatsapp text-2xl"></i>
        </button>
    </div>

    <script>
        function openWhatsApp() {
            const phoneNumber = "<?php echo $settings['whatsapp_number'] ?? '201103442881'; ?>";
            const message = "مرحباً، أريد الاستفسار عن الخدمات السياحية";
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }

        function handleServiceClick(link) {
            if (link.startsWith('/')) {
                window.location.href = '/admin' + link;
            } else if (link === 'whatsapp') {
                openWhatsApp();
            } else {
                window.open(link, '_blank');
            }
        }

        // Contact form submission
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/api/contact.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('تم إرسال طلبك بنجاح! سنتواصل معك قريباً.');
                    this.reset();
                } else {
                    alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
            });
        });
    </script>
</body>
</html>