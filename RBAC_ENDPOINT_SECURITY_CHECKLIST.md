# RBAC Endpoint Security Implementation Checklist

**Guide for securing all API endpoints with role-based access control**

---

## Overview

This checklist helps you systematically add RBAC protection to all existing endpoints in your application.

> **Note:** new endpoints should be built using the service/repository pattern.  Controllers delegate business logic to services and only perform permission checks, validation and response formatting.

---

## Checklist Template

For each endpoint, use this template:

### Endpoint: `METHOD /route/path`
- [ ] Permission identified
- [ ] RBACMiddleware initialized
- [ ] Permission check added
- [ ] Ownership validation added (if applicable)
- [ ] Role-based filtering implemented
- [ ] Audit logging enabled
- [ ] Error handling complete
- [ ] Test cases written

---

## Endpoints by Module

### DASHBOARD Module

#### GET /dashboard
- [ ] Permission: `Dashboard::VIEW`
- [ ] Initialize: `new RBACMiddleware(...)`
- [ ] Check: `$rbac->require(Permission::DASHBOARD_VIEW)`
- [ ] Ownership: N/A
- [ ] Filtering: By role (super_admin gets all data)
- [ ] Audit: Logged automatically
- [ ] Pattern: See `DashboardController_Example.php`

```php
public function getDashboard() {
    $this->rbac->require(Permission::DASHBOARD_VIEW);
    
    if ($this->rbac->isSuperAdmin()) {
        return $this->getSuperAdminDashboard();
    } elseif ($this->rbac->isAdmin()) {
        return $this->getAdminDashboard();
    } else {
        return $this->getAgentDashboard();
    }
}
```

#### GET /dashboard/export
- [ ] Permission: `Dashboard::EXPORT`
- [ ] Check: `$rbac->require(Permission::DASHBOARD_EXPORT)`
- [ ] Ownership: N/A
- [ ] Filtering: By organization

---

### CUSTOMERS Module

#### GET /customers
- [ ] Permission: `customers.view`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_VIEW)`
- [ ] Filtering: Agents see own only, admins see all
- [ ] Pattern: See `CustomersController_Example.php::list()`

```php
public function list() {
    $this->rbac->require(Permission::CUSTOMERS_VIEW);
    
    $customers = $this->getAll();
    
    if (!$this->rbac->isAdmin()) {
        $customers = array_filter($customers, 
            fn($c) => $c['created_by'] === $userId);
    }
    
    return ['success' => true, 'data' => $customers];
}
```

#### GET /customers/:id
- [ ] Permission: `customers.view`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_VIEW)`
- [ ] Ownership: `$rbac->validateResourceAccess($customer['owner_id'])`

#### POST /customers
- [ ] Permission: `customers.create`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_CREATE)`
- [ ] Validation: Required fields
- [ ] Default: Set `created_by` to current user

#### PUT /customers/:id
- [ ] Permission: `customers.edit`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_EDIT)`
- [ ] Ownership: Must own or be admin

#### DELETE /customers/:id
- [ ] Permission: `customers.delete`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_DELETE)`
- [ ] Admin Only: `$rbac->requireRole(Role::ADMIN)`

#### GET /customers/:id/export
- [ ] Permission: `customers.export`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_EXPORT)`

#### PUT /customers/:id/segment
- [ ] Permission: `customers.segment`
- [ ] Check: `$rbac->require(Permission::CUSTOMERS_SEGMENT)`

---

### BOOKINGS Module

#### GET /bookings
- [ ] Permission: `bookings.view`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_VIEW)`
- [ ] Filtering: Agents see own only

#### GET /bookings/:id
- [ ] Permission: `bookings.view`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_VIEW)`
- [ ] Ownership: `$rbac->validateResourceAccess()`

#### POST /bookings
- [ ] Permission: `bookings.create`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_CREATE)`

#### PUT /bookings/:id
- [ ] Permission: `bookings.edit`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_EDIT)`

#### POST /bookings/:id/confirm
- [ ] Permission: `bookings.confirm`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_CONFIRM)`

#### POST /bookings/:id/cancel
- [ ] Permission: `bookings.cancel`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_CANCEL)`

#### GET /bookings/:id/export
- [ ] Permission: `bookings.export`
- [ ] Check: `$rbac->require(Permission::BOOKINGS_EXPORT)`

---

### INVOICES Module (High Priority - Financial)

