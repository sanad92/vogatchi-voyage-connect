<?php

require_once __DIR__ . '/../repositories/SalaryPaymentRepository.php';
require_once __DIR__ . '/AccountingService.php';

class SalaryService {
    private $repo;
    private $accounting;

    public function __construct() {
        $this->repo = new SalaryPaymentRepository();
        $this->accounting = new AccountingService();
    }

    public function recordPayment(array $data) {
        // expected: employee_id, salary_month (YYYY-MM-01), gross_amount, net_amount, tax_amount
        $data['id'] = $this->repo->db->generateUUID();
        $data['organization_id'] = TenantMiddleware::getOrganizationId();
        $data['status'] = 'paid';
        $data['payment_date'] = date('Y-m-d');
        $this->repo->db->insert('salary_payments', $data);

        // post journal entry: debit salary expense, credit cash/bank
        $description = "Salary payment for {$data['salary_month']} (employee {$data['employee_id']})";
        $lines = [
            // accounts must exist in chart_of_accounts
            ['account_code' => '6200', 'debit' => $data['gross_amount']], // salary expense
            ['account_code' => '1000', 'credit' => $data['net_amount']] // cash/bank
        ];
        $this->accounting->postEntry($data['payment_date'], $description, $lines);

        return $data['id'];
    }
}
