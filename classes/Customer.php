<?php
/**
 * Customer Management Class
 * Tourism Management System
 */

class Customer {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['name', 'phone'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Check for duplicate phone
        $existing = $this->db->selectOne("SELECT id FROM customers WHERE phone = :phone", ['phone' => $data['phone']]);
        if ($existing) {
            throw new Exception("رقم الهاتف مستخدم بالفعل");
        }
        
        $customerData = [
            'id' => $this->db->generateUUID(),
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'nationality' => $data['nationality'] ?? null,
            'passport_number' => $data['passport_number'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'customer_segment' => $data['customer_segment'] ?? 'new',
            'notes' => $data['notes'] ?? null
        ];
        
        return $this->db->insert('customers', $customerData);
    }
    
    public function update($id, $data) {
        // Check if customer exists
        $customer = $this->getById($id);
        if (!$customer) {
            throw new Exception("العميل غير موجود");
        }
        
        // Check for duplicate phone (excluding current customer)
        if (!empty($data['phone'])) {
            $existing = $this->db->selectOne(
                "SELECT id FROM customers WHERE phone = :phone AND id != :id", 
                ['phone' => $data['phone'], 'id' => $id]
            );
            if ($existing) {
                throw new Exception("رقم الهاتف مستخدم بالفعل");
            }
        }
        
        $allowedFields = ['name', 'phone', 'email', 'address', 'nationality', 'passport_number', 'date_of_birth', 'customer_segment', 'notes'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        return $this->db->update('customers', $updateData, 'id = :id', ['id' => $id]);
    }
    
    public function getById($id) {
        return $this->db->selectOne("SELECT * FROM customers WHERE id = :id", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $search = '', $segment = '') {
        $conditions = ['is_active = 1'];
        $params = [];
        
        if (!empty($search)) {
            $conditions[] = "(name LIKE :search OR phone LIKE :search OR email LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if (!empty($segment)) {
            $conditions[] = "customer_segment = :segment";
            $params['segment'] = $segment;
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "SELECT *, 
                (SELECT COUNT(*) FROM hotel_bookings WHERE customer_id = customers.id) +
                (SELECT COUNT(*) FROM flight_bookings WHERE customer_id = customers.id) +
                (SELECT COUNT(*) FROM car_rentals WHERE customer_id = customers.id) +
                (SELECT COUNT(*) FROM transport_bookings WHERE customer_id = customers.id) as total_bookings
                FROM customers 
                WHERE $whereClause 
                ORDER BY created_at DESC";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function delete($id) {
        // Check if customer has bookings
        $bookingCount = $this->db->selectOne("
            SELECT 
                (SELECT COUNT(*) FROM hotel_bookings WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM flight_bookings WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM car_rentals WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM transport_bookings WHERE customer_id = :id) as total
        ", ['id' => $id]);
        
        if ($bookingCount['total'] > 0) {
            throw new Exception("لا يمكن حذف العميل لوجود حجوزات مرتبطة به");
        }
        
        return $this->db->update('customers', ['is_active' => 0], 'id = :id', ['id' => $id]);
    }
    
    public function getStats() {
        return [
            'total' => $this->db->count('customers', 'is_active = 1'),
            'new' => $this->db->count('customers', 'is_active = 1 AND customer_segment = "new"'),
            'regular' => $this->db->count('customers', 'is_active = 1 AND customer_segment = "regular"'),
            'vip' => $this->db->count('customers', 'is_active = 1 AND customer_segment = "vip"'),
            'recent' => $this->db->count('customers', 'is_active = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
        ];
    }
    
    public function updateLoyaltyPoints($customerId, $points) {
        return $this->db->query(
            "UPDATE customers SET loyalty_points = loyalty_points + :points WHERE id = :id", 
            ['points' => $points, 'id' => $customerId]
        );
    }
    
    public function getCustomerBookings($customerId) {
        $bookings = [];
        
        // Hotel bookings
        $hotelBookings = $this->db->select("
            SELECT id, 'hotel' as type, hotel_name as title, check_in_date as start_date, 
                   check_out_date as end_date, total_cost_customer as amount, booking_status as status,
                   created_at
            FROM hotel_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC
        ", ['id' => $customerId]);
        
        // Flight bookings
        $flightBookings = $this->db->select("
            SELECT id, 'flight' as type, CONCAT(departure_airport, ' -> ', arrival_airport) as title, 
                   departure_date as start_date, return_date as end_date, total_cost_customer as amount, 
                   booking_status as status, created_at
            FROM flight_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC
        ", ['id' => $customerId]);
        
        // Car rentals
        $carRentals = $this->db->select("
            SELECT id, 'car_rental' as type, car_model as title, pickup_date as start_date, 
                   return_date as end_date, total_cost_customer as amount, booking_status as status,
                   created_at
            FROM car_rentals 
            WHERE customer_id = :id 
            ORDER BY created_at DESC
        ", ['id' => $customerId]);
        
        // Transport bookings
        $transportBookings = $this->db->select("
            SELECT id, 'transport' as type, CONCAT(pickup_location, ' -> ', dropoff_location) as title, 
                   service_date as start_date, service_date as end_date, total_cost_customer as amount, 
                   booking_status as status, created_at
            FROM transport_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC
        ", ['id' => $customerId]);
        
        // Merge all bookings
        $allBookings = array_merge($hotelBookings, $flightBookings, $carRentals, $transportBookings);
        
        // Sort by created_at desc
        usort($allBookings, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        return $allBookings;
    }
}
?>