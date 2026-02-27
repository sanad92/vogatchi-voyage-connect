<?php
/**
 * TenantValidator Class
 * Validates tenant access and enforces multi-tenant isolation rules
 */

class TenantValidator {
    private static $db = null;
    
    /**
     * Initialize database connection
     */
    private static function initDb() {
        if (self::$db === null) {
            self::$db = Database::getInstance();
        }
    }
    
    /**
     * Validate tenant ID format and existence
     * 
     * @param string $tenantId
     * @return bool
     */
    public static function validateTenantId($tenantId) {
        // Must be a valid UUID
        if (!$tenantId || !preg_match('/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i', $tenantId)) {
            return false;
        }
        
        // Must exist in database
        self::initDb();
        $org = self::$db->selectOne(
            "SELECT id FROM organizations WHERE id = :id AND is_active = 1",
            ['id' => $tenantId]
        );
        
        return $org !== null;
    }
    
    /**
     * Check if user belongs to a specific tenant
     * 
     * @param string $userId
     * @param string $tenantId
     * @return bool
     */
    public static function userBelongsToTenant($userId, $tenantId) {
        if (!$userId || !$tenantId) {
            return false;
        }
        
        self::initDb();
        
        // Check in organization_members table
        $member = self::$db->selectOne(
            "SELECT id FROM organization_members 
             WHERE user_id = :user_id 
             AND organization_id = :org_id 
             AND is_active = 1",
            ['user_id' => $userId, 'org_id' => $tenantId]
        );
        
        if ($member) {
            return true;
        }
        
        // Also check users table (primary organization)
        $user = self::$db->selectOne(
            "SELECT id FROM users 
             WHERE id = :id 
             AND organization_id = :org_id 
             AND is_active = 1",
            ['id' => $userId, 'org_id' => $tenantId]
        );
        
        return $user !== null;
    }
    
    /**
     * Get all tenants user belongs to
     * 
     * @param string $userId
     * @return array
     */
    public static function getUserTenants($userId) {
        if (!$userId) {
            return [];
        }
        
        self::initDb();
        
        // Get from organization_members
        $members = self::$db->select(
            "SELECT DISTINCT organization_id FROM organization_members 
             WHERE user_id = :user_id AND is_active = 1",
            ['user_id' => $userId]
        );
        
        $tenantIds = array_column($members, 'organization_id');
        
        // Also add primary organization from users table
        $user = self::$db->selectOne(
            "SELECT organization_id FROM users WHERE id = :id AND is_active = 1",
            ['id' => $userId]
        );
        
        if ($user && !in_array($user['organization_id'], $tenantIds)) {
            $tenantIds[] = $user['organization_id'];
        }
        
        // Get full organization details
        if (empty($tenantIds)) {
            return [];
        }
        
        $placeholders = implode(',', array_fill(0, count($tenantIds), '?'));
        return self::$db->select(
            "SELECT * FROM organizations WHERE id IN ($placeholders) AND is_active = 1",
            $tenantIds
        );
    }
    
    /**
     * Get user's role in a specific tenant
     * 
     * @param string $userId
     * @param string $tenantId
     * @return string|null
     */
    public static function getUserRoleInTenant($userId, $tenantId) {
        if (!$userId || !$tenantId) {
            return null;
        }
        
        self::initDb();
        
        // Check organization_members first (explicit membership)
        $member = self::$db->selectOne(
            "SELECT role FROM organization_members 
             WHERE user_id = :user_id 
             AND organization_id = :org_id 
             AND is_active = 1",
            ['user_id' => $userId, 'org_id' => $tenantId]
        );
        
        if ($member) {
            return $member['role'];
        }
        
        // Check users table (primary organization)
        $user = self::$db->selectOne(
            "SELECT role FROM users 
             WHERE id = :id 
             AND organization_id = :org_id 
             AND is_active = 1",
            ['id' => $userId, 'org_id' => $tenantId]
        );
        
        return $user ? $user['role'] : null;
    }
    
    /**
     * Check if user has specific role in tenant
     * 
     * @param string $userId
     * @param string $tenantId
     * @param string $requiredRole
     * @return bool
     */
    public static function userHasRole($userId, $tenantId, $requiredRole) {
        $role = self::getUserRoleInTenant($userId, $tenantId);
        
        if ($role === $requiredRole) {
            return true;
        }
        
        // Define role hierarchy (higher level can do everything lower level can)
        $hierarchy = [
            'owner' => 0,
            'admin' => 1,
            'manager' => 2,
            'agent' => 3,
            'viewer' => 4,
            'super_admin' => -1, // Super admin can do everything
        ];
        
        $roleLevel = $hierarchy[$role] ?? null;
        $requiredLevel = $hierarchy[$requiredRole] ?? null;
        
        if ($roleLevel === null || $requiredLevel === null) {
            return false;
        }
        
        // User's role must be >= required role in hierarchy
        return $roleLevel <= $requiredLevel;
    }
    
