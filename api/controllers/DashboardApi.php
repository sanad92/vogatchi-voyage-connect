<?php
/**
 * Dashboard API controller
 * returns JSON stats, protected by RBAC
 */
require_once __DIR__ . '/../../classes/ApiController.php';
require_once __DIR__ . '/../../classes/Task.php'; // if needed

class DashboardApi extends ApiController {
    public function get() {
        // throttle by IP+endpoint
        $this->throttle();

        // require login
        $this->auth->requireLogin();

        // require permission
        $this->rbac->require(Permission::DASHBOARD_VIEW);

        // gather stats
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        $stats = [
            'customers' => $this->db->count('customers', ['organization_id' => $orgId]),
            'hotel_bookings' => $this->db->count('hotel_bookings', ['organization_id' => $orgId]),
            'flight_bookings' => $this->db->count('flight_bookings', ['organization_id' => $orgId]),
            'invoices' => $this->db->count('invoices', ['organization_id' => $orgId]),
        ];

        $this->success($stats);
    }
}