#### GET /invoices
- [ ] Permission: `invoices.view`
- [ ] Check: `$rbac->require(Permission::INVOICES_VIEW)`
- [ ] Filtering: Agents see own, accountants see all
- [ ] Pattern: See `InvoicesController_Example.php::list()`

#### GET /invoices/:id
- [ ] Permission: `invoices.view`
- [ ] Check: `$rbac->require(Permission::INVOICES_VIEW)`

#### POST /invoices
- [ ] Permission: `invoices.create`
- [ ] Check: `$rbac->require(Permission::INVOICES_CREATE)`
- [ ] Validation: Booking ID, amount

#### PUT /invoices/:id
- [ ] Permission: `invoices.edit`
- [ ] Check: `$rbac->require(Permission::INVOICES_EDIT)`
- [ ] Status Check: Only draft invoices editable

#### POST /invoices/:id/send
- [ ] Permission: `invoices.send`
- [ ] Check: `$rbac->require(Permission::INVOICES_SEND)`
- [ ] Status Check: Must be approved
- [ ] Pattern: See `InvoicesController_Example.php::send()`

#### POST /invoices/:id/approve
- [ ] Permission: `invoices.approve`
- [ ] Check: `$rbac->require(Permission::INVOICES_APPROVE)`
- [ ] Role Check: Accountant or Admin
- [ ] Audit: Log approval details
- [ ] Pattern: See `InvoicesController_Example.php::approve()`

#### POST /invoices/:id/refund
- [ ] Permission: `invoices.refund`
- [ ] Check: `$rbac->require(Permission::INVOICES_REFUND)`
- [ ] Role Check: Accountant or Admin only
- [ ] Validation: Amount, reason required
- [ ] Audit: Log refund transaction

#### DELETE /invoices/:id
- [ ] Permission: `invoices.delete`
- [ ] Check: `$rbac->require(Permission::INVOICES_DELETE)`
- [ ] Admin Only: Verify admin role

#### GET /invoices/:id/export
- [ ] Permission: `invoices.export`
- [ ] Check: `$rbac->require(Permission::INVOICES_EXPORT)`

---

### PAYMENTS Module

#### GET /payments
- [ ] Permission: `payments.view`
- [ ] Check: `$rbac->require(Permission::PAYMENTS_VIEW)`
- [ ] Filtering: Accountants see all, others see own

#### POST /payments/:id/record
- [ ] Permission: `payments.record`
- [ ] Check: `$rbac->require(Permission::PAYMENTS_RECORD)`
- [ ] Validation: Invoice ID, amount

#### POST /payments/:id/process
- [ ] Permission: `payments.process`
- [ ] Check: `$rbac->require(Permission::PAYMENTS_PROCESS)`
- [ ] Role Check: Accountant or Admin

#### POST /payments/reconcile
- [ ] Permission: `payments.reconcile`
- [ ] Check: `$rbac->require(Permission::PAYMENTS_RECONCILE)`
- [ ] Role Check: Accountant only

---

### EXPENSES Module

#### GET /expenses
- [ ] Permission: `expenses.view`
- [ ] Check: `$rbac->require(Permission::EXPENSES_VIEW)`

#### POST /expenses
- [ ] Permission: `expenses.create`
- [ ] Check: `$rbac->require(Permission::EXPENSES_CREATE)`

#### PUT /expenses/:id
- [ ] Permission: `expenses.edit`
- [ ] Check: `$rbac->require(Permission::EXPENSES_EDIT)`

#### POST /expenses/:id/approve
- [ ] Permission: `expenses.approve`
- [ ] Check: `$rbac->require(Permission::EXPENSES_APPROVE)`
- [ ] Role Check: Manager or Admin

#### DELETE /expenses/:id
- [ ] Permission: `expenses.delete`
- [ ] Check: `$rbac->require(Permission::EXPENSES_DELETE)`

#### GET /expenses/export
- [ ] Permission: `expenses.export`
- [ ] Check: `$rbac->require(Permission::EXPENSES_EXPORT)`

---

### EMPLOYEES Module

#### GET /employees
- [ ] Permission: `employees.view`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_VIEW)`
- [ ] Filtering: Admins see all, others see team only

#### GET /employees/:id
- [ ] Permission: `employees.view`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_VIEW)`

#### POST /employees
- [ ] Permission: `employees.create`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_CREATE)`
- [ ] Validation: Email, name required
- [ ] Role Check: Admin only

#### PUT /employees/:id
- [ ] Permission: `employees.edit`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_EDIT)`
- [ ] Role Check: Can only edit lower-level employees

