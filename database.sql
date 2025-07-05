-- ===================================
-- Tourism Management System - MySQL Database
-- تحويل النظام من PostgreSQL إلى MySQL
-- ===================================

-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS tourism_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tourism_system;

-- ===================================
-- جداول المستخدمين والصلاحيات
-- ===================================

-- جدول المستخدمين
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_active (is_active)
);

-- جدول الأدوار
CREATE TABLE user_roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager', 'sales_agent', 'accountant', 'viewer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role),
    INDEX idx_roles_user (user_id),
    INDEX idx_roles_role (role)
);

-- ===================================
-- جداول العملاء والموردين
-- ===================================

-- جدول العملاء
CREATE TABLE customers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    nationality VARCHAR(100),
    passport_number VARCHAR(50),
    date_of_birth DATE,
    customer_segment ENUM('vip', 'regular', 'new') DEFAULT 'new',
    loyalty_points INT DEFAULT 0,
    total_bookings INT DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0.00,
    preferred_contact ENUM('phone', 'email', 'whatsapp') DEFAULT 'phone',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_name (name),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_email (email),
    INDEX idx_customers_segment (customer_segment)
);

-- جدول الموردين
CREATE TABLE suppliers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    type ENUM('hotel', 'airline', 'transport', 'tour', 'car_rental') NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    payment_terms TEXT,
    contract_start_date DATE,
    contract_end_date DATE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suppliers_name (name),
    INDEX idx_suppliers_type (type),
    INDEX idx_suppliers_active (is_active)
);

-- ===================================
-- جداول الحجوزات الرئيسية
-- ===================================

-- جدول حجوزات الفنادق
CREATE TABLE hotel_bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id CHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    supplier_id CHAR(36),
    hotel_name VARCHAR(255) NOT NULL,
    room_type VARCHAR(255),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_nights INT GENERATED ALWAYS AS (DATEDIFF(check_out_date, check_in_date)) STORED,
    number_of_rooms INT DEFAULT 1,
    number_of_adults INT DEFAULT 1,
    number_of_children INT DEFAULT 0,
    meal_plan ENUM('room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive') DEFAULT 'breakfast',
    cost_per_night DECIMAL(10,2) NOT NULL,
    selling_price_per_night DECIMAL(10,2) NOT NULL,
    total_cost_customer DECIMAL(15,2) GENERATED ALWAYS AS (selling_price_per_night * (DATEDIFF(check_out_date, check_in_date))) STORED,
    total_cost_supplier DECIMAL(15,2) GENERATED ALWAYS AS (cost_per_night * (DATEDIFF(check_out_date, check_in_date))) STORED,
    total_profit DECIMAL(15,2) GENERATED ALWAYS AS ((selling_price_per_night - cost_per_night) * (DATEDIFF(check_out_date, check_in_date))) STORED,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_cost_customer - paid_amount) STORED,
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    cancellation_policy TEXT,
    special_requests TEXT,
    internal_notes TEXT,
    confirmation_number VARCHAR(100),
    voucher_number VARCHAR(100),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_hotel_bookings_reference (booking_reference),
    INDEX idx_hotel_bookings_customer (customer_id),
    INDEX idx_hotel_bookings_dates (check_in_date, check_out_date),
    INDEX idx_hotel_bookings_status (booking_status),
    INDEX idx_hotel_bookings_created (created_at)
);

-- جدول حجوزات الطيران
CREATE TABLE flight_bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id CHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    supplier_id CHAR(36),
    airline VARCHAR(255) NOT NULL,
    flight_type ENUM('one_way', 'round_trip', 'multi_city') DEFAULT 'round_trip',
    departure_airport VARCHAR(100) NOT NULL,
    arrival_airport VARCHAR(100) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE,
    departure_time TIME,
    arrival_time TIME,
    flight_class ENUM('economy', 'premium_economy', 'business', 'first') DEFAULT 'economy',
    number_of_passengers INT DEFAULT 1,
    adult_passengers INT DEFAULT 1,
    child_passengers INT DEFAULT 0,
    infant_passengers INT DEFAULT 0,
    total_cost_customer DECIMAL(15,2) NOT NULL,
    total_cost_supplier DECIMAL(15,2) NOT NULL,
    total_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_cost_customer - total_cost_supplier) STORED,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_cost_customer - paid_amount) STORED,
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    ticket_numbers TEXT,
    pnr_code VARCHAR(50),
    baggage_allowance VARCHAR(255),
    special_requests TEXT,
    internal_notes TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_flight_bookings_reference (booking_reference),
    INDEX idx_flight_bookings_customer (customer_id),
    INDEX idx_flight_bookings_dates (departure_date, return_date),
    INDEX idx_flight_bookings_status (booking_status)
);

