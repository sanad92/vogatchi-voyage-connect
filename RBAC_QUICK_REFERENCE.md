# RBAC Quick Reference Guide

**One-page guide for frequent RBAC operations**

---

## Quick Start

### Initialize RBAC

```php
$rbac = new RBACMiddleware($db, $userId, $orgId);
```

### Check Permission

```php
// Exact permission
$rbac->require('customers.view');
$rbac->require(Permission::CUSTOMERS_VIEW);

// By module.action
$rbac->check('customers', 'view');

// Multiple (OR)
$rbac->checkAny(['customers.create', 'customers.edit']);

// Multiple (AND)
$rbac->checkAll(['invoices.view', 'invoices.approve']);
```

### Check Role

```php
// Single role
$rbac->hasRole('agent');

// Multiple (OR)
$rbac->hasAnyRole(['agent', 'manager']);

// Multiple (AND)
$rbac->hasAllRoles(['manager', 'accountant']);

// Hierarchy
$rbac->isSuperAdmin();
$rbac->isAdmin();
$rbac->isManager();
```

### Manage Users

```php
// Can current user manage target?
$rbac->canManageUser($targetUserId, $orgId);

// Can current user assign role?
$rbac->canAssignRole($roleId);

// Validate resource ownership
$rbac->validateResourceAccess($ownerId, $orgId);
// Throws exception if not owner and not admin
```

### Get Data

```php
// Permissions
$rbac->getPermissions();
$rbac->getPermissionNames();
$rbac->getPermissionsByModule('customers');

// Roles
$rbac->getRoles();
$rbac->getRoleNames();
$rbac->getHighestRoleLevel(); // 1-6

// Session
$rbac->getSessionData();
```

---

## Common Code Patterns

### Permission Check with Response

```php
try {
    $rbac->require(Permission::CUSTOMERS_VIEW);
    // Continue...
} catch (Exception $e) {
    return ['success' => false, 'error' => $e->getMessage()];
}
```

### Role-Based Data Filtering

```php
$customers = $this->getAllCustomers();

if ($rbac->isAdmin()) {
    return $customers; // See all
} elseif ($rbac->isManager()) {
    return array_filter($customers, fn($c) => $c['team_id'] === $teamId);
} else {
    return array_filter($customers, fn($c) => $c['created_by'] === $userId);
}
```

### Approval Workflow

```php
// Check permission
$rbac->require(Permission::INVOICES_APPROVE);

// Check role
if (!$rbac->isAdmin() && !$rbac->hasRole(Role::ACCOUNTANT)) {
    throw new Exception('Must be accountant or admin');
}

// Check status
if ($invoice['status'] !== 'pending') {
    throw new Exception('Invalid status for approval');
}

// Update
$invoice->update(['status' => 'approved']);
$this->logAction('APPROVED', $invoiceId);
```

### Admin-Level Action

```php
// Require admin
$rbac->requireRole(Role::ADMIN);

// Or check before executing
if (!$rbac->isAdmin()) {
    throw new Exception('Admin only');
}

// Perform sensitive operation...
// Log everything
$this->logAdminAction('ACTION', $targetId, $details);
```

---

## Permission Constants Reference

### Modules Available

- `dashboard` - Dashboard access
- `customers` - Customer management
- `bookings` - Booking management
- `invoices` - Invoice management
- `payments` - Payment processing
- `expenses` - Expense management
- `employees` - Employee management
- `reports` - Reporting
- `settings` - Configuration
- `users` - User management
- `roles` - Role management
- `audit` - Audit log access

### Actions Available

- `view` - Read/view permission
- `create` - Create new records
- `edit` - Modify records
- `delete` - Remove records
- `export` - Export data
- `approve` - Approval workflows
- `refund` - Refund processing
- `manage` - Administrative control

### Example Permission Names

```
customers.view       → View customers
customers.create     → Create customers
customers.edit       → Edit customers
customers.delete     → Delete customers
customers.export     → Export Customer data

invoices.view        → View invoices
invoices.create      → Create invoices
invoices.edit        → Edit invoices
invoices.approve     → Approve invoices
invoices.send        → Send invoices
invoices.refund      → Process refunds
invoices.delete      → Delete invoices
invoices.export      → Export invoices

employees.view       → View employees
employees.create     → Create employees
employees.edit       → Edit employees
employees.delete     → Delete employees

reports.sales        → Sales reports
reports.accounting   → Accounting reports
reports.operational  → Operational reports
reports.export       → Export reports

roles.manage         → Manage roles/permissions
users.manage         → Manage users

audit.view           → View audit logs
audit.export         → Export audit logs
```

