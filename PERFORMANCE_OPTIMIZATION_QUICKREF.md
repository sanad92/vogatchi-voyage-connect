# Performance Optimization - Quick Reference

## 4 Main Tools

### 1. CacheManager - Fast Data Retrieval
```php
$cache = CacheManager::getInstance();

// Get with auto-load
$data = $cache->get('key', function() { return getData(); }, 300);

// Delete patterns
$cache->deletePattern('customer_*');
```

### 2. QueryOptimizer - Smart Database Operations
```php
$opt = new QueryOptimizer($db);

// Pagination (auto count)
$result = $opt->paginate($query, $params, $page = 1, $per_page = 20);

// Batch queries (fixes N+1)
$bookings = $opt->batchGet('bookings', 'customer_id', $customer_ids);

// Batch insert
$opt->batchInsert('logs', $rows, 100);

// Lazy load
$lazy = $opt->createLazyLoader($customer, 'customers', 'id', ['bookings']);
$bookings = $lazy->bookings; // Loads on access
```

### 3. OptimizedCustomerRepository - Real Example
```php
$repo = new OptimizedCustomerRepository();

// All with booking counts (optimized!)
$result = $repo->getAll($page = 1, $per_page = 20);

// Get with caching
$customer = $repo->getById('cust1');

// Search cached
$results = $repo->search('john', 50);
```

### 4. PerformanceMonitor - Find Bottlenecks
```php
$monitor = PerformanceMonitor::getInstance();

// Track operation
$timer = $monitor->startTimer('get_customers');
$customers = $db->query(...);
$metrics = $monitor->endTimer($timer);

// Find N+1 problems
$issues = $monitor->detectNPlusOne();

// HTML Report
echo $monitor->generateHTMLReport();

// Slowest queries
$slow = $monitor->getSlowestQueries(10);
```

## Common Problems & Solutions

### Problem: Loading 100 customers takes 5 seconds

**Before:**
```php
$customers = $db->query("SELECT * FROM customers");
// Takes 2sec

// This is slow:
foreach ($customers as $customer) {
    $customer['bookings'] = $db->query(
        "SELECT * FROM bookings WHERE customer_id = ?", 
        [$customer['id']]
    ); // +50ms per customer = +5 seconds!
}
```

**After:**
```php
$optimizer = new QueryOptimizer($db);
$customers = $db->query("SELECT * FROM customers");
// 1sec

$customer_ids = array_column($customers, 'id');
$bookings = $optimizer->batchGet('bookings', 'customer_id', $customer_ids);
// 1 query = fast!

foreach ($customers as &$c) {
    $c['bookings'] = $bookings[$c['id']] ?? [];
}
```

### Problem: Searching customers is slow

**Before:**
```php
$result = $db->query("SELECT * FROM customers WHERE name LIKE ?", ["%$search%"]);
// 800ms first time, 800ms every time
```

**After:**
```php
$cache = CacheManager::getInstance();
$result = $cache->get("search_$search", function() use ($db, $search) {
    return $db->query("SELECT * FROM customers WHERE name LIKE ?", ["%$search%"]);
}, 600);
// 800ms first time, 1ms cached! Cached 10 minutes.
```

### Problem: Inserting 1000 records is slow

**Before:**
```php
foreach ($records as $record) {
    $db->insert('logs', $record);
}
// 1000 queries = 3+ seconds
```

**After:**
```php
$optimizer = new QueryOptimizer($db);
$optimizer->batchInsert('logs', $records, 100);
// 10 queries = 100ms
```

### Problem: Page loads too much data, uses too much memory

**Before:**
```php
$customers = $db->query("SELECT * FROM customers ORDER BY name");
// All 10,000 customers loaded = 50MB memory
```

**After:**
```php
$optimizer = new QueryOptimizer($db);
$page = $_GET['page'] ?? 1;
$result = $optimizer->paginate(
    "SELECT id, name, email FROM customers ORDER BY name",
    [],
    $page,
    50
);
// Only 50 customers per page = 1MB memory
echo "Customers " . ($result['offset'] + 1) . " to " . min($result['offset'] + 50, $result['total']);
```

### Problem: Accessing optional data (addresses, notes, etc.) is wasteful

**Before:**
```php
$customer = $db->query("SELECT * FROM customers WHERE id = ?", [$id])[0];
$addresses = $db->query("SELECT * FROM addresses WHERE customer_id = ?", [$id]);
$notes = $db->query("SELECT * FROM notes WHERE customer_id = ?", [$id]);
// 3 queries always, even if addresses/notes not shown
```

