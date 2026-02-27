<?php

/**
 * QueryOptimizer - Query optimization utilities
 * 
 * Provides:
 * - Automatic pagination
 * - Batch/bulk operations
 * - Lazy loading patterns
 * - Query analysis
 * - Slow query detection
 */
class QueryOptimizer
{
    private $db;
    private $slow_query_threshold_ms = 100; // Flag queries taking >100ms
    private $query_log = [];

    public function __construct($db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Get paginated results
     * 
     * @param string $query SQL query with :limit and :offset placeholders
     * @param array $params Query parameters
     * @param int $page Starting from 1
     * @param int $per_page
     * @return array ['data' => [...], 'total' => N, 'page' => 1, 'per_page' => 20, 'pages' => 5]
     */
    public function paginate($query, $params = [], $page = 1, $per_page = 20)
    {
        if ($page < 1) $page = 1;
        if ($per_page < 1) $per_page = 20;
        if ($per_page > 200) $per_page = 200; // Safety limit

        // Get total count
        $count_query = $this->buildCountQuery($query);
        $total = $this->db->query($count_query, $params)[0]['total'] ?? 0;

        // Calculate pagination
        $offset = ($page - 1) * $per_page;
        $pages = ceil($total / $per_page);

        // Add limit/offset to query
        $params['limit'] = $per_page;
        $params['offset'] = $offset;
        $paginated_query = $query . "\nLIMIT :limit OFFSET :offset";

        // Execute query
        $data = $this->db->query($paginated_query, $params) ?: [];

        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'pages' => $pages,
            'has_next' => $page < $pages,
            'has_prev' => $page > 1,
            'offset' => $offset
        ];
    }

    /**
     * Batch query - Execute multiple queries efficiently
     * Useful for N+1 problem: instead of selecting 100 customers then 100 queries for bookings,
     * select all customer_ids once, then fetch all bookings for those IDs
     * 
     * Example:
     * $batcher = new QueryOptimizer($db);
     * $customer_ids = ['cust1', 'cust2', ...];
     * $bookings = $batcher->batchGet('bookings', 'customer_id', $customer_ids);
     * // Returns: ['cust1' => [...], 'cust2' => [...]]
     */
    public function batchGet($table, $key_column, $values, $select = '*')
    {
        if (empty($values)) {
            return [];
        }

        // Remove duplicates
        $values = array_unique($values);

        // Build placeholders
        $placeholders = implode(',', array_fill(0, count($values), '?'));

        $query = "SELECT $select FROM $table WHERE $key_column IN ($placeholders)";
        $results = $this->db->query($query, $values) ?: [];

        // Group by key_column
        $grouped = [];
        foreach ($results as $row) {
            $key = $row[$key_column];
            if (!isset($grouped[$key])) {
                $grouped[$key] = [];
            }
            $grouped[$key][] = $row;
        }

        return $grouped;
    }

    /**
     * Batch insert - Insert multiple rows efficiently
     * 
     * Example:
     * $batcher = new QueryOptimizer($db);
     * $rows = [
     *     ['name' => 'John', 'email' => 'john@example.com'],
     *     ['name' => 'Jane', 'email' => 'jane@example.com']
     * ];
     * $result = $batcher->batchInsert('users', $rows, 100); // Insert in chunks of 100
     */
    public function batchInsert($table, $rows, $batch_size = 100)
    {
        if (empty($rows)) {
            return ['successful' => 0, 'failed' => 0];
        }

        $successful = 0;
        $failed = 0;

        // Process in batches
        $batches = array_chunk($rows, $batch_size);

        foreach ($batches as $batch) {
            try {
                // Build multi-row insert
                $columns = array_keys($batch[0]);
                $placeholders = [];
                $values = [];

                foreach ($batch as $row) {
                    $row_placeholders = [];
                    foreach ($columns as $col) {
                        $row_placeholders[] = '?';
                        $values[] = $row[$col] ?? null;
                    }
                    $placeholders[] = '(' . implode(',', $row_placeholders) . ')';
                }

                $query = "INSERT INTO $table (" . implode(',', $columns) . ") VALUES " . implode(',', $placeholders);
                $this->db->execute($query, $values);
                $successful += count($batch);

            } catch (Exception $e) {
                error_log("BatchInsert failed for batch: " . $e->getMessage());
                $failed += count($batch);
            }
        }

        return ['successful' => $successful, 'failed' => $failed];
    }

    /**
     * Batch update - Update multiple rows efficiently
     * 
     * Example:
     * $batcher = new QueryOptimizer($db);
     * $updates = [
     *     ['id' => 'user1', 'name' => 'John Updated'],
     *     ['id' => 'user2', 'name' => 'Jane Updated']
     * ];
     * $result = $batcher->batchUpdate('users', 'id', $updates);
     */
    public function batchUpdate($table, $id_column, $rows)
    {
        if (empty($rows)) {
            return ['successful' => 0, 'failed' => 0];
        }

        $successful = 0;
        $failed = 0;

        foreach ($rows as $row) {
            try {
                $id = $row[$id_column];
                $update_data = array_diff_key($row, [$id_column => null]);

                $this->db->update($table, $update_data, "$id_column = :id", ['id' => $id]);
                $successful++;

            } catch (Exception $e) {
                error_log("BatchUpdate failed for row: " . $e->getMessage());
                $failed++;
            }
        }

        return ['successful' => $successful, 'failed' => $failed];
    }

