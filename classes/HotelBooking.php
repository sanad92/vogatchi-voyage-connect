<?php
/**
 * Hotel Booking Management Class
 * Tourism Management System
 */

require_once __DIR__ . '/TenantMiddleware.php';

class HotelBooking {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function create($data) {
        $requiredFields = ['customer_id', 'customer_name', 'hotel_name', 'destination_city', 'check_in_date', 'check_out_date', 'cost_per_night', 'selling_price_per_night'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // subscription enforcement
        if (class_exists('SubscriptionMiddleware')) {
            SubscriptionMiddleware::requireFeature('bookings');
        }

        // Validate dates
        if (strtotime($data['check_in_date']) >= strtotime($data['check_out_date'])) {
            throw new Exception("تاريخ الخروج يجب أن يكون بعد تاريخ الدخول");
        }
        
        $bookingData = [
            'id' => $this->db->generateUUID(),
            'customer_id' => $data['customer_id'],
            'customer_name' => $data['customer_name'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'supplier_name' => $data['supplier_name'] ?? '',
            'hotel_name' => $data['hotel_name'],
            'destination_city' => $data['destination_city'],
            'room_type' => $data['room_type'] ?? '',
            'check_in_date' => $data['check_in_date'],
            'check_out_date' => $data['check_out_date'],
            'number_of_adults' => $data['number_of_adults'] ?? 1,
            'number_of_children' => $data['number_of_children'] ?? 0,
            'children_ages' => $data['children_ages'] ?? null,
            'meal_plan' => $data['meal_plan'] ?? 'breakfast',
            'cost_per_night' => $data['cost_per_night'],
            'selling_price_per_night' => $data['selling_price_per_night'],
            'currency' => $data['currency'] ?? 'EGP',
            'booking_reference_supplier' => $data['booking_reference_supplier'] ?? null,
            'cancellation_policy' => $data['cancellation_policy'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'booking_agent_id' => $data['booking_agent_id'] ?? null,
            'booking_agent_name' => $data['booking_agent_name'] ?? '',
            'hotel_star_rating' => $data['hotel_star_rating'] ?? null,
            'booking_status' => 'pending'
        ];
        
        $res = $this->db->insert('hotel_bookings', $bookingData);
        if ($res) {
            if (class_exists('Logger')) {
                Logger::audit('INSERT', 'hotel_bookings', $bookingData['id'], null, $bookingData);
                Logger::activity('booking_created', ['booking_id' => $bookingData['id'], 'type' => 'hotel']);
            }
            if (class_exists('SubscriptionMiddleware')) {
                SubscriptionMiddleware::recordUsage('bookings');
            }
            if (class_exists('UsageTracker')) {
                $tracker = new UsageTracker($this->db);
                $tracker->trackBookingCreated();
            }
        }
        return $res;
    }
    
    public function update($id, $data) {
        $booking = $this->getById($id);
        if (!$booking) {
            throw new Exception("الحجز غير موجود");
        }
        
        $allowedFields = [
            'hotel_name', 'destination_city', 'room_type', 'check_in_date', 'check_out_date',
            'number_of_adults', 'number_of_children', 'children_ages', 'meal_plan',
            'cost_per_night', 'selling_price_per_night', 'currency', 'booking_reference_supplier',
            'cancellation_policy', 'payment_method', 'booking_status', 'hotel_star_rating'
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
        
        $old = $this->getById($id);
        $res = $this->db->update('hotel_bookings', $updateData, 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE', 'hotel_bookings', $id, $old, $updateData);
            Logger::activity('booking_updated', ['booking_id' => $id, 'changes' => $updateData]);
        }
        return $res;
    }
    
    public function getById($id) {
        // P1 fix: enforce tenant scope on booking reads.
        $orgId = TenantMiddleware::requireTenant();
        return $this->db->selectOne("
            SELECT hb.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as supplier_name, s.contact_person as supplier_contact
            FROM hotel_bookings hb
            LEFT JOIN customers c ON hb.customer_id = c.id
            LEFT JOIN suppliers s ON hb.supplier_id = s.id
            WHERE hb.id = :id AND hb.organization_id = :org
        ", ['id' => $id, 'org' => $orgId]);
    }
    
    public function getAll($page = 1, $perPage = 20, $filters = []) {
        // P1 fix: enforce tenant scope on booking lists.
        $orgId = TenantMiddleware::requireTenant();
        $conditions = ['1=1'];
        $params = [];
        $conditions[] = 'hb.organization_id = :org';
        $params['org'] = $orgId;
        
        if (!empty($filters['search'])) {
            $conditions[] = "(hb.customer_name LIKE :search OR hb.hotel_name LIKE :search OR hb.destination_city LIKE :search OR hb.internal_booking_number LIKE :search)";
            $params['search'] = "%{$filters['search']}%";
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = "hb.booking_status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = "hb.check_in_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = "hb.check_in_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $sql = "
            SELECT hb.*, c.name as customer_name, c.phone as customer_phone,
                   s.name as supplier_name
            FROM hotel_bookings hb
            LEFT JOIN customers c ON hb.customer_id = c.id
            LEFT JOIN suppliers s ON hb.supplier_id = s.id
            WHERE $whereClause
            ORDER BY hb.created_at DESC
        ";
        
        return $this->db->paginate($sql, $params, $page, $perPage);
    }
    
    public function updateStatus($id, $status) {
        $validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception("حالة الحجز غير صحيحة");
        }
        
        $old = $this->getById($id);
        $res = $this->db->update('hotel_bookings', ['booking_status' => $status], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE', 'hotel_bookings', $id, $old, ['booking_status'=>$status]);
            Logger::activity('booking_status_changed', ['booking_id'=>$id, 'status'=>$status]);
        }
        return $res;
    }
    
    public function updatePayment($id, $paidAmount) {
        $old = $this->getById($id);
        $res = $this->db->update('hotel_bookings', ['paid_amount' => $paidAmount], 'id = :id', ['id' => $id]);
        if ($res && class_exists('Logger')) {
            Logger::audit('UPDATE', 'hotel_bookings', $id, $old, ['paid_amount'=>$paidAmount]);
            Logger::activity('payment_updated', ['booking_id'=>$id, 'amount'=>$paidAmount]);
        }
        return $res;
    }
    
    public function getStats() {
        // P1 fix: enforce tenant scope on aggregate dashboard stats.
        $orgId = TenantMiddleware::requireTenant();
        $stats = $this->db->selectOne("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(total_cost_customer) as total_revenue,
                SUM(total_profit) as total_profit,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent
            FROM hotel_bookings
            WHERE organization_id = :org
        ", ['org' => $orgId]);
        
        return $stats;
    }
    
    public function markInvoiceSent($id) {
        return $this->db->update('hotel_bookings', [
            'invoice_sent' => 1,
            'invoice_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markVoucherSent($id) {
        return $this->db->update('hotel_bookings', [
            'voucher_sent' => 1,
            'voucher_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }
    
    public function markSupplierPaymentSent($id) {
        return $this->db->update('hotel_bookings', [
            'supplier_payment_sent' => 1,
            'supplier_payment_sent_date' => date('Y-m-d H:i:s')
        ], 'id = :id', ['id' => $id]);
    }

    /**
     * Convenience helper: generate an invoice record based on booking data
     * the resulting InvoiceService call will automatically post accounting entries
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
            'booking_type' => 'hotel',
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