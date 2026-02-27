<?php

require_once __DIR__ . '/BaseService.php';
require_once __DIR__ . '/../repositories/CustomerRepository.php';

/**
 * Service layer for customer-related business logic.
 * Controllers should depend on this rather than talking to the database directly.
 */
class CustomerService extends BaseService {
    /** @var CustomerRepository */
    private $repo;

    public function __construct(CustomerRepository $repo = null) {
        $this->repo = $repo ?? new CustomerRepository();
    }

    /**
     * Set tenant context on underlying repository.
     * Returns $this for fluent chaining.
     */
    public function setTenant(string $tenantId) {
        $this->repo->setTenantId($tenantId);
        return $this;
    }

    /**
     * Set current user id for repository operations (used by tenant validator etc.).
     */
    public function setCurrentUser(string $userId) {
        $this->repo->setCurrentUser($userId);
        return $this;
    }

    public function create(array $data) {
        // required validations
        $requiredFields = ['name', 'phone'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }

        // duplicate phone check
        if ($this->repo->existsByPhone($data['phone'])) {
            throw new Exception("رقم الهاتف مستخدم بالفعل");
        }

        // subscription limits
        if (class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::requireFeature('customers');
        }

        // set defaults
        $data['customer_segment'] = $data['customer_segment'] ?? 'new';

        $res = $this->repo->create($data);
        if ($res && class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::recordUsage('customers');
        }
        if ($res && class_exists('Logger')) {
            Logger::activity('customer_created', ['customer_id' => $data['id'] ?? null]);
        }
        return $res;
    }

    public function update(string $id, array $data) {
        $customer = $this->repo->getById($id);
        if (!$customer) {
            throw new Exception("العميل غير موجود");
        }

        if (!empty($data['phone']) && $this->repo->existsByPhone($data['phone'], $id)) {
            throw new Exception("رقم الهاتف مستخدم بالفعل");
        }

        $allowedFields = ['name', 'phone', 'email', 'address', 'nationality', 'passport_number', 'date_of_birth', 'customer_segment', 'notes'];
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }

        $res = $this->repo->updateById($id, $updateData);
        if ($res && class_exists('Logger')) {
            Logger::activity('customer_updated', ['customer_id'=>$id,'changes'=>$updateData]);
        }
        return $res;
    }

    public function delete(string $id) {
        $count = $this->repo->countBookings($id);
        if ($count > 0) {
            throw new Exception("لا يمكن حذف العميل لوجود حجوزات مرتبطة به");
        }
        $res = $this->repo->softDelete($id);
        if ($res && class_exists('Logger')) {
            Logger::activity('customer_deleted', ['customer_id'=>$id]);
        }
        return $res;
    }

    public function getById(string $id) {
        return $this->repo->getById($id);
    }

    public function getAll(int $page = 1, int $perPage = 20, string $search = '', string $segment = '') {
        return $this->repo->getAll($page, $perPage, $search, $segment);
    }

    public function getStats() {
        return $this->repo->getStats();
    }

    public function updateLoyaltyPoints(string $customerId, int $points) {
        $res = $this->repo->updateLoyaltyPoints($customerId, $points);
        if ($res && class_exists('Logger')) {
            Logger::activity('loyalty_points_updated', ['customer_id'=>$customerId,'points'=>$points]);
        }
        return $res;
    }

    public function getCustomerBookings(string $customerId) {
        $bookings = $this->repo->getRawBookings($customerId);
        usort($bookings, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        return $bookings;
    }
}
