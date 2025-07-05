<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';

$auth = new Auth();
$auth->requireLogin();

$db = Database::getInstance();

// إحصائيات أساسية
$stats = [
    'customers' => $db->count('customers'),
    'hotel_bookings' => $db->count('hotel_bookings'),
    'flight_bookings' => $db->count('flight_bookings'),
    'invoices' => $db->count('invoices'),
];

$user = $auth->getCurrentUser();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - Vogatchi Travel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center">
                    <h1 class="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
                </div>
                <div class="flex items-center space-x-4 space-x-reverse">
                    <span class="text-gray-700">أهلاً، <?php echo $user['name']; ?></span>
                    <a href="/logout.php" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
                        تسجيل الخروج
                    </a>
                </div>
            </div>
        </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                        <i class="fas fa-users text-2xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">العملاء</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['customers']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100 text-green-600">
                        <i class="fas fa-hotel text-2xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">حجوزات الفنادق</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['hotel_bookings']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                        <i class="fas fa-plane text-2xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">حجوزات الطيران</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['flight_bookings']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <i class="fas fa-file-invoice text-2xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">الفواتير</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['invoices']); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">إدارة العملاء</h3>
                <p class="text-gray-600 mb-4">إضافة وتعديل بيانات العملاء</p>
                <a href="customers.php" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
                    إدارة العملاء
                </a>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">حجز فندق جديد</h3>
                <p class="text-gray-600 mb-4">إنشاء حجز فندق للعملاء</p>
                <a href="hotel-booking.php" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-block">
                    حجز جديد
                </a>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">التقارير المالية</h3>
                <p class="text-gray-600 mb-4">عرض التقارير والإحصائيات</p>
                <a href="reports.php" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-block">
                    التقارير
                </a>
            </div>
        </div>
    </div>
</body>
</html>