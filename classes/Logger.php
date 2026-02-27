<?php

/**
 * Logger utility for activity, error and audit logging.
 *
 * This class provides a simple static interface that controllers, services or
 * any other code can call regardless of whether they extend TenantMiddleware.
 * It automatically picks up tenant/user context from the session when available.
 */
class Logger {
    /** @return \Database */
    private static function db() {
        return Database::getInstance();
    }

    private static function getTenantId() {
        return $_SESSION['organization_id'] ?? null;
    }

    private static function getUserId() {
        return $_SESSION['user_id'] ?? null;
    }

    private static function getIp() {
        return $_SERVER['REMOTE_ADDR'] ?? null;
    }

    private static function getAgent() {
        return $_SERVER['HTTP_USER_AGENT'] ?? null;
    }

    /**
     * High‑level activity log entry.
     *
     * @param string $action short identifier (e.g. "login", "payment_recorded")
     * @param array|string|null $description freeform details or associative array
     */
    public static function activity(string $action, $description = null) {
        try {
            $data = [
                'id' => self::db()->generateUUID(),
                'organization_id' => self::getTenantId(),
                'user_id' => self::getUserId(),
                'action' => $action,
                'description' => is_array($description) ? json_encode($description) : $description,
                'ip_address' => self::getIp(),
                'user_agent' => self::getAgent(),
                'created_at' => date('Y-m-d H:i:s')
            ];
            self::db()->insert('activity_logs', $data);
        } catch (Exception $e) {
            error_log("Logger.activity failed: " . $e->getMessage());
        }
    }

    /**
     * Record an error or exception.
     *
     * @param string $message
     * @param string $severity one of info|warning|error|critical
     * @param array|null $context additional JSON-serializable context
     */
    public static function error(string $message, string $severity = 'error', array $context = null) {
        try {
            $data = [
                'id' => self::db()->generateUUID(),
                'organization_id' => self::getTenantId(),
                'user_id' => self::getUserId(),
                'message' => $message,
                'severity' => $severity,
                'context' => $context ? json_encode($context) : null,
                'ip_address' => self::getIp(),
                'user_agent' => self::getAgent(),
                'resolved' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ];
            self::db()->insert('error_logs', $data);
        } catch (Exception $e) {
            error_log("Logger.error failed: " . $e->getMessage());
        }
    }

    /**
     * Convenience wrapper around the existing audit_log functionality provided
     * by TenantMiddleware.  This method will only work if tenant + user context
     * are already set in the session.
     *
     * @param string $action INSERT|UPDATE|DELETE|READ
     * @param string $entityType
     * @param string $entityId
     * @param array|null $oldValues
     * @param array|null $newValues
     */
    public static function audit(string $action, string $entityType, $entityId = null, $oldValues = null, $newValues = null) {
        // instantiate a temporary middleware object to use provided method
        $temp = new class extends TenantMiddleware {};
        if (self::getTenantId()) {
            $temp->setTenantId(self::getTenantId());
        }
        if (self::getUserId()) {
            $temp->setCurrentUser(self::getUserId());
        }
        $temp->auditLog($action, $entityType, $entityId, $oldValues, $newValues);
    }
}