-- جدول تأجير السيارات
CREATE TABLE car_rentals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id CHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    supplier_id CHAR(36),
    car_model VARCHAR(255) NOT NULL,
    car_category ENUM('economy', 'compact', 'intermediate', 'standard', 'full_size', 'premium', 'luxury', 'suv') NOT NULL,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    rental_days INT GENERATED ALWAYS AS (DATEDIFF(return_date, pickup_date)) STORED,
    pickup_location VARCHAR(255) NOT NULL,
    return_location VARCHAR(255) NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    total_cost_customer DECIMAL(15,2) GENERATED ALWAYS AS (daily_rate * DATEDIFF(return_date, pickup_date)) STORED,
    total_cost_supplier DECIMAL(15,2) NOT NULL,
    total_profit DECIMAL(15,2) GENERATED ALWAYS AS (daily_rate * DATEDIFF(return_date, pickup_date) - total_cost_supplier) STORED,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    insurance_included BOOLEAN DEFAULT FALSE,
    fuel_policy ENUM('full_to_full', 'full_to_empty', 'same_to_same') DEFAULT 'full_to_full',
    driver_age_min INT DEFAULT 21,
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    license_number VARCHAR(100),
    additional_driver_info TEXT,
    special_requests TEXT,
    internal_notes TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_car_rentals_reference (booking_reference),
    INDEX idx_car_rentals_customer (customer_id),
    INDEX idx_car_rentals_dates (pickup_date, return_date)
);

-- ===================================
-- جداول الفواتير والمدفوعات
-- ===================================

-- جدول الفواتير
CREATE TABLE invoices (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id CHAR(36) NOT NULL,
    booking_type ENUM('hotel', 'flight', 'car_rental', 'transport') NOT NULL,
    customer_id CHAR(36) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    invoice_date DATE DEFAULT (CURRENT_DATE),
    due_date DATE,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) GENERATED ALWAYS AS (subtotal * tax_percentage / 100) STORED,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_percentage / 100) - discount_amount) STORED,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    payment_status ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_percentage / 100) - discount_amount - paid_amount) STORED,
    payment_terms TEXT,
    notes TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_invoices_number (invoice_number),
    INDEX idx_invoices_customer (customer_id),
    INDEX idx_invoices_booking (booking_id, booking_type),
    INDEX idx_invoices_status (payment_status),
    INDEX idx_invoices_date (invoice_date)
);

-- ===================================
-- جداول المصروفات والمالية
-- ===================================

-- جدول الموظفين
CREATE TABLE employees (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    department VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    hire_date DATE,
    basic_salary DECIMAL(15,2) DEFAULT 0.00,
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    is_active BOOLEAN DEFAULT TRUE,
    bank_account VARCHAR(100),
    national_id VARCHAR(50),
    address TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employees_code (employee_code),
    INDEX idx_employees_name (name),
    INDEX idx_employees_active (is_active)
);

-- جدول المعاملات المالية (المصروفات والإيرادات)
CREATE TABLE expense_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category ENUM('salary', 'commission', 'rent', 'utilities', 'marketing', 'travel', 'equipment', 'other', 'booking_revenue') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    amount_egp DECIMAL(15,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    description TEXT NOT NULL,
    reference_id CHAR(36),
    reference_type ENUM('employee', 'supplier', 'customer', 'booking', 'other'),
    payment_method ENUM('cash', 'bank_transfer', 'credit_card', 'cheque', 'online') DEFAULT 'cash',
    transaction_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    receipt_number VARCHAR(100),
    bank_account VARCHAR(100),
    approved_by CHAR(36),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_transactions_number (transaction_number),
    INDEX idx_transactions_type_category (type, category),
    INDEX idx_transactions_date (transaction_date),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_reference (reference_id, reference_type)
);

-- ===================================
-- جداول أسعار الصرف والحسابات البنكية
-- ===================================

