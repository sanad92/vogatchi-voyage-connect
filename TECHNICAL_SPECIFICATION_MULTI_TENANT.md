# Multi-Tenant Isolation - Technical Specification

**Version**: 1.0  
**Status**: Production Ready  
**Date**: February 27, 2026

---

## 1. System Architecture

### 1.1 Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                │
│              (Organization Context Available)            │
└────────────────────────┬────────────────────────────────┘
                         │
                    HTTP Requests
                  (with session)
                         │
         ┌───────────────▼───────────────┐
         │    API Endpoints (PHP)        │
         │  - Auth validation            │
         │  - Tenant context extraction  │
         │  - TenantValidator checks     │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   Business Logic Classes      │
         │  (extend TenantMiddleware)    │
         │  - Customer                   │
         │  - HotelBooking               │
         │  - Invoice                    │
         │  - etc.                       │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   TenantMiddleware Layer      │
         │  - Query filtering            │
         │  - Record validation          │
         │  - Automatic org_id injection │
         │  - Audit logging              │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   Database Layer (MySQL)      │
         │  - organizations table        │
         │  - All data tables            │
         │  - All with organization_id   │
         │  - FK constraints + CASCADE   │
         └───────────────────────────────┘
```

### 1.2 Data Flow

```
User Request
    ↓
Session Check (Auth)
    ↓
Extract organization_id from session
    ↓
Validate user belongs to organization (TenantValidator)
    ↓
Create Business Object
    ↓
Set tenant context: $obj->setTenantId($orgId)
    ↓
Call method: $obj->getAll()
    ↓
TenantMiddleware intercepts query
    ↓
Inject automatic WHERE clause: AND organization_id = :__tenant_id__
    ↓
Execute query with tenant filter
    ↓
Return only tenant-specific data
    ↓
Log operation (audit_logs table)
    ↓
Return response to client
```

---

## 2. Class Hierarchy

### 2.1 TenantMiddleware (Abstract Base Class)

```php
abstract class TenantMiddleware {
  protected $db;              // Database connection
  protected $tenantId;        // Current tenant
  protected $currentUserId;   // Current user
  
  // Public API
  public function setTenantId($id)
  public function setCurrentUser($id)
  public function getTenantId()
  
  // Query Methods
  protected function selectWithTenant($sql, $params)
  protected function selectOneWithTenant($sql, $params)
  protected function insertWithTenant($table, $data)
  protected function updateWithTenant($table, $data, $where, $params)
  protected function deleteWithTenant($table, $where, $params)
  
  // Validation
  protected function validateRecordAccess($recordId, $table)
  protected function hasRoleInTenant($role)
  protected function requireRoleInTenant($role)
  
  // Audit
  protected function auditLog($action, $table, $recordId, $old, $new)
}
```

### 2.2 TenantValidator (Static Utility Class)

```php
class TenantValidator {
  // Validation
  public static function validateTenantId($tenantId)
  public static function userBelongsToTenant($userId, $tenantId)
  
  // User Context
  public static function getUserTenants($userId)
  public static function getUserRoleInTenant($userId, $tenantId)
  
  // Authorization
  public static function userHasRole($userId, $tenantId, $role)
  public static function isSuperAdmin($userId)
  
  // Record Access
  public static function canAccessRecord($userId, $tenantId, $recordId, $table)
  public static function canAccessCustomer($userId, $customerId, $tenantId)
  public static function canAccessBooking($userId, $bookingId, $tenantId)
  
  // Enforcement
  public static function ensureAccess($userId, $tenantId, $action)
}
```

### 2.3 Business Classes (Extends TenantMiddleware)

```php
class Customer extends TenantMiddleware {
  public function create($data)
  public function update($id, $data)
  public function getById($id)
  public function getAll($page, $perPage, $search, $segment)
  public function delete($id)
  // ... etc
}

class Auth extends TenantMiddleware {
  public function login($email, $password, $tenantId)
  public function register($data, $tenantId)
  public function logout()
  public function getCurrentUser()
  // ... etc
}

