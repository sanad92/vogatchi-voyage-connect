# Usage Tracking System Documentation

## Overview

The Usage Tracking System provides comprehensive per-organization analytics and metrics covering:
- **Bookings**: Count of bookings created per day/month
- **Users**: Active user counts (based on API activity)
- **Storage**: File upload tracking and storage quota management
- **API Calls**: Granular API request logging with response times and error rates

This system integrates with the SaaS subscription system and provides data for billing, analytics dashboards, and compliance reporting.

## Architecture

### Database Schema

Four main tables track usage across organizations:

#### `org_usage_summary` (Daily Aggregates)
Tracks daily metrics per organization for quick dashboard queries:
```
Fields:
  - id: UUID primary key
  - organization_id: FK to organizations
  - date: The date of the summary (UNIQUE per org)
  - bookings_created: Integer count of bookings created this day
  - active_users: Integer count of unique active users
  - storage_used_mb: Decimal storage consumption in MB
  - api_calls: Integer count of API calls made
  - created_at, updated_at: Timestamps

Indexes:
  - UNIQUE(organization_id, date) - fast daily lookup
  - (organization_id, date DESC) - fast range queries
  - (date) - cross-org trending
```

#### `api_calls_log` (Granular API Tracking)
Stores detailed information about every API request for analysis:
```
Fields:
  - id: UUID primary key
  - organization_id: FK to organizations
  - user_id: FK to users (nullable, for unauthenticated calls)
  - endpoint: The API path (e.g., '/api/bookings')
  - method: HTTP method (GET, POST, PUT, DELETE)
  - status_code: HTTP response code
  - response_time_ms: Response time in milliseconds
  - ip_address: Client IP address
  - user_agent: Browser/client string
  - request_id: Unique request identifier for tracing
  - created_at: Timestamp

Indexes:
  - (organization_id) - org-level queries
  - (user_id) - user activity queries
  - (created_at DESC) - recent calls first
  - (endpoint) - endpoint analytics
  - (organization_id, created_at DESC) - org time-series
```

#### `storage_usage` (File Tracking)
Logs all file uploads and deletions for storage quota accounting:
```
Fields:
  - id: UUID primary key
  - organization_id: FK to organizations
  - user_id: FK to users (nullable)
  - file_name: Original filename
  - file_size_bytes: Size in bytes
  - file_path: Path to file in storage
  - upload_date: Timestamp of upload
  - deleted_at: Soft-delete timestamp (nullable until deleted)

Indexes:
  - (organization_id) - org storage calculation
  - (user_id) - user uploads
  - (upload_date) - recent uploads
  - (organization_id, deleted_at) - current storage fast sum
```

#### `monthly_usage_report` (Historical Aggregates)
Pre-calculated monthly summaries for billing and historical analysis:
```
Fields:
  - id: UUID primary key
  - organization_id: FK to organizations
  - year, month: Period (e.g., 2026, 2)
  - total_bookings_created: Sum of bookings for the month
  - max_active_users: Peak active user count
  - avg_active_users: Average active users across the month
  - total_storage_mb: Average storage used during month
  - total_api_calls: Total API calls
  - avg_api_response_ms: Average response time
  - api_error_count: Calls with status >= 400
  - calculated_at: When report was generated

Indexes:
  - UNIQUE(organization_id, year, month) - upsert on recalculation
  - (organization_id) - org reports
  - (year, month) - cross-org trends
```

## PHP Classes

### UsageTracker Service
Location: `classes/services/UsageTracker.php`

Main service for recording and querying usage metrics.

#### Public Methods

**Booking & Invoice Tracking:**
```php
$tracker = new UsageTracker($db);
$tracker->trackBookingCreated();  // Increment today's booking counter
```

**API Call Tracking:**
```php
$tracker->trackApiCall(
  $endpoint,        // '/api/bookings'
  $method,          // 'POST'
  $user_id,         // User who made request
  $status_code,     // 200, 404, etc.
  $response_time_ms, // milliseconds
  $ip_address       // optional, auto-detected if not provided
);
```

