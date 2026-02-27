<?php
/**
 * Compatibility wrapper after Customer model merge.
 *
 * P2 fix: avoid duplicate `Customer` class definitions and keep backward compatibility
 * for tenant-aware call sites.
 */

require_once __DIR__ . '/Customer.php';

class CustomerWithTenant extends Customer {
}

// Backward-compatible alias for legacy references.
if (!class_exists('Customer_WithTenant')) {
    class_alias(CustomerWithTenant::class, 'Customer_WithTenant');
}
?>
