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
            'first_name' => 'required|string|min:2',
            'last_name'  => 'string|max:100',
            'email'      => 'required|email',
            'phone'      => 'string',
        ];

        $this->validate($rules);

        $data = $this->requestData;
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
