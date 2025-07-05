<?php
/**
 * Expense Transaction Management Class
 * Tourism Management System
 */

class ExpenseTransaction {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['category_id', 'amount', 'transaction_date', 'description'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        $transactionData = [
            'id' => $this->db->generateUUID(),
            'category_id' => $data['category_id'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'employee_id' => $data['employee_id'] ?? null,
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'EGP',
            'exchange_rate_to_egp' => $data['exchange_rate_to_egp'] ?? 1.00,
            'amount_egp' => $data['amount'] * ($data['exchange_rate_to_egp'] ?? 1.00),
            'transaction_date' => $data['transaction_date'],
            'description' => $data['description'],
            'reference_number' => $data['reference_number'] ?? null,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'bank_account_id' => $data['bank_account_id'] ?? null,
            'receipt_image_url' => $data['receipt_image_url'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_recurring' => $data['is_recurring'] ?? false,
            'recurring_frequency' => $data['recurring_frequency'] ?? null,
            'next_due_date' => $data['next_due_date'] ?? null,
            'status' => 'pending',
            'created_by' => $data['created_by'] ?? null
        ];
        
        return $this->db->insert('expense_transactions', $transactionData);
    }
    
    public function update($id, $data) {
        $transaction = $this->getById($id);
        if (!$transaction) {
            throw new Exception("المعاملة غير موجودة");
        }
        
        if ($transaction['status'] === 'approved') {
            throw new Exception("لا يمكن تعديل معاملة معتمدة");
        }
        
        $allowedFields = [
            'category_id', 'supplier_id', 'employee_id', 'amount', 'currency', 'exchange_rate_to_egp',
            'transaction_date', 'description', 'reference_number', 'payment_method', 'bank_account_id',
            'receipt_image_url', 'notes', 'is_recurring', 'recurring_frequency', 'next_due_date'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Recalculate EGP amount if amount or exchange rate changed
        if (isset($data['amount']) || isset($data['exchange_rate_to_egp'])) {
            $amount = $data['amount'] ?? $transaction['amount'];
            $exchangeRate = $data['exchange_rate_to_egp'] ?? $transaction['exchange_rate_to_egp'];
            $updateData['amount_egp'] = $amount * $exchangeRate;
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        return $this->db->update('expense_transactions', $updateData, 'id = :id', ['id' => $id]);
    }
    
    public function getById($id) {
        return $this->db->selectOne("
            SELECT et.*, 
                   ec.name as category_name, ec.name_ar as category_name_ar,
                   s.name as supplier_name,
                   e.full_name as employee_name,
                   ba.account_name as bank_account_name
            FROM expense_transactions et
            LEFT JOIN expense_categories ec ON et.category_id = ec.id
            LEFT JOIN suppliers s ON et.supplier_id = s.id
            LEFT JOIN employees e ON et.employee_id = e.id
            LEFT JOIN bank_accounts ba ON et.bank_account_id = ba.id
            WHERE et.id = :id
        ", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $conditions[] = "(et.description LIKE :search OR et.reference_number LIKE :search OR s.name LIKE :search OR e.full_name LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['category_id'])) {
            $conditions[] = "et.category_id = :category_id";
            $params['category_id'] = $filters['category_id'];
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "et.status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['payment_method'])) {
            $conditions[] = "et.payment_method = :payment_method";
            $params['payment_method'] = $filters['payment_method'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "et.transaction_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "et.transaction_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        if (!empty($filters['employee_id'])) {
            $conditions[] = "et.employee_id = :employee_id";
            $params['employee_id'] = $filters['employee_id'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT et.*, 
                   ec.name as category_name, ec.name_ar as category_name_ar,
                   s.name as supplier_name,
                   e.full_name as employee_name,
                   ba.account_name as bank_account_name
            FROM expense_transactions et
            LEFT JOIN expense_categories ec ON et.category_id = ec.id
            LEFT JOIN suppliers s ON et.supplier_id = s.id
            LEFT JOIN employees e ON et.employee_id = e.id
            LEFT JOIN bank_accounts ba ON et.bank_account_id = ba.id
            WHERE $whereClause
            ORDER BY et.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function approve($id, $approvedBy = null) {
        $transaction = $this->getById($id);
        if (!$transaction) {
            throw new Exception("المعاملة غير موجودة");
        }
        
        if ($transaction['status'] === 'approved') {
            throw new Exception("المعاملة معتمدة بالفعل");
        }
        
        return $this->db->update('expense_transactions', [
            'status' => 'approved',
            'approved_by' => $approvedBy,
            'approved_at' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function reject($id, $rejectedBy = null, $rejectionReason = null) {
        $transaction = $this->getById($id);
        if (!$transaction) {
            throw new Exception("المعاملة غير موجودة");
        }
        
        if ($transaction['status'] === 'approved') {
            throw new Exception("لا يمكن رفض معاملة معتمدة");
        }
        
        return $this->db->update('expense_transactions', [
            'status' => 'rejected',
            'rejected_by' => $rejectedBy,
            'rejected_at' => date('Y-m-d H:i:s'),
            'rejection_reason' => $rejectionReason
        ], 'id = :id', ['id' => $id]);
    }
    
    public function delete($id) {
        $transaction = $this->getById($id);
        if (!$transaction) {
            throw new Exception("المعاملة غير موجودة");
        }
        
        if ($transaction['status'] === 'approved') {
            throw new Exception("لا يمكن حذف معاملة معتمدة");
        }
        
        return $this->db->delete('expense_transactions', 'id = :id', ['id' => $id]);
    }
    
    public function getStats($dateFrom = null, $dateTo = null) {
        $conditions = ['1=1'];
        $params = [];
        
        if ($dateFrom) {
            $conditions[] = 'transaction_date >= :date_from';
            $params['date_from'] = $dateFrom;
        }
        
        if ($dateTo) {
            $conditions[] = 'transaction_date <= :date_to';
            $params['date_to'] = $dateTo;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        $stats = $this->db->selectOne("
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(amount_egp) as total_amount_egp,
                SUM(CASE WHEN status = 'approved' THEN amount_egp ELSE 0 END) as approved_amount_egp,
                AVG(amount_egp) as average_amount
            FROM expense_transactions
            WHERE $whereClause
        ", $params);
        
        return $stats;
    }
    
    public function getCategoryBreakdown($dateFrom = null, $dateTo = null) {
        $conditions = ['status = "approved"'];
        $params = [];
        
        if ($dateFrom) {
            $conditions[] = 'et.transaction_date >= :date_from';
            $params['date_from'] = $dateFrom;
        }
        
        if ($dateTo) {
            $conditions[] = 'et.transaction_date <= :date_to';
            $params['date_to'] = $dateTo;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        return $this->db->select("
            SELECT 
                ec.name_ar as category_name,
                COUNT(et.id) as transaction_count,
                SUM(et.amount_egp) as total_amount,
                AVG(et.amount_egp) as average_amount
            FROM expense_transactions et
            JOIN expense_categories ec ON et.category_id = ec.id
            WHERE $whereClause
            GROUP BY ec.id, ec.name_ar
            ORDER BY total_amount DESC
        ", $params);
    }
    
    public function getMonthlyTrend($months = 12) {
        return $this->db->select("
            SELECT 
                DATE_FORMAT(transaction_date, '%Y-%m') as month,
                COUNT(*) as transaction_count,
                SUM(amount_egp) as total_amount
            FROM expense_transactions
            WHERE status = 'approved' 
                AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
            ORDER BY month DESC
        ", ['months' => $months]);
    }
}
?>