**File/Storage Tracking:**
```php
// Track upload
$tracker->trackStorageUpload(
  $file_name,       // 'invoice_2026.pdf'
  $file_size_bytes, // 1048576
  $file_path,       // '/uploads/org123/...'
  $user_id          // optional
);

// Track deletion (soft-delete)
$tracker->trackStorageDeletion($file_id);

// Get total storage
$mb_used = $tracker->getTotalStorageUsageMb();  // Returns float
```

**User Activity Tracking:**
```php
// Active users in last N days (based on API calls)
$count = $tracker->getActiveUsersCount(30);  // 30-day active users
$count = $tracker->getActiveUsersCount(7);   // 7-day active users
```

**Daily/Range Queries:**
```php
// Get today's summary
$today = $tracker->getTodayUsage();
// Returns: ['bookings_created' => 5, 'active_users' => 3, 'storage_used_mb' => 125.50, 'api_calls' => 847]

// Get date range
$data = $tracker->getUsageRange('2026-01-01', '2026-01-31');
// Returns: Array of daily summaries
```

**API Analytics:**
```php
$analytics = $tracker->getApiAnalytics('2026-01-01', '2026-01-31');
// Returns array of endpoints with:
// - endpoint, method, total_calls, error_count, avg_response_ms, max_response_ms, min_response_ms
```

**Monthly Reports:**
```php
// Calculate and store monthly aggregate
$success = $tracker->calculateMonthlyReport(2026, 2);  // Feb 2026

// Retrieve existing report
$report = $tracker->getMonthlyReport(2026, 2);
```

### ApiUsageMiddleware
Location: `classes/ApiUsageMiddleware.php`

Static middleware methods for integrating tracking into API flow.

#### Public Methods

```php
// Start timing the request (call at API entry point)
ApiUsageMiddleware::startTracking();

// Log the call (call at API exit/response)
ApiUsageMiddleware::logApiCall($endpoint, $method, $status_code, $user_id);

// Wrap entire operation (callback style)
$result = ApiUsageMiddleware::trackCall('/api/bookings', 'POST', function() {
  return createBooking($data);
}, $user_id);

// Calculate all org reports for a month (run via cron)
$count = ApiUsageMiddleware::calculateAllMonthlyReports($db, 2026, 2);

// Get dashboard data for org
$data = ApiUsageMiddleware::getDashboardData($db, $org_id, $days = 30);
```

## Integration Points

### Automatic Tracking

**1. Booking Creation**
- HotelBooking::create() → `$tracker->trackBookingCreated()`
- FlightBooking::create() → `$tracker->trackBookingCreated()`
- TransportBooking::create() → `$tracker->trackBookingCreated()`
- InvoiceService::create() → `$tracker->trackBookingCreated()`

**2. API Calls**
- Can be integrated into `api/index.php` router to auto-log all requests
- Or manually called via `ApiUsageMiddleware::trackCall()` wrapper

**3. File Uploads**
- Should be called when handling file uploads
- Location: wherever file upload endpoints are handled

**4. Active Users**
- Automatically calculated from `api_calls_log`
- No explicit tracking needed; queries on API call history

### Manual Integration Example

In your booking creation endpoint:

```php
try {
  $hotel = new HotelBooking();
  $hotel->create($data);
  
  // Already tracked inside HotelBooking::create()
  // via: $tracker = new UsageTracker($db); $tracker->trackBookingCreated();
  
} catch (Exception $e) {
  // error handling
}
```

For API calls:

```php
// In API endpoint
ApiUsageMiddleware::startTracking();

try {
  $result = processRequest();
  ApiUsageMiddleware::logApiCall('/api/bookings', 'POST', 200, $user_id);
  echo json_encode($result);
} catch (Exception $e) {
  ApiUsageMiddleware::logApiCall('/api/bookings', 'POST', 500, $user_id);
  throw $e;
}
```

Or simpler:

```php
$result = ApiUsageMiddleware::trackCall('/api/bookings', 'POST', function() {
  return processRequest();
}, $user_id);
```

## API Endpoints

**Base:** `/api/usage`

### GET /api/usage/summary
Daily usage summary for today.

