<?php

require_once __DIR__ . '/../QueueBootstrap.php';

class JobDispatcher {
    private $queue;

    public function __construct() {
        $this->queue = JobQueue::getInstance();
    }

    public function dispatchEmail(array $payload, int $delaySeconds = 0): string {
        $job = new EmailJob($payload);
        return $this->queue->dispatch($job, 'email', $delaySeconds);
    }

    public function dispatchWhatsApp(array $payload, int $delaySeconds = 0): string {
        $job = new WhatsAppJob($payload);
        return $this->queue->dispatch($job, 'whatsapp', $delaySeconds);
    }

    public function dispatchInvoiceGeneration(array $payload, int $delaySeconds = 0): string {
        $job = new InvoiceGenerationJob($payload);
        return $this->queue->dispatch($job, 'invoices', $delaySeconds);
    }

    public function dispatchReportExport(array $payload, int $delaySeconds = 0): string {
        $job = new ReportExportJob($payload);
        return $this->queue->dispatch($job, 'reports', $delaySeconds);
    }
}
