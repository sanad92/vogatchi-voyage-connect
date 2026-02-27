# API Architecture & Security Stack

This document explains the **production‑ready API architecture** introduced to
support request validation, security, sanitization, rate limiting, unified
responses and centralized error handling.  It is designed to be simple, modular
and easy to integrate with existing controllers or new endpoints.

---

## 🔧 Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ApiController` | `classes/ApiController.php` | Base class for every API endpoint, handles parsing, sanitization, rate limiting, validation, RBAC. |
| `RequestValidator` | `classes/RequestValidator.php` | Lightweight validation engine with common rules (`required`, `email`, `min`, etc.). |
| `Sanitizer` | `classes/Sanitizer.php` | Recursively cleans input data to eliminate XSS/SQL injection. |
| `RateLimiter` | `classes/RateLimiter.php` | Token-bucket rate limiting (in‑memory or pluggable storage). |
| `Response` | `classes/Response.php` | Unified JSON format (`success`, `message`, `data`, `errors`, `timestamp`). |
| `ErrorHandler` | `classes/ErrorHandler.php` | Global exception handler that converts throws into JSON errors and logs them. |
| `RBACMiddleware` | `classes/RBACMiddleware.php` | Existing RBAC module integrated into API flow. |

---

## 🛣️ Request Flow

1. **HTTP request** arrives at `api/index.php` router.
2. Router selects controller and constructs it: `new SomeApi($db,$auth)`.  `ApiController`:
   - parses JSON payload (`php://input`)
   - sanitizes data via `Sanitizer::sanitize()`
   - initializes RBAC middleware if user is logged in
   - wires up rate limiter (default or Redis)
3. **Controller action** executes:
   - calls `$this->throttle()` to enforce rate limit
   - `$this->auth->requireLogin()` if needed
   - `$this->rbac->require(...)` for permission check
   - `$this->validate([...])` to run rules on input
   - business logic, interacting with models
   - use `$this->success()` or `$this->error()` for response
4. If any exception bubbles, `ErrorHandler::handle()` catches it and returns a
   standardized JSON error with appropriate HTTP status.

<br>

## 🧠 Example: Dashboard API

```php
class DashboardApi extends ApiController {
    public function get() {
        $this->throttle();                        // rate limit
        $this->auth->requireLogin();              // require authentication
        $this->rbac->require(Permission::DASHBOARD_VIEW);

        $orgId = $this->auth->getCurrentUser()['organization_id'];
        $stats = [
            'customers' => $this->db->count('customers',['organization_id'=>$orgId]),
            // ...
        ];

        $this->success($stats);
    }
}
```

## 📂 Example: Customer Creation Endpoint

```php
class CustomersApi extends ApiController {
    public function create() {
        $this->throttle();
        $this->auth->requireLogin();
        $this->rbac->require(Permission::CUSTOMERS_CREATE);

        $rules = [
            'first_name' => 'required|string|min:2',
            'email'      => 'required|email',
        ];
        $this->validate($rules);                     // throws 422 on failure

        $data = $this->requestData;
        $customer = new Customer($this->db);
        $customer->setTenantId($this->auth->getCurrentUser()['organization_id']);
        $data['created_by'] = $this->auth->getCurrentUser()['id'];

        if ($customer->create($data)) {
            $this->success(['id'=>$customer->getId()], 'Customer created', 201);
        }
        $this->error('Failed to create customer',500);
    }
}
```

## 📦 Router Example

`api/index.php` demonstrates a minimalist router that dispatches based on
method+path.  Any framework or custom router can be swapped in; the important
piece is always instantiating the controller and letting the `ErrorHandler`
catch unexpected exceptions.

```php
// bootstrap
set_exception_handler(['ErrorHandler','handle']);

switch (true) {
  case $method==='GET' && $path==='/api/dashboard':
       (new DashboardApi($db,$auth))->get();
       break;
  // ...
}
```

## ✅ Security Enhancements Summary

- **Request Validation** prevents malformed data (rules defined per-endpoint).
- **Rate Limiting** mitigates brute-force & DOS (60 requests/min default).
- **Sanitized Inputs** stops XSS & simple injection attacks.
- **Unified JSON Responses** make clients predictable.
- **Centralized Error Handler** ensures all errors are caught, logged, and do
  not leak sensitive info.
- **RBAC Integration** ensures permission checks happen early.
- **Tenant Awareness** remains from earlier multi‑tenant work.

## 💾 Pluggability

- Rate limiter storage may be swapped for Redis by passing a PSR‑16 cache
  adapter into `ApiController` constructor.
- New validation rules may be added to `RequestValidator::applyRule`.
- Sanitizer may be extended to allow more HTML or custom filters.

## ⚙️ Integration Guide

1. **Add to autoloader** or include files as shown at the top of
   `api/index.php`.
2. **Create controllers** extending `ApiController` for each API resource.
3. **Define routes** in your router file; ensure `set_exception_handler` is set.
4. **Apply validation rules** at beginning of actions.
5. **Call `$this->throttle()`** for endpoints that should be rate-limited.
6. **Use `$this->success()/error()`** exclusively for responses.
7. **Write tests** exercising success & failure paths; validation errors return
   422 with error array, rate-limit returns 429.

## 🧪 Testing Suggestions

- Send bad data → expect `422` with details.
- Flood endpoint (>limit) → expect `429` after limit reached.
- Omit permission → expect `403` and audit log entry.
- Throw unexpected exception in controller → expect `500` response with generic
  message.

## 🚀 Final Notes

This architecture can be dropped in alongside existing pages; you can convert
legacy endpoints to API versions one at a time.  The pattern encourages
consistency and dramatically reduces the risk of common security omissions.

With the previously implemented RBAC and tenant middleware, these additions
complete a hardened, maintainable API platform ready for production.

---

**Next steps:** Implement additional controllers, add caching for rate limiter,
and update documentation accordingly.  You're now equipped with a fully
secured API foundation.  🎯
---

## 🧩 Service / Repository Layer (New)

To further cleanly separate concerns, business logic has been pulled out of
models/controllers into a thin **service layer**.  Each resource gets:

1. A `Repository` class under `classes/repositories/` that handles *all* SQL
   / data access.  These classes extend `BaseRepository` (which itself
   extends the existing `TenantMiddleware`), so they automatically obey tenant
   scoping when `setTenantId()` is invoked by the caller.
2. A `Service` class under `classes/services/` that receives a repository
   instance.  Services implement input validation, complex business rules,
   orchestration across multiple repositories, and are the only place where
   `throw new Exception` should be used for domain errors.
3. Controllers (API or web) now depend on the service instead of talking to
   the database directly.  This makes unit‑testing easier and keeps controller
   code focused on HTTP concerns (validation, response formatting, RBAC).

### Example (Customer creation)

```php
$service = (new CustomerService(new CustomerRepository()))
                ->setTenant($orgId)
                ->setCurrentUser($userId);
$service->create($payload);
```

Existing business classes (e.g. `Customer`) remain as compatibility wrappers
that extend the corresponding repository; they will be removed over time as the
codebase migrates.

Refer to `classes/services/CustomerService.php` and
`classes/repositories/CustomerRepository.php` for a concrete implementation.