// Similarly: HotelBooking, FlightBooking, CarRental, Invoice, etc.
```

---

## 3. Database Schema

### 3.1 Key Tables

#### organizations
```sql
CREATE TABLE organizations (
  id CHAR(36) PRIMARY KEY,           -- UUID
  name VARCHAR(255) NOT NULL,        -- Company name
  slug VARCHAR(100) UNIQUE,          -- URL slug
  plan VARCHAR(50) DEFAULT 'free',   -- Subscription plan
  is_active BOOLEAN DEFAULT TRUE,
  created_at, updated_at
)
```

#### organization_members (For cross-org access)
```sql
CREATE TABLE organization_members (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) FK,
  user_id CHAR(36) FK,
  role ENUM('owner','admin','manager','agent','viewer'),
  is_active BOOLEAN DEFAULT TRUE
)
```

#### All Data Tables
```sql
-- Example: customers
CREATE TABLE customers (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL FK,  -- TENANT SCOPING
  name VARCHAR(150) NOT NULL,
  email, phone, ...
  INDEX idx_customers_org (organization_id),
  INDEX idx_customers_org_active (organization_id, is_active),
  CONSTRAINT fk_customers_org FK TO organizations
)
```

#### audit_logs (For compliance)
```sql
CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) FK,
  user_id CHAR(36),
  action VARCHAR(100),              -- INSERT|UPDATE|DELETE|LOGIN
  entity_type VARCHAR(100),
  entity_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address, user_agent,
  created_at
)
```

### 3.2 Foreign Key Strategy

All tables with organization_id have:
```sql
CONSTRAINT fk_<table>_org 
  FOREIGN KEY (organization_id) 
  REFERENCES organizations(id) 
  ON DELETE CASCADE
```

This ensures:
- Cannot insert data without valid organization_id
- When organization deleted, all its data is removed
- Referential integrity maintained

### 3.3 Indexing Strategy

**Single column indexes**:
```sql
CREATE INDEX idx_<table>_org ON <table>(organization_id);
```

**Composite indexes for common queries**:
```sql
CREATE INDEX idx_<table>_org_status ON <table>(organization_id, status);
CREATE INDEX idx_<table>_org_date ON <table>(organization_id, created_at);
CREATE INDEX idx_<table>_org_active ON <table>(organization_id, is_active);
```

---

## 4. API Patterns

### 4.1 Endpoint Structure (All Must Follow)

```php
<?php
// /api/customers/list.php

// 1. INCLUDE CLASSES
require_once '../config/database.php';
require_once '../classes/Auth.php';
require_once '../classes/TenantValidator.php';
require_once '../classes/Customer.php';

// 2. AUTHENTICATE
$auth = new Auth();
$auth->requireLogin();

// 3. GET CONTEXT
$user = $auth->getCurrentUser();
$orgId = $user['organization_id'];

// 4. VALIDATE ACCESS
try {
  TenantValidator::ensureAccess($user['id'], $orgId, 'read');
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['error' => $e->getMessage()]);
  exit;
}

// 5. CREATE SERVICE WITH TENANT CONTEXT
$customer = new Customer();
$customer->setTenantId($orgId);
$customer->setCurrentUser($user['id']);

// 6. EXECUTE (Auto-filtered by tenant now)
try {
  $page = $_GET['page'] ?? 1;
  $search = $_GET['search'] ?? '';
  $customers = $customer->getAll($page, 20, $search);
  
  echo json_encode([
    'success' => true,
    'data' => $customers,
    'organization_id' => $orgId  // Include for client reference
  ]);
} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
```

### 4.2 CRUD Operations Patterns

#### CREATE
```php
$customer = new Customer();
$customer->setTenantId($orgId)->setCurrentUser($userId);

try {
  $customerId = $customer->create([
    'name' => 'John Doe',
    'phone' => '123456789'
    // organization_id is auto-added!
  ]);
  echo json_encode(['id' => $customerId, 'success' => true]);
} catch (Exception $e) {
  echo json_encode(['error' => $e->getMessage()]);
}
```

#### READ
```php
$customer = new Customer();
$customer->setTenantId($orgId);

// Single record (auto-filtered)
$customer_data = $customer->getById($customerId);

// Multiple records (auto-filtered)
$customers = $customer->getAll($page, $perPage, $search);
```

#### UPDATE
```php
$customer = new Customer();
$customer->setTenantId($orgId)->setCurrentUser($userId);

try {
  $customer->update($customerId, [
    'name' => 'Jane Doe',
    // Only this customer in this org can be updated
  ]);
} catch (Exception $e) {
  // Customer doesn't exist OR user doesn't have access
}
```

#### DELETE
```php
$customer = new Customer();
$customer->setTenantId($orgId)->setCurrentUser($userId);

