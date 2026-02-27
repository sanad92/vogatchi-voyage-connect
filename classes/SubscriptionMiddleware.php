<?php

require_once __DIR__ . '/services/SubscriptionService.php';

class SubscriptionMiddleware {
    /**
     * Ensure the organization has an active subscription (not expired)
     * throws exception if not
     */
    public static function ensureActive() {
        $svc = new SubscriptionService();
        if ($svc->isReadOnly()) {
            throw new Exception('Organization subscription expired; read-only mode');
        }
    }

    /**
     * Check a feature limit before performing an action
     * @param string $feature
     * @param int $amount
     */
    public static function requireFeature(string $feature, int $amount = 1) {
        self::ensureActive();
        $svc = new SubscriptionService();
        return $svc->checkFeature($feature, $amount);
    }

    /**
     * Record usage for a feature (should be called after action succeeds)
     */
    public static function recordUsage(string $feature, int $amount = 1) {
        $svc = new SubscriptionService();
        $svc->trackUsage($feature, $amount);
    }
}
