<?php
/**
 * Invoice Management Class
 * Tourism Management System
 */

class Invoice {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['booking_id', 'booking_type', 'customer_id', 'customer_name', 'subtotal'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Generate invoice number
        $invoiceNumber = $this->generateInvoiceNumber();
        
        $invoiceData = [
            'id' => $this->db->generateUUID(),
            'invoice_number' => $invoiceNumber,
            'booking_id' => $data['booking_id'],
            'booking_type' => $data['booking_type'],
            'customer_id' => $data['customer_id'],
            'customer_name' => $data['customer_name'],
            'subtotal' => $data['subtotal'],
            'vat_rate' => $data['vat_rate'] ?? 14.00,
            'discount_amount' => $data['discount_amount'] ?? 0.00,
            'currency' => $data['currency'] ?? 'EGP',
            'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
            'payment_terms' => $data['payment_terms'] ?? '30 days',
            'notes' => $data['notes'] ?? null,
            'status' => 'draft'
        ];
        
        return $this->db->insert('invoices', $invoiceData);
    }
    
    public function update($id, $data) {
        $invoice = $this->getById($id);
        if (!$invoice) {
            throw new Exception("الفاتورة غير موجودة");
        }
        
        $allowedFields = [
            'subtotal', 'vat_rate', 'discount_amount', 'currency', 'due_date',
            'payment_terms', 'notes', 'status', 'payment_status'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        return $this->db->update('invoices', $updateData, 'id = :id', ['id' => $id]);
    }
    
    public function getById($id) {
        return $this->db->selectOne("
            SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = :id
        ", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $conditions[] = "(i.invoice_number LIKE :search OR i.customer_name LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "i.status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['payment_status'])) {
            $conditions[] = "i.payment_status = :payment_status";
            $params['payment_status'] = $filters['payment_status'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "i.issued_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "i.issued_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT i.*, c.name as customer_name, c.phone as customer_phone
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE $whereClause
            ORDER BY i.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function updatePayment($id, $paidAmount) {
        $invoice = $this->getById($id);
        if (!$invoice) {
            throw new Exception("الفاتورة غير موجودة");
        }
        
        $newPaidAmount = $invoice['total_paid_amount'] + $paidAmount;
        $paymentStatus = 'partial';
        
        if ($newPaidAmount >= $invoice['final_amount']) {
            $paymentStatus = 'paid';
            $newPaidAmount = $invoice['final_amount'];
        } elseif ($newPaidAmount <= 0) {
            $paymentStatus = 'unpaid';
            $newPaidAmount = 0;
        }
        
        return $this->db->update('invoices', [
            'total_paid_amount' => $newPaidAmount,
            'payment_status' => $paymentStatus,
            'paid_date' => $paymentStatus === 'paid' ? date('Y-m-d') : null
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markAsSent($id) {
        return $this->db->update('invoices', ['status' => 'sent'], 'id = :id', ['id' => $id]);
    }
    
    public function getStats() {
        $stats = $this->db->selectOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaid,
                SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial,
                SUM(CASE WHEN payment_status = 'overdue' THEN 1 ELSE 0 END) as overdue,
                SUM(final_amount) as total_amount,
                SUM(total_paid_amount) as total_paid,
                SUM(remaining_amount) as total_remaining
            FROM invoices
        ");
        
        return $stats;
    }
    
    private function generateInvoiceNumber() {
        $year = date('Y');
        
        // Get or create sequence for current year
        $sequence = $this->db->selectOne("
            SELECT last_number FROM invoice_sequences WHERE year = :year
        ", ['year' => $year]);
        
        if (!$sequence) {
            $this->db->insert('invoice_sequences', [
                'id' => $this->db->generateUUID(),
                'year' => $year,
                'last_number' => 1
            ]);
            $nextNumber = 1;
        } else {
            $nextNumber = $sequence['last_number'] + 1;
            $this->db->update('invoice_sequences', 
                ['last_number' => $nextNumber], 
                'year = :year', 
                ['year' => $year]
            );
        }
        
        return "INV-$year-" . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }
    
    public function getInvoiceByBooking($bookingId, $bookingType) {
        return $this->db->selectOne("
            SELECT * FROM invoices 
            WHERE booking_id = :booking_id AND booking_type = :booking_type
        ", ['booking_id' => $bookingId, 'booking_type' => $bookingType]);
    }
    
    public function delete($id) {
        $invoice = $this->getById($id);
        if (!$invoice) {
            throw new Exception("الفاتورة غير موجودة");
        }
        
        if ($invoice['payment_status'] === 'paid') {
            throw new Exception("لا يمكن حذف فاتورة مدفوعة");
        }
        
        return $this->db->delete('invoices', 'id = :id', ['id' => $id]);
    }
}
?>