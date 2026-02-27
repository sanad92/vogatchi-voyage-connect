<?php

require_once __DIR__ . '/BaseRepository.php';

/**
 * OptimizedCustomerRepository - Performance-optimized customer operations
 * 
 * Fixes N+1 problems, adds caching, batch operations, and lazy loading
 */
class OptimizedCustomerRepository extends BaseRepository
{
    protected $table = 'customers';
    private $cache;
    private $query_optimizer;
    const CACHE_TTL = 300; // 5 minutes

    public function __construct()
    {
        parent::__construct();
        $this->cache = CacheManager::getInstance();
        $this->query_optimizer = new QueryOptimizer($this->db);
    }

    /**
     * Get customer by ID with caching
     */
    public function getById($id, $use_cache = true)
    {
        $cache_key = "customer_{$id}";

        if ($use_cache) {
            return $this->cache->get($cache_key, function() use ($id) {
                return $this->selectOne("SELECT id, name, email, phone, segment_id, customer_segment FROM {$this->table} WHERE id = :id", ['id' => $id]);
            }, self::CACHE_TTL);
        }

        return $this->selectOne("SELECT id, name, email, phone, segment_id FROM {$this->table} WHERE id = :id", ['id' => $id]);
    }

    /**
     * Get customer with eager-loaded bookings count (optimized)
     * FIXED: Instead of subqueries per row, use batch approach
     */
    public function getByIdWithBookingsCount($id)
    {
        // Get customer (minimal columns)
        $customer = $this->getById($id);
        if (!$customer) {
            return null;
        }

        // Batch load all booking counts for this customer
        $booking_counts = $this->batchGetBookingCounts([$id]);
        $customer['total_bookings'] = $booking_counts[$id] ?? 0;

        return $customer;
    }

    /**
     * Get all customers with pagination (optimized)
     * FIXED: No more subqueries per row
     */
    public function getAll($page = 1, $per_page = 20, $search = '', $segment = '')
    {
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

        $where_clause = implode(' AND ', $conditions);
        
        // Optimized: No subqueries, just basic data
        $query = "SELECT id, name, email, phone, customer_segment, created_at
                  FROM {$this->table} 
                  WHERE $where_clause 
                  ORDER BY created_at DESC";

        $paginated = $this->query_optimizer->paginate($query, $params, $page, $per_page);

        // Batch load booking counts for all customers on this page (ONE query instead of N)
        if (!empty($paginated['data'])) {
            $customer_ids = array_column($paginated['data'], 'id');
            $booking_counts = $this->batchGetBookingCounts($customer_ids);

            foreach ($paginated['data'] as &$customer) {
                $customer['total_bookings'] = $booking_counts[$customer['id']] ?? 0;
            }
        }

        return $paginated;
    }

    /**
     * Batch get booking counts (ONE query instead of N)
     * FIXED: This replaces the N subqueries problem
     */
    private function batchGetBookingCounts($customer_ids)
    {
        if (empty($customer_ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($customer_ids), '?'));

        // Single query with UNION to count all booking types at once
        $query = "
            SELECT customer_id, COUNT(*) as count FROM (
                SELECT DISTINCT customer_id FROM hotel_bookings WHERE customer_id IN ($placeholders)
                UNION ALL
                SELECT DISTINCT customer_id FROM flight_bookings WHERE customer_id IN ($placeholders)
                UNION ALL
                SELECT DISTINCT customer_id FROM car_rentals WHERE customer_id IN ($placeholders)
                UNION ALL
                SELECT DISTINCT customer_id FROM transport_bookings WHERE customer_id IN ($placeholders)
            ) as all_bookings
            GROUP BY customer_id
        ";

        $params = array_merge($customer_ids, $customer_ids, $customer_ids, $customer_ids);
        $results = $this->db->query($query, $params) ?: [];

        $counts = [];
        foreach ($results as $row) {
            $counts[$row['customer_id']] = $row['count'];
        }

        return $counts;
    }