**After:**
```php
$optimizer = new QueryOptimizer($db);
$customer = $db->query("SELECT id, name, email FROM customers WHERE id = ?", [$id])[0];
$lazy = $optimizer->createLazyLoader($customer, 'customers', 'id', ['addresses', 'notes']);

if ($show_addresses) {
    $addresses = $lazy->addresses; // Only queries if needed
}
```

## Performance Checklist

Before deployment:

- [ ] Run migration: `006_add_performance_indexes.sql`
- [ ] Replace repositories with OptimizedCustomerRepository
- [ ] Add caching to customer lookups
- [ ] Use batch queries where loading multiple related items
- [ ] Add pagination to list views
- [ ] Test with `PerformanceMonitor::generateHTMLReport()`
- [ ] Fix any N+1 problems detected
- [ ] Monitor slow_query_log in production

## SQL Debug Commands

```sql
-- Which queries are slow?
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Is my index being used?
EXPLAIN SELECT * FROM customers WHERE email = 'test@example.com';
-- Check: type should be 'ref' or 'const', not 'ALL'

-- How many queries hit this table?
SELECT object_name, count_read, count_write 
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE object_schema = 'vogatchi_db' 
ORDER BY count_read DESC;
```

## Caching TTL Reference

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 5 min | Changes occasionally |
| Customer list | 5 min | Updated regularly |
| Search results | 10 min | Relatively static |
| Settings/config | 1 hour | Rarely changes |
| LookUp lists | 1 hour | Stable data |
| Reports | 24 hours | Historical data |
| API responses | 5 min | Real-time preferred |

## What Gets Cached?

✅ **Cache these:**
- Customer lists (10+ results)
- Customer lookup by email/phone
- Search results
- Permission lists
- Reference data (countries, currencies)
- Reports and aggregates

❌ **Don't cache:**
- Current user data
- Real-time prices/rates
- Active sessions
- Temporary form data

## Testing Performance

```php
// 1. Create test data
INSERT INTO customers (id, name, email, organization_id) VALUES (...) // 1000 rows

// 2. Time various operations
$monitor = PerformanceMonitor::getInstance();

$timer = $monitor->startTimer('load_customers');
$result = $repo->getAll(1, 100);
$metrics = $monitor->endTimer($timer);
echo "Loaded 100 customers in " . $metrics['duration_ms'] . "ms\n";

// 3. Check for N+1
$issues = $monitor->detectNPlusOne();
if (empty($issues)) {
    echo "✓ No N+1 problems\n";
} else {
    echo "✗ N+1 problems found:\n";
    print_r($issues);
}

// 4. Generate report
echo $monitor->generateHTMLReport();
```

## Integration Checklist

1. **Database**
   - [ ] Applied migration 006 (indexes)
   - [ ] Verified indexes exist: `SHOW INDEXES FROM customers;`

2. **Code**
   - [ ] Use OptimizedCustomerRepository instead of CustomerRepository
   - [ ] Add CacheManager to customer lookups
   - [ ] Use QueryOptimizer for batch operations
   - [ ] Add pagination to list endpoints

3. **Monitoring**
   - [ ] Enable PerformanceMonitor in dev
   - [ ] Review generated reports
   - [ ] Fix top N+1 problems

4. **Testing**
   - [ ] Load test with 1000+ customers
   - [ ] Verify cache invalidation works
   - [ ] Check memory usage doesn't spike
   - [ ] Monitor slow query log

5. **Deployment**
   - [ ] Run indexes on production
   - [ ] Deploy optimized code
   - [ ] Monitor error logs for cache issues
   - [ ] Enable performance monitoring

## Emergency Fixes

If performance still bad after optimization:

1. **Check slow query log:**
   ```sql
   SHOW ENGINE INNODB STATUS\G;
   SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 5;
   ```

2. **Verify indexes are used:**
   ```php
   foreach ($queries as $query) {
       $explain = $db->query("EXPLAIN " . $query);
       if ($explain[0]['type'] === 'ALL') {
           echo "MISSING INDEX: " . $query;
       }
   }
   ```

3. **Disable unnecessary features:**
   - Turn off logging temporarily
   - Disable audit tracking
   - Reduce cache TTL

4. **Quick wins:**
   - Select fewer columns (`SELECT id, name` not `SELECT *`)
   - Add LIMIT to test queries
   - Remove ORDER BY if not needed

## Monitoring Dashboard Command

```bash
# Run from web browser to see live performance
# http://yoursite.com/debug/performance.php
```

Content for `debug/performance.php`:
```php
<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/PerformanceMonitor.php';

$monitor = PerformanceMonitor::getInstance();
echo $monitor->generateHTMLReport();
?>
```

