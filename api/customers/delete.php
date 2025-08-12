<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  require_auth();

  $id = trim($_GET['id'] ?? '');
  if ($id === '' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $in = $raw ? json_decode($raw, true) : [];
    $id = trim($in['id'] ?? '');
  }
  if ($id === '') { json_response(['error' => 'المعرف مطلوب'], 400); }

  $pdo = get_pdo();
  $stmt = $pdo->prepare('DELETE FROM customers WHERE id = :id');
  $stmt->execute([':id' => $id]);

  json_response(['success' => true]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
