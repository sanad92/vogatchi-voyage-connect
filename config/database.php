<?php
/**
 * Database Configuration
 * Tourism Management System
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'tourism_system');
define('DB_USER', 'root'); // تغيير حسب إعدادات cPanel
define('DB_PASS', ''); // تغيير حسب إعدادات cPanel
define('DB_CHARSET', 'utf8mb4');

// Site configuration
define('SITE_URL', 'https://yourdomain.com'); // تغيير إلى نطاقك
define('SITE_NAME', 'Vogatchi Travel');
define('ADMIN_EMAIL', 'admin@vogatchitrips.com');

// Security
define('JWT_SECRET', 'your-secret-key-here-change-this'); // تغيير المفتاح
define('SESSION_LIFETIME', 3600 * 24); // 24 hours

// Upload paths
define('UPLOAD_DIR', 'uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB

// Pagination
define('ITEMS_PER_PAGE', 20);

// WhatsApp API (اختياري)
define('WHATSAPP_API_URL', '');
define('WHATSAPP_API_KEY', '');

// Currency API (اختياري لأسعار الصرف التلقائية)
define('CURRENCY_API_KEY', '');

// Error reporting (تعطيل في الإنتاج)
if ($_SERVER['HTTP_HOST'] === 'localhost' || strpos($_SERVER['HTTP_HOST'], 'localhost') !== false) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    define('DEBUG_MODE', true);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    define('DEBUG_MODE', false);
}

// Timezone
date_default_timezone_set('Africa/Cairo');

// Session configuration
ini_set('session.cookie_lifetime', SESSION_LIFETIME);
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
session_start();
?>