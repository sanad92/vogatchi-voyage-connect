<?php
/**
 * Flight Booking Management Class
 * Tourism Management System
 */

class FlightBooking {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['customer_id', 'customer_name', 'departure_airport', 'arrival_airport', 'departure_date', 'ticket_price_per_person', 'number_of_passengers'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        if (class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::requireFeature('bookings');
        }

        // Validate dates
        if (!empty($data['return_date']) && strtotime($data['return_date']) <= strtotime($data['departure_date'])) {
            throw new Exception("تاريخ العودة يجب أن يكون بعد تاريخ المغادرة");
        }
        
        $bookingData = [
            'id' => $this->db->generateUUID(),
            'customer_id' => $data['customer_id'],
            'customer_name' => $data['customer_name'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'supplier_name' => $data['supplier_name'] ?? '',
            'departure_airport' => $data['departure_airport'],
            'arrival_airport' => $data['arrival_airport'],
            'departure_date' => $data['departure_date'],
            'departure_time' => $data['departure_time'] ?? null,
            'arrival_date' => $data['arrival_date'] ?? null,
            'arrival_time' => $data['arrival_time'] ?? null,
            'return_date' => $data['return_date'] ?? null,
            'return_time' => $data['return_time'] ?? null,
            'trip_type' => $data['trip_type'] ?? 'one_way',
            'number_of_passengers' => $data['number_of_passengers'],
            'airline_name' => $data['airline_name'] ?? '',
            'flight_number' => $data['flight_number'] ?? '',
            'ticket_price_per_person' => $data['ticket_price_per_person'],
            'taxes_and_fees' => $data['taxes_and_fees'] ?? 0,
            'total_cost' => ($data['ticket_price_per_person'] * $data['number_of_passengers']) + ($data['taxes_and_fees'] ?? 0),
            'supplier_cost' => $data['supplier_cost'] ?? 0,
            'currency' => $data['currency'] ?? 'EGP',
            'booking_reference_supplier' => $data['booking_reference_supplier'] ?? null,
            'booking_agent_id' => $data['booking_agent_id'] ?? null,
            'booking_agent_name' => $data['booking_agent_name'] ?? '',
            'booking_status' => 'pending'
        ];
        
        // Calculate profit
        $bookingData['total_profit'] = $bookingData['total_cost'] - $bookingData['supplier_cost'];
        
        $res = $this->db->insert('flight_bookings', $bookingData);
        if ($res) {
            if (class_exists('Logger')) {
                Logger::audit('INSERT','flight_bookings',$bookingData['id'],null,$bookingData);
                Logger::activity('booking_created',['booking_id'=>$bookingData['id'],'type'=>'flight']);
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
            'departure_airport', 'arrival_airport', 'departure_date', 'departure_time',
            'arrival_date', 'arrival_time', 'return_date', 'return_time', 'trip_type',
            'number_of_passengers', 'airline_name', 'flight_number', 'ticket_price_per_person',
            'taxes_and_fees', 'supplier_cost', 'currency', 'booking_reference_supplier',
            'booking_status'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Recalculate totals if price or passenger count changed
        if (isset($data['ticket_price_per_person']) || isset($data['number_of_passengers']) || isset($data['taxes_and_fees'])) {
            $price = $data['ticket_price_per_person'] ?? $booking['ticket_price_per_person'];
            $passengers = $data['number_of_passengers'] ?? $booking['number_of_passengers'];
            $fees = $data['taxes_and_fees'] ?? $booking['taxes_and_fees'];
            $supplierCost = $data['supplier_cost'] ?? $booking['supplier_cost'];
            
            $updateData['total_cost'] = ($price * $passengers) + $fees;
            $updateData['total_profit'] = $updateData['total_cost'] - $supplierCost;
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        $old = $this->getById($id);
        $res = $this->db->update('flight_bookings', $updateData, 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','flight_bookings',$id,$old,$updateData);
            Logger::activity('booking_updated',['booking_id'=>$id,'changes'=>$updateData]);
        }
        return $res;
    }
    
    public function getById($id) {
        return $this->db->selectOne("
            SELECT fb.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as supplier_name, s.contact_person as supplier_contact
            FROM flight_bookings fb
            LEFT JOIN customers c ON fb.customer_id = c.id
            LEFT JOIN suppliers s ON fb.supplier_id = s.id
            WHERE fb.id = :id
        ", ['id' => $id]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $conditions[] = "(fb.customer_name LIKE :search OR fb.departure_airport LIKE :search OR fb.arrival_airport LIKE :search OR fb.internal_booking_number LIKE :search OR fb.flight_number LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "fb.booking_status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "fb.departure_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "fb.departure_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        if (!empty($filters['trip_type'])) {
            $conditions[] = "fb.trip_type = :trip_type";
            $params['trip_type'] = $filters['trip_type'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT fb.*, c.name as customer_name, c.phone as customer_phone,
                   s.name as supplier_name
            FROM flight_bookings fb
            LEFT JOIN customers c ON fb.customer_id = c.id
            LEFT JOIN suppliers s ON fb.supplier_id = s.id
            WHERE $whereClause
            ORDER BY fb.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function updateStatus($id, $status) {
        $validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("حالة الحجز غير صحيحة");
        }
        
        $old = $this->getById($id);
        $res = $this->db->update('flight_bookings', ['booking_status' => $status], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','flight_bookings',$id,$old,['booking_status'=>$status]);
            Logger::activity('booking_status_changed',['booking_id'=>$id,'status'=>$status]);
        }
        return $res;
    }
    
    public function updatePayment($id, $paidAmount) {
        $old = $this->getById($id);
        $res = $this->db->update('flight_bookings', ['paid_amount' => $paidAmount], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE','flight_bookings',$id,$old,['paid_amount'=>$paidAmount]);
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
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(total_cost) as total_revenue,
                SUM(total_profit) as total_profit,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent
            FROM flight_bookings
        ");
        
        return $stats;
    }
    
    public function markInvoiceSent($id) {
        return $this->db->update('flight_bookings', [
            'invoice_sent' => 1,
            'invoice_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markVoucherSent($id) {
        return $this->db->update('flight_bookings', [
            'voucher_sent' => 1,
            'voucher_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markSupplierPaymentSent($id) {
        return $this->db->update('flight_bookings', [
            'supplier_payment_sent' => 1,
            'supplier_payment_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }

    /**
     * Create an invoice record for this flight booking
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
            'booking_type' => 'flight',
            'customer_id' => $booking['customer_id'],
            'customer_name' => $booking['customer_name'],
            'subtotal' => $booking['total_cost'],
            'vat_rate' => 0,
            'discount_amount' => 0,
            'final_amount' => $booking['total_cost'],
            'status' => 'draft',
            'issued_date' => date('Y-m-d')
        ];
        return $svc->create($invoiceData);
    }
}
?>