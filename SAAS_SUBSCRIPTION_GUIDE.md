# SaaS Subscription Enforcement System

Vogatchi now includes a complete subscription and usage limit enforcement system designed to enforce SaaS plan limits at the application layer.

## Architecture

### Core Components

1. **Subscription Tables** (MySQL)
   - `subscription_plans` – Define plan limits and pricing
   - `subscriptions` – Track org → plan assignments (active/trialing/expired/cancelled)
   - `usage_records` – Track monthly feature usage per organization

2. **SubscriptionService** (`classes/services/SubscriptionService.php`)
   - `getActiveSubscription($orgId)` – Fetch current plan with limits
   - `isExpired($orgId)` – Check if org's subscription is past expiry
   - `isReadOnly($orgId)` – Subscription expired = read-only mode
   - `checkFeature($feature, $amount)` – Enforce plan limit before action
   - `trackUsage($feature, $amount)` – Record consumption after success
   - `getUsage($feature, $orgId)` – Query current month usage
   - `assignSubscription($orgId, $planId, $startsAt, $expiresAt, $isTrial)` – Activate a plan

3. **SubscriptionMiddleware** (`classes/SubscriptionMiddleware.php`)
   - Simple static API for enforcement:
     - `SubscriptionMiddleware::ensureActive()` – Throw if expired
     - `SubscriptionMiddleware::requireFeature($feature, $amount)` – Check limit, throw if exceeded
     - `SubscriptionMiddleware::recordUsage($feature, $amount)` – Post-action tracking

### Plan Configuration

Plans are stored as JSON objects in the database:

```sql
INSERT INTO subscription_plans (name, limits) 
VALUES ('Pro', JSON_OBJECT('bookings', 100, 'customers', 500, 'invoices', 1000));
```

**Standard Features:**
- `bookings` – number of bookings per month
- `customers` – max active customers
- `invoices` – invoices per month
- (extensible to any custom feature)

## Integration Points

### Automatic Enforcement

#### 1. Customer Creation (CustomerService)
```php
SubscriptionMiddleware::requireFeature('customers');  // check limit
// ... create customer ...
SubscriptionMiddleware::recordUsage('customers');     // log usage
```

#### 2. Bookings (HotelBooking, FlightBooking, TransportBooking)
```php
if (class_exists('SubscriptionMiddleware')) {
    SubscriptionMiddleware::requireFeature('bookings');
}
// ... create booking ...
if (class_exists('SubscriptionMiddleware')) {
    SubscriptionMiddleware::recordUsage('bookings');
}
```

#### 3. Invoicing (InvoiceService)
```php
SubscriptionMiddleware::requireFeature('invoices');
// ... create invoice ...
SubscriptionMiddleware::recordUsage('invoices');
```

## Usage Tracking

- **Period:** Monthly (1st to last day of each month)
- **Storage:** `usage_records` table with unique key `(org_id, feature, period_start)`
- **Query:** `getUsage()` returns current month consumption
- **Increment:** `trackUsage()` atomically increments counter

## Trial & Expiry Behavior

| State | Can Create? | Can Edit? | Can Delete? | Mode |
|-------|-------------|-----------|------------|------|
| Trialing (not expired) | ✅ | ✅ | ✅ | Read-Write |
| Trialing (expired) | ❌ | ❌ | ❌ | Read-Only |
| Active (not expired) | ✅ | ✅ | ✅ | Read-Write |
| Active (expired) | ❌ | ❌ | ❌ | Read-Only |
| Cancelled | ❌ | ❌ | ❌ | Read-Only |

- `isReadOnly()` returns true when subscription is expired or absent
- Before write operation, call `ensureActive()` to throw exception if in read-only mode
- Frontend checks `subscription.status` and shows "Trial Ending" / "Upgrade Now" prompts

## Example: Enforcing Booking Limits

```php
// Controller: Create Booking
$bookingData = [...];

try {
    // MiddleWare check (before DB write)
    SubscriptionMiddleware::requireFeature('bookings', 1);
    
    // Business logic
    $hb = new HotelBooking();
    $id = $hb->create($bookingData);
    
    // Track usage (after success)
    SubscriptionMiddleware::recordUsage('bookings', 1);
    
    echo json_encode(['success' => true, 'id' => $id]);
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Limit reached') !== false) {
        // Plan limit exceeded
        http_response_code(402);  // Payment required
        echo json_encode(['error' => 'Booking limit reached. Upgrade your plan.']);
    } else {
        throw $e;
    }
}
```

## API Endpoints (Optional)

Future endpoints (can be built using `AccountingService` pattern):

```
GET  /api/subscription/status          → current plan, limits, usage, expiry
GET  /api/subscription/usage           → detailed usage by feature
POST /api/subscription/upgrade         → change plan
POST /api/subscription/extend-trial    → extend trial by N days (admin only)
```

## Schema

### subscription_plans
```sql
id, name, description, features(JSON), limits(JSON), price, is_active, created_at, updated_at
```

### subscriptions
```sql
id, organization_id, plan_id, status, starts_at, expires_at, is_trial, created_at, updated_at
```

### usage_records
```sql
id, organization_id, feature, period_start, period_end, usage
```

## Migration

Run the migration to create tables:
```bash
mysql -u user -p dbname < database/migrations/004_add_subscription_enforcement.sql
```

Or import the full schema:
```bash
mysql -u user -p dbname < database/mysql/schema.sql
```

## Error Handling

**Exception: Subscription expired**
```
Exception: Organization subscription expired; read-only mode
```

**Exception: Feature limit reached**
```
Exception: Limit reached for feature bookings: 100
```

Catch these exceptions in controllers and return appropriate HTTP status:

- **402 Payment Required** – Limit reached (upgrade needed)
- **403 Forbidden** – Subscription expired (trial ended / cancel reason)
- **400 Bad Request** – Other validation errors

## Future Enhancements

1. **Soft Limits** – warn user at 85% usage but still allow creation
2. **Burst Usage** – allow overage for N days before hard-blocking
3. **Feature Gating** – certain features only in "Pro" plan (e.g., multi-currency, API access)
4. **Add-ons** – purchase extra bookings/storage on-demand
5. **Usage Alerts** – send email when org hits 80% of monthly quota
6. **Metrics Dashboard** – show usage trends, forecast overages

## Files Changed

- **New:** `classes/services/SubscriptionService.php`
- **New:** `classes/SubscriptionMiddleware.php`
- **New:** `database/migrations/004_add_subscription_enforcement.sql`
- **Modified:** `classes/services/CustomerService.php` – added feature check
- **Modified:** `classes/HotelBooking.php` – added feature check/tracking
- **Modified:** `classes/FlightBooking.php` – added feature check/tracking
- **Modified:** `classes/TransportBooking.php` – added feature check/tracking
- **Modified:** `classes/services/InvoiceService.php` – added feature check/tracking
- **Modified:** `database/mysql/schema.sql` – added subscription tables
- **Modified:** `database/mysql/schema_with_tenant_isolation.sql` – added subscription tables
