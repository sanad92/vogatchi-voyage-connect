<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../classes/Database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $db = Database::getInstance();
    
    // Sanitize and validate inputs
    $name = htmlspecialchars(trim($_POST['name'] ?? ''), ENT_QUOTES, 'UTF-8');
    $phone = htmlspecialchars(trim($_POST['phone'] ?? ''), ENT_QUOTES, 'UTF-8');
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
    $service_type = htmlspecialchars(trim($_POST['service_type'] ?? 'general'), ENT_QUOTES, 'UTF-8');
    $message = htmlspecialchars(trim($_POST['message'] ?? ''), ENT_QUOTES, 'UTF-8');

    // Validate lengths
    if (strlen($name) > 100) {
        throw new Exception('الاسم طويل جداً');
    }
    if (strlen($phone) > 20) {
        throw new Exception('رقم الهاتف طويل جداً');
    }
    if (strlen($email) > 255) {
        throw new Exception('البريد الإلكتروني طويل جداً');
    }
    if (strlen($message) > 2000) {
        throw new Exception('الرسالة طويلة جداً');
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('البريد الإلكتروني غير صالح');
    }

    $data = [
        'id' => $db->generateUUID(),
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
        'service_type' => $service_type,
        'message' => $message,
        'preferred_contact' => 'phone',
        'status' => 'pending'
    ];
    
    // التحقق من البيانات المطلوبة
    if (empty($data['name']) || empty($data['phone'])) {
        throw new Exception('الاسم ورقم الهاتف مطلوبان');
    }
    
    $result = $db->insert('service_requests', $data);
    
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'تم إرسال طلبك بنجاح']);
    } else {
        throw new Exception('فشل في إرسال الطلب');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
