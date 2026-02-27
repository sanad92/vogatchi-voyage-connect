<?php

/**
 * ApiUsageMiddleware - Automatic API call tracking middleware
 * 
 * Integrated into API request flow to:
 * - Log all API calls
 * - Measure response times
 * - Track errors and status codes
 * - Provide metrics for usage dashboard
 */
class ApiUsageMiddleware
{
    private static $request_start_time;
    private static $tracker;

    /**
     * Initialize request tracking (call at start of API request)
     */
    public static function startTracking()
    {
        self::$request_start_time = microtime(true);
    }

    /**
     * Log API call (call at end of API request/response)
     * 
     * @param string $endpoint The API endpoint path (e.g., '/api/bookings', '/api/customers')
     * @param string $method HTTP method (GET, POST, PUT, DELETE)
     * @param int $status_code HTTP status code returned
     * @param string|null $user_id User ID making the request (optional)
     */
    public static function logApiCall($endpoint, $method = 'GET', $status_code = 200, $user_id = null)
    {
        try {
            // Calculate response time
            $response_time_ms = round((microtime(true) - self::$request_start_time) * 1000);

            // Get organization from context
            $org_id = TenantMiddleware::getOrganizationId();
            
            if (!$org_id) {
                return; // Cannot track without org context
            }

            // Initialize tracker
            if (!self::$tracker) {
                global $db;
                self::$tracker = new UsageTracker($db, $org_id);
            }

            // Track the API call
            self::$tracker->trackApiCall($endpoint, $method, $user_id, $status_code, $response_time_ms);

        } catch (Exception $e) {
            error_log("ApiUsageMiddleware::logApiCall error: " . $e->getMessage());
        }
    }

    /**
     * Quick middleware to track API calls with callback
     * 
     * Example usage:
     * $result = ApiUsageMiddleware::trackCall('/api/bookings', 'POST', function() {
     *     return performBookingLogic();
     * });
     */
    public static function trackCall($endpoint, $method = 'GET', $callback = null, $user_id = null)
    {
        self::startTracking();
        
        try {
            $result = $callback ? $callback() : null;
            self::logApiCall($endpoint, $method, 200, $user_id);
            return $result;
        } catch (Exception $e) {
            self::logApiCall($endpoint, $method, 500, $user_id);
            throw $e;
        }
    }

    /**
     * Calculate monthly report for all organizations
     * Should be run via cron job at end of each month
     * 
     * Usage: ApiUsageMiddleware::calculateAllMonthlyReports($db, 2026, 2)
     */
    public static function calculateAllMonthlyReports($db, $year, $month)
    {
        try {
            // Get all organizations
            $orgs = $db->query("SELECT id FROM organizations WHERE deleted_at IS NULL");
            
            $count = 0;
            foreach ($orgs as $org) {
                $tracker = new UsageTracker($db, $org['id']);
                if ($tracker->calculateMonthlyReport($year, $month)) {
                    $count++;
                }
            }

            error_log("ApiUsageMiddleware::calculateAllMonthlyReports - Processed {$count} organizations for {$year}-{$month}");
            return $count;
        } catch (Exception $e) {
            error_log("ApiUsageMiddleware::calculateAllMonthlyReports error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get usage dashboard data for an organization
     */
    public static function getDashboardData($db, $org_id, $days = 30)
    {
        try {
            $tracker = new UsageTracker($db, $org_id);

            $end_date = date('Y-m-d');
            $start_date = date('Y-m-d', strtotime("-{$days} days"));

            return [
                'today' => $tracker->getTodayUsage(),
                'range' => $tracker->getUsageRange($start_date, $end_date),
                'total_storage_mb' => $tracker->getTotalStorageUsageMb(),
                'active_users_30d' => $tracker->getActiveUsersCount(30),
                'active_users_7d' => $tracker->getActiveUsersCount(7),
                'api_analytics' => $tracker->getApiAnalytics($start_date, $end_date)
            ];
        } catch (Exception $e) {
            error_log("ApiUsageMiddleware::getDashboardData error: " . $e->getMessage());
            return [];
        }
    }
}
