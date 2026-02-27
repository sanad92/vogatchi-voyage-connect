<?php
/**
 * Updated Auth Class with Tenant Isolation
 * Example of tenant-aware authentication
 */

class Auth extends TenantMiddleware {
    
    /**
     * Login user and set tenant context
     * 
     * @param string $email
     * @param string $password
     * @param string $tenantId - Optional: if not provided, uses primary org
     * @return bool
     */
    public function login($email, $password, $tenantId = null) {
        // Find user by email (can be in multiple orgs)
        $user = $this->db->selectOne(
            "SELECT u.*, GROUP_CONCAT(ur.role) as roles 
             FROM users u 
             LEFT JOIN user_roles ur ON u.id = ur.user_id 
             WHERE u.email = :email AND u.is_active = 1 
             GROUP BY u.id", 
            ['email' => $email]
        );
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            return false;
        }
        
        // If tenant not specified, use user's primary organization
        if (!$tenantId) {
            $tenantId = $user['organization_id'];
        }
        
        // Validate user belongs to this tenant
        if (!TenantValidator::userBelongsToTenant($user['id'], $tenantId)) {
            throw new Exception("User does not have access to this organization");
        }
        
        // Validate organization exists
        if (!TenantValidator::validateTenantId($tenantId)) {
            throw new Exception("Invalid or inactive organization");
        }
        
        $this->createSession($user, $tenantId);
        
        // Audit log
        $this->setTenantId($tenantId)->setCurrentUser($user['id']);
        $this->auditLog('LOGIN', 'users', $user['id'], null, [
            'email' => $email,
            'organization_id' => $tenantId
        ]);

        // Activity log
        if (class_exists('Logger')) {
            Logger::activity('login', ['email' => $email, 'organization_id' => $tenantId]);
        }
        
