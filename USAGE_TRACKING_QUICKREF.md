# Usage Tracking - Quick Reference

## Setup

1. **Run migration:**
   ```bash
   mysql -u user -p dbname < database/migrations/005_add_usage_tracking.sql
   # OR use schema.sql which already includes the tables
   ```

2. **Classes available:**
   - `UsageTracker` - Main service for tracking and queries
   - `ApiUsageMiddleware` - Static middleware for API integration

## Common Tasks

### Track a Booking Creation
```php
// Already integrated in HotelBooking, FlightBooking, TransportBooking, InvoiceService
// They automatically call trackBookingCreated()
// But if you create elsewhere:
$tracker = new UsageTracker($db);
$tracker->trackBookingCreated();
```

### Track an API Call
```php
// Simple method
ApiUsageMiddleware::startTracking();
// ... do work ...
ApiUsageMiddleware::logApiCall('/api/bookings', 'POST', 200, $user_id);

// Or with callback
$result = ApiUsageMiddleware::trackCall('/api/bookings', 'POST', function() {
  return doWork();
}, $user_id);
```

### Track a File Upload
```php
$tracker = new UsageTracker($db);
$tracker->trackStorageUpload(
  'filename.pdf',
  1048576,           // file size in bytes
  '/path/to/file',
  $user_id
);
```

### Track File Deletion
```php
$tracker = new UsageTracker($db);
$tracker->trackStorageDeletion($file_id);
```

### Get Today's Usage
```php
$tracker = new UsageTracker($db);
$today = $tracker->getTodayUsage();

// Returns:
// ['bookings_created' => 5, 'active_users' => 3, 'storage_used_mb' => 125.50, 'api_calls' => 847]

echo "Bookings: " . $today['bookings_created'];
echo "Storage: " . $today['storage_used_mb'] . " MB";
```

### Get Storage Usage
```php
$tracker = new UsageTracker($db);
$mb = $tracker->getTotalStorageUsageMb();
echo "Total storage: $mb MB";
```

### Get Active Users (Last 30 Days)
```php
$tracker = new UsageTracker($db);
$active = $tracker->getActiveUsersCount(30);
echo "Active users (30d): $active";
```

### Get Usage for Date Range
```php
$tracker = new UsageTracker($db);
$data = $tracker->getUsageRange('2026-01-01', '2026-01-31');

// Returns array of daily summaries
foreach ($data as $day) {
  echo $day['date'] . ": " . $day['bookings_created'] . " bookings\n";
}
```

### Get API Analytics
```php
$tracker = new UsageTracker($db);
$analytics = $tracker->getApiAnalytics('2026-01-01', '2026-01-31');

// Find slowest endpoints
foreach ($analytics as $api) {
  echo $api['endpoint'] . " - " . $api['avg_response_ms'] . "ms avg, " . $api['error_count'] . " errors\n";
}
```

### Calculate Monthly Report
```php
$tracker = new UsageTracker($db);
$success = $tracker->calculateMonthlyReport(2026, 2);

if ($success) {
  $report = $tracker->getMonthlyReport(2026, 2);
  echo "Bookings: " . $report['total_bookings_created'] . "\n";
  echo "API calls: " . $report['total_api_calls'] . "\n";
  echo "Errors: " . $report['api_error_count'] . "\n";
}
```

### Get Dashboard Data
```php
$data = ApiUsageMiddleware::getDashboardData($db, $org_id, 30);
// Returns complete dashboard object with today, range, storage, users, api_analytics
```

## API Endpoints

### GET /api/usage/summary
Get today's usage summary.

### GET /api/usage/range?start=2026-01-01&end=2026-01-31
Get date range of daily summaries.

### GET /api/usage/api-analytics?start=2026-01-01&end=2026-01-31
Get API endpoint metrics.

### GET /api/usage/monthly?year=2026&month=2
Get monthly report.

### GET /api/usage/dashboard?days=30
Get complete dashboard data.

### GET /api/usage/storage?limit=10
Get file uploads and storage info.

### POST /api/usage/calculate-monthly
Calculate monthly report. Body: `{"year": 2026, "month": 2}`

### POST /api/usage/calculate-all-monthly
Calculate all orgs' monthly reports. Body: `{"year": 2026, "month": 2}`

## Database Tables Reference

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `org_usage_summary` | Daily aggregates | org_id, date, bookings_created, active_users, storage_used_mb, api_calls |
| `api_calls_log` | Every API request | org_id, endpoint, method, status_code, response_time_ms, created_at |
| `storage_usage` | File uploads/deletions | org_id, file_size_bytes, upload_date, deleted_at |
| `monthly_usage_report` | Monthly aggregates | org_id, year, month, total_bookings, total_api_calls, etc. |

## Queries

### Total storage used by org
```sql
SELECT SUM(file_size_bytes) / (1024*1024) as total_mb
FROM storage_usage
WHERE organization_id = 'org-uuid' AND deleted_at IS NULL;
```

### Active users today
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM api_calls_log
WHERE organization_id = 'org-uuid' AND DATE(created_at) = CURDATE();
```

### Booking count this month
```sql
SELECT SUM(bookings_created) as total
FROM org_usage_summary
WHERE organization_id = 'org-uuid' 
  AND date >= '2026-02-01' 
  AND date < '2026-03-01';
```

### API endpoints by error rate
```sql
SELECT 
  endpoint,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
  ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate_pct
FROM api_calls_log
WHERE organization_id = 'org-uuid' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY endpoint
ORDER BY error_rate_pct DESC;
```

### Slowest endpoints
```sql
SELECT 
  endpoint,
  method,
  COUNT(*) as calls,
  ROUND(AVG(response_time_ms), 2) as avg_ms,
  MAX(response_time_ms) as max_ms
FROM api_calls_log
WHERE organization_id = 'org-uuid' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY endpoint, method
ORDER BY avg_ms DESC
LIMIT 10;
```

## FAQ

**Q: How is "active users" calculated?**  
A: Unique count of `user_id` values that made API calls in the time period. If no API call history, count is 0.

**Q: When is the daily summary updated?**  
A: When `trackBookingCreated()` or `trackApiCall()` is called. The `updated_at` timestamp reflects the last activity.

**Q: Can I delete old usage data?**  
A: Yes, but recommend archiving first. Safe to purge `api_calls_log` older than 90 days.

**Q: How do I calculate storage accurate?**  
A: `SUM(file_size_bytes)` for all rows with `deleted_at IS NULL` in `storage_usage` table.

**Q: The dashboard is slow, how do I optimize?**  
A: 
1. Cache `/api/usage/dashboard` response for 5 minutes
2. Reduce date range (use `days=7` instead of 180)
3. Ensure indexes on `api_calls_log(organization_id, created_at)`

**Q: How do I integrate API tracking globally?**  
A: Add to `api/index.php` router:
```php
ApiUsageMiddleware::startTracking();
try {
  // dispatch request
} finally {
  ApiUsageMiddleware::logApiCall($endpoint, $method, $status_code, $user_id);
}
```

**Q: Can I track custom metrics?**  
A: `UsageTracker` is extendable. Create custom methods in the class or subclass it.

