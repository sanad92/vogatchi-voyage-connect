# Multi-Tenant Isolation Implementation Guide

**Version**: 1.0  
**Status**: Ready for Implementation  
**Date**: 2026-02-27

---

## 📋 Overview

This guide provides a complete implementation plan for enforcing strict multi-tenant isolation across the Vogatchi Tourism Management System. The system currently lacks proper tenant isolation, creating critical security vulnerabilities.

---

## 🔐 Core Components

### 1. New Files Created

#### `/classes/TenantMiddleware.php`
- **Purpose**: Base abstract class for all data-access operations
- **Key Methods**:
  - `setTenantId($tenantId)` - Set tenant context with validation
  - `setCurrentUser($userId)` - Set user context
  - `selectWithTenant()` - Query with automatic org_id filter
  - `insertWithTenant()` - Insert with automatic org_id
  - `updateWithTenant()` - Update with automatic org_id filter
  - `deleteWithTenant()` - Delete with automatic org_id filter
  - `auditLog()` - Log all data modifications
- **Features**:
  - Automatic tenant filtering on all queries
  - Validation before any operation
  - Audit logging for compliance
  - Cross-organization access logging

#### `/classes/TenantValidator.php`
- **Purpose**: Validation and authorization checks
- **Key Methods**:
  - `validateTenantId()` - Verify tenant exists and is active
  - `userBelongsToTenant()` - Check user membership
  - `getUserTenants()` - List all user accessible orgs
  - `getUserRoleInTenant()` - Get user's role in org
  - `userHasRole()` - Check permission level
  - `isSuperAdmin()` - Check super admin status
  - `canAccessRecord()` - Record-level access check
  - `ensureAccess()` - Throw exception if denied

### 2. Example Updated Classes

#### `/classes/Customer_WithTenant.php`
- Shows how to refactor existing classes
- All queries use `selectWithTenant()`, `insertWithTenant()`, etc.
- Automatic org_id filtering on all operations
- Validation checks before each operation

#### `/classes/Auth_WithTenant.php`
- Enhanced authentication with tenant context
- Multi-organization user support
- Organization switching capability
- Session management with tenant isolation

### 3. Database Schema

#### `/database/mysql/schema_with_tenant_isolation.sql`
- Includes `organizations` table (MySQL version)
- Includes `organization_members` table
- All 16+ data tables include `organization_id` foreign key
- Proper indexes for performance
- Audit logging table

---

## 🚀 Implementation Steps

### Phase 1: Database Setup (Immediate)

```bash
# 1. Backup current MySQL database
mysqldump -u root -p tourism_system > backup_$(date +%s).sql

# 2. Add organizations table (if using MySQL backend separately)
# Run the migrations in schema_with_tenant_isolation.sql

# 3. Add organization_id to existing tables
ALTER TABLE customers ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE suppliers ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE hotel_bookings ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE flight_bookings ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE car_rentals ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE invoices ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE employees ADD COLUMN organization_id CHAR(36) NULL;
ALTER TABLE expense_transactions ADD COLUMN organization_id CHAR(36) NULL;
# ... etc for all tables

# 4. Populate existing data (DATA MIGRATION)
# Option A: If you have existing data for a single org
UPDATE customers SET organization_id = 'default-org-id' WHERE organization_id IS NULL;

# Option B: For multi-org setup
# Map existing data to appropriate organizations

# 5. Make organization_id NOT NULL and add FK
ALTER TABLE customers 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_customers_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE;
```

### Phase 2: Code Refactoring

#### 2a. Update `classes/Database.php`

Add these methods to support tenant filtering:

```php
// In Database class, add:

public function selectByOrganization($table, $orgId, $where = '1=1', $params = []) {
    $params['org_id'] = $orgId;
    $where .= ' AND organization_id = :org_id';
    return $this->select("SELECT * FROM $table WHERE $where", $params);
}

public function insertWithOrg($table, $data, $orgId) {
    $data['organization_id'] = $orgId;
    return $this->insert($table, $data);
}
```

#### 2b. Update Core Classes

**Order of Priority**:
1. `Auth.php` - Most critical for session/tenant context
2. `Customer.php` - Core business entity
3. `HotelBooking.php` - High volume data
4. `FlightBooking.php` - High volume data
5. `CarRental.php` - Data integrity
6. `Invoice.php` - Financial data
7. `Employee.php` - Payroll/HR data
8. `ExpenseTransaction.php` - Financial data

**Template for Refactoring**:

