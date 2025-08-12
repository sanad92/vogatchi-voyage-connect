<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  require_auth();
  $pdo = get_pdo();

  $page = max(1, (int)($_GET['page'] ?? 1));
  $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
  $offset = ($page - 1) * $limit;
  $search = trim($_GET['search'] ?? '');

  $where = '';
  $params = [];
  if ($search !== '') {
    $where = 'WHERE name LIKE :q OR phone LIKE :q OR email LIKE :q';
    $params[':q'] = "%$search%";
  }

  $countStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM customers $where");
  $countStmt->execute($params);
  $total = (int)$countStmt->fetch()['cnt'];

  $stmt = $pdo->prepare("SELECT id, name, phone, email, segment_id, total_spent, last_booking_date, created_at, updated_at FROM customers $where ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
  foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
  $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
  $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $stmt->execute();
  $rows = $stmt->fetchAll();

  json_response(['data' => $rows, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
