<?php
/**
 * TenantMiddleware Class
 * Enforces strict multi-tenant isolation at the database query level
 * 
 * Every operation in a multi-tenant system MUST use this middleware
 * to ensure automatic tenant scope filtering
 */

abstract class TenantMiddleware {
    protected $db;
    protected $tenantId = null;
    protected $currentUserId = null;
    protected $allowedTables = [];
    
    /**
     * Constructor - Initialize with database connection
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Set the tenant ID for this operation
     * This MUST be called before any data operation
     * 
     * @param string $tenantId
     * @throws Exception if tenant ID is invalid or user doesn't belong to it
     */
    public function setTenantId($tenantId) {
        if (!TenantValidator::validateTenantId($tenantId)) {
            throw new Exception("Invalid tenant ID format");
        }
        
        if (!TenantValidator::userBelongsToTenant($this->getCurrentUserId(), $tenantId)) {
            throw new Exception("User does not have access to this organization");
        }
        
        $this->tenantId = $tenantId;
        return $this;
    }
    
    /**
     * Set the current user ID (from session/auth)
     * 
     * @param string $userId
     */
    public function setCurrentUser($userId) {
        $this->currentUserId = $userId;
        return $this;
    }
    
    /**
     * Get current tenant ID
     * 
     * @return string|null
     */
    public function getTenantId() {
        return $this->tenantId;
    }
    
    /**
     * Inject tenant filter into WHERE clause
     * This ensures every query is automatically scoped to the tenant
     * 
     * @param string $sql
     * @param string $tableAlias - If NULL, assumes table name is in FROM clause
     * @return string
     */
    protected function injectTenantFilter($sql, $tableAlias = null) {
        if (!$this->tenantId) {
            throw new Exception("Tenant ID must be set before executing queries");
        }
        
        // Safely inject tenant filter
        $filter = " AND " . ($tableAlias ? "$tableAlias." : "") . "organization_id = :__tenant_id__";
        
        // Check if WHERE clause exists
        if (stripos($sql, 'WHERE') !== false) {
            // Append to existing WHERE clause
            $sql = preg_replace('/WHERE\s+/i', 'WHERE ', $sql);
            $sql = preg_replace('/(WHERE .+?)(\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s*;?\s*$)/i', 
                               '$1' . $filter . '$2', $sql);
        } else {
            // Add new WHERE clause
            $sql = preg_replace('/(\s+FROM\s+.+?)(\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*;?\s*$)/i',
                               '$1 WHERE organization_id = :__tenant_id__$2', $sql);
            if (stripos($sql, 'WHERE') === false) {
                $sql .= " WHERE organization_id = :__tenant_id__";
            }
        }
        
        return $sql;
    }
    
    /**
     * Execute a query with automatic tenant filtering
     * 
     * @param string $sql
     * @param array $params
     * @param string $tableAlias - Optional table alias for WHERE clause
     * @return mixed
     */
    protected function queryWithTenant($sql, $params = [], $tableAlias = null) {
        $sql = $this->injectTenantFilter($sql, $tableAlias);
        $params['__tenant_id__'] = $this->tenantId;
        return $this->db->query($sql, $params);
    }
    
    /**
     * Select with tenant filter
     * 
     * @param string $sql
     * @param array $params
     * @return array
     */
    protected function selectWithTenant($sql, $params = []) {
        $stmt = $this->queryWithTenant($sql, $params);
        return $stmt ? $stmt->fetchAll() : [];
    }
    
    /**
     * Select one row with tenant filter
     * 
     * @param string $sql
     * @param array $params
     * @return array|null
     */
    protected function selectOneWithTenant($sql, $params = []) {
        $stmt = $this->queryWithTenant($sql, $params);
        return $stmt ? $stmt->fetch() : null;
    }
    
    /**
     * Validate that we can access a specific record
     * Prevents accidental cross-tenant data access
     * 
     * @param string $recordId
     * @param string $table
     * @return bool
     */
    protected function validateRecordAccess($recordId, $table) {
        $sql = "SELECT 1 FROM $table WHERE id = :id AND organization_id = :org_id LIMIT 1";
        $result = $this->db->selectOne($sql, ['id' => $recordId, 'org_id' => $this->tenantId]);
        return $result !== null;
    }
    
    /**
     * Ensure tenant ID is included in insert data
     * 
     * @param array $data
     * @return array
     */
    protected function addTenantToData($data) {
        if (!$this->tenantId) {
            throw new Exception("Tenant ID must be set before inserting data");
        }
        
        $data['organization_id'] = $this->tenantId;
        return $data;
    }
    