#### DELETE /employees/:id
- [ ] Permission: `employees.delete`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_DELETE)`
- [ ] Role Check: Admin only

#### GET /employees/export
- [ ] Permission: `employees.export`
- [ ] Check: `$rbac->require(Permission::EMPLOYEES_EXPORT)`

---

### REPORTS Module

#### GET /reports/sales
- [ ] Permission: `reports.sales`
- [ ] Check: `$rbac->require(Permission::REPORTS_SALES)`
- [ ] Filtering: Show org data only

#### GET /reports/accounting
- [ ] Permission: `reports.accounting`
- [ ] Check: `$rbac->require(Permission::REPORTS_ACCOUNTING)`
- [ ] Role Check: Accountant or Admin

#### GET /reports/operational
- [ ] Permission: `reports.operational`
- [ ] Check: `$rbac->require(Permission::REPORTS_OPERATIONAL)`

#### GET /reports/customer
- [ ] Permission: `reports.customer`
- [ ] Check: `$rbac->require(Permission::REPORTS_CUSTOMER)`

#### GET /reports/export
- [ ] Permission: `reports.export`
- [ ] Check: `$rbac->require(Permission::REPORTS_EXPORT)`

---

### SETTINGS Module

#### GET /settings
- [ ] Permission: `settings.view`
- [ ] Check: `$rbac->require(Permission::SETTINGS_VIEW)`

#### PUT /settings
- [ ] Permission: `settings.update`
- [ ] Check: `$rbac->require(Permission::SETTINGS_UPDATE)`
- [ ] Role Check: Admin only

#### PUT /settings/billing
- [ ] Permission: `settings.billing`
- [ ] Check: `$rbac->require(Permission::SETTINGS_BILLING)`
- [ ] Role Check: Admin only

#### PUT /settings/integrations
- [ ] Permission: `settings.integrations`
- [ ] Check: `$rbac->require(Permission::SETTINGS_INTEGRATIONS)`
- [ ] Role Check: Admin only

---

### USERS Module (Admin Panel)

#### GET /admin/users
- [ ] Permission: `users.view`
- [ ] Check: `$rbac->require(Permission::USERS_VIEW)`
- [ ] Pattern: See `AdminUsersController_Example.php::listUsers()`

#### POST /admin/users
- [ ] Permission: `users.create`
- [ ] Check: `$rbac->require(Permission::USERS_CREATE)`
- [ ] Validation: Email required

#### PUT /admin/users/:id
- [ ] Permission: `users.edit`
- [ ] Check: `$rbac->require(Permission::USERS_EDIT)`
- [ ] Authority: Check `$rbac->canManageUser()`

#### DELETE /admin/users/:id
- [ ] Permission: `users.delete`
- [ ] Check: `$rbac->require(Permission::USERS_DELETE)`
- [ ] Authority: Check `$rbac->canManageUser()`

#### PUT /admin/users/:id/roles
- [ ] Permission: `users.edit`
- [ ] Check: `$rbac->require(Permission::USERS_EDIT)`
- [ ] Authority: Verify can assign each role
- [ ] Pattern: See `AdminUsersController_Example.php::updateUserRoles()`

#### POST /admin/users/:id/activate
- [ ] Permission: `users.edit`
- [ ] Check: `$rbac->require(Permission::USERS_EDIT)`

#### POST /admin/users/:id/deactivate
- [ ] Permission: `users.delete`
- [ ] Check: `$rbac->require(Permission::USERS_DELETE)`

---

### ROLES Module (Admin Only)

#### GET /admin/roles
- [ ] Permission: `roles.view`
- [ ] Check: `$rbac->require(Permission::ROLES_VIEW)`
- [ ] Role Check: Admin only

#### GET /admin/roles/:id
- [ ] Permission: `roles.view`
- [ ] Check: `$rbac->require(Permission::ROLES_VIEW)`

#### PUT /admin/roles/:id/permissions
- [ ] Permission: `roles.manage`
- [ ] Check: `$rbac->require(Permission::ROLES_MANAGE)`
- [ ] Role Check: Super admin or org admin
- [ ] Pattern: See `AdminUsersController_Example.php::updateRolePermissions()`

---

### AUDIT Module

#### GET /admin/audit-logs
- [ ] Permission: `audit.view`
- [ ] Check: `$rbac->require(Permission::AUDIT_VIEW)`
- [ ] Pattern: See `AdminUsersController_Example.php::getAuditLogs()`

#### GET /admin/audit-logs/export
- [ ] Permission: `audit.export`
- [ ] Check: `$rbac->require(Permission::AUDIT_EXPORT)`

---

## Implementation Pattern (Copy & Paste Ready)

```php
<?php
class YourEndpointController {
    private $db;
    private $auth;
    private $rbac;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;
        
