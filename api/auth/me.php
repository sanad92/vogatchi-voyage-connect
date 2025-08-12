<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  $user = require_auth();

  $pdo = get_pdo();
  $stmt = $pdo->prepare('SELECT id, full_name, email, role, phone, is_active, created_at FROM users WHERE id = :id');
  $stmt->execute([':id' => $user['id']]);
  $row = $stmt->fetch();
  if (!$row) { json_response(['error' => 'USER_NOT_FOUND'], 404); }

  json_response(['user' => $row]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
