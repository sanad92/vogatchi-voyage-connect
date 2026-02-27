# File Upload Integration Example

This document shows how to integrate usage tracking into file upload handlers.

## Setup

Ensure the following files exist:
- `classes/services/UsageTracker.php`
- Database schema with `storage_usage` table

## Example 1: Simple File Upload Handler

```php
<?php
// upload.php - Simple file upload endpoint

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/TenantMiddleware.php';
require_once __DIR__ . '/classes/services/UsageTracker.php';

// Validate tenant/auth
TenantMiddleware::validateRequest();
$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();
$user_id = $_SESSION['user_id'] ?? null;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file provided']);
    exit;
}

$file = $_FILES['file'];
$max_size = 100 * 1024 * 1024; // 100 MB limit

// Validate file
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Upload error: ' . $file['error']]);
    exit;
}

if ($file['size'] > $max_size) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large (max 100 MB)']);
    exit;
}

// Sanitize filename
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
$file_id = uniqid('file_');
$upload_dir = __DIR__ . '/uploads/' . $org_id . '/';

// Create directory if needed
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$file_path = $upload_dir . $file_id . '_' . $filename;

// Move file
if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

// Track file upload
try {
    $tracker = new UsageTracker($db, $org_id);
    $tracker->trackStorageUpload(
        $filename,
        $file['size'],
        $file_path,
        $user_id
    );
} catch (Exception $e) {
    error_log("Failed to track storage upload: " . $e->getMessage());
    // Don't fail the upload if tracking fails
}

// Return response
http_response_code(201);
echo json_encode([
    'success' => true,
    'file_id' => $file_id,
    'filename' => $filename,
    'size' => $file['size'],
    'url' => '/uploads/' . $org_id . '/' . $file_id . '_' . $filename
]);
?>
```

## Example 2: File Delete Handler

```php
<?php
// delete_file.php - Delete file endpoint

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/TenantMiddleware.php';
require_once __DIR__ . '/classes/services/UsageTracker.php';

TenantMiddleware::validateRequest();
$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$file_id = $body['file_id'] ?? null;

if (!$file_id) {
    http_response_code(400);
    echo json_encode(['error' => 'file_id required']);
    exit;
}

// Retrieve file record
$file_record = $db->selectOne(
    "SELECT id, file_path FROM storage_usage WHERE id = :id AND organization_id = :org AND deleted_at IS NULL",
    ['id' => $file_id, 'org' => $org_id]
);

if (!$file_record) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

// Delete physical file
if (file_exists($file_record['file_path'])) {
    unlink($file_record['file_path']);
}

// Track deletion in database
try {
    $tracker = new UsageTracker($db, $org_id);
    $tracker->trackStorageDeletion($file_id);
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'File deleted']);
} catch (Exception $e) {
    error_log("Failed to track storage deletion: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete file']);
}
?>
```

## Example 3: Document Upload (with Invoice Creation)

```php
<?php
// upload_invoice_document.php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/TenantMiddleware.php';
require_once __DIR__ . '/classes/services/UsageTracker.php';

TenantMiddleware::validateRequest();
$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();
$user_id = $_SESSION['user_id'] ?? null;

if (!isset($_FILES['document'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No document provided']);
    exit;
}

$file = $_FILES['document'];
$invoice_id = $_POST['invoice_id'] ?? null;

if (!$invoice_id) {
    http_response_code(400);
    echo json_encode(['error' => 'invoice_id required']);
    exit;
}

// Save document
$upload_dir = __DIR__ . '/uploads/' . $org_id . '/invoices/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
$file_path = $upload_dir . $invoice_id . '_' . date('Y-m-d_H-i-s') . '_' . $filename;

if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save document']);
    exit;
}

// Track storage
try {
    $tracker = new UsageTracker($db, $org_id);
    
    // Track file
    $tracker->trackStorageUpload(
        'invoice_' . $invoice_id . '_' . $filename,
        $file['size'],
        $file_path,
        $user_id
    );
    
    // Store document reference in database
    $doc_id = $db->generateUUID();
    $db->insert('invoice_documents', [
        'id' => $doc_id,
        'invoice_id' => $invoice_id,
        'organization_id' => $org_id,
        'file_name' => $filename,
        'file_path' => $file_path,
        'file_size' => $file['size'],
        'uploaded_by' => $user_id,
        'created_at' => date('Y-m-d H:i:s')
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'document_id' => $doc_id,
        'file_size' => $file['size']
    ]);
    
} catch (Exception $e) {
    error_log("Document upload error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to process document']);
}
?>
```

## Example 4: Bulk Upload with Progress Tracking

