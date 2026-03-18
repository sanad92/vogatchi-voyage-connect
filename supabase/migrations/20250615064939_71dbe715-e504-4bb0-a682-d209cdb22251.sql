
-- إصلاح جدول عمولات الموظفين وإضافة التحققات المطلوبة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_commission_rate_positive'
      AND conrelid = 'public.employee_commissions'::regclass
  ) THEN
    ALTER TABLE public.employee_commissions
    ADD CONSTRAINT check_commission_rate_positive CHECK (commission_rate >= 0 AND commission_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_commission_amount_positive'
      AND conrelid = 'public.employee_commissions'::regclass
  ) THEN
    ALTER TABLE public.employee_commissions
    ADD CONSTRAINT check_commission_amount_positive CHECK (commission_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_booking_amount_positive'
      AND conrelid = 'public.employee_commissions'::regclass
  ) THEN
    ALTER TABLE public.employee_commissions
    ADD CONSTRAINT check_booking_amount_positive CHECK (booking_amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_employee_booking_commission'
      AND conrelid = 'public.employee_commissions'::regclass
  ) THEN
    ALTER TABLE public.employee_commissions
    ADD CONSTRAINT unique_employee_booking_commission UNIQUE (employee_id, booking_id, booking_type);
  END IF;
END $$;

-- إضافة عمود لتتبع من قام بإنشاء العمولة
ALTER TABLE public.employee_commissions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- تحسين دالة حساب عمولة الموظف
CREATE OR REPLACE FUNCTION public.calculate_employee_commission(
  p_employee_id UUID,
  p_booking_amount NUMERIC,
  p_commission_rate NUMERIC DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  commission_rate NUMERIC;
  commission_amount NUMERIC;
  employee_active BOOLEAN;
BEGIN
  -- التحقق من أن الموظف نشط
  SELECT is_active INTO employee_active
  FROM public.employees
  WHERE id = p_employee_id;
  
  IF NOT employee_active THEN
    RAISE EXCEPTION 'الموظف غير نشط أو غير موجود';
  END IF;
  
  -- إذا لم يتم تمرير معدل العمولة، جلبه من جدول الموظفين
  IF p_commission_rate IS NULL THEN
    SELECT e.commission_rate INTO commission_rate
    FROM public.employees e
    WHERE e.id = p_employee_id AND e.is_active = true;
  ELSE
    commission_rate := p_commission_rate;
  END IF;
  
  -- التحقق من صحة معدل العمولة
  IF commission_rate IS NULL OR commission_rate < 0 OR commission_rate > 100 THEN
    RAISE EXCEPTION 'معدل العمولة غير صحيح: %', commission_rate;
  END IF;
  
  -- حساب مبلغ العمولة
  commission_amount := p_booking_amount * (commission_rate / 100);
  
  RETURN commission_amount;
END;
$$;

-- تحسين دالة الحساب التلقائي للعمولات
CREATE OR REPLACE FUNCTION public.auto_calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  booking_amount NUMERIC;
  commission_amount NUMERIC;
  booking_type_name TEXT;
  table_name TEXT;
  employee_active BOOLEAN;
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
  
  -- التحقق من وجود وكيل الحجز ونشاطه
  IF NEW.booking_agent_id IS NOT NULL THEN
    SELECT is_active INTO employee_active
    FROM public.employees
    WHERE id = NEW.booking_agent_id;
    
    IF NOT employee_active THEN
      RAISE WARNING 'وكيل الحجز غير نشط: %', NEW.booking_agent_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- حساب العمولة فقط عند اكتمال الدفع والحجز جديد أو تم تحديث المبلغ المدفوع
  IF NEW.booking_agent_id IS NOT NULL AND 
--      (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.paid_amount != NEW.paid_amount)) AND
     NEW.paid_amount >= booking_amount * 0.8 THEN -- 80% على الأقل من المبلغ مدفوع
    
    -- التحقق من عدم وجود عمولة مسبقة لنفس الحجز
    IF NOT EXISTS (
      SELECT 1 FROM public.employee_commissions 
      WHERE employee_id = NEW.booking_agent_id 
        AND booking_id = NEW.id 
        AND booking_type = booking_type_name
    ) THEN
      
      commission_amount := calculate_employee_commission(
        NEW.booking_agent_id, 
        booking_amount
      );
      
      -- إدراج العمولة في جدول العمولات