---

## Role Capabilities

### Super Admin (Level 6)
- All permissions in all modules
- Can manage system-wide settings
- Can manage all organizations
- Full audit log access

**Use case:** System administrator, developer support

---

### Admin (Level 5)
- All organization permissions
- Can create/manage users (except other admins)
- Can manage roles and permissions
- Can approve all transactions
- Full organization data access

**Use case:** Organization owner, executive manager

---

### Manager (Level 4)
- View most data
- Create/edit customers and bookings
- View financial reports
- Manage team members
- Cannot delete or approve financial transactions
- Cannot modify roles/permissions

**Use case:** Department manager, supervisor

---

### Accountant (Level 3)
- Full invoice/payment access
- Can approve invoices
- Can process refunds
- Can manage expenses
- Cannot manage users or employees
- Cannot create bookings

**Use case:** Accountant, financial controller

---

### Agent (Level 2)
- Create and manage bookings
- View/create customers
- View own customers only
- Cannot approve anything
- Cannot access financial management
- Cannot manage other users

**Use case:** Travel agent, customer service representative

---

### Viewer (Level 1)
- Read-only access
- View customers and bookings
- View reports
- Cannot create, edit, or delete anything

**Use case:** Sales analyst, report reviewer

---

## Role Hierarchy Check

```php
// Can current user manage another user?
if ($rbac->canManageUser($targetUserId, $orgId)) {
    // Current user's level > target user's level
}

// Get user's highest role level
$level = $rbac->getHighestRoleLevel(); // Returns 1-6

// Check if more privileged
if ($rbac->getHighestRoleLevel() > 2) {
    // User is at least manager level
}
```

---

## Audit & Compliance

### View Audit Logs

```php
// Last 100 access attempts
$logs = $rbac->getAuditLogs(100);

// All denials in last 30 days
$denials = $rbac->getDeniedAccessAttempts(100);
```

### Manual Logging

```php
// Log financial transaction
$this->db->query(
    "INSERT INTO financial_audit_log (invoice_id, action, performed_by, organization_id)
     VALUES (?, ?, ?, ?)",
    [$invoiceId, 'APPROVED', $userId, $orgId]
);

// Log admin action
$this->logAdminAction('USER_CREATED', $targetId, [
    'email' => $email,
    'roles' => $roleIds
]);
```

---

## Debugging

### Check user's permissions

```php
// Get all permissions
$perms = $rbac->getPermissions();
var_dump(array_column($perms, 'name'));

// Get permissions by module
$customerPerms = $rbac->getPermissionsByModule('customers');
```

### Check user's roles

```php
// Get all roles with details
$roles = $rbac->getRoles();
foreach ($roles as $role) {
    echo $role['name'] . ' (Level: ' . $role['level'] . ')';
}
```

### Query user's actual database roles

```php
// SQL to check roles in database
SELECT r.*, GROUP_CONCAT(p.name) as permissions
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = ? AND ur.organization_id = ? AND ur.revoked_at IS NULL
GROUP BY r.id;
```

---

## Common Issues & Solutions

### Permission always denied

**Check:**
1. User has role assigned: `SELECT * FROM user_roles WHERE user_id = ?`
2. Role has permission: `SELECT * FROM role_permissions WHERE role_id = ?`
3. Permission is active: `SELECT is_active FROM permissions WHERE name = ?`

### Access control not working

**Ensure:**
1. RBAC initialized with correct userId and orgId
2. Permission check is BEFORE data retrieval
3. No hardcoded organization_id bypassing multi-tenant filter

### Admin can't assign roles

**Reason:** Admin is trying to assign role with higher privilege level

**Fix:** Only assign roles at same or lower level than admin's highest role

---

## Security Checklist

- [ ] Always check permission before action
- [ ] Always include organization_id in queries
- [ ] Never trust client-provided role/permission IDs
- [ ] Log all sensitive operations
- [ ] Use permission constants, not strings
- [ ] Validate resource ownership
- [ ] Rotate permissions when switching organizations
- [ ] Archive old audit logs
- [ ] Test permission denial cases
- [ ] Code review RBAC implementations

