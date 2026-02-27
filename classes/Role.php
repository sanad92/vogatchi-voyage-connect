<?php
/**
 * Role Management Class
 * 
 * Handles role creation, retrieval, and permission management
 */
class Role {
    private $db;
    private $id;
    private $name;
    private $display_name;
    private $description;
    private $level;
    private $is_active;
    private $organization_id;
    private $permissions = [];

    // Role Constants
    const SUPER_ADMIN = 'super_admin';
    const ADMIN = 'admin';
    const MANAGER = 'manager';
    const ACCOUNTANT = 'accountant';
    const AGENT = 'agent';
    const VIEWER = 'viewer';

    // Role Levels
    const LEVEL_SUPER_ADMIN = 6;
    const LEVEL_ADMIN = 5;
    const LEVEL_MANAGER = 4;
    const LEVEL_ACCOUNTANT = 3;
    const LEVEL_AGENT = 2;
    const LEVEL_VIEWER = 1;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Get role by ID
     */
    public function getById($id) {
        $query = "SELECT * FROM roles WHERE id = ?";
        $result = $this->db->query($query, [$id]);
        
        if ($result && count($result) > 0) {
            $this->loadFromArray($result[0]);
            return $this;
        }
        return null;
    }

    /**
     * Get role by name
     */
    public function getByName($name) {
        $query = "SELECT * FROM roles WHERE name = ? AND organization_id IS NULL";
        $result = $this->db->query($query, [$name]);
        
        if ($result && count($result) > 0) {
            $this->loadFromArray($result[0]);
            return $this;
        }
        return null;
    }

    /**
     * Get organization-specific role
     */
    public function getOrgRole($name, $organization_id) {
        $query = "SELECT * FROM roles WHERE name = ? AND organization_id = ?";
        $result = $this->db->query($query, [$name, $organization_id]);
        
        if ($result && count($result) > 0) {
            $this->loadFromArray($result[0]);
            return $this;
        }
        return null;
    }

    /**
     * Get all system roles
     */
    public function getAllSystemRoles() {
        $query = "SELECT * FROM roles WHERE organization_id IS NULL AND is_active = 1 ORDER BY level DESC";
        return $this->db->query($query);
    }

    /**
     * Get all roles for an organization
     */
    public function getAllOrgRoles($organization_id) {
        $query = "SELECT * FROM roles WHERE organization_id = ? AND is_active = 1 ORDER BY level DESC";
        return $this->db->query($query, [$organization_id]);
    }

    /**
     * Create new system role
     */
    public function create($name, $display_name, $description = '', $level = 1) {
        $id = bin2hex(random_bytes(2)); // Generates a short ID
        
        $query = "INSERT INTO roles (name, display_name, description, level, is_active, organization_id)
                  VALUES (?, ?, ?, ?, 1, NULL)";
        
        if ($this->db->query($query, [$name, $display_name, $description, $level])) {
            $this->id = $this->db->lastInsertId();
            $this->name = $name;
            $this->display_name = $display_name;
            $this->description = $description;
            $this->level = $level;
            $this->is_active = true;
            return true;
        }
        return false;
    }

    /**
     * Create organization-specific role
     */
    public function createOrgRole($name, $display_name, $organization_id, $description = '', $level = 1) {
        $query = "INSERT INTO roles (name, display_name, description, level, is_active, organization_id)
                  VALUES (?, ?, ?, ?, 1, ?)";
        
        if ($this->db->query($query, [$name, $display_name, $description, $level, $organization_id])) {
            $this->id = $this->db->lastInsertId();
            $this->name = $name;
            $this->display_name = $display_name;
            $this->organization_id = $organization_id;
            $this->description = $description;
            $this->level = $level;
            $this->is_active = true;
            return true;
        }
        return false;
    }

