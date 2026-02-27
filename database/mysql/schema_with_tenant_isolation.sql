-- MySQL schema for Tourism Management System with Multi-Tenant Isolation
-- Make sure to create the database first: CREATE DATABASE tourism_system CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- Then run this schema inside it.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ===================================
-- Organizations Table (Multi-Tenancy)
-- ===================================

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url VARCHAR(500) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(190) NULL,
  address TEXT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMP NULL,
  max_users INT NOT NULL DEFAULT 5,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_organizations_slug (slug),
  INDEX idx_organizations_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users (with organization_id for primary org, can belong to multiple via organization_members)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','manager','sales_agent','accountant','viewer') NOT NULL DEFAULT 'viewer',
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_email_org (email, organization_id),
  INDEX idx_users_organization (organization_id),
  INDEX idx_users_active (is_active),
  CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Organization Members (for cross-org access)
CREATE TABLE IF NOT EXISTS organization_members (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','admin','manager','agent','viewer') NOT NULL DEFAULT 'viewer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_members (organization_id, user_id),
  INDEX idx_org_members_user (user_id),
  INDEX idx_org_members_org (organization_id),
  CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customer Segments (per organization)
CREATE TABLE IF NOT EXISTS customer_segments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  minimum_bookings INT DEFAULT 0,
  minimum_total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_segments_org_name (organization_id, name),
  INDEX idx_segments_org (organization_id),
  CONSTRAINT fk_segments_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customers (per organization)
CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  segment_id CHAR(36) NULL,
  last_booking_date DATE NULL,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_org (organization_id),
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_email (email),
  CONSTRAINT fk_customers_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_customers_segment FOREIGN KEY (segment_id) REFERENCES customer_segments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Employees (per organization)
CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employees_org (organization_id),
  INDEX idx_employees_email (email),
  CONSTRAINT fk_employees_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Booking Statuses (per organization - can be customized)
CREATE TABLE IF NOT EXISTS booking_statuses (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  name_ar VARCHAR(80) NOT NULL,
  color VARCHAR(20) DEFAULT '#6b7280',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_statuses_org_name (organization_id, name),
  INDEX idx_statuses_org (organization_id),
  CONSTRAINT fk_statuses_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hotel Bookings (per organization)
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
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
  UNIQUE KEY uk_bookings_org_number (organization_id, booking_number),
  INDEX idx_bookings_org (organization_id),
  INDEX idx_bookings_customer (customer_id),
  INDEX idx_bookings_status (status_id),
  CONSTRAINT fk_hb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_hb_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_hb_status FOREIGN KEY (status_id) REFERENCES booking_statuses(id) ON DELETE SET NULL,
  CONSTRAINT fk_hb_agent FOREIGN KEY (booking_agent_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Flight Bookings (per organization)
CREATE TABLE IF NOT EXISTS flight_bookings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  booking_number VARCHAR(40) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  departure_airport VARCHAR(100) NOT NULL,
  arrival_airport VARCHAR(100) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NULL,
  departure_time TIME NULL,
  arrival_time TIME NULL,
  trip_type VARCHAR(50) DEFAULT 'one_way',
  number_of_passengers INT NOT NULL,
  airline_name VARCHAR(255) NULL,
  flight_number VARCHAR(50) NULL,
  ticket_price_per_person DECIMAL(12,2) NOT NULL,
  taxes_and_fees DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL,
  supplier_cost DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'EGP',
  total_profit DECIMAL(12,2) DEFAULT 0,
  booking_reference_supplier VARCHAR(50) NULL,
  booking_agent_id CHAR(36) NULL,
  booking_agent_name VARCHAR(150) NULL,
  booking_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_flight_bookings_org_number (organization_id, booking_number),
  INDEX idx_flight_bookings_org (organization_id),
  INDEX idx_flight_bookings_customer (customer_id),
  CONSTRAINT fk_fb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Car Rentals (per organization)
CREATE TABLE IF NOT EXISTS car_rentals (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  booking_number VARCHAR(40) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME DEFAULT '09:00',
  return_date DATE NOT NULL,
  return_time TIME DEFAULT '09:00',
  rental_days INT NOT NULL,
  car_model VARCHAR(150) NULL,
  car_year INT NULL,
  car_color VARCHAR(50) NULL,
  transmission_type VARCHAR(50) DEFAULT 'automatic',
  fuel_type VARCHAR(50) DEFAULT 'gasoline',
  rental_price_per_day DECIMAL(12,2) NOT NULL,
  insurance_cost DECIMAL(12,2) DEFAULT 0,
  additional_services_cost DECIMAL(12,2) DEFAULT 0,
  total_cost_customer DECIMAL(12,2) NOT NULL,
  supplier_cost_per_day DECIMAL(12,2) DEFAULT 0,
  total_supplier_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'EGP',
  booking_reference_supplier VARCHAR(50) NULL,
  driver_license_number VARCHAR(100) NULL,
  insurance_type VARCHAR(50) DEFAULT 'basic',
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  booking_agent_id CHAR(36) NULL,
  booking_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_car_rentals_org_number (organization_id, booking_number),
  INDEX idx_car_rentals_org (organization_id),
  INDEX idx_car_rentals_customer (customer_id),
  CONSTRAINT fk_cr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoices (per organization)
CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
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
  UNIQUE KEY uk_invoices_org_number (organization_id, invoice_number),
  INDEX idx_invoices_org (organization_id),
  INDEX idx_invoices_customer (customer_id),
  INDEX idx_invoices_status (status),
  CONSTRAINT fk_inv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_booking FOREIGN KEY (booking_id) REFERENCES hotel_bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoice Items (per invoice)
CREATE TABLE IF NOT EXISTS invoice_items (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  invoice_id CHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customer Communications (per organization)
CREATE TABLE IF NOT EXISTS customer_communications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
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
  INDEX idx_communications_org (organization_id),
  INDEX idx_communications_customer (customer_id),
  CONSTRAINT fk_cc_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Service Requests (per organization)
CREATE TABLE IF NOT EXISTS service_requests (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(190) NULL,
  service_type VARCHAR(80) NOT NULL DEFAULT 'general',
  message TEXT NULL,
  preferred_contact ENUM('phone','whatsapp','email') NOT NULL DEFAULT 'phone',
  status ENUM('pending','in_progress','done') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_requests_org (organization_id),
  INDEX idx_service_requests_status (status),
  CONSTRAINT fk_sr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Expense Transactions (per organization)
CREATE TABLE IF NOT EXISTS expense_transactions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  transaction_number VARCHAR(40) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EGP',
  description TEXT NOT NULL,
  reference_id CHAR(36) NULL,
  reference_type VARCHAR(50) NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  transaction_date DATE NOT NULL,
  status ENUM('pending','approved','rejected','paid') DEFAULT 'pending',
  receipt_number VARCHAR(100) NULL,
  approved_by CHAR(36) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_transactions_org_number (organization_id, transaction_number),
  INDEX idx_transactions_org (organization_id),
  INDEX idx_transactions_date (transaction_date),
  INDEX idx_transactions_status (status),
  CONSTRAINT fk_transactions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- WhatsApp Conversations (per organization)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NULL,
  phone_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NULL,
  status ENUM('active','closed','archived') DEFAULT 'active',
  assigned_to CHAR(36) NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_whatsapp_conv_org (organization_id),
  INDEX idx_whatsapp_conv_phone (phone_number),
  INDEX idx_whatsapp_conv_status (status),
  CONSTRAINT fk_whatsapp_conv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_whatsapp_conv_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- WhatsApp Messages (inherited organization from conversation)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  sender_type ENUM('customer','agent','system') NOT NULL,
  sender_id CHAR(36) NULL,
  message_content TEXT NOT NULL,
  message_type ENUM('text','image','document') DEFAULT 'text',
  media_url VARCHAR(500) NULL,
  status ENUM('sent','delivered','read') DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_whatsapp_msgs_conv (conversation_id),
  INDEX idx_whatsapp_msgs_sent (sent_at),
  CONSTRAINT fk_whatsapp_msgs_conv FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bank Accounts (per organization)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  iban VARCHAR(100) NULL,
  currency VARCHAR(10) DEFAULT 'EGP',
  account_type VARCHAR(50) DEFAULT 'business',
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bank_accounts_org (organization_id),
  INDEX idx_bank_accounts_active (is_active),
  CONSTRAINT fk_bank_accounts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chart of Accounts (per organization)
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

-- Salary payments (optional payroll table)
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

-- Site Settings (per organization)
CREATE TABLE IF NOT EXISTS site_settings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  setting_key VARCHAR(255) NOT NULL,
  setting_value TEXT NULL,
  setting_type VARCHAR(50) DEFAULT 'text',
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_site_settings_org_key (organization_id, setting_key),
  INDEX idx_site_settings_org (organization_id),
  CONSTRAINT fk_site_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Landing Content (per organization)
CREATE TABLE IF NOT EXISTS landing_content (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  section VARCHAR(100) NOT NULL,
  section_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NULL,
  content TEXT NULL,
  subtitle VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  icon_name VARCHAR(100) NULL,
  order_index INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_landing_content_org (organization_id),
  INDEX idx_landing_content_section (section),
  CONSTRAINT fk_landing_content_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Log (per organization - for security monitoring)
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

-- ===================================
-- Seed minimal data
-- ===================================

-- Create organizations table structure
-- (Data will be synced from Supabase)

-- Seed booking statuses for each organization (placeholder)
-- Will be created per organization dynamically

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(is_active);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_date ON hotel_bookings(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_org_date ON flight_bookings(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, created_at);

-- ===================================
-- Multi-Tenancy Enforcement Notes
-- ===================================
/*
This schema enforces multi-tenant isolation through:

1. organization_id field in every data table
2. Foreign key constraints linking to organizations table
3. Unique constraints combining organization_id with business keys
4. Indexes on organization_id for query performance
5. Cascade delete to prevent orphaned records
6. Audit logging for security compliance

All application queries MUST filter by organization_id
and validate that the user belongs to that organization.
*/
