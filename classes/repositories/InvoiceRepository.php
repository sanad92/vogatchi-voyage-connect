<?php

require_once __DIR__ . '/BaseRepository.php';

class InvoiceRepository extends BaseRepository {
    protected $table = 'invoices';

    public function __construct() {
        parent::__construct();
    }

    public function create(array $data) {
        $data['id'] = $this->generateId();
        $data['invoice_number'] = $this->generateInvoiceNumber();
        return $this->insert($this->table, $data);
    }

    public function updateById(string $id, array $data) {
        return $this->update($this->table, $data, 'id = :id', ['id' => $id]);
    }

    public function getById(string $id) {
        $sql = "SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
            FROM {$this->table} i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = :id";
        return $this->selectOne($sql, ['id' => $id]);
    }

    public function getAll(int $page = 1, int $perPage = 20, array $filters = []) {
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
            FROM {$this->table} i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE $whereClause
            ORDER BY i.created_at DESC
        ";
        
        return $this->paginate($sql, $params, $page, $perPage);
    }

    public function updatePayment(string $id, float $paidAmount) {
        // payment logic moved to service; repository simply updates fields
        return $this->updateById($id, ['total_paid_amount' => $paidAmount]);
    }

    public function markAsSent(string $id) {
        return $this->updateById($id, ['status' => 'sent']);
    }

    public function getStats() {
        $sql = "SELECT 
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
            FROM {$this->table}"
        ;
        return $this->selectOne($sql);
    }

    private function generateInvoiceNumber() {
        $year = date('Y');
        $sequence = $this->selectOne(
            "SELECT last_number FROM invoice_sequences WHERE year = :year",
            ['year' => $year]
        );
        if (!$sequence) {
            $this->insert('invoice_sequences', [
                'id' => $this->generateId(),
                'year' => $year,
                'last_number' => 1
            ]);
            $nextNumber = 1;
        } else {
            $nextNumber = $sequence['last_number'] + 1;
            $this->update('invoice_sequences', ['last_number' => $nextNumber], 'year = :year', ['year' => $year]);
        }
        return "INV-$year-" . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }

    public function getInvoiceByBooking(string $bookingId, string $bookingType) {
        return $this->selectOne(
            "SELECT * FROM {$this->table} 
            WHERE booking_id = :booking_id AND booking_type = :booking_type",
            ['booking_id' => $bookingId, 'booking_type' => $bookingType]
        );
    }
}