    /**
     * Get bookings for customer (separate method to enable lazy loading)
     */
    public function getCustomerBookings($customer_id, $limit = 50)
    {
        $query = "
            SELECT 'hotel' as type, id, hotel_name as name, check_in_date as date, booking_status as status
            FROM hotel_bookings 
            WHERE customer_id = :id
            UNION ALL
            SELECT 'flight', id, airline as name, departure_date as date, booking_status
            FROM flight_bookings 
            WHERE customer_id = :id
            UNION ALL
            SELECT 'transport', id, pickup_location as name, pickup_date as date, booking_status
            FROM transport_bookings 
            WHERE customer_id = :id
            ORDER BY date DESC
            LIMIT :limit
        ";

        return $this->db->query($query, ['id' => $customer_id, 'limit' => $limit]) ?: [];
    }

    /**
     * Batch insert customers (optimized)
     */
    public function batchCreate($customers)
    {
        return $this->query_optimizer->batchInsert($this->table, $customers, 100);
    }

    /**
     * Batch update customers (optimized)
     */
    public function batchUpdate($customers)
    {
        return $this->query_optimizer->batchUpdate($this->table, 'id', $customers);
    }

    /**
     * Get customers by segment (with caching)
     */
    public function getBySegment($segment, $limit = 1000)
    {
        $cache_key = "customers_segment_{$segment}";

        return $this->cache->get($cache_key, function() use ($segment, $limit) {
            return $this->db->query(
                "SELECT id, name, email, customer_segment FROM {$this->table} 
                 WHERE customer_segment = :segment AND is_active = 1 
                 LIMIT :limit",
                ['segment' => $segment, 'limit' => $limit]
            ) ?: [];
        }, self::CACHE_TTL);
    }

    /**
     * Search customers (cached)
     */
    public function search($search_term, $limit = 50)
    {
        if (strlen($search_term) < 2) {
            return [];
        }

        $cache_key = "customer_search_" . md5($search_term);

        return $this->cache->get($cache_key, function() use ($search_term, $limit) {
            return $this->db->query(
                "SELECT id, name, email, phone FROM {$this->table} 
                 WHERE is_active = 1 AND (name LIKE :search OR email LIKE :search OR phone LIKE :search)
                 LIMIT :limit",
                ['search' => "%{$search_term}%", 'limit' => $limit]
            ) ?: [];
        }, 600); // 10 min cache
    }

    /**
     * Count total active customers (cached)
     */
    public function countActive()
    {
        return $this->cache->get('customer_count_active', function() {
            $result = $this->selectOne("SELECT COUNT(*) as count FROM {$this->table} WHERE is_active = 1", []);
            return $result['count'] ?? 0;
        }, self::CACHE_TTL);
    }

    /**
     * Invalidate customer cache (call after update/delete)
     */
    public function invalidateCache($customer_id = null)
    {
        if ($customer_id) {
            $this->cache->delete("customer_{$customer_id}");
        } else {
            // Invalidate all customer-related caches
            $this->cache->deletePattern('customer_*');
        }

        // Always invalidate count cache
        $this->cache->delete('customer_count_active');
    }

    /**
     * Soft delete customer (optimized)
     */
    public function softDelete($id)
    {
        $result = $this->update($this->table, ['is_active' => 0], 'id = :id', ['id' => $id]);
        $this->invalidateCache($id);
        return $result;
    }

    /**
     * Update customer (optimized)
     */
    public function updateById($id, $data)
    {
        $result = $this->update($this->table, $data, 'id = :id', ['id' => $id]);
        $this->invalidateCache($id);
        return $result;
    }

    /**
     * Get summary statistics (cached)
     */
    public function getSummaryStats()
    {
        return $this->cache->get('customer_summary_stats', function() {
            $stats = $this->selectOne("
                SELECT 
                    COUNT(*) as total_active,
                    COUNT(DISTINCT customer_segment) as segments,
                    MAX(created_at) as last_customer_added
                FROM {$this->table}
                WHERE is_active = 1
            ", []);

            return $stats ?? [];
        }, self::CACHE_TTL);
    }
}
