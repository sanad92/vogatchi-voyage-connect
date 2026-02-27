<?php
/**
 * Compatibility wrapper after Auth model merge.
 *
 * P2 fix: avoid duplicate `Auth` class definitions and keep backward compatibility
 * for any code referencing a tenant-aware variant.
 */

require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/TenantMiddleware.php';

class AuthWithTenant extends Auth {
    /**
     * Expose explicit tenant context setter for legacy callers.
     */
    public function setTenantContext(?string $organizationId, ?string $userId = null): self {
        TenantMiddleware::setTenantContext($organizationId, $userId, true);
        return $this;
    }
}

// Backward-compatible alias for legacy references.
if (!class_exists('Auth_WithTenant')) {
    class_alias(AuthWithTenant::class, 'Auth_WithTenant');
}