        return true;
    }
    
    /**
     * Create session with tenant context
     * 
     * @param array $user
     * @param string $tenantId
     */
    private function createSession($user, $tenantId) {
        TenantValidator::ensureAccess($user['id'], $tenantId, 'login');
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['full_name'];
        $_SESSION['organization_id'] = $tenantId;
        $_SESSION['user_roles'] = $user['roles'] ? explode(',', $user['roles']) : ['viewer'];
        $_SESSION['login_time'] = time();
        
        // Get user's role in this specific tenant
        $userRole = TenantValidator::getUserRoleInTenant($user['id'], $tenantId);
        if ($userRole) {
            $_SESSION['tenant_role'] = $userRole;
        }
        
        // Get list of accessible organizations
        $_SESSION['accessible_orgs'] = array_column(
            TenantValidator::getUserTenants($user['id']), 
            'id'
        );
    }
    
    /**
     * Register new user with organization
     * 
     * @param array $data
     * @param string $tenantId - Organization to register in (optional for direct org creation)
     * @return bool
     */
    public function register($data, $tenantId = null) {
        $requiredFields = ['email', 'password', 'full_name'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Validate email
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception("البريد الإلكتروني غير صحيح");
        }
        
        // Validate password
        if (strlen($data['password']) < 8) {
            throw new Exception("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        }
        
        // Check for existing email (prevent registration in multiple orgs with same email)
        // This is configurable - you might want to allow same email in different orgs
        $existing = $this->db->selectOne(
            "SELECT id FROM users WHERE email = :email",
            ['email' => $data['email']]
        );
        
        if ($existing) {
            throw new Exception("البريد الإلكتروني مستخدم بالفعل");
        }
        
        // If tenant ID provided, validate it
        if (!$tenantId) {
            // Auto-create default organization for user
            $tenantId = $this->createDefaultOrganization($data['full_name']);
        } else {
            TenantValidator::validateTenantId($tenantId);
        }
        
        $this->db->beginTransaction();
        
        try {
            $userId = $this->db->generateUUID();
            
            // Insert user
            $userData = [
                'id' => $userId,
                'organization_id' => $tenantId,
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
                'full_name' => $data['full_name'],
                'phone' => $data['phone'] ?? null,
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $this->db->insert('users', $userData);
            
            // Add to organization_members as owner (if not primary org of user)
            if ($tenantId !== $userData['organization_id']) {
                $this->db->insert('organization_members', [
                    'id' => $this->db->generateUUID(),
                    'organization_id' => $tenantId,
                    'user_id' => $userId,
                    'role' => 'owner'
                ]);
            }
            
            // Assign default role
            $this->db->insert('user_roles', [
                'id' => $this->db->generateUUID(),
                'user_id' => $userId,
                'role' => 'admin'
            ]);
            
            $this->db->commit();
            if (class_exists('Logger')) {
                Logger::activity('register', ['email' => $data['email'], 'organization_id' => $tenantId]);
            }
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * Create default organization for new user
     * 
     * @param string $userName
     * @return string Organization ID
     */
    private function createDefaultOrganization($userName) {
        $orgId = $this->db->generateUUID();
        
        $orgData = [
            'id' => $orgId,
            'name' => "$userName's Organization",
            'slug' => substr(uniqid('org_'), 0, 20),
            'plan' => 'free',
            'max_users' => 5,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $this->db->insert('organizations', $orgData);
        
        return $orgId;
    }
    
    /**
     * Logout user
     * 
     * @return bool
     */
    public function logout() {
        // Audit log the logout
        if (isset($_SESSION['user_id']) && isset($_SESSION['organization_id'])) {
            try {
                $this->setTenantId($_SESSION['organization_id'])
                     ->setCurrentUser($_SESSION['user_id']);
                $this->auditLog('LOGOUT', 'users', $_SESSION['user_id'], null, null);
            } catch (Exception $e) {
                error_log("Failed to audit logout: " . $e->getMessage());
            }
        }
        
        if (class_exists('Logger')) {
            Logger::activity('logout');
        }
        session_destroy();
        return true;
    }
    
    /**
     * Is user logged in?
     * 
     * @return bool
     */
    public function isLoggedIn() {
        return isset($_SESSION['user_id']) && 
               isset($_SESSION['organization_id']) &&
               isset($_SESSION['login_time']) && 
               (time() - $_SESSION['login_time']) < SESSION_LIFETIME;
    }
    
    /**
     * Get current user with tenant context
     * 
     * @return array|null
     */
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'name' => $_SESSION['user_name'],
            'organization_id' => $_SESSION['organization_id'],
            'roles' => $_SESSION['user_roles'] ?? [],
            'tenant_role' => $_SESSION['tenant_role'] ?? 'viewer',
            'accessible_orgs' => $_SESSION['accessible_orgs'] ?? []
        ];
    }
    
    /**
     * Get current organization ID
     * 
     * @return string|null
     */
    public function getCurrentOrganizationId() {
        return $_SESSION['organization_id'] ?? null;
    }
    
    /**
     * Switch to different organization (if user belongs to it)
     * 
     * @param string $tenantId
     * @return bool
     * @throws Exception
     */
    public function switchOrganization($tenantId) {
        $user = $this->getCurrentUser();
        
        if (!$user) {
            throw new Exception("User not logged in");
        }
        
        if (!in_array($tenantId, $user['accessible_orgs'])) {
            throw new Exception("User does not have access to this organization");
        }
        
        $_SESSION['organization_id'] = $tenantId;
        
        // Update tenant role
        $userRole = TenantValidator::getUserRoleInTenant($user['id'], $tenantId);
        if ($userRole) {
            $_SESSION['tenant_role'] = $userRole;
        }
        
        // Audit log organization switch
        $this->setTenantId($tenantId)->setCurrentUser($user['id']);
        $this->auditLog('ORG_SWITCH', 'users', $user['id'], null, [
            'new_organization_id' => $tenantId
        ]);
        
        return true;
    }
    
    /**
     * Require login
     */
    public function requireLogin() {
        if (!$this->isLoggedIn()) {
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
                http_response_code(401);
                echo json_encode(['error' => 'تسجيل الدخول مطلوب']);
                exit;
            } else {
                header('Location: /login.php');
                exit;
            }
        }
    }
    
    /**
     * Require specific role in current organization
     * 
     * @param string $role
     */
    public function requireRole($role) {
        $this->requireLogin();
        
        $user = $this->getCurrentUser();
        
        if (!TenantValidator::userHasRole($user['id'], $user['organization_id'], $role)) {
            http_response_code(403);
            echo json_encode(['error' => 'Insufficient permissions']);
            exit;
        }
    }
}
?>
