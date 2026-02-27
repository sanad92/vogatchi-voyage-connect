<?php

/**
 * UsageAnalyticsApi - API endpoints for usage metrics and analytics
 * 
 * Provides endpoints to:
 * - View daily usage summaries
 * - Get API analytics
 * - Display storage usage
 * - Monitor active users
 * - Generate monthly reports
 */

require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/TenantMiddleware.php';
require_once __DIR__ . '/../classes/services/UsageTracker.php';
require_once __DIR__ . '/../classes/ApiUsageMiddleware.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Tenant isolation
TenantMiddleware::validateRequest();

$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();
$tracker = new UsageTracker($db, $org_id);

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/usage', '', $path);

try {
    if ($method === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // GET /api/usage/summary
    if ($path === '/summary' && $method === 'GET') {
        http_response_code(200);
        echo json_encode([
            'today' => $tracker->getTodayUsage(),
            'storage_mb' => $tracker->getTotalStorageUsageMb(),
            'active_users_7d' => $tracker->getActiveUsersCount(7),
            'active_users_30d' => $tracker->getActiveUsersCount(30),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    // GET /api/usage/range?start=YYYY-MM-DD&end=YYYY-MM-DD
    if ($path === '/range' && $method === 'GET') {
        $start = $_GET['start'] ?? date('Y-m-01');
        $end = $_GET['end'] ?? date('Y-m-d');

        http_response_code(200);
        echo json_encode([
            'range' => [
                'start' => $start,
                'end' => $end
            ],
            'data' => $tracker->getUsageRange($start, $end)
        ]);
        exit;
    }

    // GET /api/usage/api-analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
    if ($path === '/api-analytics' && $method === 'GET') {
        $start = $_GET['start'] ?? date('Y-m-01');
        $end = $_GET['end'] ?? date('Y-m-d');

        http_response_code(200);
        echo json_encode([
            'period' => [
                'start' => $start,
                'end' => $end
            ],
            'analytics' => $tracker->getApiAnalytics($start, $end)
        ]);
        exit;
    }

    // GET /api/usage/monthly?year=2026&month=2
    if ($path === '/monthly' && $method === 'GET') {
        $year = $_GET['year'] ?? date('Y');
        $month = $_GET['month'] ?? date('m');

        $report = $tracker->getMonthlyReport($year, $month);

        http_response_code(200);
        echo json_encode([
            'period' => "$year-$month",
            'report' => $report ?? ['error' => 'No report found for this period']
        ]);
        exit;
    }

    // GET /api/usage/dashboard
    if ($path === '/dashboard' && $method === 'GET') {
        $days = $_GET['days'] ?? 30;

        $dashboard_data = ApiUsageMiddleware::getDashboardData($db, $org_id, $days);

        http_response_code(200);
        echo json_encode([
            'period_days' => (int)$days,
            'data' => $dashboard_data
        ]);
        exit;
    }

    // POST /api/usage/calculate-monthly
    if ($path === '/calculate-monthly' && $method === 'POST') {
        // Require admin/manager permissions
        $body = json_decode(file_get_contents('php://input'), true);
        
        $year = $body['year'] ?? date('Y');
        $month = $body['month'] ?? date('m');

        if ($tracker->calculateMonthlyReport($year, $month)) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'period' => "$year-$month",
                'message' => 'Monthly report calculated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to calculate monthly report'
            ]);
        }
        exit;
    }

    // POST /api/usage/calculate-all-monthly (admin only)
    if ($path === '/calculate-all-monthly' && $method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        
        $year = $body['year'] ?? date('Y');
        $month = $body['month'] ?? date('m');

        $count = ApiUsageMiddleware::calculateAllMonthlyReports($db, $year, $month);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'period' => "$year-$month",
            'organizations_processed' => $count
        ]);
        exit;
    }

    // GET /api/usage/storage
    if ($path === '/storage' && $method === 'GET') {
        $limit = $_GET['limit'] ?? 10;

        $storage_files = $db->query(
            "SELECT file_name, file_size_bytes, upload_date, user_id, 
                    ROUND(file_size_bytes / (1024*1024), 2) as file_size_mb
             FROM storage_usage
             WHERE organization_id = :org AND deleted_at IS NULL
             ORDER BY upload_date DESC
             LIMIT :limit",
            ['org' => $org_id, 'limit' => (int)$limit]
        );

        http_response_code(200);
        echo json_encode([
            'total_storage_mb' => $tracker->getTotalStorageUsageMb(),
            'recent_uploads' => $storage_files
        ]);
        exit;
    }

    // Not found
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
    exit;

} catch (Exception $e) {
    error_log("UsageAnalyticsApi error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
    exit;
}