    /**
     * Lazy load related data
     * 
     * Instead of eager loading all relations (which wastes memory),
     * defer loading until data is accessed
     * 
     * Example:
     * $customer = $db->selectOne("SELECT id, name FROM customers WHERE id = ?", ['cust1']);
     * $lazy_customer = new LazyLoader($customer, 'customers', 'id', ['bookings', 'invoices']);
     * $bookings = $lazy_customer->bookings; // Loaded on access
     */
    public function createLazyLoader($data, $primary_table, $primary_key, $relations = [])
    {
        return new LazyLoader($this->db, $data, $primary_table, $primary_key, $relations);
    }

    /**
     * Analyze query performance
     * Returns execution time and query plan
     */
    public function analyzeQuery($query, $params = [])
    {
        $start = microtime(true);
        $result = $this->db->query($query, $params);
        $duration_ms = round((microtime(true) - $start) * 1000, 2);

        // Get query plan
        $explain = $this->db->query("EXPLAIN " . $query, $params);

        $analysis = [
            'duration_ms' => $duration_ms,
            'is_slow' => $duration_ms > $this->slow_query_threshold_ms,
            'rows_examined' => 0,
            'rows_returned' => is_array($result) ? count($result) : 0,
            'query_plan' => $explain,
            'recommendation' => $this->getOptimizationTip($explain, $duration_ms)
        ];

        // Log slow queries
        if ($analysis['is_slow']) {
            error_log("SLOW QUERY ({$duration_ms}ms): " . substr($query, 0, 100));
        }

        return $analysis;
    }

    /**
     * Get all queries executed in this session
     * Useful for identifying performance bottlenecks
     */
    public function getQueryLog()
    {
        return $this->query_log;
    }

    /**
     * Clear query log
     */
    public function clearQueryLog()
    {
        $this->query_log = [];
    }

    /**
     * Enable query logging
     * Call this to start tracking queries
     */
    public function enableQueryProfiling($threshold_ms = 100)
    {
        $this->slow_query_threshold_ms = $threshold_ms;
        // This would hook into database connection to track all queries
        // Implementation depends on your database driver
    }

    /**
     * Find N+1 query problems
     * Detects when same query is executed multiple times in a row
     */
    public function detectNPlusOne($queries)
    {
        $issues = [];
        $query_counts = [];

        foreach ($queries as $query) {
            $normalized = $this->normalizeQuery($query);
            $query_counts[$normalized] = ($query_counts[$normalized] ?? 0) + 1;
        }

        foreach ($query_counts as $query => $count) {
            if ($count > 5) { // More than 5 similar queries = likely N+1
                $issues[] = [
                    'query' => $query,
                    'count' => $count,
                    'recommendation' => 'Use batch query or join instead'
                ];
            }
        }

        return $issues;
    }

    // ========== PRIVATE HELPERS ==========

    private function buildCountQuery($query)
    {
        // Simple COUNT(*) wrapper - works for most queries
        // For complex queries, may need custom logic
        
        // Remove ORDER BY and LIMIT for count
        $query = preg_replace('/ORDER BY .+$/i', '', $query);
        $query = preg_replace('/LIMIT .+$/i', '', $query);
        
        return "SELECT COUNT(*) as total FROM ($query) as count_table";
    }

    private function getOptimizationTip($explain, $duration_ms)
    {
        if (empty($explain)) {
            return 'Slow query - check query plan';
        }

        $first = $explain[0] ?? [];

        // Check for full table scans
        if ($first['type'] === 'ALL') {
            return 'Full table scan detected - consider adding index on WHERE clause columns';
        }

        // Check for use of filesort
        if ($first['Extra'] && strpos($first['Extra'], 'filesort') !== false) {
            return 'Filesort detected - add index on ORDER BY columns';
        }

        if ($duration_ms > 500) {
            return 'Very slow query - review query logic and indexes';
        }

        if ($duration_ms > 100) {
            return 'Slow query - monitor performance';
        }

        return null;
    }

    private function normalizeQuery($query)
    {
        // Remove specific values for pattern matching
        $normalized = preg_replace('/WHERE .+$/i', 'WHERE ...', $query);
        $normalized = preg_replace('/VALUES .+$/i', 'VALUES ...', $normalized);
        return trim($normalized);
    }
}

/**
 * LazyLoader - Defer loading relations until accessed
 */
class LazyLoader
{
    private $data;
    private $db;
    private $table;
    private $primary_key;
    private $relations;
    private $loaded = [];

    public function __construct($db, $data, $table, $primary_key, $relations = [])
    {
        $this->db = $db;
        $this->data = $data;
        $this->table = $table;
        $this->primary_key = $primary_key;
        $this->relations = $relations;
    }

    /**
     * Magic getter - lazy load on access
     */
    public function __get($property)
    {
        // Direct properties
        if (isset($this->data[$property])) {
            return $this->data[$property];
        }

        // Relations
        if (in_array($property, $this->relations) && !isset($this->loaded[$property])) {
            $this->loadRelation($property);
        }

        return $this->loaded[$property] ?? null;
    }

    private function loadRelation($relation)
    {
        $id = $this->data[$this->primary_key];

        // Map common relation names to queries
        $relation_queries = [
            'bookings' => "SELECT * FROM bookings WHERE customer_id = ? UNION ALL 
                          SELECT * FROM hotel_bookings WHERE customer_id = ? UNION ALL
                          SELECT * FROM flight_bookings WHERE customer_id = ?",
            'invoices' => "SELECT * FROM invoices WHERE customer_id = ?",
            'addresses' => "SELECT * FROM customer_addresses WHERE customer_id = ?",
            'contacts' => "SELECT * FROM customer_contacts WHERE customer_id = ?"
        ];

        if (isset($relation_queries[$relation])) {
            $query = $relation_queries[$relation];
            $this->loaded[$relation] = $this->db->query($query, [$id, $id, $id]) ?: [];
        }
    }
}
