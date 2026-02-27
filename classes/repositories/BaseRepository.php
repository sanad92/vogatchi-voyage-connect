<?php

require_once __DIR__ . '/../TenantMiddleware.php';

/**
 * Base repository providing common database operations.
 * Other repository classes should extend this to get access to `$db` and utility methods.
 *
 * Also pulls in TenantMiddleware so that repositories can be scoped by tenant via
 * `setTenantId()` and `setCurrentUser()` if needed.
 */
class BaseRepository extends TenantMiddleware {
    /** @var Database */
    protected $db;

    public function __construct() {
        parent::__construct();
        $this->db = Database::getInstance();
    }

    /**
     * Generate a new UUID using the shared Database helper.
     */
    protected function generateId() {
        return $this->db->generateUUID();
    }

    /**
     * Convenience wrapper around insert.
     * Automatically writes an audit log entry when tenant/user context is present.
     */
    protected function insert(string $table, array $data) {
        $result = $this->db->insert($table, $data);
        if ($result && isset($data['id'])) {
            try {
                $this->auditLog('INSERT', $table, $data['id'], null, $data);
            } catch (Exception $e) {
                error_log("Audit insert failed: " . $e->getMessage());
            }
        }
        return $result;
    }

    /**
     * Convenience wrapper around update.
     * Fetches old values and logs audit entry automatically when possible.
     */
    protected function update(string $table, array $data, string $where, array $params = []) {
        $old = null;
        if (!empty($params) && isset($params['id'])) {
            $old = $this->selectOne("SELECT * FROM {$table} WHERE id = :id", ['id' => $params['id']]);
        }
        $result = $this->db->update($table, $data, $where, $params);
        if ($result) {
            try {
                $entityId = $params['id'] ?? null;
                $this->auditLog('UPDATE', $table, $entityId, $old, $data);
            } catch (Exception $e) {
                error_log("Audit update failed: " . $e->getMessage());
            }
        }
        return $result;
    }

    /**
     * Convenience wrapper around delete.
     * Logs audit entry including old row data if available.
     */
    protected function delete(string $table, string $where, array $params = []) {
        $old = null;
        if (!empty($params) && isset($params['id'])) {
            $old = $this->selectOne("SELECT * FROM {$table} WHERE id = :id", ['id' => $params['id']]);
        }
        $result = $this->db->delete($table, $where, $params);
        if ($result) {
            try {
                $entityId = $params['id'] ?? null;
                $this->auditLog('DELETE', $table, $entityId, $old, null);
            } catch (Exception $e) {
                error_log("Audit delete failed: " . $e->getMessage());
            }
        }
        return $result;
    }

    /**
     * Run a raw query returning multiple rows; automatically applies tenant filter if set.
     */
    protected function select(string $sql, array $params = []) {
        if ($this->getTenantId()) {
            return $this->selectWithTenant($sql, $params);
        }
        return $this->db->select($sql, $params);
    }

    /**
     * Run a raw query returning a single row; tenant‑aware when appropriate.
     */
    protected function selectOne(string $sql, array $params = []) {
        if ($this->getTenantId()) {
            $results = $this->selectWithTenant($sql, $params);
            return $results ? $results[0] : null;
        }
        return $this->db->selectOne($sql, $params);
    }

    /**
     * Paginate a custom query with optional tenant filtering.
     */
    protected function paginate(string $sql, array $params, int $page = 1, int $perPage = 20) {
        if ($this->getTenantId()) {
            $sql = $this->injectTenantFilter($sql);
            $params['__tenant_id__'] = $this->getTenantId();
        }
        return $this->db->paginate($sql, $params, $page, $perPage);
    }

    /**
     * Count rows in a table with optional where clause; tenant filter appended automatically.
     */
    protected function count(string $table, string $where = '1=1', array $params = []) {
        if ($this->getTenantId()) {
            $where .= " AND organization_id = :__tenant_id__";
            $params['__tenant_id__'] = $this->getTenantId();
        }
        return $this->db->count($table, $where, $params);
    }
}
