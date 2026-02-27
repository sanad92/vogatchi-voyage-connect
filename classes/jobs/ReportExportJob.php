<?php
/**
 * Background job: export operational reports.
 */
class ReportExportJob extends Job {
    protected $queue = 'reports';
    protected $maxRetries = 3;
    protected $timeout = 300;

    public function handle(): void {
        $db = Database::getInstance();
        $report_type = $this->payload['report_type'] ?? null;
        $format = strtolower($this->payload['format'] ?? 'csv');
        $filters = $this->payload['filters'] ?? [];
        $organization_id = $this->payload['organization_id'] ?? ($_SESSION['organization_id'] ?? null);

        if (!$report_type) {
            throw new InvalidArgumentException('report_type is required');
        }

        if (!in_array($format, ['csv', 'json'], true)) {
            $format = 'csv';
        }

        $rows = $this->queryRows($report_type, $organization_id, $filters);
        if (empty($rows)) {
            throw new RuntimeException('No data found for report export');
        }

        $dir = __DIR__ . '/../../storage/reports';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $filePath = $dir . '/report_' . $report_type . '_' . date('Ymd_His') . '.' . $format;
        if ($format === 'json') {
            $content = json_encode([
                'report_type' => $report_type,
                'generated_at' => date('c'),
                'rows' => $rows,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            if (@file_put_contents($filePath, $content) === false) {
                throw new RuntimeException('Unable to write report file');
            }
        } else {
            $this->writeCsv($filePath, $rows);
        }

        $db->insert('report_exports', [
            'job_uuid' => $this->getUuid(),
            'organization_id' => $organization_id,
            'report_type' => $report_type,
            'format' => $format,
            'file_path' => $filePath,
            'status' => 'completed',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Logger::activity('job_report_exported', [
            'job_uuid' => $this->getUuid(),
            'report_type' => $report_type,
            'format' => $format,
            'rows' => count($rows),
        ]);
    }

    private function queryRows(string $reportType, ?string $organizationId, array $filters): array {
        $db = Database::getInstance();

        if ($reportType === 'customers') {
            $sql = 'SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC LIMIT 10000';
            return $db->select($sql);
        }

        if ($reportType === 'invoices') {
            $sql = 'SELECT id, invoice_number, customer_id, final_amount, status, issued_date, created_at FROM invoices';
            $params = [];
            if ($organizationId && $this->hasColumn('invoices', 'organization_id')) {
                $sql .= ' WHERE organization_id = ?';
                $params[] = $organizationId;
            }
            $sql .= ' ORDER BY created_at DESC LIMIT 10000';
            return $db->select($sql, $params);
        }

        if ($reportType === 'bookings') {
            $sql = 'SELECT id, booking_number, customer_id, check_in_date, check_out_date, total_cost_customer, created_at FROM hotel_bookings';
            $params = [];
            if ($organizationId && $this->hasColumn('hotel_bookings', 'organization_id')) {
                $sql .= ' WHERE organization_id = ?';
                $params[] = $organizationId;
            }
            $sql .= ' ORDER BY created_at DESC LIMIT 10000';
            return $db->select($sql, $params);
        }

        throw new InvalidArgumentException('Unsupported report_type: ' . $reportType);
    }

    private function writeCsv(string $filePath, array $rows): void {
        $handle = fopen($filePath, 'w');
        if (!$handle) {
            throw new RuntimeException('Unable to open CSV file');
        }

        try {
            $headers = array_keys($rows[0]);
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
        } finally {
            fclose($handle);
        }
    }

    private function hasColumn(string $table, string $column): bool {
        $db = Database::getInstance();
        $row = $db->selectOne(
            'SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
            [$table, $column]
        );
        return (bool)$row;
    }

    public function failed(Throwable $exception): void {
        parent::failed($exception);

        Database::getInstance()->insert('report_exports', [
            'job_uuid' => $this->getUuid(),
            'organization_id' => $this->payload['organization_id'] ?? null,
            'report_type' => $this->payload['report_type'] ?? 'unknown',
            'format' => strtolower($this->payload['format'] ?? 'csv'),
            'file_path' => null,
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        Logger::error('job_report_export_failed', 'error', ['job_uuid' => $this->getUuid(), 'message' => $exception->getMessage()]);
}

    }
