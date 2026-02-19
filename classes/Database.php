<?php
/**
 * Database Connection Class
 * Tourism Management System
 */

class Database {
    private static $instance = null;
    private $connection;
    private $host = DB_HOST;
    private $database = DB_NAME;
    private $username = DB_USER;
    private $password = DB_PASS;
    private $charset = DB_CHARSET;

    private function __construct() {
        $dsn = "mysql:host=$this->host;dbname=$this->database;charset=$this->charset";
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => true,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new PDOException("خطأ في الاتصال بقاعدة البيانات");
        }
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                throw new PDOException("Query failed: " . $e->getMessage() . " SQL: " . $sql);
            } else {
                error_log("Query failed: " . $e->getMessage() . " SQL: " . $sql);
                return false;
            }
        }
    }

    public function select($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetchAll() : [];
    }

    public function selectOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetch() : null;
    }

    public function insert($table, $data) {
        $fields = implode(',', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO $table ($fields) VALUES ($placeholders)";
        $stmt = $this->query($sql, $data);
        
        return $stmt ? $this->connection->lastInsertId() : false;
    }

    public function update($table, $data, $where, $whereParams = []) {
        $fields = [];
        foreach ($data as $key => $value) {
            $fields[] = "$key = :$key";
        }
        $fieldsString = implode(', ', $fields);
        
        $sql = "UPDATE $table SET $fieldsString WHERE $where";
        return $this->query($sql, array_merge($data, $whereParams));
    }

    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM $table WHERE $where";
        return $this->query($sql, $params);
    }

    public function count($table, $where = '1=1', $params = []) {
        $sql = "SELECT COUNT(*) as total FROM $table WHERE $where";
        $result = $this->selectOne($sql, $params);
        return $result ? (int)$result['total'] : 0;
    }

    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }

    public function commit() {
        return $this->connection->commit();
    }

    public function rollback() {
        return $this->connection->rollback();
    }

    public function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    public function escape($string) {
        return $this->connection->quote($string);
    }

    // Pagination helper
    public function paginate($sql, $params = [], $page = 1, $perPage = ITEMS_PER_PAGE) {
        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM ($sql) as count_query";
        $total = $this->selectOne($countSql, $params)['total'];
        
        // Calculate pagination
        $totalPages = ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;
        
        // Add LIMIT and OFFSET to original query
        $paginatedSql = $sql . " LIMIT $perPage OFFSET $offset";
        $data = $this->select($paginatedSql, $params);
        
        return [
            'data' => $data,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'total_pages' => $totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ];
    }

    // Search helper
    public function buildSearchWhere($fields, $searchTerm) {
        if (empty($searchTerm) || empty($fields)) {
            return ['where' => '1=1', 'params' => []];
        }
        
        $conditions = [];
        $params = [];
        
        foreach ($fields as $field) {
            $conditions[] = "$field LIKE :search_$field";
            $params["search_$field"] = "%$searchTerm%";
        }
        
        return [
            'where' => '(' . implode(' OR ', $conditions) . ')',
            'params' => $params
        ];
    }
}
?>