    /**
     * Update role
     */
    public function update($display_name, $description = null, $level = null) {
        $updates = [];
        $params = [];

        $updates[] = "display_name = ?";
        $params[] = $display_name;

        if ($description !== null) {
            $updates[] = "description = ?";
            $params[] = $description;
        }

        if ($level !== null) {
            $updates[] = "level = ?";
            $params[] = $level;
        }

        $updates[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $this->id;

        $query = "UPDATE roles SET " . implode(", ", $updates) . " WHERE id = ?";
        return $this->db->query($query, $params);
    }

    /**
     * Deactivate role
     */
    public function deactivate() {
        $query = "UPDATE roles SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Activate role
     */
    public function activate() {
        $query = "UPDATE roles SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Grant permission to role
     */
    public function grantPermission($permission_id, $granted_by_user_id = null) {
        $query = "INSERT INTO role_permissions (role_id, permission_id, granted_by_user_id)
                  VALUES (?, ?, ?)";
        
        if ($this->db->query($query, [$this->id, $permission_id, $granted_by_user_id])) {
            return true;
        }
        return false;
    }

    /**
     * Revoke permission from role
     */
    public function revokePermission($permission_id) {
        $query = "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?";
        return $this->db->query($query, [$this->id, $permission_id]);
    }

    /**
     * Get all permissions for this role (including inherited)
     */
    public function getPermissions($includeInherited = true) {
        $query = "SELECT p.*, rp.granted_at FROM permissions p
                  JOIN role_permissions rp ON p.id = rp.permission_id
                  WHERE rp.role_id = ? AND p.is_active = 1
                  ORDER BY p.module, p.action";
        
        $permissions = $this->db->query($query, [$this->id]);
        
        if ($includeInherited && $permissions) {
            $inherited = $this->getInheritedPermissions();
            if ($inherited) {
                $permissions = array_merge($permissions, $inherited);
            }
        }
        
        $this->permissions = $permissions ?? [];
        return $this->permissions;
    }

    /**
     * Get inherited permissions from parent roles
     */
    public function getInheritedPermissions() {
        $query = "SELECT p.*, rp.granted_at FROM permissions p
                  JOIN role_permissions rp ON p.id = rp.permission_id
                  JOIN role_hierarchy rh ON rh.parent_role_id = rp.role_id
                  WHERE rh.child_role_id = ? AND p.is_active = 1
                  GROUP BY p.id
                  ORDER BY p.module, p.action";
        
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Check if role has permission
     */
    public function hasPermission($permission_name) {
        if (empty($this->permissions)) {
            $this->getPermissions();
        }

        foreach ($this->permissions as $permission) {
            if ($permission['name'] === $permission_name) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if role has permission by module.action pattern
     */
    public function hasModuleAction($module, $action) {
        return $this->hasPermission("{$module}.{$action}");
    }

    /**
     * Get permission count
     */
    public function getPermissionCount() {
        $query = "SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?";
        $result = $this->db->query($query, [$this->id]);
        return $result ? $result[0]['count'] : 0;
    }

    /**
     * Get all roles with permission count
     */
    public static function getAllRolesWithCount($db) {
        $query = "SELECT r.*, COUNT(rp.permission_id) as permission_count
                  FROM roles r
                  LEFT JOIN role_permissions rp ON r.id = rp.role_id
                  WHERE r.organization_id IS NULL
                  GROUP BY r.id
                  ORDER BY r.level DESC";
        
        return $db->query($query);
    }

    /**
     * Compare role levels (is this role more privileged than another?)
     */
    public function isMorePrivilegedThan($otherRole) {
        $otherLevel = is_object($otherRole) ? $otherRole->level : $otherRole;
        return $this->level > $otherLevel;
    }

    /**
     * Compare role levels (is this role at same level or more privileged?)
     */
    public function isAtLeastAsPrivilegedAs($otherRole) {
        $otherLevel = is_object($otherRole) ? $otherRole->level : $otherRole;
        return $this->level >= $otherLevel;
    }

    /**
     * Load role properties from array
     */
    private function loadFromArray($data) {
        $this->id = $data['id'] ?? null;
        $this->name = $data['name'] ?? null;
        $this->display_name = $data['display_name'] ?? null;
        $this->description = $data['description'] ?? null;
        $this->level = $data['level'] ?? null;
        $this->is_active = $data['is_active'] ?? false;
        $this->organization_id = $data['organization_id'] ?? null;
    }

    /**
     * Getters
     */
    public function getId() { return $this->id; }
    public function getName() { return $this->name; }
    public function getDisplayName() { return $this->display_name; }
    public function getDescription() { return $this->description; }
    public function getLevel() { return $this->level; }
    public function isActive() { return $this->is_active; }
    public function getOrganizationId() { return $this->organization_id; }

    /**
     * Get role as array
     */
    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'level' => $this->level,
            'is_active' => $this->is_active,
            'organization_id' => $this->organization_id,
            'permissions' => $this->permissions
        ];
    }
}
