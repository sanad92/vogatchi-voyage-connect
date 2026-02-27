<?php
/**
 * RBAC Middleware
 * 
 * Provides role-based access control middleware for checking permissions
 * and managing authorization throughout the application
 */
class RBACMiddleware {
    private $db;
    private $userId;
    private $organizationId;
    private $userRoles = [];
    private $userPermissions = [];
    private $sessionData = [];
    private $auditLog;

    public function __construct($db, $userId = null, $organizationId = null) {
        $this->db = $db;
        $this->userId = $userId;
        $this->organizationId = $organizationId;
        
        if ($this->userId && $this->organizationId) {
            $this->loadUserContext();
        }
    }

    /**
     * Load user context (roles and permissions)
     */
    private function loadUserContext() {
        // Load user's roles in this organization
        $this->userRoles = $this->getUserRoles($this->userId, $this->organizationId);
        
        // Load all permissions for the user
        $this->userPermissions = $this->getUserPermissions();
        
        // Load session data
        $this->sessionData = [
            'user_id' => $this->userId,
            'organization_id' => $this->organizationId,
            'roles' => array_column($this->userRoles, 'name'),
            'role_ids' => array_column($this->userRoles, 'id'),
            'highest_role_level' => max(array_column($this->userRoles, 'level')),
            'permissions' => array_column($this->userPermissions, 'name'),
            'loaded_at' => time()
        ];
    }

    /**
     * Set user context
     */
    public function setUserContext($userId, $organizationId) {
        $this->userId = $userId;
        $this->organizationId = $organizationId;
        $this->loadUserContext();
        return $this;
    }

    /**
     * Get user's roles in organization
     */
    private function getUserRoles($userId, $organizationId) {
        $query = "SELECT r.* FROM roles r
                  JOIN user_roles ur ON r.id = ur.role_id
                  WHERE ur.user_id = ? AND ur.organization_id = ? AND ur.revoked_at IS NULL
                  ORDER BY r.level DESC";
        
        return $this->db->query($query, [$userId, $organizationId]) ?? [];
    }

    /**
     * Get all permissions for user
     */
    private function getUserPermissions() {
        if (empty($this->userRoles)) {
            return [];
        }

        $roleIds = array_column($this->userRoles, 'id');
        $placeholders = implode(',', array_fill(0, count($roleIds), '?'));
        
        $query = "SELECT DISTINCT p.* FROM permissions p
                  JOIN role_permissions rp ON p.id = rp.permission_id
                  WHERE rp.role_id IN ($placeholders) AND p.is_active = 1
                  ORDER BY p.module, p.action";
        
        return $this->db->query($query, $roleIds) ?? [];
    }

    /**
     * PRIMARY METHOD: Check if user has permission
     * @throws Exception if permission is denied and throwException is true
     */
    public function checkPermission($permission_name, $throwException = true) {
        // If user is super admin, always allow
        if ($this->isSuperAdmin()) {
            $this->logAuditAccess('granted', $permission_name);
            return true;
        }

        // Check if user has the permission
        foreach ($this->userPermissions as $permission) {
            if ($permission['name'] === $permission_name) {
                $this->logAuditAccess('granted', $permission_name);
                return true;
            }
        }

        // Permission denied
        $this->logAuditAccess('denied', $permission_name);
        
        if ($throwException) {
            throw new Exception("Access Denied: You do not have permission to '{$permission_name}'");
        }

        return false;
    }

    /**
     * Check permission by module.action pattern
     */
    public function check($module, $action) {
        return $this->checkPermission("{$module}.{$action}");
    }

    /**
     * Check multiple permissions (OR logic - has at least one)
     */
    public function checkAny($permissions) {
        foreach ($permissions as $permission) {
            try {
                if ($this->checkPermission($permission, false)) {
                    return true;
                }
            } catch (Exception $e) {
                continue;
            }
        }

        $this->logAuditAccess('denied', implode(', ', $permissions));
        return false;
    }

    /**
     * Check multiple permissions (AND logic - has all)
     */
    public function checkAll($permissions) {
        foreach ($permissions as $permission) {
            if (!$this->checkPermission($permission, false)) {
                $this->logAuditAccess('denied', implode(', ', $permissions));
                return false;
            }
        }

        return true;
    }

