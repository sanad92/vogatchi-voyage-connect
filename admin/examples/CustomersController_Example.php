<?php
/**
 * Example: Customers Controller (service / repository architecture)
 *
 * This version demonstrates how a controller delegates business rules to a
 * service layer.  The service in turn uses a repository for data access.
 * The controller is still responsible for RBAC checks, input validation and
 * constructing the response structure.
 */

require_once __DIR__ . '/../../classes/services/CustomerService.php';
require_once __DIR__ . '/../../classes/repositories/CustomerRepository.php';

class CustomersController {
    private $db;
    private $auth;
    private $rbac;
    /** @var CustomerService */
    private $customerService;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;

        $this->rbac = new RBACMiddleware(
            $db,
            $auth->getCurrentUser()['id'],
            $auth->getCurrentUser()['organization_id']
        );

        // instantiate service with fresh repository instance
        $this->customerService = new CustomerService(new CustomerRepository());
        // propagate tenant/user context so repository queries are scoped automatically
        $this->customerService
             ->setTenant($this->auth->getCurrentUser()['organization_id'])
             ->setCurrentUser($this->auth->getCurrentUser()['id']);
    }

    /**
     * GET /customers
     */
    public function list() {
        try {
            $this->rbac->require(Permission::CUSTOMERS_VIEW);

            $customers = $this->customerService->getAll();

            if (!$this->rbac->isAdmin()) {
                $userId = $this->auth->getCurrentUser()['id'];
                $customers = array_filter($customers, function($c) use ($userId) {
                    return $c['assigned_agent_id'] === $userId;
                });
            }

            return [
                'success' => true,
                'data' => $customers,
                'count' => count($customers)
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function view($customerId) {
        try {
            $this->rbac->require(Permission::CUSTOMERS_VIEW);

            $customerData = $this->customerService->getById($customerId);
            if (!$customerData) {
                return ['success' => false, 'error' => 'Customer not found'];
            }

            $this->rbac->validateResourceAccess(
                $customerData['assigned_agent_id'],
                $this->auth->getCurrentUser()['organization_id']
            );

            return ['success' => true, 'data' => $customerData];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function create($data) {
        try {
            $this->rbac->require(Permission::CUSTOMERS_CREATE);

            // minimal field validation shown earlier
            $required = ['first_name', 'email'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return ['success' => false, 'error' => "Missing required field: {$field}"];
                }
            }

            $data['assigned_agent_id'] = $this->auth->getCurrentUser()['id'];
            $data['created_by'] = $this->auth->getCurrentUser()['id'];

            if ($this->customerService->create($data)) {
                return [
                    'success' => true,
                    'message' => 'Customer created successfully'
                ];
            }

            return ['success' => false, 'error' => 'Failed to create customer'];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function update($customerId, $data) {
        try {
            $this->rbac->require(Permission::CUSTOMERS_EDIT);

            $existing = $this->customerService->getById($customerId);
            if (!$existing) {
                return ['success' => false, 'error' => 'Customer not found'];
            }

            $this->rbac->validateResourceAccess(
                $existing['assigned_agent_id'],
                $this->auth->getCurrentUser()['organization_id']
            );

            $data['updated_by'] = $this->auth->getCurrentUser()['id'];
            $data['updated_at'] = date('Y-m-d H:i:s');

            if ($this->customerService->update($customerId, $data)) {
                return ['success' => true, 'message' => 'Customer updated successfully'];
            }

            return ['success' => false, 'error' => 'Failed to update customer'];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function delete($customerId) {
        try {
            $this->rbac->require(Permission::CUSTOMERS_DELETE);
            if (!$this->rbac->isAdmin()) {
                throw new Exception('Only administrators can delete customers');
            }

            if ($this->customerService->delete($customerId)) {
                return ['success' => true, 'message' => 'Customer deleted successfully'];
            }
            return ['success' => false, 'error' => 'Failed to delete customer'];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function export($customerId) {
        try {
            $this->rbac->require(Permission::CUSTOMERS_EXPORT);

            $customerData = $this->customerService->getById($customerId);
            if (!$customerData) {
                return ['success' => false, 'error' => 'Customer not found'];
            }
            $this->rbac->validateResourceAccess(
                $customerData['assigned_agent_id'],
                $this->auth->getCurrentUser()['organization_id']
            );
            return [
                'success' => true,
                'data' => $customerData,
                'format' => 'csv'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