try {
  $customer->delete($customerId);
  // Only this customer in this org can be deleted
} catch (Exception $e) {
  // Access denied or record not found
}
```

---

## 5. Query Filtering Mechanism

### 5.1 Automatic WHERE Injection

When you call `selectWithTenant()`:

```php
// Input:
$customer->selectWithTenant(
  "SELECT * FROM customers WHERE name LIKE :search",
  ['search' => '%John%']
);

// Becomes:
/*
SELECT * FROM customers 
WHERE name LIKE :search 
AND organization_id = :__tenant_id__
*/

// With params: 
['search' => '%John%', '__tenant_id__' => 'org-123']
```

### 5.2 Complex Query Example

```php
$sql = "SELECT c.*, COUNT(b.id) as booking_count
        FROM customers c
        LEFT JOIN hotel_bookings b ON c.id = b.customer_id
        WHERE c.email = :email
        GROUP BY c.id";

$result = $customer->selectOneWithTenant($sql, ['email' => 'john@example.com']);

// Actual query executed:
/*
SELECT c.*, COUNT(b.id) as booking_count
FROM customers c
LEFT JOIN hotel_bookings b ON c.id = b.customer_id
WHERE c.email = :email 
  AND c.organization_id = :__tenant_id__
GROUP BY c.id
*/
```

### 5.3 Join Safety

**Important**: JOINed tables must also be filtered!

```php
// UNSAFE - hotel_bookings not filtered!
"SELECT * FROM customers c 
 LEFT JOIN hotel_bookings b ON c.id = b.customer_id
 WHERE c.email = :email"

// SAFE - both filtered:
"SELECT * FROM customers c 
 LEFT JOIN hotel_bookings b ON c.id = b.customer_id
 AND b.organization_id = :__tenant_id__
 WHERE c.email = :email"
```

---

## 6. Session Management

### 6.1 Session Structure

```php
$_SESSION = [
  'user_id' => 'user-123',
  'user_email' => 'user@example.com',
  'user_name' => 'John Doe',
  'organization_id' => 'org-456',        // Current org
  'tenant_role' => 'admin',              // Role in org
  'user_roles' => ['admin', 'manager'],  // Global roles
  'accessible_orgs' => ['org-456', 'org-789'], // All orgs user can access
  'login_time' => 1700000000
];
```

### 6.2 Session Validation

Every session must have both:
- ✅ `user_id` - Who is the user?
- ✅ `organization_id` - Which org are they in?

```php
if (!isset($_SESSION['user_id']) || !isset($_SESSION['organization_id'])) {
  throw new Exception("Invalid session");
}
```

---

## 7. Audit Logging

### 7.1 What Gets Logged

```sql
INSERT INTO audit_logs (
  id, 
  organization_id,    -- CRITICAL: which org
  user_id,             -- who did it
  action,              -- INSERT/UPDATE/DELETE/LOGIN
  entity_type,         -- customers/invoices/etc
  entity_id,           -- which record
  old_values,          -- before (JSON)
  new_values,          -- after (JSON)
  ip_address,
  user_agent,
  created_at
)
```

### 7.2 Query Example

```php
// Audited automatically when using middleware
$customer = new Customer();
$customer->setTenantId('org-123')->setCurrentUser('user-456');
$customer->update($customerId, ['name' => 'Jane']);

// audit_logs table gets entry:
/*
{
  organization_id: 'org-123',
  user_id: 'user-456',
  action: 'UPDATE',
  entity_type: 'customers',
  entity_id: 'cust-789',
  old_values: {"name": "John"},
  new_values: {"name": "Jane"},
  ip_address: '192.168.1.1',
  created_at: '2026-02-27 10:30:00'
}
*/
```

---

## 8. Security Rules

### 8.1 Query Execution Rules

```
EVERY QUERY MUST:
├─ Check session exists
├─ Extract organization_id from session  
├─ Validate user belongs to organization
├─ Pass organization_id to business class
└─ Let middleware auto-filter

NEVER:
├─ Execute raw SELECT without tenant context
├─ Trust user-provided organization_id
├─ Skip TenantValidator checks
├─ Build WHERE clauses manually
└─ Assume data is already filtered
```

### 8.2 Role Hierarchy

```
super_admin (global)
  ├─ owner (org-level)
  │  ├─ admin
  │  │  ├─ manager
  │  │  │  ├─ agent
  │  │  │  │  └─ viewer
```

Higher level can:
- Do everything lower level can
- Access all records in organization
- Modify organization settings
- Add/remove users

### 8.3 Error Responses

```json
// 401 - Not authenticated
{"error": "User not authenticated"}