    /**
     * Check if user has role
     */
    public function hasRole($role_name) {
        foreach ($this->userRoles as $role) {
            if ($role['name'] === $role_name) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check multiple roles (OR logic)
     */
    public function hasAnyRole($roles) {
        foreach ($roles as $role) {
            if ($this->hasRole($role)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check multiple roles (AND logic)
     */
    public function hasAllRoles($roles) {
        foreach ($roles as $role) {
            if (!$this->hasRole($role)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin() {
        return $this->hasRole(Role::SUPER_ADMIN);
    }

    /**
     * Check if user is admin
     */
    public function isAdmin() {
        return $this->hasRole(Role::ADMIN) || $this->isSuperAdmin();
    }

    /**
     * Check if user is manager or above
     */
    public function isManager() {
        return $this->hasRole(Role::MANAGER) || $this->isAdmin();
    }

    /**
     * Get user's highest role level
     */
    public function getHighestRoleLevel() {
        if (empty($this->userRoles)) {
            return 0;
        }
        return max(array_column($this->userRoles, 'level'));
    }

    /**
     * Check if user can manage another user (role hierarchy)
     */
    public function canManageUser($targetUserId, $targetOrganizationId) {
        // Super admin can manage anyone
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Get target user's highest role level
        $query = "SELECT MAX(r.level) as level FROM roles r
                  JOIN user_roles ur ON r.id = ur.role_id
                  WHERE ur.user_id = ? AND ur.organization_id = ? AND ur.revoked_at IS NULL";
        
        $result = $this->db->query($query, [$targetUserId, $targetOrganizationId]);
        
        if (!$result || empty($result)) {
            return false;
        }

        $targetLevel = $result[0]['level'] ?? 0;
        $userLevel = $this->getHighestRoleLevel();

        // User can only manage users with equal or lower role level
        return $userLevel > $targetLevel;
    }

    /**
     * Check if user can assign role
     */
    public function canAssignRole($roleId) {
        // Super admin can assign any role
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Get role level
        $query = "SELECT level FROM roles WHERE id = ?";
        $result = $this->db->query($query, [$roleId]);
        
        if (!$result) {
            return false;
        }

        $roleLevel = $result[0]['level'] ?? 0;
        $userLevel = $this->getHighestRoleLevel();

        // User can only assign roles they can manage (equal or lower)
        return $userLevel > $roleLevel;
    }

    /**
     * Get user's session data
     */
    public function getSessionData() {
        return $this->sessionData;
    }

    /**
     * Get user's roles
     */
    public function getRoles() {
        return $this->userRoles;
    }

    /**
     * Get user's permissions
     */
    public function getPermissions() {
        return $this->userPermissions;
    }

    /**
     * Get user's permission names
     */
    public function getPermissionNames() {
        return array_column($this->userPermissions, 'name');
    }

    /**
     * Get role names
     */
    public function getRoleNames() {
        return array_column($this->userRoles, 'name');
    }

    /**
     * Get permissions by module
     */
    public function getPermissionsByModule($module) {
        $result = [];
        foreach ($this->userPermissions as $permission) {
            if ($permission['module'] === $module) {
                $result[] = $permission;
            }
        }
        return $result;
    }

    /**
     * Log permission access/denial for audit trail
     */
    private function logAuditAccess($status, $permission_name) {
        if (!$this->userId || !$this->organizationId) {
            return;
        }

        $granted = ($status === 'granted') ? 1 : 0;
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';

        // Split permission name into module and action
        $parts = explode('.', $permission_name);
        $module = $parts[0] ?? 'unknown';
        $action = $parts[1] ?? 'unknown';

        $query = "INSERT INTO permission_audit_log (user_id, permission_name, module, action, granted, ip_address, user_agent, organization_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        try {
            $this->db->query($query, [
                $this->userId,
                $permission_name,
                $module,
                $action,
                $granted,
                $ip_address,
                $user_agent,
                $this->organizationId
            ]);
        } catch (Exception $e) {
            // Silently fail audit logging to not break application
            error_log("RBAC Audit Log Error: " . $e->getMessage());
        }
    }

    /**
     * Get audit logs for user
     */
    public function getAuditLogs($limit = 100, $offset = 0) {
        $query = "SELECT * FROM permission_audit_log
                  WHERE user_id = ? AND organization_id = ?
                  ORDER BY created_at DESC
                  LIMIT ? OFFSET ?";
        
        return $this->db->query($query, [$this->userId, $this->organizationId, $limit, $offset]);
    }

    /**
     * Get denied access attempts (security monitoring)
     */
    public function getDeniedAccessAttempts($limit = 100) {
        $query = "SELECT * FROM permission_audit_log
                  WHERE user_id = ? AND organization_id = ? AND granted = 0
                  ORDER BY created_at DESC
                  LIMIT ?";
        
        return $this->db->query($query, [$this->userId, $this->organizationId, $limit]);
    }

    /**
     * Require permission (throws exception if denied)
     */
    public function require($permission_name) {
        return $this->checkPermission($permission_name, true);
    }

    /**
     * Require role
     */
    public function requireRole($role_name) {
        if (!$this->hasRole($role_name)) {
            throw new Exception("Access Denied: Required role '{$role_name}' not found");
        }
        return true;
    }

    /**
     * Require any role
     */
    public function requireAnyRole($roles) {
        if (!$this->hasAnyRole($roles)) {
            throw new Exception("Access Denied: Required one of roles: " . implode(', ', $roles));
        }
        return true;
    }

    /**
     * Validate resource access (owner or admin check)
     */
    public function validateResourceAccess($resourceOwnerId, $resourceOrganizationId) {
        // Super admin always has access
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Must be in same organization
        if ($resourceOrganizationId !== $this->organizationId) {
            throw new Exception("Access Denied: Resource belongs to different organization");
        }

        // Must be owner or admin in organization
        if ($resourceOwnerId !== $this->userId && !$this->isAdmin()) {
            throw new Exception("Access Denied: You do not own this resource");
        }

        return true;
    }

    /**
     * Create a snapshot of permissions for logging/auditing
     */
    public function getPermissionSnapshot() {
        return [
            'user_id' => $this->userId,
            'organization_id' => $this->organizationId,
            'roles' => array_column($this->userRoles, 'name'),
            'permission_count' => count($this->userPermissions),
            'permissions' => array_column($this->userPermissions, 'name'),
            'snapshot_timestamp' => date('Y-m-d H:i:s')
        ];
    }
}
