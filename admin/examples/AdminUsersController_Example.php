<?php
/**
 * Example: Admin Users & Roles Controller
 * 
 * Shows RBAC for administrative operations:
 * - User management with role assignment
 * - Permission validation for user management
 * - Role hierarchy enforcement
 * - Admin audit logging
 */

class AdminUsersController {
    private $db;
    private $auth;
    private $rbac;
    private $roleManager;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;
        
        $this->rbac = new RBACMiddleware(
            $db,
            $auth->getCurrentUser()['id'],
            $auth->getCurrentUser()['organization_id']
        );

        $this->roleManager = new Role($db);
    }

    /**
     * GET /admin/users - List all users in organization
     * Requires: users.view permission
     */
    public function listUsers() {
        try {
            $this->rbac->require(Permission::USERS_VIEW);

            $query = "SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
                             GROUP_CONCAT(r.name) as roles,
                             COUNT(DISTINCT ur.role_id) as role_count
                      FROM users u
                      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.organization_id = ?
                      LEFT JOIN roles r ON ur.role_id = r.id
                      WHERE u.organization_id = ?
                      GROUP BY u.id
                      ORDER BY u.created_at DESC";

            $users = $this->db->query($query, [
                $this->auth->getCurrentUser()['organization_id'],
                $this->auth->getCurrentUser()['organization_id']
            ]);

            return [
                'success' => true,
                'data' => $users,
                'count' => count($users)
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * POST /admin/users - Create new user and assign roles
     * Requires: users.create permission
     */
    public function createUser($userData, $roleIds = []) {
        try {
            $this->rbac->require(Permission::USERS_CREATE);

            // Validate required fields
            if (empty($userData['email']) || empty($userData['password'])) {
                return ['success' => false, 'error' => 'Email and password required'];
            }

            // Check email doesn't exist
            $existingQuery = "SELECT id FROM users WHERE email = ? AND organization_id = ?";
            $existing = $this->db->query($existingQuery, [
                $userData['email'],
                $this->auth->getCurrentUser()['organization_id']
            ]);

            if ($existing && count($existing) > 0) {
                return ['success' => false, 'error' => 'Email already in use'];
            }

            // Create user
            $userId = bin2hex(random_bytes(18));
            $createQuery = "INSERT INTO users (id, email, password, first_name, last_name, organization_id, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, 1)";

            $this->db->query($createQuery, [
                $userId,
                $userData['email'],
                password_hash($userData['password'], PASSWORD_BCRYPT),
                $userData['first_name'] ?? '',
                $userData['last_name'] ?? '',
                $this->auth->getCurrentUser()['organization_id']
            ]);

            // Assign roles
            if (!empty($roleIds)) {
                foreach ($roleIds as $roleId) {
                    // Verify current user can assign this role
                    if (!$this->rbac->canAssignRole($roleId)) {
                        return ['success' => false, 'error' => "Cannot assign role ID {$roleId}"];
                    }

                    $assignQuery = "INSERT INTO user_roles (user_id, role_id, organization_id, assigned_by_user_id)
                                    VALUES (?, ?, ?, ?)";

                    $this->db->query($assignQuery, [
                        $userId,
                        $roleId,
                        $this->auth->getCurrentUser()['organization_id'],
                        $this->auth->getCurrentUser()['id']
                    ]);
                }
            } else {
                // Assign default viewer role
                $query = "INSERT INTO user_roles (user_id, role_id, organization_id, assigned_by_user_id)
                          VALUES (?, (SELECT id FROM roles WHERE name = 'viewer'), ?, ?)";

                $this->db->query($query, [
                    $userId,
                    $this->auth->getCurrentUser()['organization_id'],
                    $this->auth->getCurrentUser()['id']
                ]);
            }

            // Log admin action
            $this->logAdminAction('USER_CREATED', $userId, [
                'email' => $userData['email'],
                'roles' => $roleIds
            ]);

            return [
                'success' => true,
                'message' => 'User created successfully',
                'user_id' => $userId
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * PUT /admin/users/:id/roles - Update user roles
     * Requires: users.edit permission
     * Role hierarchy enforcement: can only assign roles you have authority over
     */
    public function updateUserRoles($targetUserId, $roleIds) {
        try {
            $this->rbac->require(Permission::USERS_EDIT);

            // Verify current user can manage this target user
            if (!$this->rbac->canManageUser($targetUserId, $this->auth->getCurrentUser()['organization_id'])) {
                throw new Exception('Cannot modify roles for this user');
            }

            // Verify all new roles can be assigned by current user
            foreach ($roleIds as $roleId) {
                if (!$this->rbac->canAssignRole($roleId)) {
                    throw new Exception("Cannot assign role {$roleId}");
                }
            }

            $orgId = $this->auth->getCurrentUser()['organization_id'];

            // Revoke existing roles
            $revokeQuery = "UPDATE user_roles SET revoked_at = NOW() 
                            WHERE user_id = ? AND organization_id = ? AND revoked_at IS NULL";
            $this->db->query($revokeQuery, [$targetUserId, $orgId]);

            // Assign new roles
            foreach ($roleIds as $roleId) {
                $assignQuery = "INSERT INTO user_roles (user_id, role_id, organization_id, assigned_by_user_id)
                                VALUES (?, ?, ?, ?)";

                $this->db->query($assignQuery, [
                    $targetUserId,
                    $roleId,
                    $orgId,
                    $this->auth->getCurrentUser()['id']
                ]);
            }

            // Log admin action
            $this->logAdminAction('USER_ROLES_UPDATED', $targetUserId, [
                'new_roles' => $roleIds
            ]);

            return [
                'success' => true,
                'message' => 'User roles updated successfully'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * POST /admin/users/:id/deactivate - Deactivate user
     * Requires: users.delete permission
     * Only higher-level users can deactivate lower-level users
     */
    public function deactivateUser($targetUserId) {
        try {
            $this->rbac->require(Permission::USERS_DELETE);

            // Verify authority
            if (!$this->rbac->canManageUser($targetUserId, $this->auth->getCurrentUser()['organization_id'])) {
                throw new Exception('Cannot deactivate this user');
            }

            $orgId = $this->auth->getCurrentUser()['organization_id'];

            $query = "UPDATE users SET is_active = 0 WHERE id = ? AND organization_id = ?";
            $this->db->query($query, [$targetUserId, $orgId]);

            // Log action
            $this->logAdminAction('USER_DEACTIVATED', $targetUserId);

            return [
                'success' => true,
                'message' => 'User deactivated successfully'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * POST /admin/users/:id/activate - Reactivate user
     * Requires: users.edit permission
     */
    public function activateUser($targetUserId) {
        try {
            $this->rbac->require(Permission::USERS_EDIT);

            if (!$this->rbac->canManageUser($targetUserId, $this->auth->getCurrentUser()['organization_id'])) {
                throw new Exception('Cannot activate this user');
            }

            $orgId = $this->auth->getCurrentUser()['organization_id'];

            $query = "UPDATE users SET is_active = 1 WHERE id = ? AND organization_id = ?";
            $this->db->query($query, [$targetUserId, $orgId]);

            $this->logAdminAction('USER_ACTIVATED', $targetUserId);

            return [
                'success' => true,
                'message' => 'User activated successfully'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /admin/roles - List all roles
     * Requires: roles.view permission
     */
    public function listRoles() {
        try {
            $this->rbac->require(Permission::ROLES_VIEW);

            $roles = $this->roleManager->getAllSystemRoles();

            // Add permission count to each role
            foreach ($roles as &$role) {
                $roleObj = new Role($this->db);
                $roleObj->getById($role['id']);
                $role['permission_count'] = $roleObj->getPermissionCount();
            }

            return [
                'success' => true,
                'data' => $roles,
                'count' => count($roles)
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /admin/roles/:id - Get role with permissions
     * Requires: roles.view permission
     */
    public function getRole($roleId) {
        try {
            $this->rbac->require(Permission::ROLES_VIEW);

            $role = new Role($this->db);
            $role->getById($roleId);

            if (!$role) {
                return ['success' => false, 'error' => 'Role not found'];
            }

            $permissions = $role->getPermissions(false);

            return [
                'success' => true,
                'data' => [
                    'role' => $role->toArray(),
                    'permissions' => $permissions,
                    'permission_count' => count($permissions)
                ]
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * PUT /admin/roles/:id/permissions - Update role permissions
     * Requires: roles.manage permission
     * Only admins can modify role permissions
     */
    public function updateRolePermissions($roleId, $permissionIds) {
        try {
            $this->rbac->require(Permission::ROLES_MANAGE);

            // Extra check: must be super admin or org admin
            if (!$this->rbac->isAdmin()) {
                throw new Exception('Only administrators can manage role permissions');
            }

            $role = new Role($this->db);
            $role->getById($roleId);

            if (!$role) {
                return ['success' => false, 'error' => 'Role not found'];
            }

            // Revoke existing permissions
            $revokeQuery = "DELETE FROM role_permissions WHERE role_id = ?";
            $this->db->query($revokeQuery, [$roleId]);

            // Grant new permissions
            foreach ($permissionIds as $permissionId) {
                $role->grantPermission($permissionId, $this->auth->getCurrentUser()['id']);
            }

            // Log action
            $this->logAdminAction('ROLE_PERMISSIONS_UPDATED', $roleId, [
                'permission_count' => count($permissionIds)
            ]);

            return [
                'success' => true,
                'message' => 'Role permissions updated successfully',
                'denied_permissions' => 0
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /admin/audit-logs - View admin action audit logs
     * Requires: audit.view permission
     */
    public function getAuditLogs($limit = 100, $offset = 0) {
        try {
            $this->rbac->require(Permission::AUDIT_VIEW);

            $query = "SELECT * FROM permission_audit_log
                      WHERE organization_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                      ORDER BY created_at DESC
                      LIMIT ? OFFSET ?";

            $logs = $this->db->query($query, [
                $this->auth->getCurrentUser()['organization_id'],
                $limit,
                $offset
            ]);

            return [
                'success' => true,
                'data' => $logs,
                'count' => count($logs)
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Helper: Log administrative action
     */
    private function logAdminAction($action, $targetId, $details = []) {
        $query = "INSERT INTO admin_audit_log (action, target_id, details, performed_by, organization_id, ip_address, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, NOW())";

        try {
            $this->db->query($query, [
                $action,
                $targetId,
                json_encode($details),
                $this->auth->getCurrentUser()['id'],
                $this->auth->getCurrentUser()['organization_id'],
                $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN'
            ]);
        } catch (Exception $e) {
            error_log("Admin audit log error: " . $e->getMessage());
        }
    }
}
