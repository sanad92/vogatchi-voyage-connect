<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/HotelBooking.php';
require_once '../classes/Customer.php';
require_once '../classes/TenantMiddleware.php';
require_once __DIR__ . '/layout/shell.php';

$auth = new Auth();
$auth->requireLogin();

$hotelBooking = new HotelBooking();
$customer = new Customer();
$user = $auth->getCurrentUser();

$uiDir = $_SESSION['ui_dir'] ?? 'rtl';
if (isset($_GET['dir']) && in_array($_GET['dir'], ['rtl', 'ltr'], true)) {
    $uiDir = $_GET['dir'];
    $_SESSION['ui_dir'] = $uiDir;
}
$uiLang = $uiDir === 'rtl' ? 'ar' : 'en';

// P1 fix: bind tenant context for automatic query scoping in this request.
TenantMiddleware::setTenantContext($user['organization_id'] ?? null, $user['id'] ?? null, true);
TenantMiddleware::requireTenant();

// P1 fix: initialize CSRF token once per session.
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// P1 fix: helper for CSRF validation for state-changing admin requests.
function isValidCsrfToken(?string $token): bool {
    return !empty($token) && !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    header('Content-Type: application/json');
    
    try {
        // P1 fix: enforce CSRF token on POST requests.
        if (!isValidCsrfToken($_POST['csrf_token'] ?? null)) {
            http_response_code(419);
            echo json_encode(['success' => false, 'message' => 'CSRF token mismatch']);
            exit;
        }

        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'create':
                $id = $hotelBooking->create($_POST);
                echo json_encode(['success' => true, 'id' => $id, 'message' => 'تم إنشاء الحجز بنجاح']);
                break;
                
            case 'update':
                $hotelBooking->update($_POST['id'], $_POST);
                echo json_encode(['success' => true, 'message' => 'تم تحديث الحجز بنجاح']);
                break;
                
            case 'update_status':
                $hotelBooking->updateStatus($_POST['id'], $_POST['status']);
                echo json_encode(['success' => true, 'message' => 'تم تحديث حالة الحجز بنجاح']);
                break;
                
            case 'update_payment':
                $hotelBooking->updatePayment($_POST['id'], $_POST['paid_amount']);
                echo json_encode(['success' => true, 'message' => 'تم تحديث الدفعة بنجاح']);
                break;
                
            default:
                echo json_encode(['success' => false, 'message' => 'عملية غير صحيحة']);
        }
    } catch (Exception $e) {
        // P1 fix: avoid leaking sensitive internal errors outside debug mode.
        $isDebug = filter_var((string)(getenv('APP_DEBUG') ?: '0'), FILTER_VALIDATE_BOOLEAN);
        echo json_encode(['success' => false, 'message' => $isDebug ? $e->getMessage() : 'حدث خطأ غير متوقع']);
    }
    exit;
}

// Get filters
$page = (int)($_GET['page'] ?? 1);
$filters = [
    'search' => $_GET['search'] ?? '',
    'status' => $_GET['status'] ?? '',
    'date_from' => $_GET['date_from'] ?? '',
    'date_to' => $_GET['date_to'] ?? ''
];

// Get bookings data
$bookingsData = $hotelBooking->getAll($page, 20, $filters);
$stats = $hotelBooking->getStats();

// Get customers for dropdown
$allCustomers = $customer->getAll(1, 1000);

