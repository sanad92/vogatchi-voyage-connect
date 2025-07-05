<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/Customer.php';

$auth = new Auth();
$auth->requireLogin();

$customer = new Customer();
$user = $auth->getCurrentUser();

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    header('Content-Type: application/json');
    
    try {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'create':
                $id = $customer->create($_POST);
                echo json_encode(['success' => true, 'id' => $id, 'message' => 'تم إضافة العميل بنجاح']);
                break;
                
            case 'update':
                $customer->update($_POST['id'], $_POST);
                echo json_encode(['success' => true, 'message' => 'تم تحديث العميل بنجاح']);
                break;
                
            case 'delete':
                $customer->delete($_POST['id']);
                echo json_encode(['success' => true, 'message' => 'تم حذف العميل بنجاح']);
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
$search = $_GET['search'] ?? '';
$segment = $_GET['segment'] ?? '';

// Get customers data
$customersData = $customer->getAll($page, 20, $search, $segment);
$stats = $customer->getStats();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إدارة العملاء - Vogatchi Travel</title>
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
                    <h1 class="text-2xl font-bold text-gray-900">إدارة العملاء</h1>
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                        <i class="fas fa-users text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">إجمالي العملاء</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['total']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100 text-green-600">
                        <i class="fas fa-user-plus text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">عملاء جدد</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['new']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <i class="fas fa-user-check text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">عملاء منتظمون</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['regular']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                        <i class="fas fa-crown text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">عملاء VIP</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['vip']); ?></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-orange-100 text-orange-600">
                        <i class="fas fa-calendar text-xl"></i>
                    </div>
                    <div class="mr-4">
                        <p class="text-sm font-medium text-gray-600">هذا الشهر</p>
                        <p class="text-2xl font-semibold text-gray-900"><?php echo number_format($stats['recent']); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters and Actions -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                    <input type="text" id="searchInput" placeholder="البحث بالاسم أو الهاتف أو البريد..." 
                           value="<?php echo htmlspecialchars($search); ?>"
                           class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    
                    <select id="segmentFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">جميع الفئات</option>
                        <option value="new" <?php echo $segment === 'new' ? 'selected' : ''; ?>>عملاء جدد</option>
                        <option value="regular" <?php echo $segment === 'regular' ? 'selected' : ''; ?>>عملاء منتظمون</option>
                        <option value="vip" <?php echo $segment === 'vip' ? 'selected' : ''; ?>>عملاء VIP</option>
                    </select>
                    
                    <button onclick="applyFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-search ml-2"></i>بحث
                    </button>
                </div>
                
                <button onclick="openAddModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus ml-2"></i>إضافة عميل جديد
                </button>
            </div>
        </div>

        <!-- Customers Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحجوزات</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الإضافة</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <?php foreach ($customersData['data'] as $cust): ?>
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($cust['name']); ?></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900"><?php echo htmlspecialchars($cust['phone']); ?></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900"><?php echo htmlspecialchars($cust['email'] ?? '-'); ?></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <?php
                                $segmentColors = [
                                    'new' => 'bg-blue-100 text-blue-800',
                                    'regular' => 'bg-green-100 text-green-800',
                                    'vip' => 'bg-purple-100 text-purple-800'
                                ];
                                $segmentNames = [
                                    'new' => 'جديد',
                                    'regular' => 'منتظم',
                                    'vip' => 'VIP'
                                ];
                                ?>
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full <?php echo $segmentColors[$cust['customer_segment']]; ?>">
                                    <?php echo $segmentNames[$cust['customer_segment']]; ?>
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <?php echo number_format($cust['total_bookings'] ?? 0); ?>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <?php echo date('Y/m/d', strtotime($cust['created_at'])); ?>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onclick="editCustomer('<?php echo $cust['id']; ?>')" class="text-indigo-600 hover:text-indigo-900 ml-4">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="viewCustomer('<?php echo $cust['id']; ?>')" class="text-green-600 hover:text-green-900 ml-4">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="deleteCustomer('<?php echo $cust['id']; ?>')" class="text-red-600 hover:text-red-900">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <?php if ($customersData['total_pages'] > 1): ?>
            <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div class="flex-1 flex justify-between sm:hidden">
                    <?php if ($customersData['has_prev']): ?>
                    <a href="?page=<?php echo $customersData['current_page'] - 1; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                       class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        السابق
                    </a>
                    <?php endif; ?>
                    <?php if ($customersData['has_next']): ?>
                    <a href="?page=<?php echo $customersData['current_page'] + 1; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                       class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        التالي
                    </a>
                    <?php endif; ?>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            عرض <?php echo (($customersData['current_page'] - 1) * $customersData['per_page']) + 1; ?> إلى 
                            <?php echo min($customersData['current_page'] * $customersData['per_page'], $customersData['total']); ?> من 
                            <?php echo $customersData['total']; ?> نتيجة
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <?php for ($i = 1; $i <= $customersData['total_pages']; $i++): ?>
                            <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                               class="<?php echo $i === $customersData['current_page'] ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'; ?> relative inline-flex items-center px-4 py-2 border text-sm font-medium">
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

    <!-- Add/Edit Customer Modal -->
    <div id="customerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 id="modalTitle" class="text-lg font-medium text-gray-900">إضافة عميل جديد</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="customerForm">
                    <input type="hidden" id="customerId" name="id">
                    <input type="hidden" id="formAction" name="action" value="create">
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
                            <input type="text" id="customerName" name="name" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف *</label>
                            <input type="tel" id="customerPhone" name="phone" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                            <input type="email" id="customerEmail" name="email" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
                            <textarea id="customerAddress" name="address" rows="2" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الجنسية</label>
                            <input type="text" id="customerNationality" name="nationality" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رقم الجواز</label>
                            <input type="text" id="customerPassport" name="passport_number" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">فئة العميل</label>
                            <select id="customerSegment" name="customer_segment" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="new">جديد</option>
                                <option value="regular">منتظم</option>
                                <option value="vip">VIP</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                            <textarea id="customerNotes" name="notes" rows="2" 
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
            const segment = document.getElementById('segmentFilter').value;
            const url = new URL(window.location.href);
            url.searchParams.set('search', search);
            url.searchParams.set('segment', segment);
            url.searchParams.set('page', '1');
            window.location.href = url.toString();
        }

        function openAddModal() {
            document.getElementById('modalTitle').textContent = 'إضافة عميل جديد';
            document.getElementById('formAction').value = 'create';
            document.getElementById('customerForm').reset();
            document.getElementById('customerId').value = '';
            document.getElementById('customerModal').classList.remove('hidden');
        }

        function editCustomer(id) {
            // TODO: Load customer data and populate form
            document.getElementById('modalTitle').textContent = 'تعديل العميل';
            document.getElementById('formAction').value = 'update';
            document.getElementById('customerId').value = id;
            document.getElementById('customerModal').classList.remove('hidden');
        }

        function viewCustomer(id) {
            // TODO: Open customer details modal
            alert('عرض تفاصيل العميل - سيتم تطويرها قريباً');
        }

        function deleteCustomer(id) {
            if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
                const formData = new FormData();
                formData.append('action', 'delete');
                formData.append('id', id);

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
                    alert('حدث خطأ أثناء حذف العميل');
                });
            }
        }

        function closeModal() {
            document.getElementById('customerModal').classList.add('hidden');
        }

        // Handle form submission
        document.getElementById('customerForm').addEventListener('submit', function(e) {
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