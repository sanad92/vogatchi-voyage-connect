<?php
/**
 * Authentication Class
 * Tourism Management System
 */

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function login($email, $password) {
        $user = $this->db->selectOne(
            "SELECT u.*, GROUP_CONCAT(ur.role) as roles 
             FROM users u 
             LEFT JOIN user_roles ur ON u.id = ur.user_id 
             WHERE u.email = :email AND u.is_active = 1 
             GROUP BY u.id", 
            ['email' => $email]
        );
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $this->createSession($user);
            return true;
        }
        
        return false;
    }
    
    public function register($data) {
        $requiredFields = ['email', 'password', 'full_name'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Check if email exists
        $existingUser = $this->db->selectOne("SELECT id FROM users WHERE email = :email", ['email' => $data['email']]);
        if ($existingUser) {
            throw new Exception("البريد الإلكتروني مستخدم بالفعل");
        }
        
        // Validate email
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception("البريد الإلكتروني غير صحيح");
        }
        
        // Validate password
        if (strlen($data['password']) < 8) {
            throw new Exception("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        }
        
        $this->db->beginTransaction();
        
        try {
            $userId = $this->db->generateUUID();
            
            // Insert user
            $userData = [
                'id' => $userId,
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
                'full_name' => $data['full_name'],
                'phone' => $data['phone'] ?? null,
                'department' => $data['department'] ?? null,
                'is_active' => 1
            ];
            
            $this->db->insert('users', $userData);
            
            // Assign default role
            $this->db->insert('user_roles', [
                'user_id' => $userId,
                'role' => 'viewer'
            ]);
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    private function createSession($user) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['full_name'];
        $_SESSION['user_roles'] = $user['roles'] ? explode(',', $user['roles']) : ['viewer'];
        // P0 fix: keep organization context in session for API/runtime consistency.
        $_SESSION['organization_id'] = $user['organization_id'] ?? null;
        $_SESSION['login_time'] = time();

        // P0 fix: set authoritative tenant context for current request.
        if (class_exists('TenantMiddleware')) {
            TenantMiddleware::setTenantContext($_SESSION['organization_id'] ?? null, $user['id'] ?? null, true);
        }
        
        // Update last login
        $this->db->update('users', 
            ['updated_at' => date('Y-m-d H:i:s')], 
            'id = :id', 
            ['id' => $user['id']]
        );
    }
    
    public function logout() {
        session_destroy();
        return true;
    }
    
    public function isLoggedIn() {
        return isset($_SESSION['user_id']) && 
               isset($_SESSION['login_time']) && 
               (time() - $_SESSION['login_time']) < SESSION_LIFETIME;
    }
    
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'name' => $_SESSION['user_name'],
            // P0 fix: always expose tenant context to API/controller layers.
            'organization_id' => $_SESSION['organization_id'] ?? null,
            'roles' => $_SESSION['user_roles']
        ];
    }
    
    public function hasRole($role) {
        $user = $this->getCurrentUser();
        return $user && in_array($role, $user['roles']);
    }
    
    public function hasAnyRole($roles) {
        $user = $this->getCurrentUser();
        if (!$user) return false;
        
        foreach ($roles as $role) {
            if (in_array($role, $user['roles'])) {
                return true;
            }
        }
        return false;
    }
    
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

        // P0/P1 fix: refresh authoritative tenant context for each authenticated request.
        if (class_exists('TenantMiddleware')) {
            TenantMiddleware::setTenantContext($_SESSION['organization_id'] ?? null, $_SESSION['user_id'] ?? null, true);
        }
    }
    
    public function requireRole($role) {
        $this->requireLogin();
        
        if (!$this->hasRole($role)) {
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
                http_response_code(403);
                echo json_encode(['error' => 'ليس لديك صلاحية للوصول']);
                exit;
            } else {
                header('Location: /403.php');
                exit;
            }
        }
    }
    
    public function requireAnyRole($roles) {
        $this->requireLogin();
        
        if (!$this->hasAnyRole($roles)) {
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
                http_response_code(403);
                echo json_encode(['error' => 'ليس لديك صلاحية للوصول']);
                exit;
            } else {
                header('Location: /403.php');
                exit;
            }
        }
    }
    
    public function changePassword($currentPassword, $newPassword) {
        $user = $this->getCurrentUser();
        if (!$user) {
            throw new Exception("يجب تسجيل الدخول أولاً");
        }
        
        // Get current user data
        $userData = $this->db->selectOne("SELECT password_hash FROM users WHERE id = :id", ['id' => $user['id']]);
        
        if (!password_verify($currentPassword, $userData['password_hash'])) {
            throw new Exception("كلمة المرور الحالية غير صحيحة");
        }
        
        if (strlen($newPassword) < 8) {
            throw new Exception("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
        }
        
        $this->db->update('users', 
            ['password_hash' => password_hash($newPassword, PASSWORD_DEFAULT)], 
            'id = :id', 
            ['id' => $user['id']]
        );
        
        return true;
    }
    
    public function updateProfile($data) {
        $user = $this->getCurrentUser();
        if (!$user) {
            throw new Exception("يجب تسجيل الدخول أولاً");
        }
        
        $allowedFields = ['full_name', 'phone', 'department'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        $this->db->update('users', $updateData, 'id = :id', ['id' => $user['id']]);
        
        // Update session
        if (isset($updateData['full_name'])) {
            $_SESSION['user_name'] = $updateData['full_name'];
        }
        
        return true;
    }
}
?>