        // Initialize RBAC
        $this->rbac = new RBACMiddleware(
            $db,
            $auth->getCurrentUser()['id'],
            $auth->getCurrentUser()['organization_id']
        );
    }

    /**
     * GET /endpoint - Description
     * Requires: module.action permission
     * Requires: (optional) particular role or ownership
     */
    public function action($id = null) {
        try {
            // 1. PERMISSION CHECK (fail fast)
            $this->rbac->require(Permission::MODULE_ACTION);

            // 2. GET DATA
            $data = $this->getData($id);
            
            if (!$data) {
                return ['success' => false, 'error' => 'Not found'];
            }

            // 3. OWNERSHIP/ROLE CHECK (if applicable)
            if ($this->requiresOwnership($data)) {
                $this->rbac->validateResourceAccess(
                    $data['owner_id'],
                    $this->auth->getCurrentUser()['organization_id']
                );
            }

            // 4. ROLE-BASED FILTERING (if applicable)
            if (!$this->rbac->isAdmin()) {
                $data = $this->filterByRole($data);
            }

            // 5. RETURN SUCCESS
            return [
                'success' => true,
                'data' => $data,
                'timestamp' => date('Y-m-d H:i:s')
            ];

        } catch (Exception $e) {
            // Audit logging happens automatically in RBACMiddleware
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'code' => 403
            ];
        }
    }

    private function requiresOwnership($data) {
        return isset($data['owner_id']) || isset($data['created_by']);
    }

    private function filterByRole($data) {
        // Apply role-specific filtering
        return $data;
    }
}
```

---

## Testing Checklist

For each endpoint, verify:

- [ ] Valid user with permission can access
- [ ] User without permission gets 403 error
- [ ] Ownership check prevents cross-user access
- [ ] Role-based filtering works correctly
- [ ] Audit log entry created
- [ ] Error messages are generic (no info leakage)
- [ ] Response format consistent

### Test Query Example

```sql
-- Check audit logs were created
SELECT * FROM permission_audit_log 
WHERE permission_name = 'customers.view' 
AND created_at > NOW() - INTERVAL 1 HOUR
ORDER BY created_at DESC;
```

---

## Priority Order

### Phase 1 (High Impact - Do First)
- [ ] /invoices/* (Financial)
- [ ] /admin/users/* (Security)
- [ ] /admin/roles/* (Security)
- [ ] /payments/* (Financial)

### Phase 2 (Medium Priority)
- [ ] /customers/* (Core business)
- [ ] /bookings/* (Core business)
- [ ] /employees/* (HR)
- [ ] /expenses/* (Financial)

### Phase 3 (Lower Priority)
- [ ] /reports/* (Analytics)
- [ ] /settings/* (Admin)
- [ ] /dashboard/* (Presentation)
- [ ] /audit-logs/* (Compliance)

---

## Deployment Checklist

Before going live:

- [ ] All endpoints have permission checks
- [ ] All high-priority endpoints tested
- [ ] Organization scoping verified
- [ ] Ownership validation working
- [ ] Audit logging enabled
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] QA approval received
- [ ] Backup created
- [ ] Rollback plan ready

---

## Validation Script

```bash
#!/bin/bash
# Verify all endpoints are protected

endpoints=(
    "GET /customers"
    "POST /customers"
    "PUT /customers/:id"
    "DELETE /customers/:id"
    "GET /invoices"
    "POST /invoices"
    "POST /invoices/:id/approve"
    # Add all endpoints...
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing: $endpoint"
    # Your test logic here
done
```

---

## Summary

Total endpoints to secure: **50+**

Use this checklist to:
1. ✅ Identify all endpoints
2. ✅ Determine required permission
3. ✅ Add permission checks
4. ✅ Implement ownership validation
5. ✅ Add role-based filtering
6. ✅ Test thoroughly
7. ✅ Deploy confidently

**Estimated time:** 2-3 weeks for complete implementation

---

**Last Updated:** February 27, 2026  
**Status:** Ready for Implementation
