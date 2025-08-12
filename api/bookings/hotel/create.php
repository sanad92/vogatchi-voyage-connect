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
  $hotel_name = trim($input['hotel_name'] ?? '');
  $destination_city = trim($input['destination_city'] ?? '');
  $check_in_date = trim($input['check_in_date'] ?? '');
  $check_out_date = trim($input['check_out_date'] ?? '');
  $selling = (float)($input['selling_price_per_night'] ?? 0);
  $cost = (float)($input['cost_per_night'] ?? 0);
  $adults = (int)($input['adults'] ?? 2);
  $children = (int)($input['children'] ?? 0);
  $room_type = trim($input['room_type'] ?? '');
  $meal_plan = trim($input['meal_plan'] ?? '');

  if ($customer_id === '' || $check_in_date === '' || $check_out_date === '') {
    json_response(['error' => 'بيانات الحجز الأساسية مطلوبة'], 400);
  }

  $inDate = new DateTime($check_in_date);
  $outDate = new DateTime($check_out_date);
  $nights = (int)$inDate->diff($outDate)->format('%a');
  if ($nights <= 0) { json_response(['error' => 'تواريخ غير صحيحة'], 400); }

  $total_cost_customer = $selling * $nights;
  $total_profit = ($selling - $cost) * $nights;

  $pdo = get_pdo();
  $pdo->beginTransaction();

  // Get customer name
  $custStmt = $pdo->prepare('SELECT name FROM customers WHERE id = :id');
  $custStmt->execute([':id' => $customer_id]);
  $cust = $custStmt->fetch();
  if (!$cust) { throw new Exception('العميل غير موجود'); }

  // Generate booking number simple
  $booking_number = 'VT-'.date('Y').'-'.substr(str_replace('-', '', uuid()), 0, 6);
  $status_id = null; -- optional, keep null or set default

  $id = uuid();
  $stmt = $pdo->prepare('INSERT INTO hotel_bookings (
    id, booking_number, customer_id, customer_name, hotel_name, destination_city, check_in_date, check_out_date,
    number_of_nights, adults, children, room_type, meal_plan, selling_price_per_night, cost_per_night,
    total_cost_customer, total_profit, paid_amount, remaining_amount, status_id, booking_agent_id
  ) VALUES (
    :id, :booking_number, :customer_id, :customer_name, :hotel_name, :destination_city, :check_in_date, :check_out_date,
    :nights, :adults, :children, :room_type, :meal_plan, :selling, :cost,
    :total_cost_customer, :total_profit, 0, :remaining_amount, :status_id, NULL
  )');

  $stmt->execute([
    ':id' => $id,
    ':booking_number' => $booking_number,
    ':customer_id' => $customer_id,
    ':customer_name' => $cust['name'],
    ':hotel_name' => $hotel_name ?: null,
    ':destination_city' => $destination_city ?: null,
    ':check_in_date' => $check_in_date,
    ':check_out_date' => $check_out_date,
    ':nights' => $nights,
    ':adults' => $adults,
    ':children' => $children,
    ':room_type' => $room_type ?: null,
    ':meal_plan' => $meal_plan ?: null,
    ':selling' => $selling,
    ':cost' => $cost,
    ':total_cost_customer' => $total_cost_customer,
    ':total_profit' => $total_profit,
    ':remaining_amount' => $total_cost_customer,
    ':status_id' => $status_id,
  ]);

  // update customer last_booking_date
  $pdo->prepare('UPDATE customers SET last_booking_date = :d, updated_at = CURRENT_TIMESTAMP WHERE id = :id')
      ->execute([':d' => $check_in_date, ':id' => $customer_id]);

  $pdo->commit();
  json_response(['success' => true, 'id' => $id, 'booking_number' => $booking_number]);
} catch (Throwable $e) {
  if (get_pdo()->inTransaction()) { get_pdo()->rollBack(); }
  json_response(['error' => $e->getMessage()], 500);
}
