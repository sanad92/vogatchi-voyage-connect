<?php
/**
 * Legacy customer class retained for backward compatibility.
 *
 * New code should use CustomerService/CustomerRepository directly.
 */

require_once __DIR__ . '/repositories/CustomerRepository.php';

class Customer extends CustomerRepository {
    public function __construct() {
        parent::__construct();
    }
}
?>