**Response:**
```json
{
  "today": {
    "bookings_created": 15,
    "active_users": 8,
    "storage_used_mb": 256.75,
    "api_calls": 1247
  },
  "storage_mb": 256.75,
  "active_users_7d": 12,
  "active_users_30d": 25,
  "timestamp": "2026-02-27 14:30:00"
}
```

### GET /api/usage/range?start=YYYY-MM-DD&end=YYYY-MM-DD
Date range of daily summaries (default: month-to-date).

**Response:**
```json
{
  "range": { "start": "2026-01-01", "end": "2026-01-31" },
  "data": [
    { "date": "2026-01-31", "bookings_created": 12, "active_users": 5, ... },
    { "date": "2026-01-30", "bookings_created": 8, "active_users": 3, ... }
  ]
}
```

### GET /api/usage/api-analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
Per-endpoint API metrics.

**Response:**
```json
{
  "period": { "start": "2026-01-01", "end": "2026-01-31" },
  "analytics": [
    {
      "endpoint": "/api/bookings",
      "method": "POST",
      "total_calls": 450,
      "error_count": 5,
      "avg_response_ms": 187,
      "max_response_ms": 2150,
      "min_response_ms": 45
    }
  ]
}
```

### GET /api/usage/monthly?year=2026&month=2
Historical monthly report.

**Response:**
```json
{
  "period": "2026-2",
  "report": {
    "total_bookings_created": 287,
    "max_active_users": 45,
    "avg_active_users": 28.5,
    "total_storage_mb": 1245.50,
    "total_api_calls": 28450,
    "avg_api_response_ms": 156,
    "api_error_count": 42,
    "calculated_at": "2026-03-01 02:15:00"
  }
}
```

### GET /api/usage/dashboard?days=30
Complete dashboard data for analytics UI.

**Response:**
```json
{
  "period_days": 30,
  "data": {
    "today": { ... },
    "range": [ ... ],
    "total_storage_mb": 1245.50,
    "active_users_7d": 12,
    "active_users_30d": 25,
    "api_analytics": [ ... ]
  }
}
```

### GET /api/usage/storage?limit=10
Recent file uploads and storage info.

**Response:**
```json
{
  "total_storage_mb": 1245.50,
  "recent_uploads": [
    {
      "file_name": "invoice_2026.pdf",
      "file_size_bytes": 1048576,
      "file_size_mb": 1.00,
      "upload_date": "2026-02-27 10:30:00",
      "user_id": "user-uuid"
    }
  ]
}
```

### POST /api/usage/calculate-monthly
Manually trigger monthly report calculation.

**Request:**
```json
{
  "year": 2026,
  "month": 2
}
```

**Response:**
```json
{
  "success": true,
  "period": "2026-2",
  "message": "Monthly report calculated successfully"
}
```

### POST /api/usage/calculate-all-monthly (Admin)
Calculate all organizations' monthly reports.

**Request:**
```json
{
  "year": 2026,
  "month": 2
}
```

**Response:**
```json
{
  "success": true,
  "period": "2026-2",
  "organizations_processed": 127
}
```

## Usage Examples

### Track a Booking Creation

```php
// In HotelBooking::create() (already integrated)
public function create($data) {
  // ... validation ...
  
  $res = $this->db->insert('hotel_bookings', $bookingData);
  if ($res) {
    // This tracks the booking
    $tracker = new UsageTracker($this->db);
    $tracker->trackBookingCreated();
  }
  return $res;
}
```

### Track a File Upload

```php
// In your upload handler
$file_path = handleUpload($file);
$size = filesize($file_path);

if (class_exists('UsageTracker')) {
  $tracker = new UsageTracker($db);
  $tracker->trackStorageUpload(
    $file['name'],
    $size,
    $file_path,
    $current_user_id
  );
}
```

### Get Dashboard Metrics