// 403 - Authenticated but no permission
{"error": "Access denied: insufficient permissions"}

// 404 - Record not found (or no access)
{"error": "Record not found or not accessible"}

// 500 - Server error (don't leak details)
{"error": "An error occurred. Please try again."}
```

---

## 9. Performance Guidelines

### 9.1 Index Usage

```sql
-- Fast (uses index):
SELECT * FROM customers 
WHERE organization_id = 'org-123' 
AND email = 'john@example.com';

-- Slow (full table scan):
SELECT * FROM customers 
WHERE name LIKE '%John%' 
AND organization_id = 'org-123';

-- Better (still uses org index):
SELECT * FROM customers 
WHERE organization_id = 'org-123'
AND (name LIKE '%John%' OR email LIKE '%John%')
LIMIT 100;
```

### 9.2 Query Optimization Tips

1. Always put `organization_id` first in WHERE
2. Use LIMIT for pagination (don't fetch all)
3. Only SELECT needed columns
4. Use JOINs instead of N+1 queries
5. Index composite (org_id, other_fields)

### 9.3 Monitoring

Monitor these queries:
```sql
-- Slow queries with org filter
SELECT * FROM mysql.slow_log 
WHERE sql_text LIKE '%organization_id%';

-- Missing indexes
SELECT * FROM performance_schema.file_io_waits_summary_by_index_usage 
WHERE COUNT_READ = 0;
```

---

## 10. Testing Strategy

### 10.1 Unit Test Template

```php
function testUserCannotAccessOtherOrgData() {
  // Setup
  $org1 = createOrganization();
  $org2 = createOrganization();
  $user1 = createUser($org1);
  $user2 = createUser($org2);
  
  // Create data in org1
  $customer = new Customer();
  $customer->setTenantId($org1->id)->setCurrentUser($user1->id);
  $customerId = $customer->create(['name' => 'John']);
  
  // Try to access from org2
  $customer2 = new Customer();
  $customer2->setTenantId($org2->id)->setCurrentUser($user2->id);
  $result = $customer2->getById($customerId);
  
  // Assert
  Assert::isNull($result); // Should be denied
}
```

### 10.2 Integration Test Template

```php
function testCrossOrgAccessIsLogged() {
  $admin = createSuperAdmin();
  $org = createOrganization();
  
  // Admin accesses org they don't belong to
  TenantValidator::ensureAccess($admin->id, $org->id);
  
  // Should be logged in audit_logs
  $log = getAuditLog('CROSS_ORG_ACCESS', $org->id, $admin->id);
  Assert::notNull($log);
}
```

---

## 11. Deployment Checklist

- [ ] Database backed up
- [ ] Migration script tested on dev
- [ ] All classes updated
- [ ] All endpoints protected
- [ ] TenantMiddleware tests pass
- [ ] TenantValidator tests pass
- [ ] Cross-org access tests pass
- [ ] Performance benchmarks acceptable
- [ ] Audit logging verified
- [ ] Session management tested
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Team trained
- [ ] Production deployment
- [ ] Monitoring activated

---

## 12. Emergency Procedures

### 12.1 If Cross-Org Access Occurs

```sql
-- 1. Identify the issue
SELECT * FROM audit_logs 
WHERE organization_id != expected_org
ORDER BY created_at DESC;

-- 2. Find affected data
SELECT DISTINCT entity_id 
FROM audit_logs 
WHERE action IN ('INSERT', 'UPDATE', 'DELETE')
AND organization_id != expected_org;

-- 3. Review and restore if needed
-- (from backup if necessary)
```

### 12.2 If Performance Degrades

```sql
-- 1. Check slow queries
SHOW VARIABLES WHERE variable_name = 'slow_query_log';

-- 2. Analyze query execution
EXPLAIN SELECT * FROM customers WHERE organization_id = ? AND email = ?;

-- 3. Add missing indexes
CREATE INDEX idx_customers_org_email ON customers(organization_id, email);

-- 4. Monitor improvement
SHOW PROCESSLIST;
```

---

## 13. References

- **Schema**: `/database/mysql/schema_with_tenant_isolation.sql`
- **Migration**: `/database/migrations/001_add_multi_tenant_isolation.sql`
- **Classes**: `/classes/Tenant*.php`, `*_WithTenant.php`
- **Guides**: `/MULTI_TENANT_IMPLEMENTATION_GUIDE.md`

---

**End of Technical Specification**

Version 1.0 | February 27, 2026 | Production Ready ✅