    /**
     * Insert with automatic tenant ID
     * 
     * @param string $table
     * @param array $data
     * @return string Last insert ID
     */
    protected function insertWithTenant($table, $data) {
        $data = $this->addTenantToData($data);
        
        // Audit log the insert
        $this->auditLog('INSERT', $table, null, null, $data);
        
        return $this->db->insert($table, $data);
    }
    
    /**
     * Update with tenant filter
     * 
     * @param string $table
     * @param array $data
     * @param string $whereClause
     * @param array $whereParams
     * @return bool
     */
    protected function updateWithTenant($table, $data, $whereClause, $whereParams = []) {
        if (!$this->tenantId) {
            throw new Exception("Tenant ID must be set before updating data");
        }
        
        // Ensure WHERE clause includes tenant filter
        if (stripos($whereClause, 'organization_id') === false) {
            $whereClause .= " AND organization_id = :__tenant_id__";
            $whereParams['__tenant_id__'] = $this->tenantId;
        }
        
        // Get old values for audit log
        $oldSql = "SELECT * FROM $table WHERE " . $whereClause . " LIMIT 1";
        $oldValues = $this->db->selectOne($oldSql, $whereParams);
        
        $result = $this->db->update($table, $data, $whereClause, $whereParams);
        
        // Audit log the update
        if ($oldValues) {
            $this->auditLog('UPDATE', $table, $oldValues['id'] ?? null, $oldValues, $data);
        }
        
        return $result;
    }
    
    /**
     * Delete with tenant filter
     * 
     * @param string $table
     * @param string $whereClause
     * @param array $whereParams
     * @return bool
     */
    protected function deleteWithTenant($table, $whereClause, $whereParams = []) {
        if (!$this->tenantId) {
            throw new Exception("Tenant ID must be set before deleting data");
        }
        
        // Ensure WHERE clause includes tenant filter
        if (stripos($whereClause, 'organization_id') === false) {
            $whereClause .= " AND organization_id = :__tenant_id__";
            $whereParams['__tenant_id__'] = $this->tenantId;
        }
        
        // Get record for audit log before deletion
        $selectSql = "SELECT * FROM $table WHERE " . $whereClause . " LIMIT 1";
        $record = $this->db->selectOne($selectSql, $whereParams);
        
        // Audit log the deletion
        if ($record) {
            $this->auditLog('DELETE', $table, $record['id'] ?? null, $record, null);
        }
        
        return $this->db->delete($table, $whereClause, $whereParams);
    }
    
    /**
     * Log all data modifications for security and compliance
     * 
     * @param string $action INSERT|UPDATE|DELETE|READ
     * @param string $table
     * @param string $recordId
     * @param array $oldValues
     * @param array $newValues
     */
    protected function auditLog($action, $table, $recordId, $oldValues = null, $newValues = null) {
        try {
            if (!$this->tenantId || !$this->currentUserId) {
                return; // Skip if no tenant context
            }
            
            $auditData = [
                'id' => $this->db->generateUUID(),
                'organization_id' => $this->tenantId,
                'user_id' => $this->currentUserId,
                'action' => $action,
                'entity_type' => $table,
                'entity_id' => $recordId,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $this->db->insert('audit_logs', $auditData);
        } catch (Exception $e) {
            // Don't throw - audit failures shouldn't break operations
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get current user ID from session
     * 
     * @return string|null
     */
    protected function getCurrentUserId() {
        if ($this->currentUserId) {
            return $this->currentUserId;
        }
        
        if (isset($_SESSION['user_id'])) {
            return $_SESSION['user_id'];
        }
        
        return null;
    }
    
    /**
     * Check if user has specific role in tenant
     * 
     * @param string $role
     * @return bool
     */
    protected function hasRoleInTenant($role) {
        if (!$this->tenantId) {
            return false;
        }
        
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return false;
        }
        
        $sql = "SELECT 1 FROM organization_members 
                WHERE organization_id = :org_id 
                AND user_id = :user_id 
                AND role = :role 
                AND is_active = 1 
                LIMIT 1";
        
        $result = $this->db->selectOne($sql, [
            'org_id' => $this->tenantId,
            'user_id' => $userId,
            'role' => $role
        ]);
        
        return $result !== null;
    }
    
    /**
     * Require specific role in tenant
     * 
     * @param string $role
     * @throws Exception
     */
    protected function requireRoleInTenant($role) {
        if (!$this->hasRoleInTenant($role)) {
            throw new Exception("Insufficient permissions in this organization");
        }
    }
}
?>
