<?php
/**
 * Legacy invoice class kept for backward compatibility.
 * New code should use InvoiceService/InvoiceRepository instead.
 */

require_once __DIR__ . '/repositories/InvoiceRepository.php';

class Invoice extends InvoiceRepository {
    public function __construct() {
        parent::__construct();
    }
}
?>
