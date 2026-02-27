<?php
/**
 * Customers API controller
 */
require_once __DIR__ . '/../../classes/ApiController.php';
require_once __DIR__ . '/../../classes/services/CustomerService.php';
require_once __DIR__ . '/../../classes/repositories/CustomerRepository.php';

class CustomersApi extends ApiController {
    public function create() {
        $this->throttle();
        $this->auth->requireLogin();
        $this->rbac->require(Permission::CUSTOMERS_CREATE);

        // validation rules
        $rules = [
            // P2 fix: normalize fields with CustomerService contract (name, phone).
            'name'       => 'required|string|min:2',
            'email'      => 'email',
            'phone'      => 'required|string',
        ];

        $this->validate($rules);

        $data = $this->requestData;

        // P2 fix: backward-compat mapping for legacy first_name/last_name payloads.
        if (empty($data['name']) && !empty($data['first_name'])) {
            $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        }

        $data['created_by'] = $this->auth->getCurrentUser()['id'];

        $customerService = new CustomerService(new CustomerRepository());
        $customerService
            ->setTenant($this->auth->getCurrentUser()['organization_id'])
            ->setCurrentUser($this->auth->getCurrentUser()['id']);

        if ($customerService->create($data)) {
            $this->success([], 'Customer created', 201);
        } else {
            $this->error('Failed to create customer', 500);
        }
    }
}