-- INSERT INTO public.employee_commissions (
--         employee_id,
--         booking_id,
--         booking_type,
--         booking_amount,
--         commission_rate,
--         commission_amount,
--         currency,
--         created_by
--       ) VALUES (
--         NEW.booking_agent_id,
--         NEW.id,
--         booking_type_name,
--         booking_amount,
--         (SELECT commission_rate FROM public.employees WHERE id = NEW.booking_agent_id),
--         commission_amount,
--         COALESCE(NEW.currency, 'EGP'),
--         auth.uid()
--       );
      
      -- تحديث إجمالي العمولات المكتسبة للموظف
      UPDATE public.employees 
      SET total_commission_earned = total_commission_earned + commission_amount,
          updated_at = now()
      WHERE id = NEW.booking_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء أو استبدال المشغلات للحسابات التلقائية
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.hotel_bookings;
CREATE TRIGGER auto_commission_trigger
  AFTER INSERT OR UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

DROP TRIGGER IF EXISTS auto_commission_trigger ON public.flight_bookings;
CREATE TRIGGER auto_commission_trigger
  AFTER INSERT OR UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

DROP TRIGGER IF EXISTS auto_commission_trigger ON public.transport_bookings;
CREATE TRIGGER auto_commission_trigger
  AFTER INSERT OR UPDATE ON public.transport_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

DROP TRIGGER IF EXISTS auto_commission_trigger ON public.car_rentals;
CREATE TRIGGER auto_commission_trigger
  AFTER INSERT OR UPDATE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_commission();

-- دالة للتحقق من صحة العمولات المرتبطة بموظف معين
CREATE OR REPLACE FUNCTION public.validate_employee_commissions(p_employee_id UUID)
RETURNS TABLE(
  commission_id UUID,
  booking_id UUID,
  issue_description TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id as commission_id,
    ec.booking_id,
    CASE 
      WHEN ec.commission_rate < 0 OR ec.commission_rate > 100 THEN 'معدل عمولة غير صحيح'
      WHEN ec.commission_amount <= 0 THEN 'مبلغ عمولة غير صحيح'
      WHEN ec.booking_amount <= 0 THEN 'مبلغ حجز غير صحيح'
      WHEN ec.payment_status = 'paid' AND ec.payment_date IS NULL THEN 'تاريخ دفع مفقود'
      ELSE 'مشكلة غير محددة'
    END as issue_description
  FROM public.employee_commissions ec
  WHERE ec.employee_id = p_employee_id
    AND (
      ec.commission_rate < 0 OR ec.commission_rate > 100 OR
      ec.commission_amount <= 0 OR
      ec.booking_amount <= 0
    );
END;
$$;

-- دالة لإلغاء عمولة (في حالة إلغاء الحجز)
CREATE OR REPLACE FUNCTION public.cancel_commission(
  p_commission_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  commission_record RECORD;
BEGIN
  -- الحصول على بيانات العمولة
  SELECT * INTO commission_record
  FROM public.employee_commissions
  WHERE id = p_commission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العمولة غير موجودة';
  END IF;
  
  -- التحقق من أن العمولة لم يتم دفعها بعد
  IF commission_record.payment_status = 'paid' THEN
    RAISE EXCEPTION 'لا يمكن إلغاء عمولة تم دفعها';
  END IF;
  
  -- تحديث حالة العمولة إلى ملغية
  UPDATE public.employee_commissions 
  SET 
    payment_status = 'cancelled',
    notes = COALESCE(notes || ' | ', '') || 'ملغية: ' || COALESCE(p_reason, 'بدون سبب محدد'),
    updated_at = now()
  WHERE id = p_commission_id;
  
  -- تحديث إجمالي العمولات للموظف
  UPDATE public.employees 
  SET 
    total_commission_earned = total_commission_earned - commission_record.commission_amount,
    updated_at = now()
  WHERE id = commission_record.employee_id;
  
  RETURN TRUE;
END;
$$;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee_payment_status 
ON public.employee_commissions(employee_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_employee_commissions_commission_date 
ON public.employee_commissions(commission_date);

CREATE INDEX IF NOT EXISTS idx_employee_commissions_booking 
ON public.employee_commissions(booking_id, booking_type);
