<?php
// Common bootstrap for API endpoints
header('Content-Type: application/json; charset=utf-8');
$allowed_origins = [
  'https://vogatchi-voyage-connect.lovable.app',
  'https://id-preview--49aa510d-479d-4612-891c-0963e841fe97.lovable.app',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
} else {
  header('Access-Control-Allow-Origin: https://vogatchi-voyage-connect.lovable.app');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require_once __DIR__ . '/../config/database.php';

function get_pdo(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET;
  $pdo = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function json_response($data, int $status = 200): void {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function require_auth(): array {
  if (!isset($_SESSION) || session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
  }
  if (empty($_SESSION['user_id'])) {
    json_response(['error' => 'UNAUTHORIZED'], 401);
  }
  return [
    'id' => $_SESSION['user_id'],
    'email' => $_SESSION['email'] ?? null,
    'full_name' => $_SESSION['full_name'] ?? null,
    'role' => $_SESSION['role'] ?? null,
  ];
}

function uuid(): string {
  $stmt = get_pdo()->query('SELECT UUID() as id');
  $row = $stmt->fetch();
  return $row['id'] ?? bin2hex(random_bytes(16));
}
