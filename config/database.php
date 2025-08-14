<?php
// Database configuration for PHP MySQL backend
define('DB_HOST', 'localhost');
define('DB_NAME', 'vogatchi_crm');
define('DB_USER', 'root'); // Change to your MySQL username
define('DB_PASS', ''); // Change to your MySQL password
define('DB_CHARSET', 'utf8mb4');

// You can override these values in production
if (file_exists(__DIR__ . '/database.local.php')) {
    include __DIR__ . '/database.local.php';
}
?>