-- Migration 006: Performance Optimization Indexes
-- Adds strategic indexes to improve query performance

-- ========== CUSTOMER INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_customers_org_email ON customers(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON customers(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_org_segment ON customers(organization_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_active_created ON customers(is_active, created_at);

-- ========== BOOKING INDEXES ==========
-- Hotel Bookings
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_status ON hotel_bookings(organization_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_customer ON hotel_bookings(customer_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_date_range ON hotel_bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_created ON hotel_bookings(organization_id, created_at);

-- Flight Bookings
CREATE INDEX IF NOT EXISTS idx_flight_bookings_org_status ON flight_bookings(organization_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_customer ON flight_bookings(customer_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_date_range ON flight_bookings(departure_date, arrival_date);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_org_created ON flight_bookings(organization_id, created_at);

-- Transport Bookings
CREATE INDEX IF NOT EXISTS idx_transport_bookings_org_status ON transport_bookings(organization_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_customer ON transport_bookings(customer_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_date ON transport_bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_org_created ON transport_bookings(organization_id, created_at);

-- Car Rentals
CREATE INDEX IF NOT EXISTS idx_car_rentals_org_status ON car_rentals(organization_id, rental_status);
CREATE INDEX IF NOT EXISTS idx_car_rentals_customer ON car_rentals(customer_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_dates ON car_rentals(pickup_date, return_date);

-- ========== INVOICE INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_org_ref ON invoices(organization_id, invoice_reference);
CREATE INDEX IF NOT EXISTS idx_invoices_amount ON invoices(final_amount, organization_id);

-- ========== USER/AUTH INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_users_org_email ON users(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role_id);

-- ========== USAGE TRACKING INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_api_calls_endpoint_date ON api_calls_log(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_api_calls_status ON api_calls_log(status_code, created_at);
CREATE INDEX IF NOT EXISTS idx_storage_usage_org_date ON storage_usage(organization_id, upload_date);

-- ========== LOGGING INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_date ON activity_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_org_date ON error_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_table ON audit_logs(organization_id, table_name);

-- ========== ACCOUNTING INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON journal_entries(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_org ON chart_of_accounts(organization_id, account_type);

-- ========== SUBSCRIPTION INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_records_org_feature_date ON usage_records(organization_id, feature, period_start);
CREATE INDEX IF NOT EXISTS idx_monthly_report_org_period ON monthly_usage_report(organization_id, year, month);

-- ========== COMPOSITE INDEXES FOR COMMON QUERIES ==========
-- These help queries that filter by multiple columns
CREATE INDEX IF NOT EXISTS idx_customers_full_search ON customers(organization_id, is_active, name(20), phone, email(20));
CREATE INDEX IF NOT EXISTS idx_bookings_full_search ON hotel_bookings(organization_id, booking_status, customer_id, check_in_date);

-- ========== ANALYSIS & VERIFICATION ==========

-- Verify index creations
SHOW CREATE TABLE customers\G;
SHOW CREATE TABLE hotel_bookings\G;
SHOW CREATE TABLE invoices\G;
SHOW CREATE TABLE users\G;

-- Get index usage statistics (requires performance_schema enabled)
-- SELECT object_name, count_read, count_write, count_delete, count_update
-- FROM performance_schema.table_io_waits_summary_by_index_usage
-- WHERE object_schema = 'vogatchi_db'
-- ORDER BY count_read DESC;