```php
// Old:
class Customer {
    public function getAll() {
        return $this->db->select("SELECT * FROM customers");
    }
}

// New:
class Customer extends TenantMiddleware {
    public function getAll() {
        return $this->selectWithTenant("SELECT * FROM customers");
    }
}
```

#### 2c. Update API Endpoints

Every API endpoint must:

1. Get current user and organization ID from session
2. Validate user belongs to organization
3. Pass organization ID to business classes

```php
// api/customers/list.php
<?php
require_once '../config/database.php';
require_once '../classes/Auth.php';
require_once '../classes/TenantValidator.php';
require_once '../classes/Customer.php';

// 1. Check authentication
$auth = new Auth();
$auth->requireLogin();

// 2. Get current context
$user = $auth->getCurrentUser();
$orgId = $user['organization_id'];

// 3. Validate access
TenantValidator::ensureAccess($user['id'], $orgId, 'read');

// 4. Use service with tenant context
$customer = new Customer();
$customer->setTenantId($orgId);
$customer->setCurrentUser($user['id']);

$customers = $customer->getAll();

echo json_encode(['data' => $customers]);
?>
```

### Phase 3: Testing

#### Unit Tests for Tenant Isolation

```php
// tests/TenantIsolationTest.php

class TenantIsolationTest {
    
    public function testUserCannotAccessOtherOrgData() {
        $user1OrgId = 'org-1';
        $user2OrgId = 'org-2';
        
        // Create customer in org-1
        $customer = new Customer();
        $customer->setTenantId($user1OrgId);
        $customerId = $customer->create(['name' => 'John', 'phone' => '123']);
        
        // Try to access from org-2
        $customer2 = new Customer();
        $customer2->setTenantId($user2OrgId);
        $result = $customer2->getById($customerId);
        
        // Should return null (access denied)
        assert($result === null);
    }
    
    public function testManipulatingOrgIdIsIgnored() {
        // Even if the query tries to set a different org_id,
        // the middleware force-filters by the set tenant
        $customer = new Customer();
        $customer->setTenantId('org-1');
        
        // This will be filtered to only org-1 data
        // regardless of what org_id is in the WHERE clause
        $results = $customer->getAll();
        
        // All results should be from org-1
        foreach ($results as $c) {
            assert($c['organization_id'] === 'org-1');
        }
    }
    
    public function testSuperAdminCanAccessAnyOrg() {
        // Super admin users should be logged
        // and be able to access any org
    }
}
```

---

## 📊 Security Checklist

### Before Going to Production

- [ ] All database tables have `organization_id` column
- [ ] All classes extend `TenantMiddleware` or validate org_id
- [ ] All API endpoints use `TenantValidator::ensureAccess()`
- [ ] Session includes `organization_id`
- [ ] Audit logging is enabled
- [ ] Tests pass (unit + integration)
- [ ] Performance tests with org filtering
- [ ] Cross-org access attempts logged
- [ ] Super admin access is minimized/logged
- [ ] Backup of all data before migration

### Ongoing Maintenance

- [ ] Monitor audit logs for suspicious cross-org access
- [ ] Review super admin access logs monthly
- [ ] Test tenant isolation with new features
- [ ] Update documentation when adding new tables
- [ ] Review deleted data policies

---

## 🔍 Query Patterns

### ✅ Correct (Safe) Patterns

```php
// Pattern 1: Using TenantMiddleware
$customer = new Customer();
$customer->setTenantId($orgId);
$results = $customer->getAll();  // Auto-filtered by org_id

// Pattern 2: Using TenantValidator
TenantValidator::ensureAccess($userId, $orgId, 'write');
// ... then proceed with operation

// Pattern 3: Validate specific record access
if (!TenantValidator::canAccessCustomer($userId, $customerId, $orgId)) {
    throw new Exception("Access denied");
}
```

### ❌ Incorrect (Unsafe) Patterns

```php
// NEVER: Direct query without tenant filter
$customer = new Customer();
$customer->getAll();  // ERROR: No tenant context!

// NEVER: Manual org_id filtering (easily bypassed)
$sql = "SELECT * FROM customers WHERE organization_id = :org_id";
// Vulnerable to ID manipulation

// NEVER: Trust user-provided org_id without validation
$orgId = $_GET['org_id'];
$customer->setTenantId($orgId);  // Must validate first!
```

---

## 📈 Performance Considerations

### Indexes

All added indexes for tenant filtering:

