
-- إضافة دعم العملات المتعددة لجدول الرواتب الشهرية
ALTER TABLE public.monthly_salaries 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS net_salary_egp NUMERIC(15,2);

-- إضافة دعم العملات المتعددة لجدول مدفوعات الإيجار
ALTER TABLE public.rent_payments 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS amount_egp NUMERIC(15,2);

-- تحديث العملة الافتراضية في جدول حجوزات الفنادق من SAR إلى EGP
ALTER TABLE public.hotel_bookings 
ALTER COLUMN currency SET DEFAULT 'EGP';

-- تحديث العملة الافتراضية في باقي الجداول
ALTER TABLE public.expense_transactions 
ALTER COLUMN currency SET DEFAULT 'EGP';

ALTER TABLE public.rent_contracts 
ALTER COLUMN currency SET DEFAULT 'EGP';

ALTER TABLE public.rent_payments 
ALTER COLUMN currency SET DEFAULT 'EGP';

-- إضافة حقول أسعار الصرف لجدول حجوزات الطيران
ALTER TABLE public.flight_bookings 
ADD COLUMN IF NOT EXISTS exchange_rate_to_egp NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS total_cost_egp NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS supplier_cost_egp NUMERIC(15,2);

-- إضافة حقول أسعار الصرف لجدول حجوزات الفنادق
ALTER TABLE public.hotel_bookings 
ADD COLUMN IF NOT EXISTS exchange_rate_to_egp NUMERIC(15,6) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS total_cost_customer_egp NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS cost_per_night_egp NUMERIC(15,2);

-- دالة لحساب قيم الرواتب بالعملات المتعددة
CREATE OR REPLACE FUNCTION calculate_salary_multi_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب سعر الصرف والقيمة بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.net_salary_egp = NEW.net_salary * NEW.exchange_rate;
  ELSE
    NEW.exchange_rate = 1.00;
    NEW.net_salary_egp = NEW.net_salary;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب قيم مدفوعات الإيجار بالعملات المتعددة
CREATE OR REPLACE FUNCTION calculate_rent_payment_multi_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب سعر الصرف والقيمة بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.amount_egp = NEW.amount * NEW.exchange_rate;
  ELSE
    NEW.exchange_rate = 1.00;
    NEW.amount_egp = NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب قيم حجوزات الطيران بالعملات المتعددة
CREATE OR REPLACE FUNCTION calculate_flight_booking_multi_currency()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب قيم حجوزات الفنادق بالعملات المتعددة
CREATE OR REPLACE FUNCTION calculate_hotel_booking_multi_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب القيم بالجنيه المصري
  IF NEW.currency != 'EGP' THEN
    NEW.exchange_rate_to_egp = get_current_exchange_rate(NEW.currency, 'EGP');
    NEW.total_cost_customer_egp = NEW.total_cost_customer * NEW.exchange_rate_to_egp;
    NEW.cost_per_night_egp = NEW.cost_per_night * NEW.exchange_rate_to_egp;
  ELSE
    NEW.exchange_rate_to_egp = 1.00;
    NEW.total_cost_customer_egp = NEW.total_cost_customer;
    NEW.cost_per_night_egp = NEW.cost_per_night;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغلات للحسابات التلقائية
CREATE TRIGGER salary_multi_currency_trigger
  BEFORE INSERT OR UPDATE ON public.monthly_salaries
  FOR EACH ROW EXECUTE FUNCTION calculate_salary_multi_currency();

CREATE TRIGGER rent_payment_multi_currency_trigger
  BEFORE INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION calculate_rent_payment_multi_currency();

CREATE TRIGGER flight_booking_multi_currency_trigger
  BEFORE INSERT OR UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_flight_booking_multi_currency();

CREATE TRIGGER hotel_booking_multi_currency_trigger
  BEFORE INSERT OR UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_hotel_booking_multi_currency();
