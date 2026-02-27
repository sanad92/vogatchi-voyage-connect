<?php
/**
 * Example: Invoices Controller (service / repository pattern)
 *
 * The business logic previously located in this controller has been moved into
 * `InvoiceService`.  The controller remains responsible for permission checks
 * and request/response handling.
 */

require_once __DIR__ . '/../../classes/services/InvoiceService.php';
require_once __DIR__ . '/../../classes/repositories/InvoiceRepository.php';

class InvoicesController {
    private $db;
    private $auth;
    private $rbac;
    /** @var InvoiceService */
    private $invoiceService;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;

        $this->rbac = new RBACMiddleware(
            $db,
            $auth->getCurrentUser()['id'],
            $auth->getCurrentUser()['organization_id']
        );

        $this->invoiceService = new InvoiceService(new InvoiceRepository());
        $this->invoiceService
             ->setTenant($this->auth->getCurrentUser()['organization_id'])
             ->setCurrentUser($this->auth->getCurrentUser()['id']);
    }

    public function list($filters = []) {
        try {
            $this->rbac->require(Permission::INVOICES_VIEW);
            $invoices = $this->invoiceService->getAll(1,20,$filters);

            if ($this->rbac->isAdmin() || $this->rbac->hasRole(Role::ACCOUNTANT)) {
                return ['success'=>true,'data'=>$invoices,'count'=>count($invoices)];
            } else {
                $userId = $this->auth->getCurrentUser()['id'];
                $invoices = array_filter($invoices, function($inv) use ($userId) {
                    return $inv['created_by'] === $userId;
                });
                return ['success'=>true,'data'=>$invoices,'count'=>count($invoices)];
            }
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function create($data) {
        try {
            $this->rbac->require(Permission::INVOICES_CREATE);

            if (empty($data['booking_id']) || empty($data['amount'])) {
                return ['success'=>false,'error'=>'Missing required fields'];
            }

            $data['created_by'] = $this->auth->getCurrentUser()['id'];
            $data['status'] = 'draft';

            if ($this->invoiceService->create($data)) {
                return ['success'=>true,'message'=>'Invoice created'];
            }
            return ['success'=>false,'error'=>'Failed to create invoice'];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function edit($invoiceId, $data) {
        try {
            $this->rbac->require(Permission::INVOICES_EDIT);

            $existing = $this->invoiceService->getById($invoiceId);
            if (!$existing) {
                return ['success'=>false,'error'=>'Invoice not found'];
            }
            if ($existing['status'] !== 'draft') {
                return ['success'=>false,'error'=>'Only draft invoices can be edited'];
            }

            $data['updated_by'] = $this->auth->getCurrentUser()['id'];
            if ($this->invoiceService->update($invoiceId, $data)) {
                return ['success'=>true,'message'=>'Invoice updated'];
            }
            return ['success'=>false,'error'=>'Failed to update invoice'];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function approve($invoiceId, $approvalData = []) {
        try {
            $this->rbac->require(Permission::INVOICES_APPROVE);
            if (!$this->rbac->isAdmin() && !$this->rbac->hasRole(Role::ACCOUNTANT)) {
                throw new Exception('Only accountants and admins can approve invoices');
            }

            $existing = $this->invoiceService->getById($invoiceId);
            if (!$existing) {
                return ['success'=>false,'error'=>'Invoice not found'];
            }

            $updateData = [
                'status' => 'approved',
                'approved_at' => date('Y-m-d H:i:s'),
                'approved_by' => $this->auth->getCurrentUser()['id'],
                'approval_notes' => $approvalData['notes'] ?? ''
            ];

            if ($this->invoiceService->update($invoiceId, $updateData)) {
                $this->logFinancialTransaction($invoiceId, 'APPROVED', $updateData);
                return ['success'=>true,'message'=>'Invoice approved','approval_timestamp'=>$updateData['approved_at']];
            }
            return ['success'=>false,'error'=>'Failed to approve invoice'];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function send($invoiceId) {
        try {
            $this->rbac->require(Permission::INVOICES_SEND);
            $existing = $this->invoiceService->getById($invoiceId);
            if (!$existing) {
                return ['success'=>false,'error'=>'Invoice not found'];
            }
            if ($existing['status'] !== 'approved') {
                return ['success'=>false,'error'=>'Only approved invoices can be sent'];
            }
            $sendData = [
                'status' => 'sent',
                'sent_at' => date('Y-m-d H:i:s'),
                'sent_by' => $this->auth->getCurrentUser()['id']
            ];
            if ($this->invoiceService->update($invoiceId, $sendData)) {
                $this->logFinancialTransaction($invoiceId, 'SENT', $sendData);
                return ['success'=>true,'message'=>'Invoice sent to customer','sent_timestamp'=>$sendData['sent_at']];
            }
            return ['success'=>false,'error'=>'Failed to send invoice'];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function refund($invoiceId, $refundData) {
        try {
            $this->rbac->require(Permission::INVOICES_REFUND);
            if (!$this->rbac->isAdmin() && !$this->rbac->hasRole(Role::ACCOUNTANT)) {
                throw new Exception('Insufficient permissions for refund processing');
            }
            if (empty($refundData['amount']) || empty($refundData['reason'])) {
                return ['success'=>false,'error'=>'Missing refund amount or reason'];
            }
            $existing = $this->invoiceService->getById($invoiceId);
            if (!$existing) {
                return ['success'=>false,'error'=>'Invoice not found'];
            }
            $refundId = bin2hex(random_bytes(18));
            $query = "INSERT INTO refunds (id, invoice_id, amount, reason, created_by, organization_id)
                      VALUES (?, ?, ?, ?, ?, ?)";
            $this->db->query($query, [
                $refundId,
                $invoiceId,
                $refundData['amount'],
                $refundData['reason'],
                $this->auth->getCurrentUser()['id'],
                $this->auth->getCurrentUser()['organization_id']
            ]);
            if ($refundData['amount'] >= $existing['amount']) {
                $this->invoiceService->update($invoiceId, ['status' => 'refunded']);
            }
            $this->logFinancialTransaction($invoiceId, 'REFUNDED', [
                'refund_amount' => $refundData['amount'],
                'reason' => $refundData['reason']
            ]);
            return ['success'=>true,'message'=>'Refund processed successfully','refund_id'=>$refundId];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function export($invoiceId) {
        try {
            $this->rbac->require(Permission::INVOICES_EXPORT);
            $invoiceData = $this->invoiceService->getById($invoiceId);
            if (!$invoiceData) {
                return ['success'=>false,'error'=>'Invoice not found'];
            }
            return ['success'=>true,'data'=>$invoiceData,'format'=>'pdf'];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    private function logFinancialTransaction($invoiceId, $action, $details) {
        $query = "INSERT INTO financial_audit_log (invoice_id, action, details, performed_by, organization_id, created_at)
                  VALUES (?, ?, ?, ?, ?, NOW())";
        try {
            $this->db->query($query, [
                $invoiceId,
                $action,
                json_encode($details),
                $this->auth->getCurrentUser()['id'],
                $this->auth->getCurrentUser()['organization_id']
            ]);
        } catch (Exception $e) {
            error_log("Financial audit log error: " . $e->getMessage());
        }
    }
}