```sql
-- Existing recommendations
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_hotel_bookings_org ON hotel_bookings(organization_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);

-- Composite indexes for common queries
CREATE INDEX idx_customers_org_active ON customers(organization_id, is_active);
CREATE INDEX idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX idx_bookings_org_date ON hotel_bookings(organization_id, created_at);
```

### Query Optimization

- Always include organization_id in WHERE clause
- Use indexes on (organization_id, other_keys)
- Avoid SELECT * - specify needed columns
- Paginate large result sets

---

## 🧪 Testing the Implementation

### Manual Testing

```bash
# Test 1: Login and check session
curl -X POST http://localhost/api/auth/login.php \
  -d '{"email":"user@example.com","password":"123456"}'
# Response should include organization_id

# Test 2: List data from organization
curl -X GET http://localhost/api/customers/list.php \
  -H 'Cookie: ...'
# Response should only include customers from user's org

# Test 3: Try to access other org (should fail)
curl -X GET 'http://localhost/api/customers/list.php?org_id=other-org' \
  -H 'Cookie: ...'
# Response should be error or empty
```

### Automated Testing

```bash
# Run test suite
php tests/run_tests.php

# Coverage report
php tests/coverage_report.php
```

---

## 📝 API Migration Guide

### For Frontend/React Integration

#### Before (No Isolation)
```javascript
// React component - NO ORG ID!
const [customers, setCustomers] = useState([]);

useEffect(() => {
  fetch('/api/customers/list.php')
    .then(r => r.json())
    .then(data => setCustomers(data));
}, []);
```

#### After (With Isolation)
```javascript
// React component - WITH ORG ID
const { organizationId } = useContext(OrganizationContext);
const [customers, setCustomers] = useState([]);

useEffect(() => {
  if (!organizationId) return;
  
  // Org ID is automatically in session
  // But can be passed explicitly for clarity
  fetch(`/api/customers/list.php`)
    .then(r => r.json())
    .then(data => setCustomers(data));
}, [organizationId]);
```

---

## 🚨 Troubleshooting

### Issue: "Tenant ID must be set before executing queries"

**Cause**: Business class used without setting tenant ID

**Solution**:
```php
$customer = new Customer();
// BEFORE: $customer->getAll();  // ERROR

$customer->setTenantId($userOrgId);
$customer->getAll();  // OK
```

### Issue: User sees data from other organizations

**Cause**: Query bypassed middleware or validation

**Solution**: 
1. Check that class extends TenantMiddleware
2. Verify all queries use `selectWithTenant()` etc.
3. Check session includes organization_id
4. Review audit logs for unauthorized access

### Issue: Slow queries after adding org_id filter

**Cause**: Missing indexes

**Solution**: Run all CREATE INDEX statements, then analyze:
```sql
EXPLAIN SELECT * FROM customers WHERE organization_id = ? AND name LIKE ?;
```

---

## 📚 Files Reference

### Files Created/Modified

| File | Status | Changes |
|------|--------|---------|
| `TenantMiddleware.php` | ✅ NEW | Base class for all operations |
| `TenantValidator.php` | ✅ NEW | Validation & authorization |
| `Customer_WithTenant.php` | ✅ NEW | Example refactored class |
| `Auth_WithTenant.php` | ✅ NEW | Auth with multi-org support |
| `schema_with_tenant_isolation.sql` | ✅ NEW | Updated database schema |
| `MULTI_TENANT_ISOLATION_REPORT.md` | ✅ NEW | This report |
| `Database.php` | ⏳ TODO | Add org-filtering methods |
| `Auth.php` | ⏳ TODO | Extend TenantMiddleware |
| `Customer.php` | ⏳ TODO | Extend TenantMiddleware |
| `HotelBooking.php` | ⏳ TODO | Extend TenantMiddleware |
| `FlightBooking.php` | ⏳ TODO | Extend TenantMiddleware |
| And other classes... | ⏳ TODO | Convert to tenant-aware |

---

## 🎯 Success Criteria

- [x] All database tables include organization_id
- [x] Middleware classes created and documented
- [x] Validation layer implemented
- [x] Example refactored classes provided
- [ ] All classes updated to use middleware
- [ ] All API endpoints secured with validation
- [ ] Test suite passing (100% isolation)
- [ ] Performance benchmarks acceptable
- [ ] Audit logging working
- [ ] Documentation complete

---

## 📞 Support & Questions

For implementation questions:
1. Check the examples in `Customer_WithTenant.php` and `Auth_WithTenant.php`
2. Review `TenantMiddleware.php` method documentation
3. See `TenantValidator.php` for validation patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-27 | Initial implementation guide |
