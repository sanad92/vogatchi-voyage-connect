
-- إنشاء جدول أنواع المركبات
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  capacity_passengers INTEGER DEFAULT 4,
  fuel_type TEXT DEFAULT 'gasoline',
  transmission_type TEXT DEFAULT 'automatic',
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الطرق والمسارات
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  route_name_ar TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  distance_km NUMERIC,
  estimated_duration_hours NUMERIC,
  route_type TEXT DEFAULT 'city_to_city',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول حجوزات النقل والرحلات الداخلية
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_reference TEXT NOT NULL DEFAULT ('TB-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(NEXTVAL('booking_sequence')::TEXT, 6, '0')),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  route_id UUID REFERENCES public.transport_routes(id),
  vehicle_type_id UUID REFERENCES public.vehicle_types(id),
  
  -- تفاصيل الرحلة
  departure_date DATE NOT NULL,
  departure_time TIME,
  arrival_date DATE,
  arrival_time TIME,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  number_of_passengers INTEGER NOT NULL DEFAULT 1,
  
  -- التكاليف والأسعار
  currency TEXT DEFAULT 'EGP',
  cost_per_trip NUMERIC NOT NULL,
  selling_price_per_trip NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  supplier_cost NUMERIC NOT NULL,
  total_profit NUMERIC,
  exchange_rate_to_egp NUMERIC DEFAULT 1.00,
  total_cost_egp NUMERIC,
  supplier_cost_egp NUMERIC,
  
  -- المدفوعات
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC,
  payment_due_date DATE,
  payment_method TEXT,
  
  -- الحالة والوثائق
  status_id UUID REFERENCES public.booking_statuses(id),
  booking_agent_name TEXT NOT NULL,
  special_requests TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate_number TEXT,
  
  -- الوثائق
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date TIMESTAMP WITH TIME ZONE,
  voucher_sent BOOLEAN DEFAULT false,
  voucher_sent_date TIMESTAMP WITH TIME ZONE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول إيجار السيارات
CREATE TABLE IF NOT EXISTS public.car_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_reference TEXT NOT NULL DEFAULT ('CR-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(NEXTVAL('booking_sequence')::TEXT, 6, '0')),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  vehicle_type_id UUID REFERENCES public.vehicle_types(id),
  
  -- تفاصيل الإيجار
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  rental_duration_days INTEGER NOT NULL,
  pickup_location TEXT NOT NULL,
  return_location TEXT NOT NULL,
  
  -- تفاصيل السيارة
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_plate_number TEXT,
  vehicle_color TEXT,
  fuel_level_pickup TEXT DEFAULT 'full',
  fuel_level_return TEXT,
  
  -- التكاليف والأسعار
  currency TEXT DEFAULT 'EGP',
  daily_rate NUMERIC NOT NULL,
  total_rental_cost NUMERIC NOT NULL,
  supplier_daily_cost NUMERIC NOT NULL,
  supplier_total_cost NUMERIC NOT NULL,
  insurance_cost NUMERIC DEFAULT 0,
  additional_fees NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  total_profit NUMERIC,
  exchange_rate_to_egp NUMERIC DEFAULT 1.00,
  total_cost_egp NUMERIC,
  supplier_cost_egp NUMERIC,
  
  -- المدفوعات
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC,
  deposit_paid NUMERIC DEFAULT 0,
  deposit_returned NUMERIC DEFAULT 0,
  payment_due_date DATE,
  payment_method TEXT,
  
  -- الحالة والوثائق
  status_id UUID REFERENCES public.booking_statuses(id),
  booking_agent_name TEXT NOT NULL,
  driver_license_number TEXT,
  driver_license_expiry DATE,
  insurance_included BOOLEAN DEFAULT true,
  gps_included BOOLEAN DEFAULT false,
  additional_driver_count INTEGER DEFAULT 0,
  
  -- الوثائق
  contract_sent BOOLEAN DEFAULT false,
  contract_sent_date TIMESTAMP WITH TIME ZONE,
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date TIMESTAMP WITH TIME ZONE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date TIMESTAMP WITH TIME ZONE,
  
  -- ملاحظات
  pickup_notes TEXT,
  return_notes TEXT,
  damage_notes TEXT,
  special_requirements TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء triggers للحسابات التلقائية
CREATE OR REPLACE FUNCTION calculate_transport_booking_values()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب التكلفة الإجمالية
  NEW.total_cost = NEW.selling_price_per_trip * NEW.number_of_passengers;
  
  -- حساب الربح الإجمالي
  NEW.total_profit = NEW.total_cost - NEW.supplier_cost;
  
  -- حساب المبلغ المتبقي
  NEW.remaining_amount = NEW.total_cost - COALESCE(NEW.paid_amount, 0);
  
  -- حساب القيم بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate_to_egp = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.total_cost_egp = NEW.total_cost * NEW.exchange_rate_to_egp;
    NEW.supplier_cost_egp = NEW.supplier_cost * NEW.exchange_rate_to_egp;
  ELSE
    NEW.exchange_rate_to_egp = 1.00;
    NEW.total_cost_egp = NEW.total_cost;
    NEW.supplier_cost_egp = NEW.supplier_cost;
  END IF;
  
  -- إذا تم توفير customer_id، جلب اسم العميل
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO NEW.customer_name FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_car_rental_values()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب عدد أيام الإيجار
  NEW.rental_duration_days = NEW.rental_end_date - NEW.rental_start_date + 1;
  
  -- حساب التكلفة الإجمالية
  NEW.total_rental_cost = NEW.daily_rate * NEW.rental_duration_days;
  NEW.supplier_total_cost = NEW.supplier_daily_cost * NEW.rental_duration_days;
  
  -- حساب الربح الإجمالي
  NEW.total_profit = NEW.total_rental_cost - NEW.supplier_total_cost - NEW.insurance_cost - NEW.additional_fees;
  
  -- حساب المبلغ المتبقي
  NEW.remaining_amount = NEW.total_rental_cost - COALESCE(NEW.paid_amount, 0);
  
  -- حساب القيم بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate_to_egp = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.total_cost_egp = NEW.total_rental_cost * NEW.exchange_rate_to_egp;
    NEW.supplier_cost_egp = NEW.supplier_total_cost * NEW.exchange_rate_to_egp;
  ELSE
    NEW.exchange_rate_to_egp = 1.00;
    NEW.total_cost_egp = NEW.total_rental_cost;
    NEW.supplier_cost_egp = NEW.supplier_total_cost;
  END IF;
  
  -- إذا تم توفير customer_id، جلب اسم العميل
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO NEW.customer_name FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers للجداول
CREATE TRIGGER transport_booking_calculations
  BEFORE INSERT OR UPDATE ON public.transport_bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_transport_booking_values();

CREATE TRIGGER car_rental_calculations
  BEFORE INSERT OR UPDATE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION calculate_car_rental_values();

-- إضافة triggers للتحديث التلقائي
CREATE TRIGGER update_transport_bookings_updated_at
  BEFORE UPDATE ON public.transport_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_rentals_updated_at
  BEFORE UPDATE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات أولية لأنواع المركبات
-- INSERT INTO public.vehicle_types (name, name_ar, description, capacity_passengers, fuel_type, transmission_type) VALUES
-- ('Economy Car', 'سيارة اقتصادية', 'سيارة صغيرة موفرة للوقود', 4, 'gasoline', 'automatic'),
-- ('Sedan', 'سيدان', 'سيارة عائلية متوسطة الحجم', 5, 'gasoline', 'automatic'),
-- ('SUV', 'دفع رباعي', 'سيارة دفع رباعي كبيرة', 7, 'gasoline', 'automatic'),
-- ('Minibus', 'حافلة صغيرة', 'حافلة صغيرة للمجموعات', 12, 'diesel', 'manual'),
-- ('Luxury Car', 'سيارة فاخرة', 'سيارة فاخرة عالية الجودة', 4, 'gasoline', 'automatic'),
-- ('Van', 'فان', 'سيارة فان للنقل', 8, 'gasoline', 'automatic'),
-- ('Bus', 'حافلة', 'حافلة كبيرة للمجموعات الكبيرة', 45, 'diesel', 'manual'),
-- ('Limousine', 'ليموزين', 'سيارة ليموزين فاخرة', 8, 'gasoline', 'automatic');

-- إدراج بيانات أولية للطرق
-- INSERT INTO public.transport_routes (route_name, route_name_ar, departure_city, arrival_city, distance_km, estimated_duration_hours, route_type) VALUES
-- ('Cairo to Alexandria', 'القاهرة إلى الإسكندرية', 'Cairo', 'Alexandria', 220, 3, 'city_to_city'),
-- ('Cairo Airport Transfer', 'نقل مطار القاهرة', 'Cairo Airport', 'Cairo City', 45, 1, 'airport_transfer'),
-- ('Giza Pyramids Tour', 'جولة أهرامات الجيزة', 'Cairo', 'Giza Pyramids', 25, 0.5, 'tourist_route'),
-- ('Red Sea Transfer', 'نقل البحر الأحمر', 'Cairo', 'Hurghada', 450, 5, 'city_to_city'),
-- ('Luxor City Tour', 'جولة مدينة الأقصر', 'Luxor Airport', 'Luxor Hotels', 15, 0.3, 'city_tour'),
-- ('Aswan Transfer', 'نقل أسوان', 'Aswan Airport', 'Aswan City', 20, 0.4, 'airport_transfer');