    /**
     * Check if user is super admin (can bypass tenant checks)
     * 
     * @param string $userId
     * @return bool
     */
    public static function isSuperAdmin($userId) {
        if (!$userId) {
            return false;
        }
        
        self::initDb();
        
        // Check users table for super_admin role
        $user = self::$db->selectOne(
            "SELECT role FROM users WHERE id = :id AND is_active = 1",
            ['id' => $userId]
        );
        
        return $user && $user['role'] === 'super_admin';
    }
    
    /**
     * Validate data access for a record
     * Ensures user can access specific record in tenant
     * 
     * @param string $userId
     * @param string $tenantId
     * @param string $recordId
     * @param string $table
     * @return bool
     */
    public static function canAccessRecord($userId, $tenantId, $recordId, $table) {
        // Super admin can access anything
        if (self::isSuperAdmin($userId)) {
            return true;
        }
        
        // Must belong to tenant
        if (!self::userBelongsToTenant($userId, $tenantId)) {
            return false;
        }
        
        // Record must exist in tenant
        self::initDb();
        $record = self::$db->selectOne(
            "SELECT 1 FROM $table WHERE id = :id AND organization_id = :org_id LIMIT 1",
            ['id' => $recordId, 'org_id' => $tenantId]
        );
        
        return $record !== null;
    }
    
    /**
     * Validate multi-field access (e.g., customer in specific org)
     * 
     * @param string $userId
     * @param string $customerId
     * @param string $tenantId
     * @return bool
     */
    public static function canAccessCustomer($userId, $customerId, $tenantId) {
        return self::canAccessRecord($userId, $tenantId, $customerId, 'customers');
    }
    
    /**
     * Validate booking access
     * 
     * @param string $userId
     * @param string $bookingId
     * @param string $tenantId
     * @return bool
     */
    public static function canAccessBooking($userId, $bookingId, $tenantId) {
        // Check all booking types
        self::initDb();
        
        $booking = self::$db->selectOne(
            "SELECT 1 FROM hotel_bookings WHERE id = :id AND organization_id = :org_id LIMIT 1",
            ['id' => $bookingId, 'org_id' => $tenantId]
        );
        
        if ($booking) {
            return self::userBelongsToTenant($userId, $tenantId);
        }
        
        $booking = self::$db->selectOne(
            "SELECT 1 FROM flight_bookings WHERE id = :id AND organization_id = :org_id LIMIT 1",
            ['id' => $bookingId, 'org_id' => $tenantId]
        );
        
        if ($booking) {
            return self::userBelongsToTenant($userId, $tenantId);
        }
        
        $booking = self::$db->selectOne(
            "SELECT 1 FROM car_rentals WHERE id = :id AND organization_id = :org_id LIMIT 1",
            ['id' => $bookingId, 'org_id' => $tenantId]
        );
        
        return $booking && self::userBelongsToTenant($userId, $tenantId);
    }
    
    /**
     * Ensure operation is allowed
     * Throws exception if access denied
     * 
     * @param string $userId
     * @param string $tenantId
     * @param string $action
     * @throws Exception
     */
    public static function ensureAccess($userId, $tenantId, $action = 'read') {
        // Verify user exists
        if (!$userId) {
            throw new Exception("User not authenticated");
        }
        
        // Verify tenant exists
        if (!self::validateTenantId($tenantId)) {
            throw new Exception("Invalid or inactive organization");
        }
        
        // Super admin bypass
        if (self::isSuperAdmin($userId)) {
            // Log super admin cross-access
            self::logCrossOrgAccess($userId, $tenantId, $action);
            return;
        }
        
        // User must belong to tenant
        if (!self::userBelongsToTenant($userId, $tenantId)) {
            throw new Exception("Access denied: You do not belong to this organization");
        }
    }
    
    /**
     * Log cross-organization access by admins
     * 
     * @param string $userId
     * @param string $tenantId
     * @param string $action
     */
    private static function logCrossOrgAccess($userId, $tenantId, $action) {
        try {
            self::initDb();
            
            $log = [
                'id' => self::$db->generateUUID(),
                'organization_id' => $tenantId,
                'user_id' => $userId,
                'action' => 'CROSS_ORG_ACCESS_' . strtoupper($action),
                'entity_type' => 'admin_access',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            self::$db->insert('audit_logs', $log);
        } catch (Exception $e) {
            error_log("Failed to log cross-org access: " . $e->getMessage());
        }
    }
}
?>