-- جدول أسعار الصرف
CREATE TABLE exchange_rates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    from_currency ENUM('SAR', 'EGP', 'USD', 'EUR') NOT NULL,
    to_currency ENUM('SAR', 'EGP', 'USD', 'EUR') NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    effective_date DATE DEFAULT (CURRENT_DATE),
    source ENUM('manual', 'api', 'bank') DEFAULT 'manual',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_currency_date (from_currency, to_currency, effective_date),
    INDEX idx_exchange_rates_currencies (from_currency, to_currency),
    INDEX idx_exchange_rates_date (effective_date)
);

-- جدول الحسابات البنكية
CREATE TABLE bank_accounts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    iban VARCHAR(100),
    currency ENUM('SAR', 'EGP', 'USD', 'EUR') DEFAULT 'EGP',
    account_type ENUM('checking', 'savings', 'business') DEFAULT 'business',
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bank_accounts_name (account_name),
    INDEX idx_bank_accounts_currency (currency),
    INDEX idx_bank_accounts_active (is_active)
);

-- ===================================
-- جداول WhatsApp والتواصل
-- ===================================

-- جدول محادثات WhatsApp
CREATE TABLE whatsapp_conversations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36),
    phone_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    platform ENUM('whatsapp', 'telegram', 'sms') DEFAULT 'whatsapp',
    status ENUM('active', 'closed', 'archived') DEFAULT 'active',
    assigned_to CHAR(36),
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    INDEX idx_whatsapp_phone (phone_number),
    INDEX idx_whatsapp_customer (customer_id),
    INDEX idx_whatsapp_status (status)
);

-- جدول رسائل WhatsApp
CREATE TABLE whatsapp_messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conversation_id CHAR(36) NOT NULL,
    sender_type ENUM('customer', 'agent', 'system') NOT NULL,
    sender_id CHAR(36),
    message_content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'document', 'location', 'contact') DEFAULT 'text',
    media_url VARCHAR(500),
    message_id VARCHAR(255),
    status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    INDEX idx_whatsapp_messages_conversation (conversation_id),
    INDEX idx_whatsapp_messages_sent (sent_at)
);

-- ===================================
-- جداول صفحة الهبوط وإدارة المحتوى
-- ===================================

-- جدول محتوى صفحة الهبوط
CREATE TABLE landing_content (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    section VARCHAR(100) NOT NULL,
    section_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    content TEXT,
    subtitle VARCHAR(500),
    badge_text VARCHAR(255),
    button_text VARCHAR(255),
    button_link VARCHAR(500),
    image_url VARCHAR(500),
    icon_name VARCHAR(100),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    layout_config JSON,
    style_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_landing_content_section (section),
    INDEX idx_landing_content_active (is_active),
    INDEX idx_landing_content_order (order_index)
);

-- جدول إعدادات الموقع
CREATE TABLE site_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('text', 'email', 'url', 'color', 'number', 'boolean', 'json') DEFAULT 'text',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_site_settings_key (setting_key)
);

-- جدول طلبات الخدمة من صفحة الهبوط
CREATE TABLE service_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    service_type ENUM('hotel', 'flight', 'car_rental', 'tour', 'general') NOT NULL,
    message TEXT,
    preferred_contact ENUM('phone', 'email', 'whatsapp') DEFAULT 'phone',
    status ENUM('pending', 'contacted', 'converted', 'closed') DEFAULT 'pending',
    assigned_to CHAR(36),
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    INDEX idx_service_requests_status (status),
    INDEX idx_service_requests_type (service_type),
    INDEX idx_service_requests_date (created_at)
);

-- ===================================
-- إدراج البيانات الأساسية
-- ===================================

-- أسعار الصرف الأساسية
INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, source) VALUES
('USD', 'EGP', 31.000000, CURRENT_DATE, 'manual'),
('EUR', 'EGP', 34.000000, CURRENT_DATE, 'manual'),
('SAR', 'EGP', 8.250000, CURRENT_DATE, 'manual'),
('EGP', 'USD', 0.032258, CURRENT_DATE, 'manual'),
('EGP', 'EUR', 0.029412, CURRENT_DATE, 'manual'),
('EGP', 'SAR', 0.121212, CURRENT_DATE, 'manual');

