<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/TenantMiddleware.php';
require_once __DIR__ . '/layout/shell.php';

$auth = new Auth();
$auth->requireLogin();

$db = Database::getInstance();
$user = $auth->getCurrentUser();

$uiDir = $_SESSION['ui_dir'] ?? 'rtl';
if (isset($_GET['dir']) && in_array($_GET['dir'], ['rtl', 'ltr'], true)) {
    $uiDir = $_GET['dir'];
    $_SESSION['ui_dir'] = $uiDir;
}
$uiLang = $uiDir === 'rtl' ? 'ar' : 'en';

// P1 fix: bind authoritative tenant context for this request.
TenantMiddleware::setTenantContext($user['organization_id'] ?? null, $user['id'] ?? null, true);
$orgId = TenantMiddleware::requireTenant();

// إحصائيات أساسية
$stats = [
    // P1 fix: enforce tenant scope on all dashboard aggregates.
    'customers' => $db->count('customers', ['organization_id' => $orgId]),
    'hotel_bookings' => $db->count('hotel_bookings', ['organization_id' => $orgId]),
    'flight_bookings' => $db->count('flight_bookings', ['organization_id' => $orgId]),
    'invoices' => $db->count('invoices', ['organization_id' => $orgId]),
];

renderAdminLayoutStart([
    'htmlTitle' => 'لوحة التحكم - Vogatchi Travel',
    'pageTitle' => 'لوحة التحكم',
    'userName' => 'أهلاً، ' . ($user['name'] ?? ''),
    'currentPage' => 'dashboard',
    'dir' => $uiDir,
    'lang' => $uiLang,
]);
?>
<div class="space-y-8">
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
                <a href="customers.php" class="ui-btn ui-btn-md ui-btn-primary">
                    إدارة العملاء
                </a>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">حجز فندق جديد</h3>
                <p class="text-gray-600 mb-4">إنشاء حجز فندق للعملاء</p>
                <a href="hotel-bookings.php" class="ui-btn ui-btn-md ui-btn-success">
                    حجز جديد
                </a>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">التقارير المالية</h3>
                <p class="text-gray-600 mb-4">عرض التقارير والإحصائيات</p>
                <a href="reports.php" class="ui-btn ui-btn-md ui-btn-secondary">
                    التقارير
                </a>
            </div>
        </div>
<?php renderAdminLayoutEnd(); ?>