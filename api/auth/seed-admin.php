<?php
// Convenience endpoint to seed a default admin user (remove after first use)
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }
  $input = $_POST;
  if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw) { $input = json_decode($raw, true) ?: []; }
  }
  $email = trim($input['email'] ?? 'admin@example.com');
  $password = (string)($input['password'] ?? 'Admin@123');
  $full_name = trim($input['full_name'] ?? 'Super Admin');
  $role = $input['role'] ?? 'super_admin';

  $pdo = get_pdo();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
  $stmt->execute([':email' => $email]);
  if ($stmt->fetch()) { json_response(['message' => 'User already exists']); }

  $id = uuid();
  $hash = password_hash($password, PASSWORD_BCRYPT);
  $pdo->prepare('INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES (:id, :full_name, :email, :hash, :role, 1)')
      ->execute([':id' => $id, ':full_name' => $full_name, ':email' => $email, ':hash' => $hash, ':role' => $role]);

  json_response(['success' => true, 'id' => $id]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
