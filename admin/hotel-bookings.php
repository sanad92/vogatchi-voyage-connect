<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/HotelBooking.php';
require_once '../classes/Customer.php';

$auth = new Auth();
$auth->requireLogin();

$hotelBooking = new HotelBooking();
$customer = new Customer();
$user = $auth->getCurrentUser();

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    header('Content-Type: application/json');
    
    try {
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
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>حجوزات الفنادق - Vogatchi Travel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4 space-x-reverse">
                    <a href="dashboard.php" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-arrow-right"></i> العودة للوحة التحكم
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">حجوزات الفنادق</h1>
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
                           class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    
                    <select id="statusFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">جميع الحالات</option>
                        <option value="pending" <?php echo $filters['status'] === 'pending' ? 'selected' : ''; ?>>معلقة</option>
                        <option value="confirmed" <?php echo $filters['status'] === 'confirmed' ? 'selected' : ''; ?>>مؤكدة</option>
                        <option value="cancelled" <?php echo $filters['status'] === 'cancelled' ? 'selected' : ''; ?>>ملغية</option>
                        <option value="completed" <?php echo $filters['status'] === 'completed' ? 'selected' : ''; ?>>مكتملة</option>
                    </select>
                    
                    <input type="date" id="dateFromFilter" value="<?php echo $filters['date_from']; ?>"
                           class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    
                    <input type="date" id="dateToFilter" value="<?php echo $filters['date_to']; ?>"
                           class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="applyFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-search ml-2"></i>بحث
                    </button>
                    <button onclick="openAddModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
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
                                <button onclick="viewBooking('<?php echo $booking['id']; ?>')" class="text-blue-600 hover:text-blue-900 ml-4">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editBooking('<?php echo $booking['id']; ?>')" class="text-indigo-600 hover:text-indigo-900 ml-4">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="updateStatus('<?php echo $booking['id']; ?>')" class="text-green-600 hover:text-green-900 ml-4">
                                    <i class="fas fa-refresh"></i>
                                </button>
                                <button onclick="updatePayment('<?php echo $booking['id']; ?>')" class="text-purple-600 hover:text-purple-900">
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
    <div id="bookingModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 id="modalTitle" class="text-lg font-medium text-gray-900">حجز فندق جديد</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="bookingForm">
                    <input type="hidden" id="bookingId" name="id">
                    <input type="hidden" id="formAction" name="action" value="create">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Customer Information -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">معلومات العميل</h4>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">العميل *</label>
                                <select id="customerId" name="customer_id" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">اختر العميل</option>
                                    <?php foreach ($allCustomers['data'] as $cust): ?>
                                    <option value="<?php echo $cust['id']; ?>"><?php echo htmlspecialchars($cust['name']) . ' - ' . htmlspecialchars($cust['phone']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">اسم العميل *</label>
                                <input type="text" id="customerName" name="customer_name" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                        </div>

                        <!-- Hotel Information -->
                        <div class="space-y-4">
                            <h4 class="text-md font-medium text-gray-900 border-b pb-2">معلومات الفندق</h4>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">اسم الفندق *</label>
                                <input type="text" id="hotelName" name="hotel_name" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">المدينة *</label>
                                <input type="text" id="destinationCity" name="destination_city" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">نوع الغرفة</label>
                                <input type="text" id="roomType" name="room_type" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">تقييم الفندق</label>
                                <select id="hotelStarRating" name="hotel_star_rating" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
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
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">تاريخ الخروج *</label>
                                    <input type="date" id="checkOutDate" name="check_out_date" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">عدد البالغين *</label>
                                    <input type="number" id="numberOfAdults" name="number_of_adults" value="1" min="1" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">عدد الأطفال</label>
                                    <input type="number" id="numberOfChildren" name="number_of_children" value="0" min="0" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">أعمار الأطفال</label>
                                <input type="text" id="childrenAges" name="children_ages" placeholder="مثال: 5، 8، 12" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">نظام الوجبات</label>
                                <select id="mealPlan" name="meal_plan" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
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
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">سعر البيع للليلة *</label>
                                <input type="number" id="sellingPricePerNight" name="selling_price_per_night" step="0.01" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                                <select id="currency" name="currency" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                    <option value="EGP" selected>جنيه مصري</option>
                                    <option value="USD">دولار أمريكي</option>
                                    <option value="EUR">يورو</option>
                                    <option value="SAR">ريال سعودي</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                                <select id="paymentMethod" name="payment_method" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
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
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">سياسة الإلغاء</label>
                            <textarea id="cancellationPolicy" name="cancellation_policy" rows="2" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button type="button" onclick="closeModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            إلغاء
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            حفظ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
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
</body>
</html>