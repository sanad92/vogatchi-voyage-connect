-- Migration 007: Background Jobs Queue
-- Adds database-backed queue with retries and failure logging

CREATE TABLE IF NOT EXISTS jobs_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_uuid VARCHAR(64) NOT NULL,
  queue VARCHAR(64) NOT NULL DEFAULT 'default',
  job_class VARCHAR(191) NOT NULL,
  payload JSON NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  timeout_seconds INT NOT NULL DEFAULT 120,
  status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  available_at DATETIME NOT NULL,
  reserved_at DATETIME NULL,
  completed_at DATETIME NULL,
  failed_at DATETIME NULL,
  last_error TEXT NULL,
  result TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_jobs_queue_uuid (job_uuid),
  KEY idx_jobs_queue_status_available (status, available_at),
  KEY idx_jobs_queue_queue_status_available (queue, status, available_at),
  KEY idx_jobs_queue_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_failures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_uuid VARCHAR(64) NOT NULL,
  queue_job_id BIGINT UNSIGNED NULL,
  job_class VARCHAR(191) NOT NULL,
  payload JSON NULL,
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL,
  stack_trace MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_job_failures_job_uuid (job_uuid),
  KEY idx_job_failures_created (created_at),
  CONSTRAINT fk_job_failures_queue_job
    FOREIGN KEY (queue_job_id) REFERENCES jobs_queue(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS generated_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_uuid VARCHAR(64) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'html',
  file_path VARCHAR(500) NOT NULL,
  status ENUM('generated','failed') NOT NULL DEFAULT 'generated',
  error_message TEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_generated_invoices_invoice (invoice_id),
  KEY idx_generated_invoices_job_uuid (job_uuid),
  CONSTRAINT fk_generated_invoices_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_exports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_uuid VARCHAR(64) NOT NULL,
  organization_id CHAR(36) NULL,
  report_type VARCHAR(64) NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'csv',
  file_path VARCHAR(500) NULL,
  status ENUM('completed','failed') NOT NULL DEFAULT 'completed',
  error_message TEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_report_exports_org (organization_id),
  KEY idx_report_exports_type (report_type),
  KEY idx_report_exports_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
