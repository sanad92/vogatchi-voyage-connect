<?php
/**
 * Employee Management Class
 * Tourism Management System
 */

class Employee {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['employee_code', 'full_name', 'position', 'hire_date', 'base_salary'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Check for duplicate employee code
        $existing = $this->db->selectOne("SELECT id FROM employees WHERE employee_code = :code", ['code' => $data['employee_code']]);
        if ($existing) {
            throw new Exception("رقم الموظف مستخدم بالفعل");
        }
        
        $employeeData = [
            'id' => $this->db->generateUUID(),
            'employee_code' => $data['employee_code'],
            'full_name' => $data['full_name'],
            'position' => $data['position'],
            'department' => $data['department'] ?? null,
            'hire_date' => $data['hire_date'],
            'base_salary' => $data['base_salary'],
            'allowances' => $data['allowances'] ?? 0,
            'salary_scale_level' => $data['salary_scale_level'] ?? 1,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'national_id' => $data['national_id'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_name' => $data['bank_name'] ?? null,
            'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
            'commission_type' => $data['commission_type'] ?? 'percentage',
            'commission_rate' => $data['commission_rate'] ?? 0.00,
            'is_active' => true
        ];
        
        return $this->db->insert('employees', $employeeData);
    }
    
    public function update($id, $data) {
        $employee = $this->getById($id);
        if (!$employee) {
            throw new Exception("الموظف غير موجود");
        }
        
        // Check for duplicate employee code (excluding current employee)
        if (!empty($data['employee_code'])) {
            $existing = $this->db->selectOne(
                "SELECT id FROM employees WHERE employee_code = :code AND id != :id", 
                ['code' => $data['employee_code'], 'id' => $id]
            );
            if ($existing) {
                throw new Exception("رقم الموظف مستخدم بالفعل");
            }
        }
        
        $allowedFields = [
            'employee_code', 'full_name', 'position', 'department', 'hire_date', 'base_salary',
            'allowances', 'salary_scale_level', 'phone', 'email', 'national_id',
            'bank_account_number', 'bank_name', 'emergency_contact_name', 'emergency_contact_phone',
            'commission_type', 'commission_rate', 'is_active'
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
        
        return $this->db->update('employees', $updateData, 'id = :id', ['id' => $id]);
    }
    
    public function getById($id) {
        return $this->db->selectOne("SELECT * FROM employees WHERE id = :id", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $search = '', $department = '', $activeOnly = true) {
        $conditions = [];
        $params = [];
        
        if ($activeOnly) {
            $conditions[] = 'is_active = 1';
        }
        
        if (!empty($search)) {
            $conditions[] = "(full_name LIKE :search OR employee_code LIKE :search OR phone LIKE :search OR email LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if (!empty($department)) {
            $conditions[] = "department = :department";
            $params['department'] = $department;
        }
        
        $whereClause = empty($conditions) ? '1=1' : implode(' AND ', $conditions);
        $sql = "SELECT * FROM employees WHERE $whereClause ORDER BY created_at DESC";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function deactivate($id) {
        // Check if employee has active bookings or pending salaries
        $activeBookings = $this->db->selectOne("
            SELECT 
                (SELECT COUNT(*) FROM hotel_bookings WHERE booking_agent_id = :id AND booking_status IN ('pending', 'confirmed')) +
                (SELECT COUNT(*) FROM flight_bookings WHERE booking_agent_id = :id AND booking_status IN ('pending', 'confirmed')) +
                (SELECT COUNT(*) FROM car_rentals WHERE booking_agent_id = :id AND booking_status IN ('pending', 'confirmed')) +
                (SELECT COUNT(*) FROM transport_bookings WHERE booking_agent_id = :id AND booking_status IN ('pending', 'confirmed')) as total
        ", ['id' => $id]);
        
        if ($activeBookings['total'] > 0) {
            throw new Exception("لا يمكن إلغاء تفعيل الموظف لوجود حجوزات نشطة مرتبطة به");
        }
        
        return $this->db->update('employees', ['is_active' => 0], 'id = :id', ['id' => $id]);
    }
    
    public function activate($id) {
        return $this->db->update('employees', ['is_active' => 1], 'id = :id', ['id' => $id]);
    }
    
    public function getStats() {
        return [
            'total' => $this->db->count('employees', '1=1'),
            'active' => $this->db->count('employees', 'is_active = 1'),
            'inactive' => $this->db->count('employees', 'is_active = 0'),
            'recent' => $this->db->count('employees', 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
            'with_commissions' => $this->db->count('employees', 'commission_rate > 0 AND is_active = 1')
        ];
    }
    
    public function getDepartments() {
        $result = $this->db->select("SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department");
        return array_column($result, 'department');
    }
    
    public function updateCommissionEarned($employeeId, $amount) {
        return $this->db->query(
            "UPDATE employees SET total_commission_earned = total_commission_earned + :amount WHERE id = :id",
            ['amount' => $amount, 'id' => $employeeId]
        );
    }
    
    public function getEmployeeCommissions($employeeId, $dateFrom = null, $dateTo = null) {
        $conditions = ['employee_id = :employee_id'];
        $params = ['employee_id' => $employeeId];
        
        if ($dateFrom) {
            $conditions[] = 'commission_date >= :date_from';
            $params['date_from'] = $dateFrom;
        }
        
        if ($dateTo) {
            $conditions[] = 'commission_date <= :date_to';
            $params['date_to'] = $dateTo;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        return $this->db->select("
            SELECT ec.*, 
                   CASE ec.booking_type
                       WHEN 'hotel' THEN (SELECT hotel_name FROM hotel_bookings WHERE id = ec.booking_id)
                       WHEN 'flight' THEN (SELECT CONCAT(departure_airport, ' - ', arrival_airport) FROM flight_bookings WHERE id = ec.booking_id)
                       WHEN 'car_rental' THEN (SELECT car_model FROM car_rentals WHERE id = ec.booking_id)
                       WHEN 'transport' THEN (SELECT CONCAT(pickup_location, ' - ', dropoff_location) FROM transport_bookings WHERE id = ec.booking_id)
                   END as booking_reference
            FROM employee_commissions ec
            WHERE $whereClause
            ORDER BY ec.commission_date DESC
        ", $params);
    }
    
    public function calculateMonthlyCommission($employeeId, $month, $year) {
        $employee = $this->getById($employeeId);
        if (!$employee) {
            throw new Exception("الموظف غير موجود");
        }
        
        if ($employee['commission_rate'] <= 0) {
            return ['total_commission' => 0, 'bookings_count' => 0];
        }
        
        $startDate = "$year-$month-01";
        $endDate = date('Y-m-t', strtotime($startDate));
        
        // Calculate commissions from all booking types
        $commissions = $this->db->selectOne("
            SELECT 
                SUM(
                    CASE 
                        WHEN booking_type = 'hotel' THEN (total_profit * :commission_rate / 100)
                        WHEN booking_type = 'flight' THEN (total_profit * :commission_rate / 100)
                        WHEN booking_type = 'car_rental' THEN (total_profit * :commission_rate / 100)
                        WHEN booking_type = 'transport' THEN (total_profit * :commission_rate / 100)
                        ELSE 0
                    END
                ) as total_commission,
                COUNT(*) as bookings_count
            FROM (
                SELECT 'hotel' as booking_type, total_profit FROM hotel_bookings 
                WHERE booking_agent_id = :employee_id AND DATE(created_at) BETWEEN :start_date AND :end_date
                UNION ALL
                SELECT 'flight' as booking_type, total_profit FROM flight_bookings 
                WHERE booking_agent_id = :employee_id AND DATE(created_at) BETWEEN :start_date AND :end_date
                UNION ALL
                SELECT 'car_rental' as booking_type, total_profit FROM car_rentals 
                WHERE booking_agent_id = :employee_id AND DATE(created_at) BETWEEN :start_date AND :end_date
                UNION ALL
                SELECT 'transport' as booking_type, total_profit FROM transport_bookings 
                WHERE booking_agent_id = :employee_id AND DATE(created_at) BETWEEN :start_date AND :end_date
            ) as all_bookings
        ", [
            'employee_id' => $employeeId,
            'commission_rate' => $employee['commission_rate'],
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        return [
            'total_commission' => $commissions['total_commission'] ?? 0,
            'bookings_count' => $commissions['bookings_count'] ?? 0
        ];
    }
}
?>