-- ============================================================================
-- RBAC (Role-Based Access Control) Schema
-- ============================================================================
-- Implements a complete role-based authorization system for Vogatchi
-- Supports 6 roles: super_admin, admin, manager, accountant, agent, viewer
-- ============================================================================

-- Users table (if not exists - add role support)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    organization_id CHAR(36),
    INDEX idx_email (email),
    INDEX idx_organization_id (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INT DEFAULT 0 COMMENT 'Role hierarchy - higher = more privileged',
    is_active BOOLEAN DEFAULT 1,
    organization_id CHAR(36) COMMENT 'NULL = system role, org_id = organization-specific role',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_org_role (organization_id, name),
    INDEX idx_level (level),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL COMMENT 'dashboard, customers, bookings, invoices, employees, reports, etc',
    action VARCHAR(50) NOT NULL COMMENT 'view, create, edit, delete, export, approve, etc',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_module_action (module, action),
    INDEX idx_module (module),
    INDEX idx_action (action),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role-Permissions Pivot table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    role_id TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    granted_by_user_id CHAR(36),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Roles Pivot table (many-to-many between users and roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    role_id TINYINT UNSIGNED NOT NULL,
    organization_id CHAR(36) NOT NULL,
    assigned_by_user_id CHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    UNIQUE KEY uk_user_org_role (user_id, organization_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_role_id (role_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_revoked_at (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Hierarchy table (for inheritance - optional but powerful)
CREATE TABLE IF NOT EXISTS role_hierarchy (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    parent_role_id TINYINT UNSIGNED NOT NULL,
    child_role_id TINYINT UNSIGNED NOT NULL,
    UNIQUE KEY uk_role_hierarchy (parent_role_id, child_role_id),
    FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (child_role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permission Audit Log
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    granted BOOLEAN,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    organization_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_permission_name (permission_name),
    INDEX idx_module (module),
    INDEX idx_organization_id (organization_id),
    INDEX idx_created_at (created_at),
    INDEX idx_granted (granted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- System Roles (Initial Data)
-- ============================================================================
INSERT INTO roles (name, display_name, description, level, is_active, organization_id) VALUES
('super_admin', 'Super Administrator', 'Full system access across all organizations. Can manage roles, permissions, and organizations.', 6, 1, NULL),
('admin', 'Administrator', 'Full organizational access. Can manage users, roles, and most features within the organization.', 5, 1, NULL),
('manager', 'Manager', 'Can manage team members, view reports, and oversee operations. Cannot manage billing or system settings.', 4, 1, NULL),
('accountant', 'Accountant', 'Access to financial data: invoices, payments, expenses, and accounting reports. Cannot modify employment records.', 3, 1, NULL),
('agent', 'Agent/Representative', 'Primary user role. Can create and manage bookings, customer interactions, and service requests. Limited reporting.', 2, 1, NULL),
('viewer', 'Viewer', 'Read-only access to assigned areas. Can view data but cannot create or modify records.', 1, 1, NULL)
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), description=VALUES(description);

-- ============================================================================
-- System Permissions (Initial Data)
-- ============================================================================
-- DASHBOARD Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('dashboard.view', 'View Dashboard', 'Access the main dashboard', 'dashboard', 'view', 1),
('dashboard.export', 'Export Dashboard Data', 'Export dashboard metrics and reports', 'dashboard', 'export', 1);

-- CUSTOMERS Module  
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('customers.view', 'View Customers', 'View customer list and details', 'customers', 'view', 1),
('customers.create', 'Create Customer', 'Add new customer records', 'customers', 'create', 1),
('customers.edit', 'Edit Customer', 'Modify customer information', 'customers', 'edit', 1),
('customers.delete', 'Delete Customer', 'Remove customer records from system', 'customers', 'delete', 1),
('customers.export', 'Export Customers', 'Export customer data to CSV/Excel', 'customers', 'export', 1),
('customers.segment', 'Manage Segments', 'Create and manage customer segments', 'customers', 'segment', 1);

-- BOOKINGS Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('bookings.view', 'View Bookings', 'View booking list and details', 'bookings', 'view', 1),
('bookings.create', 'Create Booking', 'Create new bookings for customers', 'bookings', 'create', 1),
('bookings.edit', 'Edit Booking', 'Modify booking details and dates', 'bookings', 'edit', 1),
('bookings.cancel', 'Cancel Booking', 'Cancel existing bookings', 'bookings', 'cancel', 1),
('bookings.confirm', 'Confirm Booking', 'Confirm pending bookings with suppliers', 'bookings', 'confirm', 1),
('bookings.export', 'Export Bookings', 'Export booking data and reports', 'bookings', 'export', 1);

-- INVOICES Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('invoices.view', 'View Invoices', 'View invoice list and details', 'invoices', 'view', 1),
('invoices.create', 'Create Invoice', 'Generate invoices for bookings', 'invoices', 'create', 1),
('invoices.edit', 'Edit Invoice', 'Modify pending invoices', 'invoices', 'edit', 1),
('invoices.send', 'Send Invoice', 'Send invoices to customers', 'invoices', 'send', 1),
('invoices.approve', 'Approve Invoice', 'Approve invoices for payment processing', 'invoices', 'approve', 1),
('invoices.delete', 'Delete Invoice', 'Delete/void invoices', 'invoices', 'delete', 1),
('invoices.refund', 'Process Refund', 'Create refunds and credit notes', 'invoices', 'refund', 1),
('invoices.export', 'Export Invoices', 'Export invoice data and accounting reports', 'invoices', 'export', 1);

-- PAYMENTS Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('payments.view', 'View Payments', 'View payment records and history', 'payments', 'view', 1),
('payments.record', 'Record Payment', 'Log customer payments', 'payments', 'record', 1),
('payments.process', 'Process Payment', 'Process refunds and payment adjustments', 'payments', 'process', 1),
('payments.reconcile', 'Reconcile Payments', 'Reconcile payments with bank statements', 'payments', 'reconcile', 1);

-- EXPENSES Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('expenses.view', 'View Expenses', 'View expense records', 'expenses', 'view', 1),
('expenses.create', 'Create Expense', 'Record new business expenses', 'expenses', 'create', 1),
('expenses.edit', 'Edit Expense', 'Modify expense records', 'expenses', 'edit', 1),
('expenses.approve', 'Approve Expense', 'Approve pending expenses', 'expenses', 'approve', 1),
('expenses.delete', 'Delete Expense', 'Delete expense records', 'expenses', 'delete', 1),
('expenses.export', 'Export Expenses', 'Export expense reports', 'expenses', 'export', 1);

-- ACCOUNTING Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('accounting.view', 'View Accounting', 'Browse chart of accounts and journal entries', 'accounting', 'view', 1),
('accounting.manage', 'Manage Accounting', 'Create/edit accounts and post journal entries', 'accounting', 'manage', 1);

-- EMPLOYEES Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('employees.view', 'View Employees', 'View employee directory and details', 'employees', 'view', 1),
('employees.create', 'Create Employee', 'Add new employees to system', 'employees', 'create', 1),
('employees.edit', 'Edit Employee', 'Modify employee information and roles', 'employees', 'edit', 1),
('employees.delete', 'Delete Employee', 'Remove employees from system', 'employees', 'delete', 1),
('employees.export', 'Export Employees', 'Export employee records', 'employees', 'export', 1);

-- REPORTS Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('reports.sales', 'Sales Reports', 'View sales and revenue reports', 'reports', 'view', 1),
('reports.accounting', 'Accounting Reports', 'View financial and accounting reports', 'reports', 'view', 1),
('reports.operational', 'Operational Reports', 'View operational metrics and KPIs', 'reports', 'view', 1),
('reports.customer', 'Customer Reports', 'View customer-related analytics', 'reports', 'view', 1),
('reports.export', 'Export Reports', 'Export reports to various formats', 'reports', 'export', 1);

-- SETTINGS Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('settings.view', 'View Settings', 'Access organization settings', 'settings', 'view', 1),
('settings.update', 'Update Settings', 'Modify organization settings', 'settings', 'update', 1),
('settings.billing', 'Manage Billing', 'Access and modify billing information', 'settings', 'update', 1),
('settings.integrations', 'Manage Integrations', 'Configure external integrations', 'settings', 'update', 1);

-- USERS & ROLES Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('users.view', 'View Users', 'View user list and details', 'users', 'view', 1),
('users.create', 'Create User', 'Add new users to organization', 'users', 'create', 1),
('users.edit', 'Edit User', 'Modify user information and roles', 'users', 'edit', 1),
('users.delete', 'Delete User', 'Remove users from organization', 'users', 'delete', 1),
('roles.manage', 'Manage Roles', 'Create and modify roles and permissions', 'roles', 'manage', 1),
('roles.view', 'View Roles', 'View available roles and permissions', 'roles', 'view', 1);

-- AUDIT & COMPLIANCE Module
INSERT INTO permissions (name, display_name, description, module, action, is_active) VALUES
('audit.view', 'View Audit Logs', 'Access system audit logs', 'audit', 'view', 1),
('audit.export', 'Export Audit Logs', 'Export audit logs for compliance', 'audit', 'export', 1);

-- ============================================================================
-- Default Role-Permission Assignments
-- ============================================================================

-- SUPER_ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'super_admin'
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- ADMIN: All except user deletion and role management at super admin level
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND p.name IN (
    'dashboard.view', 'dashboard.export',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.export', 'customers.segment',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel', 'bookings.confirm', 'bookings.export',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send', 'invoices.approve', 'invoices.delete', 'invoices.refund', 'invoices.export',
    'payments.view', 'payments.record', 'payments.process', 'payments.reconcile',
    'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.approve', 'expenses.delete', 'expenses.export',
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.export',
    'reports.sales', 'reports.accounting', 'reports.operational', 'reports.customer', 'reports.export',
    'settings.view', 'settings.update', 'settings.billing', 'settings.integrations',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'roles.manage', 'roles.view',
    'audit.view', 'audit.export'
)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- MANAGER: Team management, view reports, moderate access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' 
AND p.name IN (
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit', 'customers.export', 'customers.segment',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel', 'bookings.confirm', 'bookings.export',
    'invoices.view', 'invoices.export',
    'payments.view',
    'expenses.view', 'expenses.create', 'expenses.edit',
    'employees.view', 'employees.create', 'employees.edit',
    'reports.sales', 'reports.operational', 'reports.customer', 'reports.export',
    'settings.view',
    'users.view'
)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- ACCOUNTANT: Financial operations only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'accountant' 
AND p.name IN (
    'dashboard.view',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send', 'invoices.approve', 'invoices.delete', 'invoices.refund', 'invoices.export',
    'payments.view', 'payments.record', 'payments.process', 'payments.reconcile',
    'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.approve', 'expenses.delete', 'expenses.export',
    'reports.accounting', 'reports.export',
    'settings.billing'
)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- AGENT: Booking and customer management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'agent' 
AND p.name IN (
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel', 'bookings.confirm',
    'invoices.view', 'invoices.export',
    'payments.view',
    'reports.sales', 'reports.customer'
)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- VIEWER: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'viewer' 
AND p.name IN (
    'dashboard.view',
    'customers.view',
    'bookings.view',
    'invoices.view',
    'reports.sales', 'reports.customer',
    'settings.view'
)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify the schema:

-- SELECT * FROM roles ORDER BY level DESC;
-- SELECT COUNT(*) as total_permissions FROM permissions;
-- SELECT r.name, COUNT(rp.permission_id) as permission_count 
-- FROM roles r 
-- LEFT JOIN role_permissions rp ON r.id = rp.role_id 
-- WHERE r.organization_id IS NULL
-- GROUP BY r.id, r.name 
-- ORDER BY r.level DESC;
-- SELECT r.display_name, p.display_name, p.module, p.action 
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id 
-- JOIN permissions p ON rp.permission_id = p.id 
-- WHERE r.name = 'admin'
-- ORDER BY p.module, p.action;
