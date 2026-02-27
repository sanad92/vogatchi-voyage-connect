<?php
/**
 * Permission Management Class
 * 
 * Handles permission creation, retrieval, and role assignment
 */
class Permission {
    private $db;
    private $id;
    private $name;
    private $display_name;
    private $description;
    private $module;
    private $action;
    private $is_active;

    // Permission Constants by Module
    const DASHBOARD_VIEW = 'dashboard.view';
    const DASHBOARD_EXPORT = 'dashboard.export';

    const CUSTOMERS_VIEW = 'customers.view';
    const CUSTOMERS_CREATE = 'customers.create';
    const CUSTOMERS_EDIT = 'customers.edit';
    const CUSTOMERS_DELETE = 'customers.delete';
    const CUSTOMERS_EXPORT = 'customers.export';
    const CUSTOMERS_SEGMENT = 'customers.segment';

    const BOOKINGS_VIEW = 'bookings.view';
    const BOOKINGS_CREATE = 'bookings.create';
    const BOOKINGS_EDIT = 'bookings.edit';
    const BOOKINGS_CANCEL = 'bookings.cancel';
    const BOOKINGS_CONFIRM = 'bookings.confirm';
    const BOOKINGS_EXPORT = 'bookings.export';

    const INVOICES_VIEW = 'invoices.view';
    const INVOICES_CREATE = 'invoices.create';
    const INVOICES_EDIT = 'invoices.edit';
    const INVOICES_SEND = 'invoices.send';
    const INVOICES_APPROVE = 'invoices.approve';
    const INVOICES_DELETE = 'invoices.delete';
    const INVOICES_REFUND = 'invoices.refund';
    const INVOICES_EXPORT = 'invoices.export';

    const PAYMENTS_VIEW = 'payments.view';
    const PAYMENTS_RECORD = 'payments.record';
    const PAYMENTS_PROCESS = 'payments.process';
    const PAYMENTS_RECONCILE = 'payments.reconcile';

    const EXPENSES_VIEW = 'expenses.view';
    const EXPENSES_CREATE = 'expenses.create';
    const EXPENSES_EDIT = 'expenses.edit';
    const EXPENSES_APPROVE = 'expenses.approve';
    const EXPENSES_DELETE = 'expenses.delete';
    const EXPENSES_EXPORT = 'expenses.export';

    const ACCOUNTING_VIEW = 'accounting.view';
    const ACCOUNTING_MANAGE = 'accounting.manage';

    const EMPLOYEES_VIEW = 'employees.view';
    const EMPLOYEES_CREATE = 'employees.create';
    const EMPLOYEES_EDIT = 'employees.edit';
    const EMPLOYEES_DELETE = 'employees.delete';
    const EMPLOYEES_EXPORT = 'employees.export';

    const REPORTS_SALES = 'reports.sales';
    const REPORTS_ACCOUNTING = 'reports.accounting';
    const REPORTS_OPERATIONAL = 'reports.operational';
    const REPORTS_CUSTOMER = 'reports.customer';
    const REPORTS_EXPORT = 'reports.export';

    const SETTINGS_VIEW = 'settings.view';
    const SETTINGS_UPDATE = 'settings.update';
    const SETTINGS_BILLING = 'settings.billing';
    const SETTINGS_INTEGRATIONS = 'settings.integrations';

    const USERS_VIEW = 'users.view';
    const USERS_CREATE = 'users.create';
    const USERS_EDIT = 'users.edit';
    const USERS_DELETE = 'users.delete';

    const ROLES_MANAGE = 'roles.manage';
    const ROLES_VIEW = 'roles.view';

    const AUDIT_VIEW = 'audit.view';
    const AUDIT_EXPORT = 'audit.export';

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Get permission by ID
     */
    public function getById($id) {
        $query = "SELECT * FROM permissions WHERE id = ?";
        $result = $this->db->query($query, [$id]);
        
        if ($result && count($result) > 0) {
            $this->loadFromArray($result[0]);
            return $this;
        }
        return null;
    }

    /**
     * Get permission by name
     */
    public function getByName($name) {
        $query = "SELECT * FROM permissions WHERE name = ?";
        $result = $this->db->query($query, [$name]);
        
        if ($result && count($result) > 0) {
            $this->loadFromArray($result[0]);
            return $this;
        }
        return null;
    }