```php
// In your analytics controller
$tracker = new UsageTracker($db);

$today = $tracker->getTodayUsage();
$month_data = $tracker->getUsageRange('2026-01-01', '2026-01-31');
$api_analytics = $tracker->getApiAnalytics('2026-01-01', '2026-01-31');
$storage_mb = $tracker->getTotalStorageUsageMb();
$active_users = $tracker->getActiveUsersCount(30);

// Build response
echo json_encode([
  'period' => 'January 2026',
  'bookings' => array_sum(array_column($month_data, 'bookings_created')),
  'avg_daily_bookings' => count($month_data) > 0 
    ? array_sum(array_column($month_data, 'bookings_created')) / count($month_data)
    : 0,
  'peak_api_calls' => max(array_column($month_data, 'api_calls')),
  'api_performance' => $api_analytics,
  'storage_used_mb' => $storage_mb,
  'active_users_30d' => $active_users
]);
```

### Monthly Cron Job

```php
// Run this at end of each month (e.g., via cron: 0 2 1 * * php /path/to/cron_job.php)
<?php
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/ApiUsageMiddleware.php';

$db = Database::getInstance();

// Calculate for current month
$date = new DateTime();
$date->modify('first day of last month');
$year = (int)$date->format('Y');
$month = (int)$date->format('m');

$count = ApiUsageMiddleware::calculateAllMonthlyReports($db, $year, $month);
error_log("Processed monthly reports for {$count} organizations");
```

## Performance Considerations

### Query Optimization

1. **Daily Summary Access**: Use `org_usage_date` index for ~10ms lookups
2. **Date Range Queries**: Index `(organization_id, date DESC)` provides fast scans
3. **API Analytics**: Pre-aggregate in `monthly_usage_report` for slow queries
4. **Storage Calculations**: Index `(organization_id, deleted_at)` for fast sum of active files

### Data Retention

Recommend:
- Keep `api_calls_log` for 90 days (archive older records to separate table)
- Keep `org_usage_summary` for 1-2 years (for trend analysis)
- Keep `monthly_usage_report` indefinitely (for billing history)
- Archive `storage_usage` deleted records after 90 days

### Scaling

For high-volume organizations:
- Consider partitioning `api_calls_log` by month: `api_calls_log_202602`
- Move heavy calculations to background jobs
- Cache dashboard queries (5-minute TTL)
- Use `INSERT IGNORE` for concurrent writes instead of `UPDATE ... OR INSERT`

## Integration with Subscription System

Usage metrics feed back into subscription enforcement:

1. **Booking Limits**: `usage_records` table tracks `'bookings'` feature; `org_usage_summary` provides audit trail
2. **API Quotas**: `api_calls_log` available for future rate limiting
3. **Storage Quotas**: `storage_usage.file_size_bytes` sum checked against plan limit
4. **Billing**: `monthly_usage_report` provides accurate usage for invoicing

## Future Enhancements

1. **Real-time Dashboards**: WebSocket integration for live metrics
2. **Alerts & Thresholds**: Email when bookings exceed daily average
3. **Custom Metrics**: Extensible counter system for business-specific KPIs
4. **ML-based Anomalies**: Detect unusual patterns in API response times
5. **Cost Attribution**: Track cost per endpoint, per user, per feature
6. **Audit Export**: GDPR-compliant data export for organizations
7. **Rate Limiting**: Enforce per-endpoint quotas using `api_calls_log`

## Troubleshooting

**Usage not being tracked:**
- Check `TenantMiddleware::getOrganizationId()` returns valid UUID
- Verify `class_exists('UsageTracker')` in domain classes
- Check database connection in `UsageTracker::__construct()`

**High storage usage calculation:**
- Verify `storage_usage.deleted_at IS NULL` condition excludes soft-deletes
- Check for duplicate file records from concurrent uploads
- Use `GROUP BY file_path` to deduplicate if needed

**API analytics showing old data:**
- Monthly report calculated at start of month; historical data is read-only
- Force recalculation: `POST /api/usage/calculate-monthly` with past date
- Raw logs in `api_calls_log`; aggregate endpoint in `monthly_usage_report`

**Dashboard slow:**
- Cache results: `GET /api/usage/dashboard` response (5-min TTL minimum)
- Reduce date range: use `days=7` instead of `days=180`
- Check indexes: `EXPLAIN SELECT ... FROM org_usage_summary` should use `idx_org_usage_org_date`

