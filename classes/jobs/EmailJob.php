<?php
/**
 * Background job: send email.
 */
class EmailJob extends Job {
    protected $queue = 'email';
    protected $maxRetries = 5;
    protected $timeout = 60;

    public function handle(): void {
        $to = $this->payload['to'] ?? '';
        $subject = $this->payload['subject'] ?? '(no subject)';
        $body = $this->payload['body'] ?? '';
        $isHtml = (bool)($this->payload['html'] ?? true);

        if (!$to) {
            throw new InvalidArgumentException("Email 'to' is required");
        }

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("Invalid email address: {$to}");
        }

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: ' . ($isHtml ? 'text/html' : 'text/plain') . '; charset=UTF-8',
        ];

        if (!empty($this->payload['from'])) {
            $headers[] = 'From: ' . $this->payload['from'];
        }

        if (!empty($this->payload['cc'])) {
            $headers[] = 'Cc: ' . implode(',', (array) $this->payload['cc']);
        }

        if (!empty($this->payload['bcc'])) {
            $headers[] = 'Bcc: ' . implode(',', (array) $this->payload['bcc']);
        }

        $ok = @mail($to, $subject, $body, implode("\r\n", $headers));
        if (!$ok) {
            throw new RuntimeException('mail() returned false');
        }

        Logger::activity('job_email_sent', [
            'job_uuid' => $this->getUuid(),
            'to' => $to,
            'subject' => $subject,
        ]);
    }
}
