<?php

require_once __DIR__ . '/BaseService.php';
require_once __DIR__ . '/../repositories/InvoiceRepository.php';
require_once __DIR__ . '/AccountingService.php';

class InvoiceService extends BaseService {
    /** @var InvoiceRepository */
    private $repo;
    /** @var AccountingService */
    private $accounting;
    /** @var Database */
    private $db;

    public function __construct(InvoiceRepository $repo = null) {
        $this->repo = $repo ?? new InvoiceRepository();
        $this->accounting = new AccountingService();
        // P0 fix: initialize DB dependency used by usage tracking path.
        $this->db = Database::getInstance();
    }

    public function setTenant(string $tenantId) {
        $this->repo->setTenantId($tenantId);
        return $this;
    }

    public function setCurrentUser(string $userId) {
        $this->repo->setCurrentUser($userId);
        return $this;
    }

    public function create(array $data) {
        $required = ['booking_id', 'booking_type', 'customer_id', 'customer_name', 'subtotal'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل {$field} مطلوب");
            }
        }
        
        if (class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::requireFeature('invoices');
        }
        
        // default values
        $data['vat_rate'] = $data['vat_rate'] ?? 14.00;
        $data['discount_amount'] = $data['discount_amount'] ?? 0.00;
        $data['currency'] = $data['currency'] ?? 'EGP';
        $data['due_date'] = $data['due_date'] ?? date('Y-m-d', strtotime('+30 days'));
        $data['payment_terms'] = $data['payment_terms'] ?? '30 days';
        $data['status'] = $data['status'] ?? 'draft';

        // calculate price fields
        $subtotal = $data['subtotal'];
        $vat = $subtotal * ($data['vat_rate']/100);
        $data['final_amount'] = $subtotal + $vat - $data['discount_amount'];
        $data['total_paid_amount'] = 0;
        $data['remaining_amount'] = $data['final_amount'];
        $res = $this->repo->create($data);
        if ($res) {
            if (class_exists('Logger')) {
                Logger::activity('invoice_created', ['invoice_id'=>$data['id'] ?? null]);
            }
            if (class_exists('SubscriptionMiddleware')) {
                SubscriptionMiddleware::recordUsage('invoices');
            }
            if (class_exists('UsageTracker')) {
                // P0 fix: use initialized DB dependency and resolved tenant context.
                $tracker = new UsageTracker($this->db);
                $tracker->trackBookingCreated();
            }
            // automatically post a receivable & revenue entry for generated invoice
            try {
                $this->postInvoiceEntry($data);
            } catch (Exception $e) {
                // logging but don't break the flow
                if (class_exists('Logger')) {
                    // P0 fix: use Logger::error(message, severity, context) signature.
                    Logger::error('accounting_invoice_post_error', 'error', ['error'=>$e->getMessage()]);
                }
            }
        }
        return $res;
    }

    public function update(string $id, array $data) {
        $invoice = $this->repo->getById($id);
        if (!$invoice) {
            throw new Exception("الفاتورة غير موجودة");
        }

        $allowed = ['subtotal','vat_rate','discount_amount','currency','due_date','payment_terms','notes','status','payment_status'];
        $updateData = [];
        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        $res = $this->repo->updateById($id, $updateData);
        if ($res && class_exists('Logger')) {
            Logger::activity('invoice_updated', ['invoice_id'=>$id,'changes'=>$updateData]);
        }
        return $res;
    }

    public function getById(string $id) {
        return $this->repo->getById($id);
    }

    public function getAll(int $page = 1, int $perPage = 20, array $filters = []) {
        return $this->repo->getAll($page, $perPage, $filters);
    }

    public function updatePayment(string $id, float $paidAmount) {
        $invoice = $this->repo->getById($id);
        if (!$invoice) {
            throw new Exception("الفاتورة غير موجودة");
        }

        $newPaid = $invoice['total_paid_amount'] + $paidAmount;
        $status = 'partial';
        if ($newPaid >= $invoice['final_amount']) {
            $status = 'paid';
            $newPaid = $invoice['final_amount'];
        } elseif ($newPaid <= 0) {
            $status = 'unpaid';
            $newPaid = 0;
        }
        $this->repo->updateById($id, [
            'total_paid_amount' => $newPaid,
            'payment_status' => $status,
            'paid_date' => $status === 'paid' ? date('Y-m-d') : null
        ]);
        if (class_exists('Logger')) {
            Logger::activity('invoice_payment', ['invoice_id'=>$id,'amount'=>$paidAmount,'status'=>$status]);
        }
        // post payment journal entry
        try {
            $this->postPaymentEntry($invoice, $paidAmount, $status);
        } catch (Exception $e) {
            if (class_exists('Logger')) {
                // P0 fix: use Logger::error(message, severity, context) signature.
                Logger::error('accounting_invoice_payment_error', 'error', ['error'=>$e->getMessage()]);
            }
        }
        return true;
    }

    public function markAsSent(string $id) {
        $res = $this->repo->markAsSent($id);
        if ($res && class_exists('Logger')) {
            Logger::activity('invoice_sent', ['invoice_id'=>$id]);
        }
        return $res;
    }

    public function getStats() {
        return $this->repo->getStats();
    }

    public function getInvoiceByBooking(string $bookingId, string $bookingType) {
        return $this->repo->getInvoiceByBooking($bookingId, $bookingType);
    }

    /**
     * Internal helpers to create accounting entries for invoices
     */
    private function postInvoiceEntry(array $invoice) {
        // debit accounts receivable, credit revenue
        $desc = "Invoice {$invoice['invoice_number']}";
        $lines = [
            ['account_code' => '1100', 'debit' => $invoice['final_amount']], // Accounts receivable
            ['account_code' => '4000', 'credit' => $invoice['final_amount']] // Sales revenue
        ];
        $this->accounting->postEntry($invoice['issued_date'] ?? date('Y-m-d'), $desc, $lines, $invoice['id']);
    }

    private function postPaymentEntry(array $invoice, float $amount, string $status) {
        if ($amount <= 0) {
            return;
        }
        $desc = "Payment for invoice {$invoice['invoice_number']}";
        $lines = [
            ['account_code' => '1000', 'debit' => $amount], // Cash/bank
            ['account_code' => '1100', 'credit' => $amount] // Reduce A/R
        ];
        $this->accounting->postEntry(date('Y-m-d'), $desc, $lines, $invoice['id']);
    }
}
