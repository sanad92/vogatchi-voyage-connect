<?php
/**
 * Car Rental Management Class
 * Tourism Management System
 */

class CarRental {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['customer_id', 'customer_name', 'pickup_location', 'pickup_date', 'return_date', 'car_model', 'rental_price_per_day'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Validate dates
        if (strtotime($data['return_date']) <= strtotime($data['pickup_date'])) {
            throw new Exception("تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام");
        }
        
        // Calculate rental days
        $pickupDate = new DateTime($data['pickup_date']);
        $returnDate = new DateTime($data['return_date']);
        $rentalDays = $pickupDate->diff($returnDate)->days;
        
        $bookingData = [
            'id' => $this->db->generateUUID(),
            'customer_id' => $data['customer_id'],
            'customer_name' => $data['customer_name'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'supplier_name' => $data['supplier_name'] ?? '',
            'pickup_location' => $data['pickup_location'],
            'dropoff_location' => $data['dropoff_location'] ?? $data['pickup_location'],
            'pickup_date' => $data['pickup_date'],
            'pickup_time' => $data['pickup_time'] ?? '09:00',
            'return_date' => $data['return_date'],
            'return_time' => $data['return_time'] ?? '09:00',
            'rental_days' => $rentalDays,
            'car_model' => $data['car_model'],
            'car_year' => $data['car_year'] ?? null,
            'car_color' => $data['car_color'] ?? null,
            'transmission_type' => $data['transmission_type'] ?? 'automatic',
            'fuel_type' => $data['fuel_type'] ?? 'gasoline',
            'rental_price_per_day' => $data['rental_price_per_day'],
            'insurance_cost' => $data['insurance_cost'] ?? 0,
            'additional_services_cost' => $data['additional_services_cost'] ?? 0,
            'total_cost_customer' => ($data['rental_price_per_day'] * $rentalDays) + ($data['insurance_cost'] ?? 0) + ($data['additional_services_cost'] ?? 0),
            'supplier_cost_per_day' => $data['supplier_cost_per_day'] ?? 0,
            'total_supplier_cost' => ($data['supplier_cost_per_day'] ?? 0) * $rentalDays,
            'currency' => $data['currency'] ?? 'EGP',
            'booking_reference_supplier' => $data['booking_reference_supplier'] ?? null,
            'driver_license_number' => $data['driver_license_number'] ?? null,
            'insurance_type' => $data['insurance_type'] ?? 'basic',
            'deposit_amount' => $data['deposit_amount'] ?? 0,
            'additional_driver_info' => $data['additional_driver_info'] ?? null,
            'special_requests' => $data['special_requests'] ?? null,
            'booking_agent_id' => $data['booking_agent_id'] ?? null,
            'booking_agent_name' => $data['booking_agent_name'] ?? '',
            'booking_status' => 'pending'
        ];
        
        // Calculate profit
        $bookingData['total_profit'] = $bookingData['total_cost_customer'] - $bookingData['total_supplier_cost'];
        
        return $this->db->insert('car_rentals', $bookingData);
    }
    
    public function update($id, $data) {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception("الحجز غير موجود");
        }
        
        $allowedFields = [
            'pickup_location', 'dropoff_location', 'pickup_date', 'pickup_time', 'return_date', 'return_time',
            'car_model', 'car_year', 'car_color', 'transmission_type', 'fuel_type', 'rental_price_per_day',
            'insurance_cost', 'additional_services_cost', 'supplier_cost_per_day', 'currency',
            'booking_reference_supplier', 'driver_license_number', 'insurance_type', 'deposit_amount',
            'additional_driver_info', 'special_requests', 'booking_status'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Recalculate if dates or prices changed
        if (isset($data['pickup_date']) || isset($data['return_date']) || isset($data['rental_price_per_day']) || isset($data['supplier_cost_per_day'])) {
            $pickupDate = new DateTime($data['pickup_date'] ?? $booking['pickup_date']);
            $returnDate = new DateTime($data['return_date'] ?? $booking['return_date']);
            $rentalDays = $pickupDate->diff($returnDate)->days;
            
            $pricePerDay = $data['rental_price_per_day'] ?? $booking['rental_price_per_day'];
            $supplierCostPerDay = $data['supplier_cost_per_day'] ?? $booking['supplier_cost_per_day'];
            $insurance = $data['insurance_cost'] ?? $booking['insurance_cost'];
            $additional = $data['additional_services_cost'] ?? $booking['additional_services_cost'];
            
            $updateData['rental_days'] = $rentalDays;
            $updateData['total_cost_customer'] = ($pricePerDay * $rentalDays) + $insurance + $additional;
            $updateData['total_supplier_cost'] = $supplierCostPerDay * $rentalDays;
            $updateData['total_profit'] = $updateData['total_cost_customer'] - $updateData['total_supplier_cost'];
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        return $this->db->update('car_rentals', $updateData, 'id = :id', ['id' => $id]);
    }
    
    public function getById($id) {
        return $this->db->selectOne("
            SELECT cr.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as supplier_name, s.contact_person as supplier_contact
            FROM car_rentals cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN suppliers s ON cr.supplier_id = s.id
            WHERE cr.id = :id
        ", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $conditions[] = "(cr.customer_name LIKE :search OR cr.car_model LIKE :search OR cr.pickup_location LIKE :search OR cr.internal_booking_number LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "cr.booking_status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "cr.pickup_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "cr.pickup_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT cr.*, c.name as customer_name, c.phone as customer_phone,
                   s.name as supplier_name
            FROM car_rentals cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN suppliers s ON cr.supplier_id = s.id
            WHERE $whereClause
            ORDER BY cr.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function updateStatus($id, $status) {
        $validStatuses = ['pending', 'confirmed', 'picked_up', 'returned', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("حالة الحجز غير صحيحة");
        }
        
        return $this->db->update('car_rentals', ['booking_status' => $status], 'id = :id', ['id' => $id]);
    }
    
    public function updatePayment($id, $paidAmount) {
        return $this->db->update('car_rentals', ['paid_amount' => $paidAmount], 'id = :id', ['id' => $id]);
    }
    
    public function getStats() {
        $stats = $this->db->selectOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN booking_status = 'picked_up' THEN 1 ELSE 0 END) as picked_up,
                SUM(CASE WHEN booking_status = 'returned' THEN 1 ELSE 0 END) as returned,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(total_cost_customer) as total_revenue,
                SUM(total_profit) as total_profit,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent
            FROM car_rentals
        ");
        
        return $stats;
    }
    
    public function markInvoiceSent($id) {
        return $this->db->update('car_rentals', [
            'invoice_sent' => 1,
            'invoice_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markVoucherSent($id) {
        return $this->db->update('car_rentals', [
            'voucher_sent' => 1,
            'voucher_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
}
?>