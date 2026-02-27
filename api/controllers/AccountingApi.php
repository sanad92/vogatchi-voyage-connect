<?php
/**
 * Accounting API controller
 * simple read/write endpoints for chart of accounts and journal reports
 */
require_once __DIR__ . '/../../classes/ApiController.php';
require_once __DIR__ . '/../../classes/services/AccountingService.php';

class AccountingApi extends ApiController {
    public function get() {
        $this->throttle();
        $this->auth->requireLogin();
        $this->rbac->require(Permission::ACCOUNTING_VIEW);

        $svc = new AccountingService();
        $action = $_GET['action'] ?? 'trial';
        switch ($action) {
            case 'trial':
                $date = $_GET['date'] ?? null;
                $result = $svc->trialBalance($date);
                break;
            case 'pl':
                $start = $_GET['start'] ?? null;
                $end = $_GET['end'] ?? null;
                $result = $svc->profitAndLoss($start, $end);
                break;
            case 'bs':
                $asOf = $_GET['as_of'] ?? null;
                $result = $svc->balanceSheet($asOf);
                break;
            case 'entries':
                $filters = [];
                if (!empty($_GET['from'])) $filters['date_from'] = $_GET['from'];
                if (!empty($_GET['to'])) $filters['date_to'] = $_GET['to'];
                require_once __DIR__ . '/../../classes/repositories/JournalEntryRepository.php';
                $repo = new JournalEntryRepository();
                $result = $repo->getEntries($filters);
                break;
            default:
                throw new Exception('Unknown accounting action');
        }

        $this->success($result);
    }

    public function post() {
        $this->throttle();
        $this->auth->requireLogin();
        $this->rbac->require(Permission::ACCOUNTING_MANAGE);

        $svc = new AccountingService();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Invalid JSON');
        }
        // expecting entry_date, description, lines
        $id = $svc->postEntry(
            $input['entry_date'] ?? date('Y-m-d'),
            $input['description'] ?? '',
            $input['lines'] ?? [],
            $input['reference'] ?? null,
            $this->auth->getCurrentUser()['id']
        );
        $this->success(['id' => $id]);
    }
}
