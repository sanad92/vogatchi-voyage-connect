<?php
/**
 * ApiController
 *
 * Base class for API endpoints. Handles common tasks:
 *  - JSON request parsing
 *  - Input sanitization
 *  - Validation helper
 *  - Rate limiting check
 *  - Unified response wrapper
 *  - RBAC middleware integration
 */
require_once __DIR__ . '/RequestValidator.php';
require_once __DIR__ . '/Sanitizer.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/RBACMiddleware.php';
require_once __DIR__ . '/TenantMiddleware.php';

class ApiController {
    protected $db;
    protected $auth;
    protected $rbac;
    protected $rateLimiter;
    protected $requestData = [];

    public function __construct($db, $auth, $rateStorage = null) {
        $this->db   = $db;
        $this->auth = $auth;

        // parse JSON payload
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        $this->requestData = $json ?? [];

        // apply sanitization
        $this->requestData = Sanitizer::sanitize($this->requestData);

        // sessions must provide user info
        if ($this->auth->isLoggedIn()) {
            $user = $this->auth->getCurrentUser();
            // P0 fix: normalize tenant context from the same source used by Auth.
            TenantMiddleware::setTenantContext($user['organization_id'] ?? null, $user['id'] ?? null, true);
            // P1 fix: authenticated API requests must always have tenant context.
            TenantMiddleware::requireTenant();
            $this->rbac = new RBACMiddleware($db, $user['id'], $user['organization_id']);
        }

        // simple in-memory limiter if none provided
        if ($rateStorage === null) {
            // basic array-backed
            $rateStorage = new class {
                private $data = [];
                public function get($k) { return $this->data[$k] ?? null; }
                public function set($k, $v, $ttl) { $this->data[$k] = $v; }
            };
        }
        $this->rateLimiter = new RateLimiter($rateStorage, 60, 60);
    }

    /**
     * Retrieve sanitized input
     */
    protected function input($key, $default = null) {
        return $this->requestData[$key] ?? $default;
    }

    /**
     * Validate current request data with rules
     */
    protected function validate(array $rules) {
        $validator = new RequestValidator($this->requestData, $rules);
        if ($validator->fails()) {
            throw new Exception('Validation failed', 422);
        }
        return true;
    }

    /**
     * Rate-limit per user+endpoint (key derived from user id and path)
     */
    protected function throttle(string $key = null) {
        if ($key === null) {
            $key = ($_SERVER['REMOTE_ADDR'] ?? 'anon') . ':' . $_SERVER['REQUEST_URI'];
        }
        if (!$this->rateLimiter->allow($key)) {
            throw new Exception('Too many requests', 429);
        }
    }

    /**
     * Send successful JSON response
     */
    protected function success($data = [], $message = '', $code = 200) {
        echo Response::success($data, $message, $code);
        exit;
    }

    /**
     * Send error JSON response
     */
    protected function error($message = '', $code = 400, $errors = []) {
        echo Response::error($message, $code, $errors);
        exit;
    }
}
