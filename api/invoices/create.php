<?php
require_once __DIR__ . '/../../api/_bootstrap.php';

try {
  $user = require_auth();
  $input = $_POST;
  if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw) { $input = json_decode($raw, true) ?: []; }
  }

  $customer_id = trim($input['customer_id'] ?? '');
  $booking_id = trim($input['booking_id'] ?? '');
  $currency = strtoupper(trim($input['currency'] ?? 'EGP'));
  $items = $input['items'] ?? [];
  $notes = trim($input['notes'] ?? '');

  if ($customer_id === '' || empty($items)) {
    json_response(['error' => 'العميل وبنود الفاتورة مطلوبة'], 400);
  }

  $pdo = get_pdo();
  $pdo->beginTransaction();

  // totals
  $subtotal = 0;
  foreach ($items as $it) {
    $qty = (int)($it['quantity'] ?? 1);
    $price = (float)($it['unit_price'] ?? 0);
    $subtotal += $qty * $price;
  }
  $vat_amount = round($subtotal * 0.14, 2); // 14% default
  $discount_amount = (float)($input['discount_amount'] ?? 0);
  $final_amount = $subtotal + $vat_amount - $discount_amount;

  $invoice_number = 'INV-'.date('Y').'-'.substr(str_replace('-', '', uuid()), 0, 6);
  $invoice_id = uuid();

  $stmt = $pdo->prepare('INSERT INTO invoices (
    id, invoice_number, booking_id, customer_id, currency, subtotal, vat_amount, discount_amount, final_amount,
    total_paid_amount, remaining_amount, status, notes
  ) VALUES (
    :id, :invoice_number, :booking_id, :customer_id, :currency, :subtotal, :vat_amount, :discount_amount, :final_amount,
    0, :remaining_amount, "draft", :notes
  )');

  $stmt->execute([
    ':id' => $invoice_id,
    ':invoice_number' => $invoice_number,
    ':booking_id' => $booking_id ?: null,
    ':customer_id' => $customer_id,
    ':currency' => $currency,
    ':subtotal' => $subtotal,
    ':vat_amount' => $vat_amount,
    ':discount_amount' => $discount_amount,
    ':final_amount' => $final_amount,
    ':remaining_amount' => $final_amount,
    ':notes' => $notes ?: null,
  ]);

  $itemStmt = $pdo->prepare('INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price) VALUES (:id, :invoice_id, :description, :quantity, :unit_price, :total_price)');
  foreach ($items as $it) {
    $qty = (int)($it['quantity'] ?? 1);
    $price = (float)($it['unit_price'] ?? 0);
    $desc = trim($it['description'] ?? 'Service');
    $itemStmt->execute([
      ':id' => uuid(),
      ':invoice_id' => $invoice_id,
      ':description' => $desc,
      ':quantity' => $qty,
      ':unit_price' => $price,
      ':total_price' => $qty * $price,
    ]);
  }

  $pdo->commit();
  json_response(['success' => true, 'id' => $invoice_id, 'invoice_number' => $invoice_number]);
} catch (Throwable $e) {
  if (get_pdo()->inTransaction()) { get_pdo()->rollBack(); }
  json_response(['error' => $e->getMessage()], 500);
}
