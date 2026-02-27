<?php

require_once __DIR__ . '/BaseRepository.php';

class ChartOfAccountsRepository extends BaseRepository {
    protected $table = 'chart_of_accounts';

    public function __construct() {
        parent::__construct();
    }

    public function getByCode($code) {
        return $this->db->selectOne("SELECT * FROM chart_of_accounts WHERE code = :code AND organization_id = :org", [
            'code' => $code,
            'org' => TenantMiddleware::getOrganizationId()
        ]);
    }

    public function getActiveAccounts($type = null) {
        $sql = "SELECT * FROM chart_of_accounts WHERE organization_id = :org AND is_active = 1";
        $params = ['org' => TenantMiddleware::getOrganizationId()];
        if ($type) {
            $sql .= " AND type = :type";
            $params['type'] = $type;
        }
        return $this->db->selectAll($sql, $params);
    }
}
