
-- =============================================
-- CORE LOOKUP TABLES
-- =============================================

-- Booking Statuses
CREATE TABLE IF NOT EXISTS public.booking_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read booking_statuses" ON public.booking_statuses;
CREATE POLICY "Authenticated users can read booking_statuses" ON public.booking_statuses FOR SELECT TO authenticated USING (true);

-- Customer Segments
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  minimum_bookings INT DEFAULT 0,
  minimum_total_spent DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read customer_segments" ON public.customer_segments;
CREATE POLICY "Authenticated users can read customer_segments" ON public.customer_segments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage customer_segments" ON public.customer_segments;
CREATE POLICY "Authenticated users can manage customer_segments" ON public.customer_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- CUSTOMERS
-- =============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  nationality TEXT,
  address TEXT,
  passport_number TEXT,
  segment_id UUID REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  loyalty_points INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_booking_date DATE,
  preferences JSONB,
  communication_preferences JSONB,
  created_by UUID,
  last_follow_up_date TIMESTAMPTZ,
  last_follow_up_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);

-- =============================================
-- EMPLOYEES
-- =============================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  hire_date DATE,
  salary_scale_level INT DEFAULT 1,
  base_salary DECIMAL(12,2) DEFAULT 0,
  allowances DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2),
  commission_type TEXT,
  total_commission_earned DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bank_account_number TEXT,
  bank_name TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
CREATE POLICY "Authenticated users can manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- SUPPLIERS
-- =============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'hotel',
  supplier_type TEXT DEFAULT 'hotel',
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  tax_number TEXT,
  rating DECIMAL(3,2),
  payment_type TEXT DEFAULT 'prepaid',
  payment_method_options JSONB DEFAULT '[]',
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  credit_limit DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Hotel Suppliers
CREATE TABLE IF NOT EXISTS public.hotel_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  payment_terms TEXT,
  is_direct_hotel BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hotel_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_suppliers" ON public.hotel_suppliers;
CREATE POLICY "Authenticated users can manage hotel_suppliers" ON public.hotel_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier Currencies
CREATE TABLE IF NOT EXISTS public.supplier_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EGP',
  exchange_rate DECIMAL(12,4) DEFAULT 1,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.supplier_currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage supplier_currencies" ON public.supplier_currencies;
CREATE POLICY "Authenticated users can manage supplier_currencies" ON public.supplier_currencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier Contracts
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  payment_terms TEXT,
  terms_and_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage supplier_contracts" ON public.supplier_contracts;
CREATE POLICY "Authenticated users can manage supplier_contracts" ON public.supplier_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier Ratings
CREATE TABLE IF NOT EXISTS public.supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  service_quality INT DEFAULT 0,
  delivery_time INT DEFAULT 0,
  price_competitiveness INT DEFAULT 0,
  communication INT DEFAULT 0,
  overall_rating DECIMAL(3,2) DEFAULT 0,
  feedback TEXT,
  rated_by UUID,
  rating_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage supplier_ratings" ON public.supplier_ratings;
CREATE POLICY "Authenticated users can manage supplier_ratings" ON public.supplier_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference_number TEXT,
  booking_id UUID,
  booking_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage supplier_payments" ON public.supplier_payments;
