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
    
    $data = [
        'id' => $db->generateUUID(),
        'name' => $_POST['name'] ?? '',
        'phone' => $_POST['phone'] ?? '',
        'email' => $_POST['email'] ?? '',
        'service_type' => $_POST['service_type'] ?? 'general',
        'message' => $_POST['message'] ?? '',
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