
-- إنشاء جدول شركات الطيران
CREATE TABLE IF NOT EXISTS public.airlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  iata_code TEXT UNIQUE, -- كود الإياتا مثل MS, EK
  icao_code TEXT UNIQUE, -- كود الإيكاو مثل MSR, UAE
  country TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول المطارات
CREATE TABLE IF NOT EXISTS public.airports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  iata_code TEXT UNIQUE NOT NULL, -- مثل CAI, DXB
  icao_code TEXT UNIQUE, -- مثل HECA, OMDB
  timezone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول درجات الطيران
CREATE TABLE IF NOT EXISTS public.flight_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Economy, Business, First
  name_ar TEXT NOT NULL, -- اقتصادية, رجال أعمال, أولى
  code TEXT UNIQUE NOT NULL, -- Y, C, F
  description TEXT,
  baggage_allowance TEXT, -- مثل "23kg checked, 7kg carry-on"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول حجوزات الطيران
CREATE TABLE IF NOT EXISTS public.flight_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- معلومات الحجز الأساسية
  booking_reference TEXT NOT NULL UNIQUE DEFAULT ('FB-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(NEXTVAL('booking_sequence')::TEXT, 6, '0')),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  booking_agent_name TEXT NOT NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- تفاصيل الرحلة
  departure_airport_id UUID REFERENCES public.airports(id) NOT NULL,
  arrival_airport_id UUID REFERENCES public.airports(id) NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME,
  arrival_date DATE NOT NULL,
  arrival_time TIME,
  flight_number TEXT,
  airline_id UUID REFERENCES public.airlines(id) NOT NULL,
  flight_class_id UUID REFERENCES public.flight_classes(id) NOT NULL,
  
  -- تفاصيل المسافرين
  number_of_passengers INTEGER NOT NULL DEFAULT 1,
  passenger_details JSONB, -- [{name, passport, date_of_birth, nationality}]
  
  -- معلومات الأمتعة والخدمات
  baggage_info JSONB, -- {checked: "2x23kg", carry_on: "7kg", extra_baggage: "1x10kg"}
  special_requests TEXT,
  meal_preferences TEXT,
  seat_preferences TEXT,
  
  -- المعلومات المالية
  ticket_price_per_person NUMERIC NOT NULL,
  taxes_and_fees NUMERIC DEFAULT 0,
  total_cost NUMERIC NOT NULL,
  supplier_cost NUMERIC NOT NULL,
  total_profit NUMERIC,
  currency TEXT DEFAULT 'EGP',
  
  -- معلومات الدفع
  payment_method TEXT,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC,
  payment_due_date DATE,
  
  -- حالة الحجز والتتبع
  status_id UUID REFERENCES public.booking_statuses(id),
  confirmation_number TEXT, -- رقم تأكيد شركة الطيران
  ticket_numbers TEXT[], -- أرقام التذاكر الفردية
  is_round_trip BOOLEAN DEFAULT false,
  return_flight_id UUID REFERENCES public.flight_bookings(id), -- للربط مع رحلة العودة
  
  -- معلومات الموردين
  supplier_name TEXT NOT NULL,
  supplier_reference TEXT,
  
  -- التواريخ والتتبع
  invoice_sent BOOLEAN DEFAULT false,
  invoice_sent_date TIMESTAMP WITH TIME ZONE,
  voucher_sent BOOLEAN DEFAULT false,
  voucher_sent_date TIMESTAMP WITH TIME ZONE,
  supplier_payment_sent BOOLEAN DEFAULT false,
  supplier_payment_sent_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج شركات الطيران الأساسية
-- INSERT INTO public.airlines (name, iata_code, icao_code, country) VALUES
-- ('مصر للطيران', 'MS', 'MSR', 'Egypt'),
-- ('طيران الإمارات', 'EK', 'UAE', 'UAE'),
-- ('الخطوط السعودية', 'SV', 'SVA', 'Saudi Arabia'),
-- ('القطرية', 'QR', 'QTR', 'Qatar'),
-- ('الاتحاد للطيران', 'EY', 'ETD', 'UAE'),
-- ('فلاي دبي', 'FZ', 'FDB', 'UAE'),
-- ('أديل', 'ADK', 'ABDDK', 'Egypt'),
-- ('النيل للطيران', 'NP', 'NIA', 'Egypt');

-- إدراج المطارات الأساسية
-- INSERT INTO public.airports (name, city, country, iata_code, icao_code, timezone) VALUES
-- ('مطار القاهرة الدولي', 'القاهرة', 'Egypt', 'CAI', 'HECA', 'Africa/Cairo'),
-- ('مطار دبي الدولي', 'دبي', 'UAE', 'DXB', 'OMDB', 'Asia/Dubai'),
-- ('مطار الملك عبدالعزيز الدولي', 'جدة', 'Saudi Arabia', 'JED', 'OEJN', 'Asia/Riyadh'),
-- ('مطار حمد الدولي', 'الدوحة', 'Qatar', 'DOH', 'OTHH', 'Asia/Qatar'),
-- ('مطار أبو ظبي الدولي', 'أبو ظبي', 'UAE', 'AUH', 'OMAA', 'Asia/Dubai'),
-- ('مطار الملك فهد الدولي', 'الدمام', 'Saudi Arabia', 'DMM', 'OEDF', 'Asia/Riyadh'),
-- ('مطار شرم الشيخ الدولي', 'شرم الشيخ', 'Egypt', 'SSH', 'HESH', 'Africa/Cairo'),
-- ('مطار الغردقة الدولي', 'الغردقة', 'Egypt', 'HRG', 'HEGN', 'Africa/Cairo'),
-- ('مطار الأقصر الدولي', 'الأقصر', 'Egypt', 'LXR', 'HELX', 'Africa/Cairo'),
-- ('مطار أسوان الدولي', 'أسوان', 'Egypt', 'ASW', 'HESN', 'Africa/Cairo');

-- إدراج درجات الطيران
-- INSERT INTO public.flight_classes (name, name_ar, code, description, baggage_allowance) VALUES
-- ('Economy', 'اقتصادية', 'Y', 'الدرجة الاقتصادية', '20kg checked + 7kg carry-on'),
-- ('Premium Economy', 'اقتصادية ممتازة', 'W', 'الدرجة الاقتصادية الممتازة', '23kg checked + 7kg carry-on'),
-- ('Business', 'رجال أعمال', 'C', 'درجة رجال الأعمال', '32kg checked + 7kg carry-on'),
-- ('First Class', 'الدرجة الأولى', 'F', 'الدرجة الأولى', '40kg checked + 7kg carry-on');

-- إنشاء دالة لحساب القيم التلقائية لحجوزات الطيران
CREATE OR REPLACE FUNCTION calculate_flight_booking_values()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب التكلفة الإجمالية
  NEW.total_cost = NEW.ticket_price_per_person * NEW.number_of_passengers + COALESCE(NEW.taxes_and_fees, 0);
  
  -- حساب الربح الإجمالي
  NEW.total_profit = NEW.total_cost - NEW.supplier_cost;
  
  -- حساب المبلغ المتبقي
  NEW.remaining_amount = NEW.total_cost - COALESCE(NEW.paid_amount, 0);
  
  -- إذا تم توفير customer_id، جلب اسم العميل
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO NEW.customer_name FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الترايجر
CREATE TRIGGER flight_booking_calculations
  BEFORE INSERT OR UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_flight_booking_values();

-- تفعيل Row Level Security
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Enable all access for airlines" ON public.airlines FOR ALL USING (true);
CREATE POLICY "Enable all access for airports" ON public.airports FOR ALL USING (true);
CREATE POLICY "Enable all access for flight_classes" ON public.flight_classes FOR ALL USING (true);
CREATE POLICY "Enable all access for flight_bookings" ON public.flight_bookings FOR ALL USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_flight_bookings_customer_id ON public.flight_bookings(customer_id);
CREATE INDEX idx_flight_bookings_departure_date ON public.flight_bookings(departure_date);
CREATE INDEX idx_flight_bookings_airline_id ON public.flight_bookings(airline_id);
CREATE INDEX idx_flight_bookings_status_id ON public.flight_bookings(status_id);
CREATE INDEX idx_flight_bookings_booking_reference ON public.flight_bookings(booking_reference);