renderAdminLayoutStart([
    'htmlTitle' => 'حجوزات الفنادق - Vogatchi Travel',
    'pageTitle' => 'حجوزات الفنادق',
    'userName' => 'أهلاً، ' . ($user['name'] ?? ''),
    'currentPage' => 'hotel-bookings',
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
                        <i class="fas fa-hotel text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">إجمالي الحجوزات</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['total']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <i class="fas fa-clock text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">معلقة</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['pending']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100 text-green-600">
                        <i class="fas fa-check text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">مؤكدة</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['confirmed']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                        <i class="fas fa-dollar-sign text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                        <p class="text-xl font-semibold text-gray-900"><?php echo number_format($stats['total_revenue'] ?? 0); ?> جنيه</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters and Actions -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <input type="text" id="searchInput" placeholder="البحث..." 
                           value="<?php echo htmlspecialchars($filters['search']); ?>"
                              class="ui-input ui-input-md">
                    
                    <select id="statusFilter" class="ui-select ui-select-md">
                        <option value="">جميع الحالات</option>
                        <option value="pending" <?php echo $filters['status'] === 'pending' ? 'selected' : ''; ?>>معلقة</option>
                        <option value="confirmed" <?php echo $filters['status'] === 'confirmed' ? 'selected' : ''; ?>>مؤكدة</option>
                        <option value="cancelled" <?php echo $filters['status'] === 'cancelled' ? 'selected' : ''; ?>>ملغية</option>
                        <option value="completed" <?php echo $filters['status'] === 'completed' ? 'selected' : ''; ?>>مكتملة</option>
                    </select>
                    
                          <input type="date" id="dateFromFilter" value="<?php echo $filters['date_from']; ?>"
                              class="ui-input ui-input-md">
                    
                          <input type="date" id="dateToFilter" value="<?php echo $filters['date_to']; ?>"
                              class="ui-input ui-input-md">
                </div>
                
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="applyFilters()" class="ui-btn ui-btn-md ui-btn-primary">
                        <i class="fas fa-search ml-2"></i>بحث
                    </button>
                    <button onclick="openAddModal()" class="ui-btn ui-btn-md ui-btn-success">
                        <i class="fas fa-plus ml-2"></i>حجز جديد
                    </button>
                </div>
            </div>
        </div>

        <!-- Bookings Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الحجز</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفندق</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التواريخ</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <?php foreach ($bookingsData['data'] as $booking): ?>
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($booking['internal_booking_number']); ?></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($booking['customer_name']); ?></div>
                                <?php if ($booking['customer_phone']): ?>
                                <div class="text-sm text-gray-500"><?php echo htmlspecialchars($booking['customer_phone']); ?></div>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($booking['hotel_name']); ?></div>
                                <div class="text-sm text-gray-500"><?php echo htmlspecialchars($booking['destination_city']); ?></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">
                                    <?php echo date('Y/m/d', strtotime($booking['check_in_date'])); ?> - 
                                    <?php echo date('Y/m/d', strtotime($booking['check_out_date'])); ?>
                                </div>
                                <div class="text-sm text-gray-500"><?php echo $booking['number_of_nights']; ?> ليالي</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">
                                    <?php echo number_format($booking['total_cost_customer']); ?> <?php echo $booking['currency']; ?>
                                </div>
                                <?php if ($booking['paid_amount'] > 0): ?>
                                <div class="text-sm text-green-600">مدفوع: <?php echo number_format($booking['paid_amount']); ?></div>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <?php
                                $statusColors = [
                                    'pending' => 'bg-yellow-100 text-yellow-800',
                                    'confirmed' => 'bg-green-100 text-green-800',
                                    'cancelled' => 'bg-red-100 text-red-800',
                                    'completed' => 'bg-blue-100 text-blue-800',
                                    'no_show' => 'bg-gray-100 text-gray-800'
                                ];
                                $statusNames = [
                                    'pending' => 'معلقة',
                                    'confirmed' => 'مؤكدة',
                                    'cancelled' => 'ملغية',
                                    'completed' => 'مكتملة',
                                    'no_show' => 'لم يحضر'
                                ];
                                ?>
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full <?php echo $statusColors[$booking['booking_status']] ?? 'bg-gray-100 text-gray-800'; ?>">
                                    <?php echo $statusNames[$booking['booking_status']] ?? $booking['booking_status']; ?>
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onclick="viewBooking('<?php echo $booking['id']; ?>')" class="ui-icon-btn ml-2">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editBooking('<?php echo $booking['id']; ?>')" class="ui-icon-btn ml-2">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="updateStatus('<?php echo $booking['id']; ?>')" class="ui-icon-btn ml-2">
                                    <i class="fas fa-refresh"></i>
                                </button>
                                <button onclick="updatePayment('<?php echo $booking['id']; ?>')" class="ui-icon-btn">
                                    <i class="fas fa-money-bill"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <?php if ($bookingsData['total_pages'] > 1): ?>
            <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div class="flex-1 flex justify-between sm:hidden">
                    <?php if ($bookingsData['has_prev']): ?>
                    <a href="?page=<?php echo $bookingsData['current_page'] - 1; ?><?php echo http_build_query($filters, '', '&', PHP_QUERY_RFC3986); ?>" 
                       class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        السابق
                    </a>
                    <?php endif; ?>
                    <?php if ($bookingsData['has_next']): ?>
                    <a href="?page=<?php echo $bookingsData['current_page'] + 1; ?><?php echo http_build_query($filters, '', '&', PHP_QUERY_RFC3986); ?>" 
                       class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        التالي
                    </a>
                    <?php endif; ?>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            عرض <?php echo (($bookingsData['current_page'] - 1) * $bookingsData['per_page']) + 1; ?> إلى 
                            <?php echo min($bookingsData['current_page'] * $bookingsData['per_page'], $bookingsData['total']); ?> من 
                            <?php echo $bookingsData['total']; ?> نتيجة
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <?php for ($i = 1; $i <= $bookingsData['total_pages']; $i++): ?>
                            <a href="?page=<?php echo $i; ?><?php echo http_build_query($filters, '', '&', PHP_QUERY_RFC3986); ?>" 
                               class="<?php echo $i === $bookingsData['current_page'] ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'; ?> relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                                <?php echo $i; ?>
                            </a>
                            <?php endfor; ?>
                        </nav>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Add/Edit Booking Modal -->
    <div id="bookingModal" class="fixed inset-0 ui-modal-overlay hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="ui-modal-panel max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 id="modalTitle" class="text-lg font-medium text-gray-900">حجز فندق جديد</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="bookingForm">
                    <input type="hidden" id="bookingId" name="id">
                    <input type="hidden" id="formAction" name="action" value="create">
                    <input type="hidden" id="csrfTokenInput" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Customer Information -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">معلومات العميل</h4>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">العميل *</label>
                                <select id="customerId" name="customer_id" required 
                                        class="ui-select ui-select-md">
                                    <option value="">اختر العميل</option>
                                    <?php foreach ($allCustomers['data'] as $cust): ?>
                                    <option value="<?php echo $cust['id']; ?>"><?php echo htmlspecialchars($cust['name']) . ' - ' . htmlspecialchars($cust['phone']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">اسم العميل *</label>
                                <input type="text" id="customerName" name="customer_name" required 
                                       class="ui-input ui-input-md">
                            </div>
                        </div>

                        <!-- Hotel Information -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">معلومات الفندق</h4>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">اسم الفندق *</label>
                                <input type="text" id="hotelName" name="hotel_name" required 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">المدينة *</label>
                                <input type="text" id="destinationCity" name="destination_city" required 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">نوع الغرفة</label>
                                <input type="text" id="roomType" name="room_type" 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">تقييم الفندق</label>
                                <select id="hotelStarRating" name="hotel_star_rating" 
                                        class="ui-select ui-select-md">
                                    <option value="">غير محدد</option>
                                    <option value="1">نجمة واحدة</option>
                                    <option value="2">نجمتان</option>
                                    <option value="3">3 نجوم</option>
                                    <option value="4">4 نجوم</option>
                                    <option value="5">5 نجوم</option>
                                </select>
                            </div>
                        </div>

                        <!-- Booking Details -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">تفاصيل الحجز</h4>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">تاريخ الدخول *</label>
                                    <input type="date" id="checkInDate" name="check_in_date" required 
                                           class="ui-input ui-input-md">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">تاريخ الخروج *</label>
                                    <input type="date" id="checkOutDate" name="check_out_date" required 
                                           class="ui-input ui-input-md">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">عدد البالغين *</label>
                                    <input type="number" id="numberOfAdults" name="number_of_adults" value="1" min="1" required 
                                           class="ui-input ui-input-md">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">عدد الأطفال</label>
                                    <input type="number" id="numberOfChildren" name="number_of_children" value="0" min="0" 
                                           class="ui-input ui-input-md">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">أعمار الأطفال</label>
                                <input type="text" id="childrenAges" name="children_ages" placeholder="مثال: 5، 8، 12" 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">نظام الوجبات</label>
                                <select id="mealPlan" name="meal_plan" 
                                        class="ui-select ui-select-md">
                                    <option value="room_only">الغرفة فقط</option>
                                    <option value="breakfast" selected>إفطار</option>
                                    <option value="half_board">نصف بورد</option>
                                    <option value="full_board">فل بورد</option>
                                    <option value="all_inclusive">شامل كليا</option>
                                </select>
                            </div>
                        </div>

                        <!-- Pricing -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">التسعير</h4>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">تكلفة الليلة (مورد) *</label>
                                <input type="number" id="costPerNight" name="cost_per_night" step="0.01" required 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">سعر البيع للليلة *</label>
                                <input type="number" id="sellingPricePerNight" name="selling_price_per_night" step="0.01" required 
                                       class="ui-input ui-input-md">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                                <select id="currency" name="currency" 
                                        class="ui-select ui-select-md">
                                    <option value="EGP" selected>جنيه مصري</option>
                                    <option value="USD">دولار أمريكي</option>
                                    <option value="EUR">يورو</option>
                                    <option value="SAR">ريال سعودي</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                                <select id="paymentMethod" name="payment_method" 
                                        class="ui-select ui-select-md">
                                    <option value="">اختر طريقة الدفع</option>
                                    <option value="cash">نقدي</option>
                                    <option value="credit_card">بطاقة ائتمان</option>
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="installment">تقسيط</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 grid grid-cols-1 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رقم الحجز عند المورد</label>
                            <input type="text" id="bookingReferenceSupplier" name="booking_reference_supplier" 
                                   class="ui-input ui-input-md">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">سياسة الإلغاء</label>
                            <textarea id="cancellationPolicy" name="cancellation_policy" rows="2" 
                                      class="ui-textarea"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button type="button" onclick="closeModal()" 
                                class="ui-btn ui-btn-md ui-btn-secondary">
                            إلغاء
                        </button>
                        <button type="submit" 
                                class="ui-btn ui-btn-md ui-btn-primary">
                            حفظ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // P1 fix: shared CSRF token for all AJAX state-changing requests.
        const csrfToken = '<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>';

        function applyFilters() {
            const search = document.getElementById('searchInput').value;
            const status = document.getElementById('statusFilter').value;
            const dateFrom = document.getElementById('dateFromFilter').value;
            const dateTo = document.getElementById('dateToFilter').value;
            
            const url = new URL(window.location.href);
            url.searchParams.set('search', search);
            url.searchParams.set('status', status);
            url.searchParams.set('date_from', dateFrom);
            url.searchParams.set('date_to', dateTo);
            url.searchParams.set('page', '1');
            window.location.href = url.toString();
        }

        function openAddModal() {
            document.getElementById('modalTitle').textContent = 'حجز فندق جديد';
            document.getElementById('formAction').value = 'create';
            document.getElementById('bookingForm').reset();
            document.getElementById('bookingId').value = '';
            document.getElementById('bookingModal').classList.remove('hidden');
        }

        function editBooking(id) {
            // TODO: Load booking data and populate form
            document.getElementById('modalTitle').textContent = 'تعديل الحجز';
            document.getElementById('formAction').value = 'update';
            document.getElementById('bookingId').value = id;
            document.getElementById('bookingModal').classList.remove('hidden');
        }

        function viewBooking(id) {
            // TODO: Open booking details modal
            alert('عرض تفاصيل الحجز - سيتم تطويرها قريباً');
        }

        function updateStatus(id) {
            const status = prompt('أدخل الحالة الجديدة (pending, confirmed, cancelled, completed, no_show):');
            if (status) {
                const formData = new FormData();
                formData.append('action', 'update_status');
                formData.append('id', id);
                formData.append('status', status);
                formData.append('csrf_token', csrfToken);

                fetch('', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        location.reload();
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    alert('حدث خطأ أثناء تحديث الحالة');
                });
            }
        }

        function updatePayment(id) {
            const amount = prompt('أدخل مبلغ الدفعة:');
            if (amount && !isNaN(amount)) {
                const formData = new FormData();
                formData.append('action', 'update_payment');
                formData.append('id', id);
                formData.append('paid_amount', amount);
                formData.append('csrf_token', csrfToken);

                fetch('', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        location.reload();
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    alert('حدث خطأ أثناء تحديث الدفعة');
                });
            }
        }

        function closeModal() {
            document.getElementById('bookingModal').classList.add('hidden');
        }

        // Handle customer selection change
        document.getElementById('customerId').addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const customerName = selectedOption.text.split(' - ')[0];
                document.getElementById('customerName').value = customerName;
            } else {
                document.getElementById('customerName').value = '';
            }
        });

        // Handle form submission
        document.getElementById('bookingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            formData.set('csrf_token', csrfToken);
            
            fetch('', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                alert('حدث خطأ أثناء حفظ البيانات');
            });
        });

        // Search on Enter key
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    </script>
<?php renderAdminLayoutEnd(); ?>