<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
  }

  $input = $_POST;
  if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw) { $input = json_decode($raw, true) ?: []; }
  }

  $email = trim($input['email'] ?? '');
  $password = (string)($input['password'] ?? '');

  if ($email === '' || $password === '') {
    json_response(['error' => 'البريد الإلكتروني وكلمة المرور مطلوبة'], 400);
  }

  $pdo = get_pdo();
  $stmt = $pdo->prepare('SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = :email LIMIT 1');
  $stmt->execute([':email' => $email]);
  $user = $stmt->fetch();

  if (!$user || !password_verify($password, $user['password_hash'])) {
    json_response(['error' => 'بيانات الدخول غير صحيحة'], 401);
  }

  if ((int)$user['is_active'] !== 1) {
    json_response(['error' => 'الحساب معطل'], 403);
  }

  if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
  $_SESSION['user_id'] = $user['id'];
  $_SESSION['email'] = $user['email'];
  $_SESSION['full_name'] = $user['full_name'];
  $_SESSION['role'] = $user['role'];

  json_response([
    'success' => true,
    'user' => [
      'id' => $user['id'],
      'email' => $user['email'],
      'full_name' => $user['full_name'],
      'role' => $user['role']
    ]
  ]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
