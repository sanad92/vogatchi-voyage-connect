<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  require_auth();

  $input = $_POST;
  if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw) { $input = json_decode($raw, true) ?: []; }
  }

  $id = trim($input['id'] ?? '');
  if ($id === '') { json_response(['error' => 'المعرف مطلوب'], 400); }

  $fields = ['name','phone','email','segment_id'];
  $updates = [];
  $params = [':id' => $id];
  foreach ($fields as $f) {
    if (array_key_exists($f, $input)) {
      $updates[] = "$f = :$f";
      $params[":$f"] = $input[$f] === '' ? null : $input[$f];
    }
  }
  if (empty($updates)) { json_response(['error' => 'لا توجد تغييرات'], 400); }

  $pdo = get_pdo();
  $sql = 'UPDATE customers SET '.implode(', ', $updates).', updated_at = CURRENT_TIMESTAMP WHERE id = :id';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);

  json_response(['success' => true]);
} catch (Throwable $e) {
  json_response(['error' => $e->getMessage()], 500);
}