-- إعدادات الموقع الأساسية
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'Vogatchi Travel', 'text', 'اسم الشركة'),
('company_name_ar', 'فوجاتشي للسياحة والسفر', 'text', 'اسم الشركة بالعربية'),
('phone_number', '+20 110 344 2881', 'text', 'رقم الهاتف الرئيسي'),
('email', 'ops@vogatchitrips.com', 'email', 'البريد الإلكتروني'),
('whatsapp_number', '201103442881', 'text', 'رقم الواتساب'),
('website_title', 'Vogatchi Travel - رحلتك تبدأ من هنا', 'text', 'عنوان الموقع'),
('website_description', 'شركة Vogatchi للسياحة والسفر - نقدم أفضل العروض للفنادق والطيران وتأجير السيارات', 'text', 'وصف الموقع'),
('primary_color', '#3B82F6', 'color', 'اللون الأساسي'),
('secondary_color', '#6366F1', 'color', 'اللون الثانوي'),
('accent_color', '#10B981', 'color', 'لون التمييز');

-- محتوى صفحة الهبوط
INSERT INTO landing_content (section, section_type, title, content, subtitle, badge_text, button_text, button_link, icon_name, order_index, is_active) VALUES
('hero', 'hero', 'رحلتك المميزة تبدأ من هنا', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', 'Vogatchi Travel - وجهتك للسفر المميز', '', 'ابدأ المحادثة الآن', 'whatsapp', 'MessageSquare', 1, TRUE),
('hero', 'badges', 'مرخص رسمياً', 'نحن مرخصون رسمياً من وزارة السياحة المصرية', '', 'مرخص رسمياً', '', '', 'Shield', 2, TRUE),
('hero', 'badges', '+10,000 عميل راضي', 'أكثر من 10 آلاف عميل سعيد بخدماتنا المميزة', '', '+10,000 عميل راضي', '', '', 'Users', 3, TRUE),
('services', 'service', 'حجز الفنادق', 'احجز أفضل الفنادق في مصر والعالم بأسعار تنافسية', '', '', 'احجز الآن', '/hotel-bookings', 'Hotel', 6, TRUE),
('services', 'service', 'حجز الطيران', 'رحلات جوية مريحة لجميع الوجهات العالمية', '', '', 'احجز الآن', '/flight-bookings', 'Plane', 7, TRUE),
('services', 'service', 'تأجير السيارات', 'سيارات حديثة ومريحة لرحلتك', '', '', 'احجز الآن', '/car-rentals', 'Car', 8, TRUE);

-- إنشاء المستخدم الأساسي (admin)
INSERT INTO users (id, email, password_hash, full_name, department, is_active) VALUES
('admin-user-id-1234', 'admin@vogatchitrips.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'مدير النظام', 'الإدارة', TRUE);

-- إعطاء صلاحية super_admin للمستخدم الأساسي
INSERT INTO user_roles (user_id, role) VALUES
('admin-user-id-1234', 'super_admin');

-- إنشاء عملاء تجريبيين
INSERT INTO customers (name, email, phone, nationality, customer_segment) VALUES
('أحمد محمد علي', 'ahmed@example.com', '01001234567', 'مصري', 'regular'),
('سارة أحمد حسن', 'sara@example.com', '01009876543', 'مصري', 'vip'),
('محمد عبدالله', 'mohamed@example.com', '01005555555', 'سعودي', 'new');

-- إنشاء موردين تجريبيين
INSERT INTO suppliers (name, type, contact_person, email, phone, commission_rate, is_active) VALUES
('فندق سونستا الأقصر', 'hotel', 'أحمد محمد', 'reservations@sonesta-luxor.com', '01001234567', 15.00, TRUE),
('مصر للطيران', 'airline', 'سارة أحمد', 'corporate@egyptair.com', '01009876543', 8.00, TRUE),
('شركة النقل السياحي المتميز', 'transport', 'محمد علي', 'info@premium-transport.com', '01005554321', 20.00, TRUE),
('هيرتز لتأجير السيارات', 'car_rental', 'فاطمة حسن', 'egypt@hertz.com', '01007778899', 12.00, TRUE);

-- إنشاء موظفين تجريبيين
INSERT INTO employees (employee_code, name, position, department, basic_salary, commission_rate, is_active) VALUES
('EMP001', 'أحمد محمد السيد', 'مندوب مبيعات', 'المبيعات', 5000.00, 2.50, TRUE),
('EMP002', 'سارة علي حسن', 'محاسبة', 'المحاسبة', 6000.00, 0.00, TRUE),
('EMP003', 'محمد عبدالرحمن', 'مدير المبيعات', 'المبيعات', 8000.00, 1.00, TRUE);

COMMIT;