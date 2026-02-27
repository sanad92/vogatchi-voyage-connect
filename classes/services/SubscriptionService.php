<?php

require_once __DIR__ . '/../repositories/BaseRepository.php';

class SubscriptionService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function getActiveSubscription($orgId = null) {
        $orgId = $orgId ?? TenantMiddleware::getOrganizationId();
        $sql = "SELECT s.*, p.name as plan_name, p.features, p.limits
                FROM subscriptions s
                JOIN subscription_plans p ON p.id = s.plan_id
                WHERE s.organization_id = :org
                  AND s.status IN ('active','trialing')
                  AND (s.expires_at IS NULL OR s.expires_at >= CURRENT_DATE)
                ORDER BY s.starts_at DESC
                LIMIT 1";
        return $this->db->selectOne($sql, ['org' => $orgId]);
    }

    public function isExpired($orgId = null) {
        $sub = $this->getActiveSubscription($orgId);
        return !$sub;
    }

    public function isReadOnly($orgId = null) {
        return $this->isExpired($orgId);
    }

    public function checkFeature(string $feature, int $amount = 1, $orgId = null) {
        $orgId = $orgId ?? TenantMiddleware::getOrganizationId();
        $sub = $this->getActiveSubscription($orgId);
        if (!$sub) {
            throw new Exception('Subscription expired or inactive');
        }
        // parse limits JSON
        $limits = json_decode($sub['limits'], true) ?: [];
        $limit = $limits[$feature] ?? null;
        if ($limit === null) {
            // no limit defined -> assume allowed
            return true;
        }
        // compute current usage for current month period
        $now = date('Y-m-01');
        $usage = $this->getUsage($feature, $orgId, $now);
        if ($usage + $amount > $limit) {
            throw new Exception("Limit reached for feature {$feature}: {$limit}");
        }
        return true;
    }

    public function trackUsage(string $feature, int $amount = 1, $orgId = null) {
        $orgId = $orgId ?? TenantMiddleware::getOrganizationId();
        // determine period (month)
        $start = date('Y-m-01');
        $end = date('Y-m-t');
        // attempt to increment
        $existing = $this->db->selectOne(
            "SELECT * FROM usage_records WHERE organization_id = :org AND feature = :feat AND period_start = :start",
            ['org'=> $orgId, 'feat'=>$feature, 'start'=>$start]
        );
        if ($existing) {
            $this->db->update('usage_records', ['usage' => $existing['usage'] + $amount],
                              'id = :id', ['id' => $existing['id']]);
        } else {
            $this->db->insert('usage_records', [
                'id' => $this->db->generateUUID(),
                'organization_id' => $orgId,
                'feature' => $feature,
                'period_start' => $start,
                'period_end' => $end,
                'usage' => $amount
            ]);
        }
    }

    public function getUsage(string $feature, $orgId = null, $periodStart = null) {
        $orgId = $orgId ?? TenantMiddleware::getOrganizationId();
        $periodStart = $periodStart ?? date('Y-m-01');
        $row = $this->db->selectOne(
            "SELECT usage FROM usage_records WHERE organization_id = :org AND feature = :feat AND period_start = :start",
            ['org'=> $orgId, 'feat'=>$feature, 'start'=>$periodStart]
        );
        return $row ? intval($row['usage']) : 0;
    }

    public function getPlan($planId) {
        return $this->db->selectOne("SELECT * FROM subscription_plans WHERE id = :id", ['id' => $planId]);
    }

    public function assignSubscription($orgId, $planId, $startsAt, $expiresAt = null, $isTrial = false) {
        $data = [
            'id' => $this->db->generateUUID(),
            'organization_id' => $orgId,
            'plan_id' => $planId,
            'status' => $isTrial ? 'trialing' : 'active',
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'is_trial' => $isTrial ? 1 : 0
        ];
        return $this->db->insert('subscriptions', $data);
    }
}