```php
<?php
// bulk_upload.php - Upload multiple files with progress

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/TenantMiddleware.php';
require_once __DIR__ . '/classes/services/UsageTracker.php';

TenantMiddleware::validateRequest();
$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();
$user_id = $_SESSION['user_id'] ?? null;

if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No files provided']);
    exit;
}

$files = $_FILES['files'];
$upload_dir = __DIR__ . '/uploads/' . $org_id . '/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$tracker = new UsageTracker($db, $org_id);
$uploaded = [];
$errors = [];

// Process each file
for ($i = 0; $i < count($files['name']); $i++) {
    $file = [
        'name' => $files['name'][$i],
        'tmp_name' => $files['tmp_name'][$i],
        'size' => $files['size'][$i],
        'error' => $files['error'][$i]
    ];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = [
            'file' => $file['name'],
            'error' => 'Upload error: ' . $file['error']
        ];
        continue;
    }

    // Sanitize and move
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
    $file_id = uniqid('file_');
    $file_path = $upload_dir . $file_id . '_' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        $errors[] = [
            'file' => $file['name'],
            'error' => 'Failed to save'
        ];
        continue;
    }

    // Track in database
    try {
        $tracker->trackStorageUpload(
            $filename,
            $file['size'],
            $file_path,
            $user_id
        );

        $uploaded[] = [
            'file_id' => $file_id,
            'filename' => $filename,
            'size' => $file['size']
        ];
    } catch (Exception $e) {
        $errors[] = [
            'file' => $file['name'],
            'error' => 'Tracking failed'
        ];
    }
}

http_response_code(207); // Multi-status
echo json_encode([
    'success' => true,
    'uploaded' => count($uploaded),
    'failed' => count($errors),
    'files' => $uploaded,
    'errors' => $errors
]);
?>
```

## Example 5: Stream Large File (with Chunked Upload)

```php
<?php
// chunked_upload.php - Handle large file uploads in chunks

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Database.php';
require_once __DIR__ . '/classes/TenantMiddleware.php';
require_once __DIR__ . '/classes/services/UsageTracker.php';

TenantMiddleware::validateRequest();
$db = Database::getInstance();
$org_id = TenantMiddleware::getOrganizationId();
$user_id = $_SESSION['user_id'] ?? null;

// Chunked upload metadata
$upload_id = $_POST['upload_id'] ?? null;
$chunk_number = (int)($_POST['chunk_number'] ?? 0);
$chunk_total = (int)($_POST['chunk_total'] ?? 1);
$filename = $_POST['filename'] ?? 'upload';
$file = $_FILES['chunk'] ?? null;

if (!$upload_id || !$file) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

$chunk_dir = __DIR__ . '/uploads/' . $org_id . '/.chunks/' . $upload_id . '/';
if (!is_dir($chunk_dir)) {
    mkdir($chunk_dir, 0755, true);
}

// Save chunk
$chunk_path = $chunk_dir . 'chunk_' . $chunk_number;
if (!move_uploaded_file($file['tmp_name'], $chunk_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save chunk']);
    exit;
}

// Check if all chunks received
$received_chunks = count(glob($chunk_dir . 'chunk_*'));
if ($received_chunks < $chunk_total) {
    http_response_code(202); // Accepted, not complete
    echo json_encode([
        'success' => true,
        'chunk' => $chunk_number,
        'progress' => round($received_chunks / $chunk_total * 100)
    ]);
    exit;
}

// All chunks received, assemble file
$sanitized_filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
$file_id = uniqid('file_');
$final_path = __DIR__ . '/uploads/' . $org_id . '/' . $file_id . '_' . $sanitized_filename;

$out = fopen($final_path, 'wb');
for ($i = 1; $i <= $chunk_total; $i++) {
    $chunk_file = $chunk_dir . 'chunk_' . $i;
    if (file_exists($chunk_file)) {
        fwrite($out, file_get_contents($chunk_file));
        unlink($chunk_file);
    }
}
fclose($out);
rmdir($chunk_dir);

// Track complete upload
try {
    $tracker = new UsageTracker($db, $org_id);
    $total_size = filesize($final_path);
    
    $tracker->trackStorageUpload(
        $sanitized_filename,
        $total_size,
        $final_path,
        $user_id
    );

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'file_id' => $file_id,
        'filename' => $sanitized_filename,
        'size' => $total_size,
        'message' => 'Upload complete'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to finalize upload']);
}
?>
```

## Frontend Integration Examples

### JavaScript: Simple Upload

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/upload.php', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data;
}
```

### JavaScript: Chunked Upload for Large Files

```javascript
async function uploadChunked(file, chunkSize = 5 * 1024 * 1024) {
  const uploadId = 'upload_' + Date.now();
  const chunks = Math.ceil(file.size / chunkSize);

  for (let i = 1; i <= chunks; i++) {
    const start = (i - 1) * chunkSize;
    const end = Math.min(i * chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('upload_id', uploadId);
    formData.append('chunk_number', i);
    formData.append('chunk_total', chunks);
    formData.append('filename', file.name);

    const response = await fetch('/chunked_upload.php', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    console.log(`Chunk ${i}/${chunks}: ${data.progress || 100}%`);

    if (response.status === 201) {
      return data;
    }
  }
}
```

## Notes

1. **Storage Tracking**: Each upload call creates a record in `storage_usage` table. Total storage is calculated by summing active files (deleted_at IS NULL).

2. **Soft Deletes**: Files are soft-deleted (marked with `deleted_at` timestamp) rather than physically removed to maintain audit trail.

3. **Performance**: For high-volume uploads, consider:
   - Batching storage tracking (track after 10 files, not per-file)
   - Using async jobs or queues for large files
   - Implementing rate limiting per organization

4. **Security**: 
   - Always validate file types
   - Implement size limits per organization based on subscription plan
   - Sanitize filenames to prevent path traversal
   - Store files outside web root when possible

5. **Monitoring**: Query storage usage in dashboard:
   ```sql
   SELECT SUM(file_size_bytes) / (1024*1024) as total_mb
   FROM storage_usage
   WHERE organization_id = ? AND deleted_at IS NULL;
   ```