    /**
     * Get permissions by module
     */
    public function getByModule($module) {
        $query = "SELECT * FROM permissions WHERE module = ? AND is_active = 1 ORDER BY action";
        return $this->db->query($query, [$module]);
    }

    /**
     * Get all permissions grouped by module
     */
    public function getAllGrouped() {
        $query = "SELECT * FROM permissions WHERE is_active = 1 ORDER BY module, action";
        $permissions = $this->db->query($query);
        
        $grouped = [];
        foreach ($permissions as $permission) {
            $module = $permission['module'];
            if (!isset($grouped[$module])) {
                $grouped[$module] = [];
            }
            $grouped[$module][] = $permission;
        }
        
        return $grouped;
    }

    /**
     * Get all active permissions
     */
    public function getAll() {
        $query = "SELECT * FROM permissions WHERE is_active = 1 ORDER BY module, action";
        return $this->db->query($query);
    }

    /**
     * Create new permission
     */
    public function create($name, $display_name, $module, $action, $description = '') {
        // Check if permission already exists
        if ($this->getByName($name)) {
            return false;
        }

        $query = "INSERT INTO permissions (name, display_name, description, module, action, is_active)
                  VALUES (?, ?, ?, ?, ?, 1)";
        
        if ($this->db->query($query, [$name, $display_name, $description, $module, $action])) {
            $this->id = $this->db->lastInsertId();
            $this->name = $name;
            $this->display_name = $display_name;
            $this->module = $module;
            $this->action = $action;
            $this->description = $description;
            $this->is_active = true;
            return true;
        }
        return false;
    }

    /**
     * Update permission
     */
    public function update($display_name, $description = null) {
        $updates = ["display_name = ?"];
        $params = [$display_name];

        if ($description !== null) {
            $updates[] = "description = ?";
            $params[] = $description;
        }

        $updates[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $this->id;

        $query = "UPDATE permissions SET " . implode(", ", $updates) . " WHERE id = ?";
        return $this->db->query($query, $params);
    }

    /**
     * Deactivate permission
     */
    public function deactivate() {
        $query = "UPDATE permissions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Activate permission
     */
    public function activate() {
        $query = "UPDATE permissions SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Get roles that have this permission
     */
    public function getRoles() {
        $query = "SELECT r.* FROM roles r
                  JOIN role_permissions rp ON r.id = rp.role_id
                  WHERE rp.permission_id = ?
                  ORDER BY r.level DESC";
        
        return $this->db->query($query, [$this->id]);
    }

    /**
     * Get role count
     */
    public function getRoleCount() {
        $query = "SELECT COUNT(DISTINCT role_id) as count FROM role_permissions WHERE permission_id = ?";
        $result = $this->db->query($query, [$this->id]);
        return $result ? $result[0]['count'] : 0;
    }

    /**
     * Check if permission is used by any role
     */
    public function isUsedByRoles() {
        return $this->getRoleCount() > 0;
    }

    /**
     * Load from array
     */
    private function loadFromArray($data) {
        $this->id = $data['id'] ?? null;
        $this->name = $data['name'] ?? null;
        $this->display_name = $data['display_name'] ?? null;
        $this->description = $data['description'] ?? null;
        $this->module = $data['module'] ?? null;
        $this->action = $data['action'] ?? null;
        $this->is_active = $data['is_active'] ?? false;
    }

    /**
     * Getters
     */
    public function getId() { return $this->id; }
    public function getName() { return $this->name; }
    public function getDisplayName() { return $this->display_name; }
    public function getDescription() { return $this->description; }
    public function getModule() { return $this->module; }
    public function getAction() { return $this->action; }
    public function isActive() { return $this->is_active; }

    /**
     * Get permission as array
     */
    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'module' => $this->module,
            'action' => $this->action,
            'is_active' => $this->is_active
        ];
    }

    /**
     * Get all modules
     */
    public static function getAllModules($db) {
        $query = "SELECT DISTINCT module FROM permissions WHERE is_active = 1 ORDER BY module";
        return $db->query($query);
    }

    /**
     * Get permission statistics
     */
    public static function getStats($db) {
        $query = "SELECT 
                    COUNT(*) as total_permissions,
                    COUNT(DISTINCT module) as total_modules,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_permissions
                  FROM permissions";
        
        return $db->query($query);
    }
}
