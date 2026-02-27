<?php
/**
 * Example: Dashboard API Controller
 * 
 * Shows basic RBAC usage patterns for common scenarios:
 * - Role-based data visibility
 * - Permission checks before returning sensitive data
 * - Filtering data based on user role
 */

class DashboardController {
    private $db;
    private $auth;
    private $rbac;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;
        
        $this->rbac = new RBACMiddleware(
            $db,
            $auth->getCurrentUser()['id'],
            $auth->getCurrentUser()['organization_id']
        );
    }

    /**
     * GET /dashboard - Main dashboard
     * Requires: dashboard.view permission
     * Returns data filtered by user role
     */
    public function getDashboard() {
        try {
            // Require login and basic permission
            $this->rbac->require(Permission::DASHBOARD_VIEW);

            $userRole = $this->rbac->getRoleNames()[0] ?? 'viewer';
            $dashboard = [
                'metrics' => [],
                'charts' => [],
                'widgets' => []
            ];

            // Super Admin: Complete system overview
            if ($this->rbac->isSuperAdmin()) {
                $dashboard['metrics'] = $this->getSuperAdminMetrics();
                $dashboard['charts'] = $this->getSuperAdminCharts();
            }
            // Admin: Organization overview
            elseif ($this->rbac->isAdmin()) {
                $dashboard['metrics'] = $this->getAdminMetrics();
                $dashboard['charts'] = $this->getAdminCharts();
            }
            // Accountant: Financial overview
            elseif ($this->rbac->hasRole(Role::ACCOUNTANT)) {
                $dashboard['metrics'] = $this->getAccountantMetrics();
                $dashboard['charts'] = $this->getAccountantCharts();
            }
            // Manager: Team and operations overview
            elseif ($this->rbac->hasRole(Role::MANAGER)) {
                $dashboard['metrics'] = $this->getManagerMetrics();
                $dashboard['charts'] = $this->getManagerCharts();
            }
            // Agent: Personal performance
            elseif ($this->rbac->hasRole(Role::AGENT)) {
                $dashboard['metrics'] = $this->getAgentMetrics();
                $dashboard['charts'] = $this->getAgentCharts();
            }
            // Viewer: Limited read-only
            else {
                $dashboard['metrics'] = $this->getViewerMetrics();
                $dashboard['charts'] = [];
            }

            return [
                'success' => true,
                'data' => $dashboard,
                'user_role' => $userRole,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Super admin dashboard metrics - all data
     */
    private function getSuperAdminMetrics() {
        return [
            'total_organizations' => $this->getTotalOrganizations(),
            'total_users' => $this->getTotalUsers(),
            'total_revenue' => $this->getTotalRevenue(),
            'active_subscriptions' => $this->getActiveSubscriptions(),
            'pending_invoices' => $this->getPendingInvoices(),
            'system_health' => $this->getSystemHealth()
        ];
    }

    /**
     * Admin dashboard metrics - org-level data
     */
    private function getAdminMetrics() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'total_customers' => $this->getOrgCustomerCount($orgId),
            'total_bookings' => $this->getOrgBookingCount($orgId),
            'total_revenue' => $this->getOrgRevenue($orgId),
            'pending_invoices' => $this->getOrgPendingInvoices($orgId),
            'total_employees' => $this->getOrgEmployeeCount($orgId),
            'active_users' => $this->getOrgActiveUsers($orgId)
        ];
    }

    /**
     * Accountant dashboard metrics - financial only
     */
    private function getAccountantMetrics() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        $accSvc = new AccountingService();
        $now = date('Y-m-d');
        $firstOfMonth = date('Y-m-01');
        $pl = $accSvc->profitAndLoss($firstOfMonth, $now);
        $netProfit = 0;
        foreach ($pl as $row) {
            if ($row['type'] === 'revenue') {
                $netProfit += ($row['credit'] - $row['debit']);
            } else {
                $netProfit -= ($row['debit'] - $row['credit']);
            }
        }

        return [
            'total_invoices' => $this->getOrgInvoiceCount($orgId),
            'total_revenue' => $this->getOrgRevenue($orgId),
            'pending_payments' => $this->getOrgPendingPayments($orgId),
            'total_expenses' => $this->getOrgExpenses($orgId),
            'accounts_receivable' => $this->getAccountsReceivable($orgId),
            'monthly_cash_flow' => $this->getMonthlyCashFlow($orgId),
            'current_month_profit' => $netProfit
        ];
    }

    /**
     * Manager dashboard metrics - team and operations
     */
    private function getManagerMetrics() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'team_size' => $this->getTeamSize($orgId),
            'new_customers_this_month' => $this->getNewCustomers($orgId, 'month'),
            'bookings_this_month' => $this->getMonthlyBookings($orgId),
            'customer_satisfaction' => $this->getCustomerSatisfaction($orgId),
            'revenue_this_month' => $this->getMonthlyRevenue($orgId)
        ];
    }

    /**
     * Agent dashboard metrics - personal performance
     */
    private function getAgentMetrics() {
        $userId = $this->auth->getCurrentUser()['id'];
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'my_customers' => $this->getUserCustomerCount($userId),
            'my_bookings' => $this->getUserBookingCount($userId),
            'my_revenue' => $this->getUserRevenue($userId),
            'conversion_rate' => $this->getUserConversionRate($userId),
            'average_booking_value' => $this->getUserAvgBookingValue($userId)
        ];
    }

    /**
     * Viewer dashboard metrics - limited read-only
     */
    private function getViewerMetrics() {
        return [
            'customer_count' => $this->getOrgCustomerCount($this->auth->getCurrentUser()['organization_id']),
            'booking_count' => $this->getOrgBookingCount($this->auth->getCurrentUser()['organization_id'])
        ];
    }

    /**
     * Super admin charts
     */
    private function getSuperAdminCharts() {
        // Would return multi-org revenue trends, user growth, etc.
        return [
            'revenue_by_organization' => [],
            'user_growth' => [],
            'subscription_distribution' => []
        ];
    }

    /**
     * Admin charts
     */
    private function getAdminCharts() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'revenue_trend' => $this->getOrgRevenueTrend($orgId),
            'booking_sources' => $this->getOrgBookingSources($orgId),
            'customer_segments' => $this->getOrgCustomerSegments($orgId)
        ];
    }

    /**
     * Accountant charts
     */
    private function getAccountantCharts() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'revenue_vs_expenses' => $this->getRevenueVsExpenses($orgId),
            'payment_status' => $this->getPaymentStatus($orgId),
            'top_customers_by_value' => $this->getTopCustomers($orgId)
        ];
    }

    /**
     * Manager charts
     */
    private function getManagerCharts() {
        $orgId = $this->auth->getCurrentUser()['organization_id'];
        
        return [
            'team_performance' => $this->getTeamPerformance($orgId),
            'monthly_targets' => $this->getMonthlyTargets($orgId)
        ];
    }

    /**
     * Agent charts
     */
    private function getAgentCharts() {
        $userId = $this->auth->getCurrentUser()['id'];
        
        return [
            'my_performance' => $this->getUserPerformance($userId)
        ];
    }

    /**
     * Get analytics with permission checking
     * Requires: reports.sales permission
     */
    public function getSalesAnalytics() {
        try {
            // Check permission
            if (!$this->rbac->checkPermission(Permission::REPORTS_SALES, false)) {
                return ['success' => false, 'error' => 'Access denied'];
            }

            $orgId = $this->auth->getCurrentUser()['organization_id'];

            return [
                'success' => true,
                'data' => [
                    'total_sales' => $this->getOrgRevenue($orgId),
                    'conversion_rate' => $this->getConversionRate($orgId),
                    'top_destinations' => $this->getTopDestinations($orgId),
                    'sales_by_agent' => $this->getSalesByAgent($orgId),
                    'monthly_trend' => $this->getMonthlySalesTrend($orgId)
                ]
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Placeholder methods - in real implementation, these would query the database
     */
    private function getTotalOrganizations() { return 45; }
    private function getTotalUsers() { return 1250; }
    private function getTotalRevenue() { return 2450000; }
    private function getActiveSubscriptions() { return 45; }
    private function getPendingInvoices() { return 230; }
    private function getSystemHealth() { return 'Normal'; }
    
    private function getOrgCustomerCount($orgId) { return 450; }
    private function getOrgBookingCount($orgId) { return 1200; }
    private function getOrgRevenue($orgId) { return 125000; }
    private function getOrgPendingInvoices($orgId) { return 42; }
    private function getOrgEmployeeCount($orgId) { return 15; }
    private function getOrgActiveUsers($orgId) { return 18; }
    private function getOrgInvoiceCount($orgId) { return 450; }
    private function getOrgPendingPayments($orgId) { return 28; }
    private function getOrgExpenses($orgId) { return 45000; }
    private function getAccountsReceivable($orgId) { return 85000; }
    private function getMonthlyCashFlow($orgId) { return 40000; }
    private function getTeamSize($orgId) { return 15; }
    private function getNewCustomers($orgId, $period) { return 25; }
    private function getMonthlyBookings($orgId) { return 185; }
    private function getCustomerSatisfaction($orgId) { return 4.5; }
    private function getMonthlyRevenue($orgId) { return 45000; }
    private function getUserCustomerCount($userId) { return 120; }
    private function getUserBookingCount($userId) { return 340; }
    private function getUserRevenue($userId) { return 45000; }
    private function getUserConversionRate($userId) { return 32; }
    private function getUserAvgBookingValue($userId) { return 2100; }
    private function getOrgRevenueTrend($orgId) { return []; }
    private function getOrgBookingSources($orgId) { return []; }
    private function getOrgCustomerSegments($orgId) { return []; }
    private function getRevenueVsExpenses($orgId) { return []; }
    private function getPaymentStatus($orgId) { return []; }
    private function getTopCustomers($orgId) { return []; }
    private function getTeamPerformance($orgId) { return []; }
    private function getMonthlyTargets($orgId) { return []; }
    private function getUserPerformance($userId) { return []; }
    private function getConversionRate($orgId) { return 28.5; }
    private function getTopDestinations($orgId) { return []; }
    private function getSalesByAgent($orgId) { return []; }
    private function getMonthlySalesTrend($orgId) { return []; }
}
