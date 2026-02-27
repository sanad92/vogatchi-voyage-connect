<?php

require_once __DIR__ . '/BaseRepository.php';

/**
 * Repository responsible for low‑level database operations related to customers.
 * Business rules belong in the corresponding service.
 */
class CustomerRepository extends BaseRepository {
    protected $table = 'customers';

    public function __construct() {
        parent::__construct();
    }

    public function create(array $data) {
        $data['id'] = $this->generateId();
        return $this->insert($this->table, $data);
    }

    public function updateById(string $id, array $data) {
        return $this->update($this->table, $data, 'id = :id', ['id' => $id]);
    }

    public function getById(string $id) {
        return $this->selectOne("SELECT * FROM {$this->table} WHERE id = :id", ['id' => $id]);
    }

    public function getAll(int $page = 1, int $perPage = 20, string $search = '', string $segment = '') {
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
                (SELECT COUNT(*) FROM hotel_bookings WHERE customer_id = {$this->table}.id) +
                (SELECT COUNT(*) FROM flight_bookings WHERE customer_id = {$this->table}.id) +
                (SELECT COUNT(*) FROM car_rentals WHERE customer_id = {$this->table}.id) +
                (SELECT COUNT(*) FROM transport_bookings WHERE customer_id = {$this->table}.id) as total_bookings
                FROM {$this->table} 
                WHERE $whereClause 
                ORDER BY created_at DESC";

        return $this->paginate($sql, $params, $page, $perPage);
    }

    public function softDelete(string $id) {
        return $this->update($this->table, ['is_active' => 0], 'id = :id', ['id' => $id]);
    }

    public function countBookings(string $customerId) {
        $result = $this->selectOne(
            "SELECT 
                (SELECT COUNT(*) FROM hotel_bookings WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM flight_bookings WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM car_rentals WHERE customer_id = :id) +
                (SELECT COUNT(*) FROM transport_bookings WHERE customer_id = :id) as total",
            ['id' => $customerId]
        );

        return $result['total'] ?? 0;
    }

    public function getStats() {
        return $this->selectOne("SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN customer_segment = 'new' THEN 1 ELSE 0 END) as new,
            SUM(CASE WHEN customer_segment = 'regular' THEN 1 ELSE 0 END) as regular,
            SUM(CASE WHEN customer_segment = 'vip' THEN 1 ELSE 0 END) as vip,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent
            FROM {$this->table} WHERE is_active = 1");
    }

    public function updateLoyaltyPoints(string $customerId, int $points) {
        $sql = "UPDATE {$this->table} SET loyalty_points = loyalty_points + :points WHERE id = :id";
        if ($this->getTenantId()) {
            // tenant filter will be injected automatically by queryWithTenant
            return $this->queryWithTenant($sql, ['points' => $points, 'id' => $customerId]);
        }
        return $this->db->query($sql, ['points' => $points, 'id' => $customerId]);
    }

    /**
     * Return bookings for a specific customer; repository only handles raw retrieval.
     */
    public function getRawBookings(string $customerId) {
        $bookings = [];

        $hotelBookings = $this->select(
            "SELECT id, 'hotel' as type, hotel_name as title, check_in_date as start_date, 
                   check_out_date as end_date, total_cost_customer as amount, booking_status as status,
                   created_at
            FROM hotel_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC",
            ['id' => $customerId]
        );

        $flightBookings = $this->select(
            "SELECT id, 'flight' as type, CONCAT(departure_airport, ' -> ', arrival_airport) as title, 
                   departure_date as start_date, return_date as end_date, total_cost_customer as amount, 
                   booking_status as status, created_at
            FROM flight_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC",
            ['id' => $customerId]
        );

        $carRentals = $this->select(
            "SELECT id, 'car_rental' as type, car_model as title, pickup_date as start_date, 
                   return_date as end_date, total_cost_customer as amount, booking_status as status,
                   created_at
            FROM car_rentals 
            WHERE customer_id = :id 
            ORDER BY created_at DESC",
            ['id' => $customerId]
        );

        $transportBookings = $this->select(
            "SELECT id, 'transport' as type, CONCAT(pickup_location, ' -> ', dropoff_location) as title, 
                   service_date as start_date, service_date as end_date, total_cost_customer as amount, 
                   booking_status as status, created_at
            FROM transport_bookings 
            WHERE customer_id = :id 
            ORDER BY created_at DESC",
            ['id' => $customerId]
        );

        return array_merge($hotelBookings, $flightBookings, $carRentals, $transportBookings);
    }

    public function existsByPhone(string $phone, ?string $excludeId = null) {
        $sql = "SELECT id FROM {$this->table} WHERE phone = :phone";
        $params = ['phone' => $phone];
        if ($excludeId) {
            $sql .= " AND id != :id";
            $params['id'] = $excludeId;
        }
        // selectOne already applies tenant filtering when tenant is set
        $result = $this->selectOne($sql, $params);
        return $result !== null;
    }
}
