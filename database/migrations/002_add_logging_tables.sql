-- Add activity_logs and error_logs tables for centralized logging

CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT NULL,
  ip_address VARCHAR(50) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_org (organization_id),
  INDEX idx_activity_logs_user (user_id),
  INDEX idx_activity_logs_created (created_at),
  CONSTRAINT fk_activity_logs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS error_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  message VARCHAR(500) NOT NULL,
  severity ENUM('info','warning','error','critical') NOT NULL DEFAULT 'error',
  context JSON NULL,
  ip_address VARCHAR(50) NULL,
  user_agent VARCHAR(500) NULL,
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_error_logs_org (organization_id),
  INDEX idx_error_logs_created (created_at),
  INDEX idx_error_logs_severity (severity),
  CONSTRAINT fk_error_logs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