CREATE POLICY "Authenticated users can manage supplier_payments" ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- HOTEL BOOKINGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_booking_number TEXT NOT NULL UNIQUE DEFAULT ('HB-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  booking_date DATE DEFAULT CURRENT_DATE,
  booking_agent_name TEXT,
  booking_agent_id UUID,
  hotel_name TEXT,
  hotel_star_rating INT DEFAULT 0,
  destination_city TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_nights INT DEFAULT 1,
  room_type TEXT,
  number_of_adults INT DEFAULT 2,
  number_of_children INT DEFAULT 0,
  children_ages TEXT,
  meal_plan TEXT DEFAULT 'BB',
  booking_reference_supplier TEXT,
  cancellation_policy TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  cost_per_night DECIMAL(12,2) DEFAULT 0,
  selling_price_per_night DECIMAL(12,2) DEFAULT 0,
  total_cost_customer DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  payment_due_date DATE,
  currency TEXT DEFAULT 'EGP',
  invoice_sent BOOLEAN DEFAULT false,
  supplier_payment_sent BOOLEAN DEFAULT false,
  voucher_sent BOOLEAN DEFAULT false,
  invoice_sent_date DATE,
  supplier_payment_sent_date DATE,
  voucher_sent_date DATE,
  status_id UUID REFERENCES public.booking_statuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_bookings" ON public.hotel_bookings;
CREATE POLICY "Authenticated users can manage hotel_bookings" ON public.hotel_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Special Request Types
CREATE TABLE IF NOT EXISTS public.special_request_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  has_extra_cost BOOLEAN DEFAULT false,
  extra_cost_amount DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.special_request_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage special_request_types" ON public.special_request_types;
CREATE POLICY "Authenticated users can manage special_request_types" ON public.special_request_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Booking Special Requests
CREATE TABLE IF NOT EXISTS public.booking_special_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.hotel_bookings(id) ON DELETE CASCADE,
  special_request_type_id UUID REFERENCES public.special_request_types(id) ON DELETE SET NULL,
  custom_request_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.booking_special_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage booking_special_requests" ON public.booking_special_requests;
CREATE POLICY "Authenticated users can manage booking_special_requests" ON public.booking_special_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Booking Status History
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  status_id UUID REFERENCES public.booking_statuses(id) ON DELETE SET NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage booking_status_history" ON public.booking_status_history;
CREATE POLICY "Authenticated users can manage booking_status_history" ON public.booking_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- FLIGHT BOOKINGS
-- =============================================

-- Airports
CREATE TABLE IF NOT EXISTS public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  iata_code TEXT NOT NULL,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage airports" ON public.airports;
CREATE POLICY "Authenticated users can manage airports" ON public.airports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Airlines
CREATE TABLE IF NOT EXISTS public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  iata_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage airlines" ON public.airlines;
CREATE POLICY "Authenticated users can manage airlines" ON public.airlines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flight Classes
CREATE TABLE IF NOT EXISTS public.flight_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT,
  baggage_allowance TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.flight_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage flight_classes" ON public.flight_classes;
CREATE POLICY "Authenticated users can manage flight_classes" ON public.flight_classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flight Bookings
CREATE TABLE IF NOT EXISTS public.flight_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE DEFAULT ('FB-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  departure_airport_id UUID REFERENCES public.airports(id),
  arrival_airport_id UUID REFERENCES public.airports(id),
  departure_date DATE NOT NULL,
  departure_time TEXT,
  arrival_date DATE NOT NULL,
  arrival_time TEXT,
  airline_id UUID REFERENCES public.airlines(id),
  flight_number TEXT,
  flight_class_id UUID REFERENCES public.flight_classes(id),
  number_of_passengers INT DEFAULT 1,
  passenger_details JSONB,
  ticket_price_per_person DECIMAL(12,2) DEFAULT 0,
  taxes_and_fees DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  supplier_cost DECIMAL(12,2) DEFAULT 0,
  supplier_name TEXT,
  booking_agent_id UUID,
  booking_agent_name TEXT,
  booking_date DATE DEFAULT CURRENT_DATE,
  status_id UUID REFERENCES public.booking_statuses(id) ON DELETE SET NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  payment_due_date DATE,
  payment_method TEXT,
  confirmation_number TEXT,
  ticket_numbers JSONB,
  baggage_info JSONB,
  meal_preferences TEXT,
  seat_preferences TEXT,
  special_requests TEXT,
  supplier_reference TEXT,
  total_profit DECIMAL(12,2) DEFAULT 0,
  exchange_rate_to_egp DECIMAL(12,4) DEFAULT 1,
  total_cost_egp DECIMAL(12,2) DEFAULT 0,
  supplier_cost_egp DECIMAL(12,2) DEFAULT 0,
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date DATE,
  voucher_sent BOOLEAN DEFAULT false,
  voucher_sent_date DATE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date DATE,
  is_round_trip BOOLEAN DEFAULT false,
  return_flight_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage flight_bookings" ON public.flight_bookings;
CREATE POLICY "Authenticated users can manage flight_bookings" ON public.flight_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- TRANSPORT & CAR RENTAL
-- =============================================

-- Vehicle Types
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  capacity_passengers INT DEFAULT 4,
  fuel_type TEXT DEFAULT 'petrol',
  transmission_type TEXT DEFAULT 'automatic',
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage vehicle_types" ON public.vehicle_types;
CREATE POLICY "Authenticated users can manage vehicle_types" ON public.vehicle_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transport Routes
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  route_name_ar TEXT,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  distance_km DECIMAL(10,2),
  estimated_duration_hours DECIMAL(5,2),
  route_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage transport_routes" ON public.transport_routes;
CREATE POLICY "Authenticated users can manage transport_routes" ON public.transport_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transport Bookings
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE DEFAULT ('TB-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  route_id UUID REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  booking_agent_id UUID,
  booking_agent_name TEXT,
  departure_date DATE NOT NULL,
  departure_time TEXT,
  arrival_date DATE,
  arrival_time TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  number_of_passengers INT DEFAULT 1,
  currency TEXT DEFAULT 'EGP',
  cost_per_trip DECIMAL(12,2) DEFAULT 0,
  selling_price_per_trip DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  supplier_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  exchange_rate_to_egp DECIMAL(12,4) DEFAULT 1,
  total_cost_egp DECIMAL(12,2) DEFAULT 0,
  supplier_cost_egp DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  payment_due_date DATE,
  payment_method TEXT,
  status_id UUID REFERENCES public.booking_statuses(id) ON DELETE SET NULL,
  special_requests TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate_number TEXT,
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date DATE,
  voucher_sent BOOLEAN DEFAULT false,
  voucher_sent_date DATE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage transport_bookings" ON public.transport_bookings;
CREATE POLICY "Authenticated users can manage transport_bookings" ON public.transport_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Car Rentals
CREATE TABLE IF NOT EXISTS public.car_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_reference TEXT NOT NULL UNIQUE DEFAULT ('CR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  booking_agent_id UUID,
  booking_agent_name TEXT,
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  rental_duration_days INT DEFAULT 1,
  pickup_location TEXT,
  return_location TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vehicle_plate_number TEXT,
  vehicle_color TEXT,
  fuel_level_pickup TEXT DEFAULT 'full',
  fuel_level_return TEXT,
  currency TEXT DEFAULT 'EGP',
  daily_rate DECIMAL(12,2) DEFAULT 0,
  total_rental_cost DECIMAL(12,2) DEFAULT 0,
  supplier_daily_cost DECIMAL(12,2) DEFAULT 0,
  supplier_total_cost DECIMAL(12,2) DEFAULT 0,
  insurance_cost DECIMAL(12,2) DEFAULT 0,
  additional_fees DECIMAL(12,2) DEFAULT 0,
  security_deposit DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  exchange_rate_to_egp DECIMAL(12,4) DEFAULT 1,
  total_cost_egp DECIMAL(12,2) DEFAULT 0,
  supplier_cost_egp DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  deposit_paid DECIMAL(12,2) DEFAULT 0,
  deposit_returned DECIMAL(12,2) DEFAULT 0,
  payment_due_date DATE,
  payment_method TEXT,
  status_id UUID REFERENCES public.booking_statuses(id) ON DELETE SET NULL,
  driver_license_number TEXT,
  driver_license_expiry DATE,
  insurance_included BOOLEAN DEFAULT true,
  gps_included BOOLEAN DEFAULT false,
  additional_driver_count INT DEFAULT 0,
  contract_sent BOOLEAN DEFAULT false,
  contract_sent_date DATE,
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date DATE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date DATE,
  pickup_notes TEXT,
  return_notes TEXT,
  damage_notes TEXT,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.car_rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage car_rentals" ON public.car_rentals;
CREATE POLICY "Authenticated users can manage car_rentals" ON public.car_rentals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- INVOICES
-- =============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  booking_id UUID,
  booking_type TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  currency TEXT DEFAULT 'EGP',
  subtotal DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 0,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) DEFAULT 0,
  total_paid_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  issued_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
CREATE POLICY "Authenticated users can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage invoice_items" ON public.invoice_items;
CREATE POLICY "Authenticated users can manage invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- FINANCIAL MANAGEMENT
-- =============================================

-- Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT DEFAULT 'EGP',
  current_balance DECIMAL(12,2) DEFAULT 0,
  account_type TEXT DEFAULT 'checking',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage bank_accounts" ON public.bank_accounts;
CREATE POLICY "Authenticated users can manage bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bank Account Transactions
CREATE TABLE IF NOT EXISTS public.bank_account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  related_invoice_id UUID,
  related_payment_order_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.bank_account_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage bank_account_transactions" ON public.bank_account_transactions;
CREATE POLICY "Authenticated users can manage bank_account_transactions" ON public.bank_account_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Exchange Rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(12,4) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage exchange_rates" ON public.exchange_rates;
CREATE POLICY "Authenticated users can manage exchange_rates" ON public.exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  budget_limit DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage expense_categories" ON public.expense_categories;
CREATE POLICY "Authenticated users can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expense Transactions
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE DEFAULT ('EXP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  transaction_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  vendor_name TEXT,
  vendor_phone TEXT,
  invoice_number TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage expense_transactions" ON public.expense_transactions;
CREATE POLICY "Authenticated users can manage expense_transactions" ON public.expense_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rent Contracts
CREATE TABLE IF NOT EXISTS public.rent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT,
  property_name TEXT NOT NULL,
  property_address TEXT,
  landlord_name TEXT NOT NULL,
  landlord_phone TEXT,
  monthly_rent DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  end_date DATE,
  contract_duration_months INT DEFAULT 12,
  security_deposit DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2),
  payment_day_of_month INT DEFAULT 1,
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  contract_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rent_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage rent_contracts" ON public.rent_contracts;
CREATE POLICY "Authenticated users can manage rent_contracts" ON public.rent_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rent Payments
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.rent_contracts(id) ON DELETE CASCADE,
  payment_month TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  amount_egp DECIMAL(12,2),
  exchange_rate DECIMAL(12,4),
  payment_date DATE,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reference_number TEXT,
  late_fee DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage rent_payments" ON public.rent_payments;
CREATE POLICY "Authenticated users can manage rent_payments" ON public.rent_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Monthly Salaries
CREATE TABLE IF NOT EXISTS public.monthly_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_month TEXT NOT NULL,
  base_salary DECIMAL(12,2) DEFAULT 0,
  allowances DECIMAL(12,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  overtime_rate DECIMAL(12,2) DEFAULT 0,
  overtime_amount DECIMAL(12,2) DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  insurance_deduction DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) DEFAULT 0,
  attendance_days INT,
  absence_days INT,
  late_hours DECIMAL(5,2),
  currency TEXT DEFAULT 'EGP',
  exchange_rate DECIMAL(12,4),
  net_salary_egp DECIMAL(12,2),
  payment_date DATE,
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage monthly_salaries" ON public.monthly_salaries;
CREATE POLICY "Authenticated users can manage monthly_salaries" ON public.monthly_salaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee Commissions
CREATE TABLE IF NOT EXISTS public.employee_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  booking_id UUID,
  booking_type TEXT DEFAULT 'hotel',
  booking_amount DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  commission_date DATE DEFAULT CURRENT_DATE,
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage employee_commissions" ON public.employee_commissions;
CREATE POLICY "Authenticated users can manage employee_commissions" ON public.employee_commissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee Commission Periods
CREATE TABLE IF NOT EXISTS public.employee_commission_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_bookings_count INT DEFAULT 0,
  total_booking_amount DECIMAL(12,2) DEFAULT 0,
  total_supplier_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_commission_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage employee_commission_periods" ON public.employee_commission_periods;
CREATE POLICY "Authenticated users can manage employee_commission_periods" ON public.employee_commission_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission Payments
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  payment_period_start DATE,
  payment_period_end DATE,
  total_commission_amount DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage commission_payments" ON public.commission_payments;
CREATE POLICY "Authenticated users can manage commission_payments" ON public.commission_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- CRM
-- =============================================

-- Loyalty Points
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  points_earned INT DEFAULT 0,
  points_used INT DEFAULT 0,
  current_balance INT DEFAULT 0,
  booking_id UUID,
  transaction_type TEXT DEFAULT 'earned',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty_points" ON public.loyalty_points;
CREATE POLICY "Authenticated users can manage loyalty_points" ON public.loyalty_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Loyalty Rewards
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  points_required INT DEFAULT 0,
  reward_type TEXT DEFAULT 'discount_percentage',
  reward_value DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "Authenticated users can manage loyalty_rewards" ON public.loyalty_rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'email',
  target_segment_id UUID REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  message_template TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Authenticated users can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Campaign Sends
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'sent',
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage campaign_sends" ON public.campaign_sends;
CREATE POLICY "Authenticated users can manage campaign_sends" ON public.campaign_sends FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;
CREATE POLICY "Authenticated users can manage notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- CUSTOMER SERVICE
-- =============================================

-- Customer Follow Ups
CREATE TABLE IF NOT EXISTS public.customer_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  last_contact_date DATE,
  customer_value TEXT DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customer_follow_ups" ON public.customer_follow_ups;
CREATE POLICY "Authenticated users can manage customer_follow_ups" ON public.customer_follow_ups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Communications
CREATE TABLE IF NOT EXISTS public.customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID,
  follow_up_id UUID REFERENCES public.customer_follow_ups(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT DEFAULT 'successful',
  content TEXT,
  duration_minutes INT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  handled_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customer_communications" ON public.customer_communications;
CREATE POLICY "Authenticated users can manage customer_communications" ON public.customer_communications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Notes
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID,
  note_type TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_private BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customer_notes" ON public.customer_notes;
CREATE POLICY "Authenticated users can manage customer_notes" ON public.customer_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Satisfaction
CREATE TABLE IF NOT EXISTS public.customer_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID,
  overall_rating INT,
  service_rating INT,
  communication_rating INT,
  feedback TEXT,
  survey_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_satisfaction ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customer_satisfaction" ON public.customer_satisfaction;
CREATE POLICY "Authenticated users can manage customer_satisfaction" ON public.customer_satisfaction FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- WHATSAPP
-- =============================================

-- WhatsApp Settings
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  phone_number_id TEXT,
  access_token TEXT,
  webhook_verify_token TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT false,
  api_version TEXT DEFAULT 'v18.0',
  rate_limit_per_minute INT DEFAULT 80,
  auto_assignment_enabled BOOLEAN DEFAULT true,
  business_description TEXT,
  business_website TEXT,
  business_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_settings" ON public.whatsapp_settings;
CREATE POLICY "Authenticated users can manage whatsapp_settings" ON public.whatsapp_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'normal',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  auto_assigned BOOLEAN DEFAULT false,
  assignment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_conversations" ON public.whatsapp_conversations;
CREATE POLICY "Authenticated users can manage whatsapp_conversations" ON public.whatsapp_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  template_name TEXT,
  template_language TEXT,
  template_parameters JSONB,
  status TEXT DEFAULT 'sent',
  error_code TEXT,
  error_message TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Authenticated users can manage whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  language TEXT DEFAULT 'ar',
  status TEXT DEFAULT 'pending',
  header_type TEXT,
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  variables JSONB,
  approval_status TEXT,
  template_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Authenticated users can manage whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID,
  status TEXT DEFAULT 'available',
  active_conversations_count INT DEFAULT 0,
  max_conversations INT DEFAULT 5,
  last_activity TIMESTAMPTZ DEFAULT now(),
  auto_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "Authenticated users can manage whatsapp_sessions" ON public.whatsapp_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quick Replies
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_global BOOLEAN DEFAULT true,
  created_by UUID,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage quick_replies" ON public.quick_replies;
CREATE POLICY "Authenticated users can manage quick_replies" ON public.quick_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- ADMIN / SYSTEM
-- =============================================

-- Destinations
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  country TEXT,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage destinations" ON public.destinations;
CREATE POLICY "Authenticated users can manage destinations" ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Hotels
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  star_rating INT DEFAULT 3,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  amenities JSONB DEFAULT '[]',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage hotels" ON public.hotels;
CREATE POLICY "Authenticated users can manage hotels" ON public.hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Backup Logs
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  file_size TEXT,
  file_url TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage backup_logs" ON public.backup_logs;
CREATE POLICY "Authenticated users can manage backup_logs" ON public.backup_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "Authenticated users can manage admin_audit_log" ON public.admin_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Form Submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID,
  data JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage form_submissions" ON public.form_submissions;
CREATE POLICY "Authenticated users can manage form_submissions" ON public.form_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Media Library
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT,
  file_type TEXT,
  file_size INT,
  url TEXT,
  alt_text TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage media_library" ON public.media_library;
CREATE POLICY "Authenticated users can manage media_library" ON public.media_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service Requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_type TEXT DEFAULT 'general',
  message TEXT,
  preferred_contact TEXT DEFAULT 'phone',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage service_requests" ON public.service_requests;
CREATE POLICY "Authenticated users can manage service_requests" ON public.service_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Content Blocks (CMS)
CREATE TABLE IF NOT EXISTS public.content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}',
  layout_settings JSONB DEFAULT '{}',
  style_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  section TEXT DEFAULT 'main',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage content_blocks" ON public.content_blocks;
CREATE POLICY "Authenticated users can manage content_blocks" ON public.content_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hotel_bookings_updated_at ON public.hotel_bookings;
CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_flight_bookings_updated_at ON public.flight_bookings;
CREATE TRIGGER update_flight_bookings_updated_at BEFORE UPDATE ON public.flight_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_transport_bookings_updated_at ON public.transport_bookings;
CREATE TRIGGER update_transport_bookings_updated_at BEFORE UPDATE ON public.transport_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_car_rentals_updated_at ON public.car_rentals;
CREATE TRIGGER update_car_rentals_updated_at BEFORE UPDATE ON public.car_rentals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_expense_transactions_updated_at ON public.expense_transactions;
CREATE TRIGGER update_expense_transactions_updated_at BEFORE UPDATE ON public.expense_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_rent_contracts_updated_at ON public.rent_contracts;
CREATE TRIGGER update_rent_contracts_updated_at BEFORE UPDATE ON public.rent_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_monthly_salaries_updated_at ON public.monthly_salaries;
CREATE TRIGGER update_monthly_salaries_updated_at BEFORE UPDATE ON public.monthly_salaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_customer_segments_updated_at ON public.customer_segments;
CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_content_blocks_updated_at ON public.content_blocks;
CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed booking statuses
-- INSERT INTO public.booking_statuses (name, name_ar, color, sort_order) VALUES
--   ('Pending', 'قيد المعالجة', '#f59e0b', 1),
--   ('Confirmed', 'مؤكد', '#10b981', 2),
--   ('Cancelled', 'ملغي', '#ef4444', 3),
--   ('Completed', 'مكتمل', '#3b82f6', 4)
-- ON CONFLICT DO NOTHING;

-- Seed flight classes
-- INSERT INTO public.flight_classes (name, name_ar, code) VALUES
--   ('Economy', 'اقتصادي', 'Y'),
--   ('Business', 'أعمال', 'C'),
--   ('First Class', 'درجة أولى', 'F')
-- ON CONFLICT DO NOTHING;
