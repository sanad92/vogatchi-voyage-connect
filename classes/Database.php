<?php
/**
 * Database Connection Class
 * Tourism Management System
 */

class Database {
    private static $instance = null;
    private $connection;
    private $host = DB_HOST;
    private $database = DB_NAME;
    private $username = DB_USER;
    private $password = DB_PASS;
    private $charset = DB_CHARSET;

    // P1 fix: tenant-scoped tables list used by automatic enforcement layer.
    private $tenantScopedTables = [
        'users', 'customers', 'suppliers', 'employees', 'customer_segments', 'booking_statuses',
        'hotel_bookings', 'flight_bookings', 'car_rentals', 'transport_bookings', 'invoices',
        'invoice_items', 'customer_communications', 'service_requests', 'expense_transactions',
        'whatsapp_conversations', 'bank_accounts', 'site_settings', 'landing_content',
        'org_usage_summary', 'api_calls_log', 'storage_usage', 'monthly_usage_report',
        'subscriptions', 'usage_records', 'activity_logs', 'audit_logs', 'error_logs',
        'jobs_queue', 'job_failures', 'generated_invoices', 'report_exports', 'chart_of_accounts',
        'journal_entries', 'salary_payments'
    ];

    private function __construct() {
        $dsn = "mysql:host=$this->host;dbname=$this->database;charset=$this->charset";
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => true,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new PDOException("خطأ في الاتصال بقاعدة البيانات");
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            // P2 fix: never fail silently, always log and throw.
            error_log("Query failed: " . $e->getMessage() . " SQL: " . $sql);
            throw $e;
        }
    }

    public function select($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetchAll() : [];
    }

    public function selectOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetch() : null;
    }

    public function insert($table, $data) {
        // P1 fix: automatically enforce tenant_id on scoped tables when context exists.
        if ($this->isTenantScopedTable($table)) {
            $orgId = $this->getCurrentOrganizationId();
            if ($orgId && !isset($data['organization_id'])) {
                $data['organization_id'] = $orgId;
            }
        }

        $fields = implode(',', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO $table ($fields) VALUES ($placeholders)";
        $stmt = $this->query($sql, $data);
        
        return $stmt ? $this->connection->lastInsertId() : false;
    }

    public function update($table, $data, $where, $whereParams = []) {
        // P1 fix: enforce organization filter automatically on scoped tables.
        if ($this->isTenantScopedTable($table)) {
            [$where, $whereParams] = $this->appendTenantFilter($where, $whereParams);
        }

        $fields = [];
        foreach ($data as $key => $value) {
            $fields[] = "$key = :$key";
        }
        $fieldsString = implode(', ', $fields);
        
        $sql = "UPDATE $table SET $fieldsString WHERE $where";
        return $this->query($sql, array_merge($data, $whereParams));
    }

    public function delete($table, $where, $params = []) {
        // P1 fix: enforce organization filter automatically on scoped tables.
        if ($this->isTenantScopedTable($table)) {
            [$where, $params] = $this->appendTenantFilter($where, $params);
        }

        $sql = "DELETE FROM $table WHERE $where";
        return $this->query($sql, $params);
    }

    public function count($table, $where = '1=1', $params = []) {
        // P1/P0 compatibility fix: support array filters used by some controllers.
        if (is_array($where)) {
            $filters = $where;
            $where = '1=1';
            $params = [];
            foreach ($filters as $column => $value) {
                $paramName = 'count_' . preg_replace('/[^a-zA-Z0-9_]/', '_', (string)$column);
                $where .= " AND {$column} = :{$paramName}";
                $params[$paramName] = $value;
            }
        }

        // P1 fix: enforce organization filter automatically on scoped tables.
        if ($this->isTenantScopedTable($table)) {
            [$where, $params] = $this->appendTenantFilter($where, $params);
        }

        $sql = "SELECT COUNT(*) as total FROM $table WHERE $where";
        $result = $this->selectOne($sql, $params);
        return $result ? (int)$result['total'] : 0;
    }

    /**
     * P1 fix: determine whether table must be tenant-scoped.
     */
    private function isTenantScopedTable($table): bool {
        return in_array(strtolower((string)$table), $this->tenantScopedTables, true);
    }

    /**
     * P1 fix: resolve current tenant context for automatic query scoping.
     */
    private function getCurrentOrganizationId(): ?string {
        if (class_exists('TenantMiddleware')) {
            $org = TenantMiddleware::getOrganizationId();
            if (!empty($org)) {
                return $org;
            }
        }
        if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['organization_id'])) {
            return (string)$_SESSION['organization_id'];
        }
        return null;
    }

    /**
     * P1 fix: append tenant filter when missing, preserving positional or named params.
     */
    private function appendTenantFilter($where, $params): array {
        $orgId = $this->getCurrentOrganizationId();
        if (!$orgId) {
            return [$where, $params];
        }

        if (stripos((string)$where, 'organization_id') !== false) {
            return [$where, $params];
        }

        if (is_array($params) && array_is_list($params)) {
            $where = (string)$where . ' AND organization_id = ?';
            $params[] = $orgId;
            return [$where, $params];
        }

        $where = (string)$where . ' AND organization_id = :__tenant_org_id__';
        if (!is_array($params)) {
            $params = [];
        }
        $params['__tenant_org_id__'] = $orgId;

        return [$where, $params];
    }

    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }

    public function commit() {
        return $this->connection->commit();
    }

    public function rollback() {
        return $this->connection->rollback();
    }

    public function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    public function escape($string) {
        return $this->connection->quote($string);
    }

    // Pagination helper
    public function paginate($sql, $params = [], $page = 1, $perPage = ITEMS_PER_PAGE) {
        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM ($sql) as count_query";
        $total = $this->selectOne($countSql, $params)['total'];
        
        // Calculate pagination
        $totalPages = ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;
        
        // Add LIMIT and OFFSET to original query
        $paginatedSql = $sql . " LIMIT $perPage OFFSET $offset";
        $data = $this->select($paginatedSql, $params);
        
        return [
            'data' => $data,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'total_pages' => $totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ];
    }

    // Search helper
    public function buildSearchWhere($fields, $searchTerm) {
        if (empty($searchTerm) || empty($fields)) {
            return ['where' => '1=1', 'params' => []];
        }
        
        $conditions = [];
        $params = [];
        
        foreach ($fields as $field) {
            $conditions[] = "$field LIKE :search_$field";
            $params["search_$field"] = "%$searchTerm%";
        }
        
        return [
            'where' => '(' . implode(' OR ', $conditions) . ')',
            'params' => $params
        ];
    }
}
?>