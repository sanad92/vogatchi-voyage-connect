# Usage Tracking System - Implementation Checklist

## Pre-Deployment

- [ ] Review `USAGE_TRACKING_GUIDE.md` for system overview
- [ ] Review `USAGE_TRACKING_QUICKREF.md` for quick API reference
- [ ] Verify PHP version supports UUID functions (MySQL 8.0+)
- [ ] Backup existing database before migration

## Database Setup

- [ ] Run migration 005:
  ```bash
  mysql -u root -p dbname < database/migrations/005_add_usage_tracking.sql
  ```
  
  **OR** reinstall from updated schema:
  ```bash
  mysql -u root -p dbname < database/mysql/schema.sql
  ```

- [ ] Verify tables created:
  ```sql
  SHOW TABLES LIKE 'org_usage%';
  SHOW TABLES LIKE 'api_calls%';
  SHOW TABLES LIKE 'storage_usage%';
  SHOW TABLES LIKE 'monthly_usage%';
  ```

- [ ] Verify indexes created (each table should have 3-5 indexes):
  ```sql
  SHOW INDEXES FROM org_usage_summary;
  SHOW INDEXES FROM api_calls_log;
  SHOW INDEXES FROM storage_usage;
  SHOW INDEXES FROM monthly_usage_report;
  ```

## Code Deployment

### PHP Files Created
- [ ] `classes/services/UsageTracker.php` - Core service
- [ ] `classes/ApiUsageMiddleware.php` - Middleware
- [ ] `api/usage.php` - API endpoints

### PHP Files Modified
- [ ] `api/index.php` - Added usage route
- [ ] `classes/HotelBooking.php` - Added `trackBookingCreated()` call
- [ ] `classes/FlightBooking.php` - Added `trackBookingCreated()` call
- [ ] `classes/TransportBooking.php` - Added `trackBookingCreated()` call
- [ ] `classes/services/InvoiceService.php` - Added `trackBookingCreated()` call

### Documentation Files Created
- [ ] `USAGE_TRACKING_GUIDE.md` - Full documentation
- [ ] `USAGE_TRACKING_QUICKREF.md` - Quick reference
- [ ] `database/migrations/005_add_usage_tracking.sql` - Migration script

## Verification

### Syntax Checks
```bash
php -l classes/services/UsageTracker.php
php -l classes/ApiUsageMiddleware.php
php -l api/usage.php
php -l classes/HotelBooking.php
php -l classes/FlightBooking.php
php -l classes/TransportBooking.php
php -l classes/services/InvoiceService.php
php -l api/index.php
```

- [ ] All syntax checks pass (no errors)

### Runtime Checks  
- [ ] Create a test booking - verify `org_usage_summary.bookings_created` increments
- [ ] Call any API endpoint - verify `api_calls_log` receives entry
- [ ] Check `/api/usage/summary` returns 200 with valid JSON
- [ ] Check `/api/usage/dashboard` returns complete data

### Integration Tests
```bash
# Test API endpoints
curl http://localhost/api/usage/summary
curl http://localhost/api/usage/range?start=2026-01-01&end=2026-01-31
curl http://localhost/api/usage/api-analytics?start=2026-01-01&end=2026-01-31
curl http://localhost/api/usage/dashboard
curl http://localhost/api/usage/storage
```

- [ ] All endpoints return 200 with valid JSON
- [ ] Data is accurate (matches test data)
- [ ] Error responses return proper JSON with error field

## Post-Deployment

### Scheduled Jobs (Cron)

Set up monthly report calculation:

```bash
# Add to crontab (run at 2 AM on 1st of each month)
0 2 1 * * php /path/to/cron_monthly_report.php
```

Create `/path/to/cron_monthly_report.php`:
```php
<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/ApiUsageMiddleware.php';

$db = Database::getInstance();
$date = new DateTime();
$date->modify('first day of last month');
$year = (int)$date->format('Y');
$month = (int)$date->format('m');

$count = ApiUsageMiddleware::calculateAllMonthlyReports($db, $year, $month);
error_log("Monthly reports calculated for {$count} organizations");
?>
```

- [ ] Cron job created and tested
- [ ] Log file location verified
- [ ] Cron job executes successfully on schedule

### Monitoring

Set up log monitoring:

```bash
# Monitor for errors
tail -f error.log | grep "UsageTracker\|ApiUsageMiddleware"
```

- [ ] No errors in error logs from usage tracking
- [ ] Data accumulating normally in `org_usage_summary`
- [ ] API calls being logged to `api_calls_log`

### Documentation

