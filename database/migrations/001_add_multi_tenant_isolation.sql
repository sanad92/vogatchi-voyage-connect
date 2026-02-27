-- Multi-Tenant Isolation Migration Script
-- Run this migration to add organization_id to all existing tables
-- 
-- IMPORTANT: Backup your database before running this!
-- 
-- This script should be run in phases:
-- Phase 1: Add columns
-- Phase 2: Populate data
-- Phase 3: Add constraints

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ==========================================
-- Phase 1: Add organizations table (if not exists)
-- ==========================================

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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- Phase 2a: Add organization_id columns
-- ==========================================

-- If columns don't already exist, add them
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER email;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE customer_segments ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE booking_statuses ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE flight_bookings ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE car_rentals ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER invoice_id;
ALTER TABLE customer_communications ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE expense_transactions ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;
ALTER TABLE landing_content ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL AFTER id;

-- ==========================================
-- Phase 2b: Create default organization (if needed)
-- ==========================================

-- Create a default organization for existing data
-- Modify these values to match your company
INSERT IGNORE INTO organizations (id, name, slug, plan, max_users, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default-org',
  'professional',
  100,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ==========================================
-- Phase 2c: Migrate existing data
-- ==========================================

-- IMPORTANT: Update '00000000-0000-0000-0000-000000000001' to your actual default org ID

UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE customers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE suppliers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE employees SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE customer_segments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE booking_statuses SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE hotel_bookings SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE flight_bookings SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE car_rentals SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE invoices SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- For invoice_items, need to join from invoices
UPDATE invoice_items SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL AND invoice_id IN (
  SELECT DISTINCT id FROM invoices
);

UPDATE customer_communications SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE service_requests SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE expense_transactions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE whatsapp_conversations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE bank_accounts SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE site_settings SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE landing_content SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- ==========================================
-- Phase 3a: Modify columns to NOT NULL
-- ==========================================

ALTER TABLE users 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE customers 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE suppliers 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE employees 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE customer_segments 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE booking_statuses 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE hotel_bookings 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE flight_bookings 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE car_rentals 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE invoices 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE invoice_items 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE customer_communications 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE service_requests 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE expense_transactions 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE whatsapp_conversations 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE bank_accounts 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE site_settings 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

ALTER TABLE landing_content 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL;

-- ==========================================
-- Phase 3b: Add Foreign Key Constraints
-- ==========================================

-- Add FK if it doesn't already exist
ALTER TABLE users 
  ADD CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE customers 
  ADD CONSTRAINT fk_customers_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE suppliers 
  ADD CONSTRAINT fk_suppliers_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE employees 
  ADD CONSTRAINT fk_employees_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE customer_segments 
  ADD CONSTRAINT fk_segments_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE booking_statuses 
  ADD CONSTRAINT fk_statuses_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE hotel_bookings 
  ADD CONSTRAINT fk_hb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE flight_bookings 
  ADD CONSTRAINT fk_fb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE car_rentals 
  ADD CONSTRAINT fk_cr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE invoices 
  ADD CONSTRAINT fk_inv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE customer_communications 
  ADD CONSTRAINT fk_cc_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE service_requests 
  ADD CONSTRAINT fk_sr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE expense_transactions 
  ADD CONSTRAINT fk_transactions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE whatsapp_conversations 
  ADD CONSTRAINT fk_whatsapp_conv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE bank_accounts 
  ADD CONSTRAINT fk_bank_accounts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE site_settings 
  ADD CONSTRAINT fk_site_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE landing_content 
  ADD CONSTRAINT fk_landing_content_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ==========================================
-- Phase 4: Add/Update Indexes
-- ==========================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_org_email ON users(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_email ON customers(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_segments_org ON customer_segments(organization_id);
CREATE INDEX IF NOT EXISTS idx_statuses_org ON booking_statuses(organization_id);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org ON hotel_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_date ON hotel_bookings(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_status ON hotel_bookings(organization_id, booking_status);

CREATE INDEX IF NOT EXISTS idx_flight_bookings_org ON flight_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_org_date ON flight_bookings(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_car_rentals_org ON car_rentals(organization_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_org_date ON car_rentals(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_communications_org ON customer_communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_org ON service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON expense_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_org ON whatsapp_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_org ON site_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_landing_content_org ON landing_content(organization_id);

-- ==========================================
-- Phase 5: Create Audit Log Table (Optional)
-- ==========================================

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

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check all tables have organization_id
/*
SELECT 
  TABLE_NAME,
  IF(COLUMN_NAME IS NOT NULL, 'YES', 'NO') as has_organization_id
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND c.COLUMN_NAME = 'organization_id'
WHERE t.TABLE_SCHEMA = 'tourism_system'
AND t.TABLE_TYPE = 'BASE TABLE'
AND t.TABLE_NAME NOT IN ('organizations', 'organization_members')
ORDER BY t.TABLE_NAME;
*/

-- Check for orphaned records (records with NULL organization_id)
/*
SELECT 'customers' as table_name, COUNT(*) as null_count FROM customers WHERE organization_id IS NULL
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers WHERE organization_id IS NULL
UNION ALL
SELECT 'hotel_bookings', COUNT(*) FROM hotel_bookings WHERE organization_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE organization_id IS NULL;
*/

-- Count records per organization
/*
SELECT 
  o.name,
  (SELECT COUNT(*) FROM customers WHERE organization_id = o.id) as customers,
  (SELECT COUNT(*) FROM hotel_bookings WHERE organization_id = o.id) as hotel_bookings,
  (SELECT COUNT(*) FROM invoices WHERE organization_id = o.id) as invoices
FROM organizations o
WHERE o.is_active = 1;
*/
