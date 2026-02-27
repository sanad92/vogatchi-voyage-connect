<?php

require_once __DIR__ . '/BaseRepository.php';

class SalaryPaymentRepository extends BaseRepository {
    protected $table = 'salary_payments';

    public function __construct() {
        parent::__construct();
    }

    public function getByMonthAndEmployee($month, $employeeId) {
        return $this->db->selectOne("SELECT * FROM salary_payments WHERE salary_month = :month AND employee_id = :emp AND organization_id = :org", [
            'month' => $month,
            'emp' => $employeeId,
            'org' => TenantMiddleware::getOrganizationId()
        ]);
    }
}
