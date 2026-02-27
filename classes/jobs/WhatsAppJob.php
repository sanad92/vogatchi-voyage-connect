<?php
/**
 * Background job: send WhatsApp message through external API.
 */
class WhatsAppJob extends Job {
    protected $queue = 'whatsapp';
    protected $maxRetries = 3;
    protected $timeout = 30;

    public function handle(): void {
        $phone = $this->payload['phone'] ?? '';
        $message = $this->payload['message'] ?? '';
        $mediaUrl = $this->payload['media_url'] ?? null;

        if (!$phone) {
            throw new InvalidArgumentException('WhatsApp phone is required');
        }

        if (!$this->isValidPhoneNumber($phone)) {
            throw new InvalidArgumentException('Invalid phone number format');
        }

        $apiUrl = defined('WHATSAPP_API_URL') ? WHATSAPP_API_URL : '';
        $apiToken = defined('WHATSAPP_API_TOKEN') ? WHATSAPP_API_TOKEN : '';
        if (!$apiUrl || !$apiToken) {
            throw new RuntimeException('WHATSAPP_API_URL / WHATSAPP_API_TOKEN not configured');
        }

        $payload = [
            'to' => $phone,
            'text' => $message
        ];

        if ($mediaUrl) {
            $payload['media_url'] = $mediaUrl;
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiToken,
            ],
        ]);

        $response = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new RuntimeException('cURL error: ' . $curlError);
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('WhatsApp API failure: HTTP ' . $statusCode . ' response=' . (string) $response);
        }

        Logger::activity('job_whatsapp_sent', [
            'job_uuid' => $this->getUuid(),
            'phone' => $this->maskPhoneNumber($phone),
        ]);
    }

    private function isValidPhoneNumber(string $phone): bool {
        $normalized = str_replace([' ', '-'], '', $phone);
        return (bool) preg_match('/^\+\d{7,16}$/', $normalized);
    }

    private function maskPhoneNumber(string $phone): string {
        if (strlen($phone) <= 4) {
            return '****';
        }
        return str_repeat('*', max(0, strlen($phone) - 4)) . substr($phone, -4);
    }

    public function retryDelaySeconds(): int {
        $map = [20, 60, 180];
        return $map[$this->attempts - 1] ?? 300;
    }
}
