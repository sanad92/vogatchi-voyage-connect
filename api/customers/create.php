<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  require_auth();

  $input = $_POST;
  if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw) { $input = json_decode($raw, true) ?: []; }
  }

  $name = trim($input['name'] ?? '');
  $phone = trim($input['phone'] ?? '');
  $email = trim($input['email'] ?? '');
  $segment_id = $input['segment_id'] ?? null;

  if ($name === '' || $phone === '') {
    json_response(['error' => 'الاسم ورقم الهاتف مطلوبان'], 400);
  }

  $pdo = get_pdo();
  $id = uuid();
  $stmt = $pdo->prepare('INSERT INTO customers (id, name, phone, email, segment_id) VALUES (:id, :name, :phone, :email, :segment_id)');
  $stmt->execute([
    ':id' => $id,
    ':name' => $name,
    ':phone' => $phone,
    ':email' => $email ?: null,
    ':segment_id' => $segment_id ?: null,
  ]);

  json_response(['success' => true, 'id' => $id]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
