<?php
/**
 * Alert Job
 * Handles sending system alerts and notifications
 */

class AlertJob extends Job {
    protected $queue = 'alerts';
    protected $maxRetries = 2;
    protected $timeout = 30;

    public function handle(): void {
        $title = $this->payload['title'] ?? 'Alert';
        $message = $this->payload['message'] ?? '';
        $severity = $this->payload['severity'] ?? 'info'; // info, warning, error, critical
        $user_id = $this->payload['user_id'] ?? null;
        $notify_method = $this->payload['notify_method'] ?? 'database'; // database, email, both
        
        try {
            // Store alert in database
            $alert_id = $this->storeAlert($title, $message, $severity, $user_id);
            
            // Send notifications
            if (in_array($notify_method, ['email', 'both'])) {
                $this->sendEmailAlert($title, $message, $severity);
            }
            
            Logger::activity('job_alert_sent', [
                'alert_id' => $alert_id,
                'title' => $title,
                'severity' => $severity,
                'job_uuid' => $this->getUuid()
            ]);
            
        } catch (Exception $e) {
            throw new Exception("Alert sending failed: " . $e->getMessage());
        }
    }

    /**
     * Store alert in database
     */
    private function storeAlert($title, $message, $severity, $user_id) {
        $sql = "INSERT INTO alerts (
            title, message, severity, user_id, created_at, read_at
        ) VALUES (?, ?, ?, ?, NOW(), NULL)";
        
        Database::getInstance()->query($sql, [$title, $message, $severity, $user_id]);
        
        return null;
    }

    /**
     * Send email alert
     */
    private function sendEmailAlert($title, $message, $severity) {
        $to = defined('ADMIN_EMAIL') ? ADMIN_EMAIL : '';
        
        if (!$to) {
            return; // No admin email configured
        }

        $subject = "[" . strtoupper($severity) . "] " . $title;
        $body = "
            <h2>$title</h2>
            <p>$message</p>
            <p>Severity: <strong>$severity</strong></p>
            <p>Time: " . date('Y-m-d H:i:s') . "</p>
        ";

        // Queue email
        try {
            $email_job = new EmailJob([
                'to' => $to,
                'subject' => $subject,
                'body' => $body,
                'html' => true
            ]);
            
            JobQueue::getInstance()->dispatch($email_job, 'email', 0);
        } catch (Exception $e) {
            Logger::error('job_alert_email_queue_failed', 'warning', ['message' => $e->getMessage()]);
        }
    }
}
