<?php
// Central API bootstrap
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/Auth.php';
require_once __DIR__ . '/../classes/ErrorHandler.php';
require_once __DIR__ . '/../classes/ApiController.php';

// set exception handler
set_exception_handler(['ErrorHandler', 'handle']);

$db = Database::getInstance();
$auth = new Auth();

// simple router (for illustration)
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// dispatch
switch (true) {
    case $method === 'GET' && $path === '/api/dashboard':
        require_once __DIR__ . '/controllers/DashboardApi.php';
        $ctrl = new DashboardApi($db, $auth);
        $ctrl->get();
        break;

    case ($path === '/api/accounting') && in_array($method, ['GET','POST']):
        require_once __DIR__ . '/controllers/AccountingApi.php';
        $ctrl = new AccountingApi($db, $auth);
        if ($method === 'GET') {
            $ctrl->get();
        } else {
            $ctrl->post();
        }
        break;

    case $method === 'POST' && $path === '/api/customers':
        require_once __DIR__ . '/controllers/CustomersApi.php';
        $ctrl = new CustomersApi($db, $auth);
        $ctrl->create();
        break;

    case strpos($path, '/api/usage') === 0 && in_array($method, ['GET', 'POST']):
        require_once __DIR__ . '/usage.php';
        break;

    // ... other routes

    default:
        header('Content-Type: application/json', true, 404);
        echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
        break;
}
