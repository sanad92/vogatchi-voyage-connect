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
