<?php
require_once '../config/database.php';
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/Customer.php';
require_once '../classes/TenantMiddleware.php';
require_once __DIR__ . '/layout/shell.php';

$auth = new Auth();
$auth->requireLogin();

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
        // P1 fix: avoid leaking sensitive internal errors outside debug mode.
        $isDebug = filter_var((string)(getenv('APP_DEBUG') ?: '0'), FILTER_VALIDATE_BOOLEAN);
        echo json_encode(['success' => false, 'message' => $isDebug ? $e->getMessage() : 'حدث خطأ غير متوقع']);
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

renderAdminLayoutStart([
    'htmlTitle' => 'إدارة العملاء - Vogatchi Travel',
    'pageTitle' => 'إدارة العملاء',
    'userName' => 'أهلاً، ' . ($user['name'] ?? ''),
    'currentPage' => 'customers',
    'dir' => $uiDir,
    'lang' => $uiLang,
]);
?>
<div class="space-y-8">
    <section>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">ملخص العملاء</h3>
        <p class="ui-helper-text">اقرأ الأرقام بسرعة لمعرفة نمو العملاء ونشاط الشرائح.</p>
    </section>
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ultrawide:grid-cols-5 gap-4 tablet:gap-6 mb-8">
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

        <section>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">البحث والتصفية</h3>
            <p class="ui-helper-text">استخدم الفلاتر لتقليل النتائج والوصول السريع لبيانات العميل.</p>
        </section>
        <!-- Filters and Actions -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <div class="flex flex-col laptop:flex-row laptop:items-center laptop:justify-between space-y-4 laptop:space-y-0">
                <div class="flex flex-col tablet:flex-row space-y-4 tablet:space-y-0 tablet:space-x-4 tablet:space-x-reverse">
                          <input type="text" id="searchInput" placeholder="البحث بالاسم أو الهاتف أو البريد..." 
                           value="<?php echo htmlspecialchars($search); ?>"
                              class="ui-input ui-input-md">
                    
                    <select id="segmentFilter" class="ui-select ui-select-md">
                        <option value="">جميع الفئات</option>
                        <option value="new" <?php echo $segment === 'new' ? 'selected' : ''; ?>>عملاء جدد</option>
                        <option value="regular" <?php echo $segment === 'regular' ? 'selected' : ''; ?>>عملاء منتظمون</option>
                        <option value="vip" <?php echo $segment === 'vip' ? 'selected' : ''; ?>>عملاء VIP</option>
                    </select>
                    
                    <button onclick="applyFilters()" class="ui-btn ui-btn-md ui-btn-primary">
                        <i class="fas fa-search ml-2"></i>بحث
                    </button>
                </div>
                
                <button onclick="openAddModal()" class="ui-btn ui-btn-md ui-btn-success">
                    <i class="fas fa-plus ml-2"></i>إضافة عميل جديد
                </button>
            </div>
        </div>

        <section>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">قائمة العملاء</h3>
            <p class="ui-helper-text">جميع العملاء مرتبين مع إجراءات سريعة لكل سجل.</p>
        </section>
        <!-- Customers Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="ui-table-skeleton">
                <?php for ($i = 0; $i < 6; $i++): ?>
                <div class="ui-skeleton-row">
                    <div class="ui-skeleton-line"></div>
                    <div class="ui-skeleton-line"></div>
                    <div class="ui-skeleton-line"></div>
                    <div class="ui-skeleton-line"></div>
                    <div class="ui-skeleton-line"></div>
                </div>
                <?php endfor; ?>
            </div>
            <div class="overflow-x-auto">
                <table>
                    <thead>
                        <tr>
                            <th class="ui-col-start">الاسم</th>
                            <th class="ui-col-start">الهاتف</th>
                            <th class="ui-col-start">البريد الإلكتروني</th>
                            <th class="ui-col-center">الفئة</th>
                            <th class="ui-col-center">الحجوزات</th>
                            <th class="ui-col-center">تاريخ الإضافة</th>
                            <th class="ui-col-end">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($customersData['data'])): ?>
                        <?php foreach ($customersData['data'] as $cust): ?>
                        <tr>
                            <td>
                                <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($cust['name']); ?></div>
                            </td>
                            <td>
                                <div class="text-sm text-gray-900"><?php echo htmlspecialchars($cust['phone']); ?></div>
                            </td>
                            <td>
                                <div class="text-sm text-gray-900"><?php echo htmlspecialchars($cust['email'] ?? '-'); ?></div>
                            </td>
                            <td class="ui-col-center">
                                <?php
                                $segmentColors = [
                                    'new' => 'ui-badge ui-badge-info',
                                    'regular' => 'ui-badge ui-badge-success',
                                    'vip' => 'ui-badge ui-badge-warning'
                                ];
                                $segmentNames = [
                                    'new' => 'جديد',
                                    'regular' => 'منتظم',
                                    'vip' => 'VIP'
                                ];
                                ?>
                                <span class="<?php echo $segmentColors[$cust['customer_segment']] ?? 'ui-badge ui-badge-neutral'; ?>">
                                    <?php echo $segmentNames[$cust['customer_segment']] ?? 'غير محدد'; ?>
                                </span>
                            </td>
                            <td class="ui-col-center text-sm text-gray-900">
                                <?php echo number_format($cust['total_bookings'] ?? 0); ?>
                            </td>
                            <td class="ui-col-center text-sm text-gray-900">
                                <?php echo date('Y/m/d', strtotime($cust['created_at'])); ?>
                            </td>
                            <td class="ui-col-end">
                                <div class="ui-row-actions">
                                    <button type="button" class="ui-btn ui-btn-ghost ui-action-trigger" data-action-trigger="customer-actions-<?php echo $cust['id']; ?>">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div id="customer-actions-<?php echo $cust['id']; ?>" class="ui-action-menu">
                                        <button type="button" onclick="viewCustomer('<?php echo $cust['id']; ?>')" class="ui-action-item">
                                            <i class="fas fa-eye"></i><span>عرض</span>
                                        </button>
                                        <button type="button" onclick="editCustomer('<?php echo $cust['id']; ?>')" class="ui-action-item">
                                            <i class="fas fa-edit"></i><span>تعديل</span>
                                        </button>
                                        <button type="button" onclick="deleteCustomer('<?php echo $cust['id']; ?>')" class="ui-action-item ui-action-item-danger">
                                            <i class="fas fa-trash"></i><span>حذف</span>
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php else: ?>
                        <tr>
                            <td colspan="7">
                                <div class="ui-empty flex items-center justify-center">
                                    <i class="fas fa-users ui-empty-icon"></i>
                                    <span>لا توجد بيانات عملاء مطابقة للبحث الحالي</span>
                                </div>
                            </td>
                        </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <?php if ($customersData['total_pages'] > 1): ?>
            <div class="ui-table-footer">
                <div class="flex-1 flex justify-between sm:hidden">
                    <?php if ($customersData['has_prev']): ?>
                    <a href="?page=<?php echo $customersData['current_page'] - 1; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                       class="ui-btn ui-btn-sm ui-btn-secondary">
                        السابق
                    </a>
                    <?php endif; ?>
                    <?php if ($customersData['has_next']): ?>
                    <a href="?page=<?php echo $customersData['current_page'] + 1; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                       class="ui-btn ui-btn-sm ui-btn-secondary">
                        التالي
                    </a>
                    <?php endif; ?>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700 dark:text-slate-300">
                            عرض <?php echo (($customersData['current_page'] - 1) * $customersData['per_page']) + 1; ?> إلى 
                            <?php echo min($customersData['current_page'] * $customersData['per_page'], $customersData['total']); ?> من 
                            <?php echo $customersData['total']; ?> نتيجة
                        </p>
                    </div>
                    <div>
                        <nav class="relative z-0 inline-flex rounded-md -space-x-px" aria-label="Pagination">
                            <?php for ($i = 1; $i <= $customersData['total_pages']; $i++): ?>
                            <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&segment=<?php echo urlencode($segment); ?>" 
                               class="<?php echo $i === $customersData['current_page'] ? 'ui-btn ui-btn-sm ui-btn-primary' : 'ui-btn ui-btn-sm ui-btn-secondary'; ?>">
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
    <div id="customerModal" class="fixed inset-0 ui-modal-overlay hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="ui-modal-panel max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 id="modalTitle" class="text-lg font-medium text-gray-900">إضافة عميل جديد</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="customerForm">
                    <input type="hidden" id="customerId" name="id">
                    <input type="hidden" id="formAction" name="action" value="create">
                    <input type="hidden" id="csrfTokenInput" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
                            <input type="text" id="customerName" name="name" required 
                                   class="ui-input ui-input-md">
                            <p class="ui-field-error"></p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف *</label>
                            <input type="tel" id="customerPhone" name="phone" required 
                                   class="ui-input ui-input-md">
                            <p class="ui-helper-text">مثال: 010xxxxxxxx</p>
                            <p class="ui-field-error"></p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                            <input type="email" id="customerEmail" name="email" 
                                   class="ui-input ui-input-md">
                            <p class="ui-field-error"></p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
                            <textarea id="customerAddress" name="address" rows="2" 
                                      class="ui-textarea"></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الجنسية</label>
                            <input type="text" id="customerNationality" name="nationality" 
                                   class="ui-input ui-input-md">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رقم الجواز</label>
                            <input type="text" id="customerPassport" name="passport_number" 
                                   class="ui-input ui-input-md">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">فئة العميل</label>
                            <select id="customerSegment" name="customer_segment" 
                                    class="ui-select ui-select-md">
                                <option value="new">جديد</option>
                                <option value="regular">منتظم</option>
                                <option value="vip">VIP</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                            <textarea id="customerNotes" name="notes" rows="2" 
                                      class="ui-textarea"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 space-x-reverse mt-6">
                        <button type="button" onclick="closeModal()" 
                                class="ui-btn ui-btn-md ui-btn-secondary">
                            إلغاء
                        </button>
                        <button type="submit" 
                                id="customerSubmitBtn"
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
            showToast('عرض تفاصيل العميل سيتم إضافته في التحديث القادم', 'info');
        }

        async function deleteCustomer(id) {
            const confirmed = await showConfirmDialog({
                title: 'تأكيد حذف العميل',
                text: 'سيتم حذف العميل نهائياً من القائمة. هل تريد الاستمرار؟',
                confirmText: 'نعم، حذف',
                cancelText: 'إلغاء'
            });

            if (!confirmed) return;

            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('id', id);
            formData.append('csrf_token', csrfToken);

            setGlobalLoading(true, 'جاري حذف العميل...');
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
                    showToast(data.message, 'success');
                    setTimeout(() => location.reload(), 650);
                } else {
                    showToast(data.message || 'تعذر حذف العميل', 'error');
                }
            })
            .catch(() => {
                showToast('حدث خطأ أثناء حذف العميل', 'error');
            })
            .finally(() => {
                setGlobalLoading(false);
            });
        }

        function closeModal() {
            document.getElementById('customerModal').classList.add('hidden');
        }

        // Handle form submission
        document.getElementById('customerForm').addEventListener('submit', function(e) {
            e.preventDefault();

            if (!validateFormInline(this)) {
                showToast('يرجى مراجعة الحقول المميزة باللون الأحمر', 'error');
                return;
            }
            
            const formData = new FormData(this);
            formData.set('csrf_token', csrfToken);
            const submitButton = document.getElementById('customerSubmitBtn');
            const actionText = document.getElementById('formAction').value === 'update' ? 'جاري تحديث العميل...' : 'جاري إضافة العميل...';
            setButtonLoading(submitButton, true);
            setGlobalLoading(true, actionText);
            
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
                    showToast(data.message, 'success');
                    setTimeout(() => location.reload(), 650);
                } else {
                    showToast(data.message || 'تعذر حفظ البيانات', 'error');
                }
            })
            .catch(() => {
                showToast('حدث خطأ أثناء حفظ البيانات', 'error');
            })
            .finally(() => {
                setButtonLoading(submitButton, false);
                setGlobalLoading(false);
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