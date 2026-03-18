
-- Create sequence for booking numbers first
CREATE SEQUENCE IF NOT EXISTS booking_sequence START 1;

-- Create hotel bookings table
CREATE TABLE public.hotel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Booking Details
  customer_name TEXT NOT NULL,
  internal_booking_number TEXT UNIQUE NOT NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_agent_name TEXT NOT NULL,
  
  -- Hotel Information
  hotel_name TEXT NOT NULL,
  hotel_star_rating INTEGER CHECK (hotel_star_rating >= 1 AND hotel_star_rating <= 5),
  destination_city TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_nights INTEGER,
  
  -- Room and Stay
  room_type TEXT NOT NULL,
  number_of_adults INTEGER NOT NULL DEFAULT 1,
  number_of_children INTEGER NOT NULL DEFAULT 0,
  children_ages TEXT, -- JSON array or comma-separated
  meal_plan TEXT NOT NULL CHECK (meal_plan IN ('RO', 'BB', 'HB', 'FB', 'ALL', 'UAI', 'SAL')),
  booking_reference_supplier TEXT,
  cancellation_policy TEXT,
  
  -- Supplier and Cost
  supplier_name TEXT NOT NULL,
  cost_per_night DECIMAL(10,2) NOT NULL,
  selling_price_per_night DECIMAL(10,2) NOT NULL,
  total_cost_customer DECIMAL(10,2),
  total_profit DECIMAL(10,2),
  payment_method TEXT,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2),
  payment_due_date DATE,
  
  -- Document tracking
  invoice_sent BOOLEAN DEFAULT FALSE,
  supplier_payment_sent BOOLEAN DEFAULT FALSE,
  voucher_sent BOOLEAN DEFAULT FALSE,
  invoice_sent_date TIMESTAMP WITH TIME ZONE,
  supplier_payment_sent_date TIMESTAMP WITH TIME ZONE,
  voucher_sent_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'VT-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(NEXTVAL('booking_sequence')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Set default for internal_booking_number
ALTER TABLE public.hotel_bookings 
ALTER COLUMN internal_booking_number SET DEFAULT generate_booking_number();

-- Create function to calculate booking values
CREATE OR REPLACE FUNCTION calculate_booking_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate number of nights
  NEW.number_of_nights = NEW.check_out_date - NEW.check_in_date;
  
  -- Calculate total cost to customer
  NEW.total_cost_customer = NEW.selling_price_per_night * NEW.number_of_nights;
  
  -- Calculate total profit
  NEW.total_profit = (NEW.selling_price_per_night - NEW.cost_per_night) * NEW.number_of_nights;
  
  -- Calculate remaining amount
  NEW.remaining_amount = NEW.total_cost_customer - COALESCE(NEW.paid_amount, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
CREATE TRIGGER calculate_booking_values_trigger
  BEFORE INSERT OR UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_values();

-- Create suppliers table for hotel bookings
CREATE TABLE public.hotel_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  payment_terms TEXT,
  is_direct_hotel BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default suppliers
INSERT INTO public.hotel_suppliers (name, is_direct_hotel) VALUES 
('Hotel Direct', TRUE),
('Booking.com', FALSE),
('Expedia', FALSE),
('Hotels.com', FALSE),
('Agoda', FALSE);

-- Enable RLS
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for access (temporarily open for development)
CREATE POLICY "Enable all access for hotel_bookings" ON public.hotel_bookings FOR ALL USING (true);
CREATE POLICY "Enable all access for hotel_suppliers" ON public.hotel_suppliers FOR ALL USING (true);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_hotel_bookings_updated_at 
    BEFORE UPDATE ON public.hotel_bookings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
