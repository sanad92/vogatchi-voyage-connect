
-- إضافة حقول العمولات لجدول الموظفين
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.00;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS total_commission_earned NUMERIC DEFAULT 0.00;

-- إنشاء جدول عمولات الموظفين
CREATE TABLE IF NOT EXISTS public.employee_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  booking_id UUID,
  booking_type TEXT NOT NULL, -- 'hotel', 'flight', 'transport', 'car_rental'
  booking_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EGP',
  commission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول دفع عمولات الموظفين
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  payment_period_start DATE NOT NULL,
  payment_period_end DATE NOT NULL,
  total_commission_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EGP',
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة حقل معرف الموظف المسؤول للحجوزات
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES public.employees(id);
ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES public.employees(id);
ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES public.employees(id);
ALTER TABLE public.car_rentals ADD COLUMN IF NOT EXISTS booking_agent_id UUID REFERENCES public.employees(id);

-- إنشاء function لحساب العمولة
CREATE OR REPLACE FUNCTION calculate_employee_commission(
  p_employee_id UUID,
  p_booking_amount NUMERIC,
  p_commission_rate NUMERIC DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  commission_rate NUMERIC;
  commission_amount NUMERIC;
BEGIN
  -- إذا لم يتم تمرير معدل العمولة، جلبه من جدول الموظفين
  IF p_commission_rate IS NULL THEN
    SELECT e.commission_rate INTO commission_rate
    FROM public.employees e
    WHERE e.id = p_employee_id;
  ELSE
    commission_rate := p_commission_rate;
  END IF;
  
  -- حساب مبلغ العمولة
  commission_amount := p_booking_amount * (commission_rate / 100);
  
  RETURN commission_amount;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لحساب العمولة تلقائياً عند تأكيد الحجز
CREATE OR REPLACE FUNCTION auto_calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  booking_amount NUMERIC;
  commission_amount NUMERIC;
  booking_type_name TEXT;
  table_name TEXT;
BEGIN
  -- تحديد نوع الحجز والمبلغ
  table_name := TG_TABLE_NAME;
  
  CASE table_name
    WHEN 'hotel_bookings' THEN
      booking_amount := NEW.total_cost_customer;
      booking_type_name := 'hotel';
    WHEN 'flight_bookings' THEN
      booking_amount := NEW.total_cost;
      booking_type_name := 'flight';
    WHEN 'transport_bookings' THEN
      booking_amount := NEW.total_cost;
      booking_type_name := 'transport';
    WHEN 'car_rentals' THEN
      booking_amount := NEW.total_rental_cost;
      booking_type_name := 'car_rental';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- حساب العمولة إذا كان الحجز مدفوع والموظف محدد
  IF NEW.booking_agent_id IS NOT NULL AND 
     OLD.paid_amount != NEW.paid_amount AND 
     NEW.paid_amount >= booking_amount THEN
    
    commission_amount := calculate_employee_commission(
      NEW.booking_agent_id, 
      booking_amount
    );
    
    -- إدراج العمولة في جدول العمولات
    INSERT INTO public.employee_commissions (
      employee_id,
      booking_id,
      booking_type,
      booking_amount,
      commission_rate,
      commission_amount,
      currency
    ) VALUES (
      NEW.booking_agent_id,
      NEW.id,
      booking_type_name,
      booking_amount,
      (SELECT commission_rate FROM public.employees WHERE id = NEW.booking_agent_id),
      commission_amount,
      COALESCE(NEW.currency, 'EGP')
    );
    
    -- تحديث إجمالي العمولات المكتسبة للموظف
    UPDATE public.employees 
    SET total_commission_earned = total_commission_earned + commission_amount
    WHERE id = NEW.booking_agent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers للجداول
CREATE TRIGGER hotel_booking_commission_trigger
  AFTER UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

CREATE TRIGGER flight_booking_commission_trigger
  AFTER UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

CREATE TRIGGER transport_booking_commission_trigger
  AFTER UPDATE ON public.transport_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

CREATE TRIGGER car_rental_commission_trigger
  AFTER UPDATE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

-- إضافة triggers للتحديث التلقائي
CREATE TRIGGER update_employee_commissions_updated_at
  BEFORE UPDATE ON public.employee_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_payments_updated_at
  BEFORE UPDATE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات أولية لأنواع العمولات
UPDATE public.employees 
SET commission_rate = 2.5, commission_type = 'percentage' 
WHERE commission_rate = 0;