- [ ] Team trained on new endpoints
- [ ] Dashboard developers briefed on `/api/usage` endpoints
- [ ] Billing team briefed on `monthly_usage_report` for invoicing
- [ ] Operations team aware of monthly cron job

## Feature Verification

### Booking Tracking
```php
// Create a test booking
$booking = new HotelBooking();
$booking->create(['...']); 

// Query
SELECT bookings_created FROM org_usage_summary 
WHERE organization_id = 'org-uuid' AND date = CURDATE();
```
- [ ] `bookings_created` increments by 1

### API Call Tracking
```php
// Call API endpoint
GET /api/usage/summary

// Query
SELECT COUNT(*) FROM api_calls_log 
WHERE organization_id = 'org-uuid' AND endpoint = '/api/usage/summary';
```
- [ ] New row appears in `api_calls_log`
- [ ] `response_time_ms` is populated (non-zero)

### Storage Tracking
```php
// Would need to upload a file through your upload endpoint
// Then query
SELECT SUM(file_size_bytes)/(1024*1024) as total_mb FROM storage_usage 
WHERE organization_id = 'org-uuid' AND deleted_at IS NULL;
```
- [ ] Storage size calculates correctly

### Active Users Count
```php
// Query
SELECT active_users FROM org_usage_summary WHERE organization_id = 'org-uuid' AND date = CURDATE();
// Or API
GET /api/usage/summary
```
- [ ] `active_users` reflects unique users making API calls

### Monthly Reports
```php
// Trigger calculation (should be done automatically by cron, but test manually)
POST /api/usage/calculate-monthly
Body: {"year": 2026, "month": 2}

// Query
SELECT * FROM monthly_usage_report 
WHERE organization_id = 'org-uuid' AND year = 2026 AND month = 2;
```
- [ ] Report calculates successfully
- [ ] Data appears reasonable (totals roughly match daily sums)

## Performance Baseline

### Query Performance

Before going live, establish baselines:

```bash
# Time daily summary query
mysql -u root -p dbname -e "
SELECT BENCHMARK(10000, (
  SELECT * FROM org_usage_summary 
  WHERE organization_id = 'test-org' AND date = CURDATE()
));"

# Time API analytics query
mysql -u root -p dbname -e "
SELECT BENCHMARK(100, (
  SELECT endpoint, COUNT(*) as total
  FROM api_calls_log
  WHERE organization_id = 'test-org' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  GROUP BY endpoint
));"
```

- [ ] Daily summary: <20ms
- [ ] API analytics (30-day): <500ms
- [ ] Monthly report calculation: <2 seconds

### Load Testing

Simulate typical daily usage:

```bash
# Generate 1000 API calls
for i in {1..1000}; do
  curl -s http://localhost/api/usage/summary > /dev/null &
done
wait

# Check performance didn't degrade
# Query api_calls_log size
SELECT COUNT(*) FROM api_calls_log WHERE DATE(created_at) = CURDATE();
```

- [ ] System handles 1000+ concurrent requests without errors
- [ ] Response times remain under 1 second

## Rollback Plan

If issues occur:

1. **Disable usage tracking** (temporary):
   ```php
   // In booking classes, comment out UsageTracker calls
   // System continues to operate normally without tracking
   ```

2. **Drop tables** (if needed):
   ```sql
   DROP TABLE IF EXISTS monthly_usage_report;
   DROP TABLE IF EXISTS storage_usage;
   DROP TABLE IF EXISTS api_calls_log;
   DROP TABLE IF EXISTS org_usage_summary;
   ```

3. **Revert code changes**:
   ```bash
   git checkout classes/HotelBooking.php classes/FlightBooking.php \
     classes/TransportBooking.php classes/services/InvoiceService.php api/index.php
   ```

- [ ] Rollback tested in staging environment
- [ ] Rollback plan documented and team aware

## Future Tasks

Based on this foundation, upcoming work:

- [ ] Integrate usage dashboard frontend (React components)
- [ ] Add real-time WebSocket updates for dashboard
- [ ] Implement rate limiting using `api_calls_log` data
- [ ] Add billing integration to charge based on usage
- [ ] Create alerts for usage thresholds (80%, 95%, over-limit)
- [ ] Build analytics ML model for predictions
- [ ] Add GDPR data export/deletion flows
- [ ] Implement cost attribution per endpoint/user

---

## Sign-Off

- [ ] Database Admin: Tables verified and indexes optimized
- [ ] Backend Lead: Code reviewed and deployed
- [ ] QA: All verification tests passed
- [ ] DevOps: Cron jobs configured and monitoring active
- [ ] Product/PM: Features working as expected

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Notes:** _________________________________________________________________

