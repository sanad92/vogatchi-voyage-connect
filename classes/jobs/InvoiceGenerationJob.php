<?php
/**
 * Background job: generate invoice file artifact.
 */
class InvoiceGenerationJob extends Job {
    protected $queue = 'invoices';
    protected $maxRetries = 3;
    protected $timeout = 120;

    public function handle(): void {
        $db = Database::getInstance();
        $invoice_id = $this->payload['invoice_id'] ?? null;
        $format = strtolower($this->payload['format'] ?? 'html');

        if (!$invoice_id) {
            throw new InvalidArgumentException('invoice_id is required');
        }

        $invoice = $db->selectOne('SELECT * FROM invoices WHERE id = ?', [$invoice_id]);
        if (!$invoice) {
            throw new RuntimeException('Invoice not found: ' . $invoice_id);
        }

        $items = $db->select('SELECT * FROM invoice_items WHERE invoice_id = ?', [$invoice_id]);

        $dir = __DIR__ . '/../../storage/invoices';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        if (!in_array($format, ['html', 'json'], true)) {
            $format = 'html';
        }

        $filePath = $dir . '/invoice_' . $invoice_id . '_' . date('Ymd_His') . '.' . $format;

        if ($format === 'json') {
            $content = json_encode([
                'invoice' => $invoice,
                'items' => $items,
                'generated_at' => date('c'),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            $content = $this->buildHtml($invoice, $items);
        }

        $bytes = @file_put_contents($filePath, $content);
        if ($bytes === false) {
            throw new RuntimeException('Failed to write invoice artifact file');
        }

        $db->insert('generated_invoices', [
            'job_uuid' => $this->getUuid(),
            'invoice_id' => $invoice_id,
            'format' => $format,
            'file_path' => $filePath,
            'status' => 'generated',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Logger::activity('job_invoice_generated', [
            'job_uuid' => $this->getUuid(),
            'invoice_id' => $invoice_id,
            'format' => $format,
        ]);
    }

    private function buildHtml(array $invoice, array $items): string {
        $rows = '';
        foreach ($items as $item) {
            $rows .= '<tr>'
                . '<td>' . htmlspecialchars((string)($item['description'] ?? ''), ENT_QUOTES, 'UTF-8') . '</td>'
                . '<td>' . (int)($item['quantity'] ?? 0) . '</td>'
                . '<td>' . htmlspecialchars((string)($item['unit_price'] ?? '0'), ENT_QUOTES, 'UTF-8') . '</td>'
                . '<td>' . htmlspecialchars((string)($item['total_price'] ?? '0'), ENT_QUOTES, 'UTF-8') . '</td>'
                . '</tr>';
        }

        return '<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title></head><body>'
            . '<h1>Invoice ' . htmlspecialchars((string)$invoice['invoice_number'], ENT_QUOTES, 'UTF-8') . '</h1>'
            . '<p>Status: ' . htmlspecialchars((string)$invoice['status'], ENT_QUOTES, 'UTF-8') . '</p>'
            . '<table border="1" cellspacing="0" cellpadding="6">'
            . '<thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>'
            . '<tbody>' . $rows . '</tbody>'
            . '</table>'
            . '<h3>Final Amount: ' . htmlspecialchars((string)$invoice['final_amount'], ENT_QUOTES, 'UTF-8') . '</h3>'
            . '</body></html>';
    }
}
