-- MySQL schema for PHP backend migration (core tables)
-- Make sure to create the database first: CREATE DATABASE tourism_system CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- Then run this schema inside it.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Users
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','manager','sales_agent','accountant','viewer') NOT NULL DEFAULT 'viewer',
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  minimum_bookings INT DEFAULT 0,
  minimum_total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  segment_id CHAR(36) NULL,
  last_booking_date DATE NULL,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_segment FOREIGN KEY (segment_id) REFERENCES customer_segments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Employees (optional basic)
CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Booking Statuses
CREATE TABLE IF NOT EXISTS booking_statuses (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(80) NOT NULL,
  name_ar VARCHAR(80) NOT NULL,
  color VARCHAR(20) DEFAULT '#6b7280',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hotel Bookings (core)
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  booking_number VARCHAR(40) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  customer_name VARCHAR(150) NULL,
  hotel_name VARCHAR(150) NULL,
  destination_city VARCHAR(120) NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_nights INT NOT NULL,
  adults INT DEFAULT 2,
  children INT DEFAULT 0,
  room_type VARCHAR(120) NULL,
  meal_plan VARCHAR(120) NULL,
  selling_price_per_night DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_per_night DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost_customer DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status_id CHAR(36) NULL,
  booking_agent_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_hb_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_hb_status FOREIGN KEY (status_id) REFERENCES booking_statuses(id) ON DELETE SET NULL,
  CONSTRAINT fk_hb_agent FOREIGN KEY (booking_agent_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hb_booking_number ON hotel_bookings(booking_number);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  invoice_number VARCHAR(40) NOT NULL,
  booking_id CHAR(36) NULL,
  customer_id CHAR(36) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  issued_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_booking FOREIGN KEY (booking_id) REFERENCES hotel_bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_number ON invoices(invoice_number);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  invoice_id CHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Customer Communications (CRM basics)
CREATE TABLE IF NOT EXISTS customer_communications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  booking_id CHAR(36) NULL,
  communication_type ENUM('call','whatsapp','email','follow_up') NOT NULL,
  direction ENUM('inbound','outbound') NOT NULL,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  content TEXT NULL,
  handled_by CHAR(36) NULL,
  scheduled_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IF NOT EXISTS idx_cc_customer ON customer_communications(customer_id);

-- Service Requests (used by api/contact.php)
CREATE TABLE IF NOT EXISTS service_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(190) NULL,
  service_type VARCHAR(80) NOT NULL DEFAULT 'general',
  message TEXT NULL,
  preferred_contact ENUM('phone','whatsapp','email') NOT NULL DEFAULT 'phone',
  status ENUM('pending','in_progress','done') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed minimal data
INSERT INTO booking_statuses (id, name, name_ar, color, is_active, sort_order)
VALUES (UUID(), 'Pending', 'قيد المعالجة', '#f59e0b', 1, 1),
       (UUID(), 'Confirmed', 'مؤكد', '#10b981', 1, 2),
       (UUID(), 'Cancelled', 'ملغي', '#ef4444', 1, 3)
ON DUPLICATE KEY UPDATE name=name;

-- Audit log for data modifications (non-tenant schema)
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id CHAR(36) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(50) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_org (organization_id),
  INDEX idx_audit_logs_user (user_id),
  INDEX idx_audit_logs_created (created_at),
  CONSTRAINT fk_audit_logs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity log for high level user actions
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

-- Error log for exceptions and system errors
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

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id CHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coa_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  INDEX idx_coa_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal entries header
CREATE TABLE IF NOT EXISTS journal_entries (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NULL,
  reference VARCHAR(100) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_je_org (organization_id),
  CONSTRAINT fk_je_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal lines
CREATE TABLE IF NOT EXISTS journal_lines (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  journal_entry_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jl_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jl_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  INDEX idx_jl_entry (journal_entry_id),
  INDEX idx_jl_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Salary payments
CREATE TABLE IF NOT EXISTS salary_payments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  salary_month DATE NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  net_amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  payment_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salary_org (organization_id),
  INDEX idx_salary_emp (employee_id),
  CONSTRAINT fk_salary_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id CHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coa_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  INDEX idx_coa_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal entries header
CREATE TABLE IF NOT EXISTS journal_entries (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NULL,
  reference VARCHAR(100) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_je_org (organization_id),
  CONSTRAINT fk_je_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal lines
CREATE TABLE IF NOT EXISTS journal_lines (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  journal_entry_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jl_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jl_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  INDEX idx_jl_entry (journal_entry_id),
  INDEX idx_jl_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Salary payments
CREATE TABLE IF NOT EXISTS salary_payments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  salary_month DATE NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  net_amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  payment_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salary_org (organization_id),
  INDEX idx_salary_emp (employee_id),
  CONSTRAINT fk_salary_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscription / billing tables
CREATE TABLE IF NOT EXISTS subscription_plans (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  features JSON NULL,
  limits JSON NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status ENUM('trialing','active','cancelled','expired') NOT NULL DEFAULT 'trialing',
  starts_at DATE NOT NULL,
  expires_at DATE NULL,
  is_trial TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_subs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_subs_org (organization_id),
  INDEX idx_subs_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usage_records (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  feature VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  usage INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_usage_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usage_period (organization_id, feature, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- seed minimal plans
INSERT INTO subscription_plans (id, name, description, features, limits, price) VALUES
  (UUID(), 'Free', 'Basic free plan', JSON_OBJECT('features','[]'), JSON_OBJECT('max_users',5,'max_bookings_per_month',10), 0),
  (UUID(), 'Pro',  'Unlimited bookings & users', JSON_OBJECT('features','[]'), JSON_OBJECT('max_users',1000,'max_bookings_per_month',100000), 49.99)
ON DUPLICATE KEY UPDATE name=name;

-- ========== COMPREHENSIVE USAGE TRACKING SYSTEM ==========

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
