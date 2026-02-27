<?php
/**
 * Transport Booking Management Class
 * Tourism Management System
 */

class TransportBooking {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['customer_id', 'customer_name', 'pickup_location', 'dropoff_location', 'service_date', 'service_time', 'vehicle_type', 'cost_per_trip'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        if (class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::requireFeature('bookings');
        }

        $bookingData = [
            'id' => $this->db->generateUUID(),
            'customer_id' => $data['customer_id'],
            'customer_name' => $data['customer_name'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'supplier_name' => $data['supplier_name'] ?? '',
            'service_type' => $data['service_type'] ?? 'transfer',
            'pickup_location' => $data['pickup_location'],
            'dropoff_location' => $data['dropoff_location'],
            'service_date' => $data['service_date'],
            'service_time' => $data['service_time'],
            'return_service_date' => $data['return_service_date'] ?? null,
            'return_service_time' => $data['return_service_time'] ?? null,
            'vehicle_type' => $data['vehicle_type'],
            'number_of_passengers' => $data['number_of_passengers'] ?? 1,
            'distance_km' => $data['distance_km'] ?? null,
            'estimated_duration_hours' => $data['estimated_duration_hours'] ?? null,
            'cost_per_trip' => $data['cost_per_trip'],
            'return_trip_cost' => $data['return_trip_cost'] ?? 0,
            'waiting_time_cost' => $data['waiting_time_cost'] ?? 0,
            'additional_stops_cost' => $data['additional_stops_cost'] ?? 0,
            'total_cost_customer' => $data['cost_per_trip'] + ($data['return_trip_cost'] ?? 0) + ($data['waiting_time_cost'] ?? 0) + ($data['additional_stops_cost'] ?? 0),
            'supplier_cost' => $data['supplier_cost'] ?? 0,
            'currency' => $data['currency'] ?? 'EGP',
            'driver_name' => $data['driver_name'] ?? null,
            'driver_phone' => $data['driver_phone'] ?? null,
            'vehicle_plate_number' => $data['vehicle_plate_number'] ?? null,
            'vehicle_model' => $data['vehicle_model'] ?? null,
            'special_instructions' => $data['special_instructions'] ?? null,
            'flight_number' => $data['flight_number'] ?? null,
            'pickup_sign_name' => $data['pickup_sign_name'] ?? null,
            'booking_reference_supplier' => $data['booking_reference_supplier'] ?? null,
            'booking_agent_id' => $data['booking_agent_id'] ?? null,
            'booking_agent_name' => $data['booking_agent_name'] ?? '',
            'booking_status' => 'pending'
        ];
        
        // Calculate profit
        $bookingData['total_profit'] = $bookingData['total_cost_customer'] - $bookingData['supplier_cost'];
        
        $res = $this->db->insert('transport_bookings', $bookingData);
        if ($res) {
            if (class_exists('Logger')) {
                Logger::audit('INSERT','transport_bookings',$bookingData['id'],null,$bookingData);
                Logger::activity('booking_created',['booking_id'=>$bookingData['id'],'type'=>'transport']);
            }
            if (class_exists('SubscriptionMiddleware')) {
                SubscriptionMiddleware::recordUsage('bookings');
            }            if (class_exists('UsageTracker')) {
                $tracker = new UsageTracker($this->db);
                $tracker->trackBookingCreated();
            }        }
        return $res;
    }
    
    public function update($id, $data) {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception("الحجز غير موجود");
        }
        
        $allowedFields = [
            'service_type', 'pickup_location', 'dropoff_location', 'service_date', 'service_time',
            'return_service_date', 'return_service_time', 'vehicle_type', 'number_of_passengers',
            'distance_km', 'estimated_duration_hours', 'cost_per_trip', 'return_trip_cost',
            'waiting_time_cost', 'additional_stops_cost', 'supplier_cost', 'currency',
            'driver_name', 'driver_phone', 'vehicle_plate_number', 'vehicle_model',
            'special_instructions', 'flight_number', 'pickup_sign_name',
            'booking_reference_supplier', 'booking_status'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Recalculate totals if costs changed
        if (isset($data['cost_per_trip']) || isset($data['return_trip_cost']) || isset($data['waiting_time_cost']) || isset($data['additional_stops_cost']) || isset($data['supplier_cost'])) {
            $costPerTrip = $data['cost_per_trip'] ?? $booking['cost_per_trip'];
            $returnCost = $data['return_trip_cost'] ?? $booking['return_trip_cost'];
            $waitingCost = $data['waiting_time_cost'] ?? $booking['waiting_time_cost'];
            $additionalCost = $data['additional_stops_cost'] ?? $booking['additional_stops_cost'];
            $supplierCost = $data['supplier_cost'] ?? $booking['supplier_cost'];
            
            $updateData['total_cost_customer'] = $costPerTrip + $returnCost + $waitingCost + $additionalCost;
            $updateData['total_profit'] = $updateData['total_cost_customer'] - $supplierCost;
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        $old = $this->getById($id);
        $res = $this->db->update('transport_bookings', $updateData, 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','transport_bookings',$id,$old,$updateData);
            Logger::activity('booking_updated',['booking_id'=>$id,'changes'=>$updateData]);
        }
        return $res;
    }
    
    public function getById($id) {
        return $this->db->selectOne("
            SELECT tb.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as supplier_name, s.contact_person as supplier_contact
            FROM transport_bookings tb
            LEFT JOIN customers c ON tb.customer_id = c.id
            LEFT JOIN suppliers s ON tb.supplier_id = s.id
            WHERE tb.id = :id
        ", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $conditions[] = "(tb.customer_name LIKE :search OR tb.pickup_location LIKE :search OR tb.dropoff_location LIKE :search OR tb.internal_booking_number LIKE :search OR tb.driver_name LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "tb.booking_status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['service_type'])) {
            $conditions[] = "tb.service_type = :service_type";
            $params['service_type'] = $filters['service_type'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "tb.service_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "tb.service_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT tb.*, c.name as customer_name, c.phone as customer_phone,
                   s.name as supplier_name
            FROM transport_bookings tb
            LEFT JOIN customers c ON tb.customer_id = c.id
            LEFT JOIN suppliers s ON tb.supplier_id = s.id
            WHERE $whereClause
            ORDER BY tb.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function updateStatus($id, $status) {
        $validStatuses = ['pending', 'confirmed', 'driver_assigned', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("حالة الحجز غير صحيحة");
        }
        
        $old = $this->getById($id);
        $res = $this->db->update('transport_bookings', ['booking_status' => $status], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','transport_bookings',$id,$old,['booking_status'=>$status]);
            Logger::activity('booking_status_changed',['booking_id'=>$id,'status'=>$status]);
        }
        return $res;
    }
    
    public function updatePayment($id, $paidAmount) {
        $old = $this->getById($id);
        $res = $this->db->update('transport_bookings', ['paid_amount' => $paidAmount], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','transport_bookings',$id,$old,['paid_amount'=>$paidAmount]);
            Logger::activity('payment_updated',['booking_id'=>$id,'amount'=>$paidAmount]);
        }
        return $res;
    }
    
    public function getStats() {
        $stats = $this->db->selectOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN booking_status = 'driver_assigned' THEN 1 ELSE 0 END) as driver_assigned,
                SUM(CASE WHEN booking_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(total_cost_customer) as total_revenue,
                SUM(total_profit) as total_profit,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent
            FROM transport_bookings
        ");
        
        return $stats;
    }
    
    public function markInvoiceSent($id) {
        return $this->db->update('transport_bookings', [
            'invoice_sent' => 1,
            'invoice_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markVoucherSent($id) {
        return $this->db->update('transport_bookings', [
            'voucher_sent' => 1,
            'voucher_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }

    /**
     * Create an invoice for this transport booking
     */
    public function createInvoice($id) {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception('Booking not found');
        }
        require_once __DIR__ . '/services/InvoiceService.php';
        $svc = new InvoiceService();
        $invoiceData = [
            'booking_id' => $id,
            'booking_type' => 'transport',
            'customer_id' => $booking['customer_id'],
            'customer_name' => $booking['customer_name'],
            'subtotal' => $booking['total_cost_customer'],
            'vat_rate' => 0,
            'discount_amount' => 0,
            'final_amount' => $booking['total_cost_customer'],
            'status' => 'draft',
            'issued_date' => date('Y-m-d')
        ];
        return $svc->create($invoiceData);
    }
}
?>