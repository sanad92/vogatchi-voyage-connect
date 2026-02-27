-- Migration 005: Comprehensive Usage Tracking System
-- Adds org_usage_summary and api_calls_log for analytics and billing

-- Organization usage summary table (daily aggregates)
CREATE TABLE IF NOT EXISTS org_usage_summary (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  bookings_created INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  storage_used_mb DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  api_calls INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_usage_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uk_org_usage_date (organization_id, date),
  INDEX idx_org_usage_org_date (organization_id, date DESC),
  INDEX idx_org_usage_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- API calls log table (granular tracking for analytics)
CREATE TABLE IF NOT EXISTS api_calls_log (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT,
  response_time_ms INT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  request_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_calls_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_calls_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_api_calls_org (organization_id),
  INDEX idx_api_calls_user (user_id),
  INDEX idx_api_calls_date (created_at DESC),
  INDEX idx_api_calls_endpoint (endpoint),
  INDEX idx_api_calls_org_date (organization_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Storage usage table (track uploads/deletions per org)
CREATE TABLE IF NOT EXISTS storage_usage (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  file_name VARCHAR(255),
  file_size_bytes BIGINT NOT NULL,
  file_path VARCHAR(500),
  upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_storage_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_storage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_storage_org (organization_id),
  INDEX idx_storage_user (user_id),
  INDEX idx_storage_date (upload_date),
  INDEX idx_storage_org_deleted (organization_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Monthly usage report (calculated aggregates for billing/reporting)
CREATE TABLE IF NOT EXISTS monthly_usage_report (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  total_bookings_created INT NOT NULL DEFAULT 0,
  max_active_users INT NOT NULL DEFAULT 0,
  avg_active_users DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_storage_mb DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_api_calls INT NOT NULL DEFAULT 0,
  avg_api_response_ms DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  api_error_count INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_monthly_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uk_monthly_org_period (organization_id, year, month),
  INDEX idx_monthly_org (organization_id),
  INDEX idx_monthly_period (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
