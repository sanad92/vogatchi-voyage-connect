<?php

/**
 * UsageTracker - Comprehensive usage tracking system for organizations
 * 
 * Tracks and aggregates:
 * - Daily booking counts
 * - Active user counts  
 * - Storage usage (MB)
 * - API call counts and metrics
 * - Monthly aggregates for billing/reporting
 */
class UsageTracker
{
    private $db;
    private $organization_id;

    public function __construct($db, $organization_id = null)
    {
        $this->db = $db;
        $this->organization_id = $organization_id ?? TenantMiddleware::getOrganizationId();
    }

    /**
     * Track a booking creation
     * Increments daily counter for organization
     */
    public function trackBookingCreated()
    {
        if (!$this->organization_id) {
            return false;
        }

        $today = date('Y-m-d');
        
        try {
            // Try to increment existing record
            $result = $this->db->execute(
                "UPDATE org_usage_summary 
                 SET bookings_created = bookings_created + 1, updated_at = NOW()
                 WHERE organization_id = :org AND date = :date",
                ['org' => $this->organization_id, 'date' => $today]
            );

            // If no record exists, create one
            if ($this->db->rowCount == 0) {
                $this->db->insert('org_usage_summary', [
                    'organization_id' => $this->organization_id,
                    'date' => $today,
                    'bookings_created' => 1
                ]);
            }

            return true;
        } catch (Exception $e) {
            error_log("UsageTracker::trackBookingCreated error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Track API call
     * Logs granular call data for analytics
     */
    public function trackApiCall($endpoint, $method = 'GET', $user_id = null, $status_code = 200, $response_time_ms = 0, $ip_address = null)
    {
        if (!$this->organization_id) {
            return false;
        }

        try {
            $request_id = isset($_SERVER['HTTP_X_REQUEST_ID']) ? $_SERVER['HTTP_X_REQUEST_ID'] : uniqid('req_');
            $ip = $ip_address ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $user_agent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

            $this->db->insert('api_calls_log', [
                'organization_id' => $this->organization_id,
                'user_id' => $user_id,
                'endpoint' => substr($endpoint, 0, 255),
                'method' => substr($method, 0, 10),
                'status_code' => $status_code,
                'response_time_ms' => (int)$response_time_ms,
                'ip_address' => $ip,
                'user_agent' => $user_agent,
                'request_id' => $request_id
            ]);

            // Also increment daily API call counter
            $this->incrementDailyApiCalls();

            return true;
        } catch (Exception $e) {
            error_log("UsageTracker::trackApiCall error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Track file upload/storage
     */
    public function trackStorageUpload($file_name, $file_size_bytes, $file_path, $user_id = null)
    {
        if (!$this->organization_id) {
            return false;
        }

        try {
            $this->db->insert('storage_usage', [
                'organization_id' => $this->organization_id,
                'user_id' => $user_id,
                'file_name' => substr($file_name, 0, 255),
                'file_size_bytes' => (int)$file_size_bytes,
                'file_path' => substr($file_path, 0, 500)
            ]);

            // Update daily storage counter
            $this->updateDailyStorageUsage();

            return true;
        } catch (Exception $e) {
            error_log("UsageTracker::trackStorageUpload error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Track file deletion (removes from storage count)
     */
    public function trackStorageDeletion($file_id)
    {
        if (!$this->organization_id) {
            return false;
        }

        try {
            $this->db->execute(
                "UPDATE storage_usage SET deleted_at = NOW() WHERE id = :id AND organization_id = :org",
                ['id' => $file_id, 'org' => $this->organization_id]
            );

            // Update daily storage counter
            $this->updateDailyStorageUsage();

            return true;
        } catch (Exception $e) {
            error_log("UsageTracker::trackStorageDeletion error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get total storage used by organization (in MB)
     */
    public function getTotalStorageUsageMb()
    {
        if (!$this->organization_id) {
            return 0;
        }

        try {
            $result = $this->db->query(
                "SELECT COALESCE(SUM(file_size_bytes), 0) / (1024 * 1024) as total_mb
                 FROM storage_usage
                 WHERE organization_id = :org AND deleted_at IS NULL",
                ['org' => $this->organization_id]
            );
            
            return (float)($result[0]['total_mb'] ?? 0);
        } catch (Exception $e) {
            error_log("UsageTracker::getTotalStorageUsageMb error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get active users count (unique users with activity in last 30 days)
     */
    public function getActiveUsersCount($days = 30)
    {
        if (!$this->organization_id) {
            return 0;
        }

        try {
            $result = $this->db->query(
                "SELECT COUNT(DISTINCT user_id) as active_users
                 FROM api_calls_log
                 WHERE organization_id = :org 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)",
                ['org' => $this->organization_id, 'days' => (int)$days]
            );
            
            return (int)($result[0]['active_users'] ?? 0);
        } catch (Exception $e) {
            error_log("UsageTracker::getActiveUsersCount error: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get today's usage summary
     */
    public function getTodayUsage()
    {
        if (!$this->organization_id) {
            return null;
        }

        try {
            $result = $this->db->query(
                "SELECT * FROM org_usage_summary 
                 WHERE organization_id = :org AND date = CURDATE()",
                ['org' => $this->organization_id]
            );
            
            return $result[0] ?? $this->getEmptyUsageSummary();
        } catch (Exception $e) {
            error_log("UsageTracker::getTodayUsage error: " . $e->getMessage());
            return $this->getEmptyUsageSummary();
        }
    }

    /**
     * Get usage for a specific date range
     */
    public function getUsageRange($start_date, $end_date)
    {
        if (!$this->organization_id) {
            return [];
        }

        try {
            return $this->db->query(
                "SELECT date, bookings_created, active_users, storage_used_mb, api_calls
                 FROM org_usage_summary
                 WHERE organization_id = :org AND date BETWEEN :start AND :end
                 ORDER BY date DESC",
                ['org' => $this->organization_id, 'start' => $start_date, 'end' => $end_date]
            );
        } catch (Exception $e) {
            error_log("UsageTracker::getUsageRange error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Calculate and store monthly usage report
     * Should be run monthly (e.g., via cron job)
     */
    public function calculateMonthlyReport($year, $month)
    {
        if (!$this->organization_id) {
            return false;
        }

        try {
            // Build date range for the month
            $start_date = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
            $end_date = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));

            // Aggregate daily summaries
            $daily_data = $this->db->query(
                "SELECT 
                    SUM(bookings_created) as total_bookings,
                    MAX(active_users) as max_users,
                    AVG(active_users) as avg_users,
                    AVG(storage_used_mb) as avg_storage
                 FROM org_usage_summary
                 WHERE organization_id = :org AND date BETWEEN :start AND :end",
                ['org' => $this->organization_id, 'start' => $start_date, 'end' => $end_date]
            );

            // Aggregate API metrics
            $api_data = $this->db->query(
                "SELECT 
                    COUNT(*) as total_calls,
                    AVG(response_time_ms) as avg_response_ms,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
                 FROM api_calls_log
                 WHERE organization_id = :org AND created_at BETWEEN :start AND :end",
                ['org' => $this->organization_id, 'start' => $start_date . ' 00:00:00', 'end' => $end_date . ' 23:59:59']
            );

            $daily = $daily_data[0] ?? [];
            $api = $api_data[0] ?? [];

            // Upsert monthly report
            $this->db->execute(
                "INSERT INTO monthly_usage_report 
                 (organization_id, year, month, total_bookings_created, max_active_users, avg_active_users, 
                  total_storage_mb, total_api_calls, avg_api_response_ms, api_error_count)
                 VALUES (:org, :year, :month, :bookings, :max_users, :avg_users, :storage, :api_calls, :avg_ms, :errors)
                 ON DUPLICATE KEY UPDATE
                  total_bookings_created = :bookings,
                  max_active_users = :max_users,
                  avg_active_users = :avg_users,
                  total_storage_mb = :storage,
                  total_api_calls = :api_calls,
                  avg_api_response_ms = :avg_ms,
                  api_error_count = :errors,
                  calculated_at = NOW()",
                [
                    'org' => $this->organization_id,
                    'year' => (int)$year,
                    'month' => (int)$month,
                    'bookings' => (int)($daily['total_bookings'] ?? 0),
                    'max_users' => (int)($daily['max_users'] ?? 0),
                    'avg_users' => (float)($daily['avg_users'] ?? 0),
                    'storage' => (float)($daily['avg_storage'] ?? 0),
                    'api_calls' => (int)($api['total_calls'] ?? 0),
                    'avg_ms' => (float)($api['avg_response_ms'] ?? 0),
                    'errors' => (int)($api['error_count'] ?? 0)
                ]
            );

            return true;
        } catch (Exception $e) {
            error_log("UsageTracker::calculateMonthlyReport error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get monthly report
     */
    public function getMonthlyReport($year, $month)
    {
        if (!$this->organization_id) {
            return null;
        }

        try {
            $result = $this->db->query(
                "SELECT * FROM monthly_usage_report
                 WHERE organization_id = :org AND year = :year AND month = :month",
                ['org' => $this->organization_id, 'year' => (int)$year, 'month' => (int)$month]
            );
            
            return $result[0] ?? null;
        } catch (Exception $e) {
            error_log("UsageTracker::getMonthlyReport error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get API call analytics for date range
     */
    public function getApiAnalytics($start_date, $end_date)
    {
        if (!$this->organization_id) {
            return [];
        }

        try {
            return $this->db->query(
                "SELECT 
                    endpoint,
                    method,
                    COUNT(*) as total_calls,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
                    AVG(response_time_ms) as avg_response_ms,
                    MAX(response_time_ms) as max_response_ms,
                    MIN(response_time_ms) as min_response_ms
                 FROM api_calls_log
                 WHERE organization_id = :org AND created_at BETWEEN :start AND :end
                 GROUP BY endpoint, method
                 ORDER BY total_calls DESC",
                ['org' => $this->organization_id, 'start' => $start_date . ' 00:00:00', 'end' => $end_date . ' 23:59:59']
            );
        } catch (Exception $e) {
            error_log("UsageTracker::getApiAnalytics error: " . $e->getMessage());
            return [];
        }
    }

    // =========== PRIVATE HELPER METHODS ===========

    /**
     * Increment daily API call counter
     */
    private function incrementDailyApiCalls()
    {
        $today = date('Y-m-d');
        
        try {
            $this->db->execute(
                "UPDATE org_usage_summary 
                 SET api_calls = api_calls + 1, updated_at = NOW()
                 WHERE organization_id = :org AND date = :date",
                ['org' => $this->organization_id, 'date' => $today]
            );

            if ($this->db->rowCount == 0) {
                $this->db->insert('org_usage_summary', [
                    'organization_id' => $this->organization_id,
                    'date' => $today,
                    'api_calls' => 1
                ]);
            }
        } catch (Exception $e) {
            error_log("UsageTracker::incrementDailyApiCalls error: " . $e->getMessage());
        }
    }

    /**
     * Update daily storage usage
     */
    private function updateDailyStorageUsage()
    {
        $today = date('Y-m-d');
        $storage_mb = $this->getTotalStorageUsageMb();

        try {
            $this->db->execute(
                "UPDATE org_usage_summary 
                 SET storage_used_mb = :storage, updated_at = NOW()
                 WHERE organization_id = :org AND date = :date",
                ['org' => $this->organization_id, 'date' => $today, 'storage' => $storage_mb]
            );

            if ($this->db->rowCount == 0) {
                $this->db->insert('org_usage_summary', [
                    'organization_id' => $this->organization_id,
                    'date' => $today,
                    'storage_used_mb' => $storage_mb
                ]);
            }
        } catch (Exception $e) {
            error_log("UsageTracker::updateDailyStorageUsage error: " . $e->getMessage());
        }
    }

    /**
     * Get empty usage summary structure
     */
    private function getEmptyUsageSummary()
    {
        return [
            'bookings_created' => 0,
            'active_users' => 0,
            'storage_used_mb' => 0,
            'api_calls' => 0,
            'date' => date('Y-m-d')
        ];
    }
}
