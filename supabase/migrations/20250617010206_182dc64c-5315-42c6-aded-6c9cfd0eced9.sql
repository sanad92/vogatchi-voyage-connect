
-- إضافة جدول العمولات المجمعة حسب الفترة
CREATE TABLE IF NOT EXISTS public.employee_commission_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_bookings_count INTEGER NOT NULL DEFAULT 0,
  total_booking_amount NUMERIC NOT NULL DEFAULT 0,
  total_supplier_cost NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_date DATE,
  payment_method TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period_start, period_end)
);

-- إضافة فهارس لتحسين الأداء
CREATE INDEX idx_commission_periods_employee_date ON public.employee_commission_periods(employee_id, period_start, period_end);
CREATE INDEX idx_commission_periods_status ON public.employee_commission_periods(status);

-- دالة لحساب ربح الحجوزات للموظف في فترة معينة
CREATE OR REPLACE FUNCTION public.calculate_employee_bookings_profit(
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE
) RETURNS TABLE(
  booking_type TEXT,
  booking_id UUID,
  booking_amount NUMERIC,
  supplier_cost NUMERIC,
  profit NUMERIC,
  booking_date DATE
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  -- حجوزات الفنادق
  SELECT 
    'hotel'::TEXT as booking_type,
    hb.id as booking_id,
    hb.total_cost_customer as booking_amount,
--     (hb.cost_per_night * hb.number_of_nights) as supplier_cost,
--     (hb.total_cost_customer - (hb.cost_per_night * hb.number_of_nights)) as profit,
    hb.booking_date
  FROM public.hotel_bookings hb
  WHERE hb.booking_agent_id = p_employee_id
    AND hb.booking_date >= p_period_start
    AND hb.booking_date <= p_period_end
    AND hb.total_cost_customer > 0
  
  UNION ALL
  
  -- حجوزات الطيران
  SELECT 
    'flight'::TEXT as booking_type,
    fb.id as booking_id,
    fb.total_cost as booking_amount,
    fb.supplier_cost as supplier_cost,
--     (fb.total_cost - fb.supplier_cost) as profit,
    fb.booking_date
  FROM public.flight_bookings fb
  WHERE fb.booking_agent_id = p_employee_id
    AND fb.booking_date >= p_period_start
    AND fb.booking_date <= p_period_end
    AND fb.total_cost > 0
  
  UNION ALL
  
  -- حجوزات المواصلات
  SELECT 
    'transport'::TEXT as booking_type,
    tb.id as booking_id,
    tb.total_cost as booking_amount,
    tb.supplier_cost as supplier_cost,
--     (tb.total_cost - tb.supplier_cost) as profit,
    tb.booking_date
  FROM public.transport_bookings tb
  WHERE tb.booking_agent_id = p_employee_id
    AND tb.booking_date >= p_period_start
    AND tb.booking_date <= p_period_end
    AND tb.total_cost > 0
  
  UNION ALL
  
  -- تأجير السيارات
  SELECT 
    'car_rental'::TEXT as booking_type,
    cr.id as booking_id,
    cr.total_rental_cost as booking_amount,
    cr.supplier_total_cost as supplier_cost,
--     (cr.total_rental_cost - cr.supplier_total_cost) as profit,
    cr.rental_start_date as booking_date
  FROM public.car_rentals cr
  WHERE cr.booking_agent_id = p_employee_id
    AND cr.rental_start_date >= p_period_start
    AND cr.rental_start_date <= p_period_end
    AND cr.total_rental_cost > 0;
END;
$$;

-- دالة لحساب وإنشاء العمولة المجمعة للفترة
CREATE OR REPLACE FUNCTION public.generate_period_commission(
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  employee_data RECORD;
  bookings_summary RECORD;
  commission_amount NUMERIC;
  existing_period_id UUID;
  result JSONB;
BEGIN
  -- التحقق من وجود الموظف ونشاطه
  SELECT * INTO employee_data 
  FROM public.employees 
  WHERE id = p_employee_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'الموظف غير موجود أو غير نشط'
    );
  END IF;
  
  -- التحقق من عدم وجود عمولة لنفس الفترة
  SELECT id INTO existing_period_id 
  FROM public.employee_commission_periods 
  WHERE employee_id = p_employee_id 
    AND period_start = p_period_start 
    AND period_end = p_period_end;
  
  IF existing_period_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERIOD_EXISTS',
      'message', 'تم حساب عمولة هذا الموظف لهذه الفترة مسبقاً'
    );
  END IF;
  
  -- حساب ملخص الحجوزات والأرباح
  SELECT 
    COUNT(*) as bookings_count,
    COALESCE(SUM(booking_amount), 0) as total_booking_amount,
    COALESCE(SUM(supplier_cost), 0) as total_supplier_cost,
    COALESCE(SUM(profit), 0) as total_profit
  INTO bookings_summary
  FROM public.calculate_employee_bookings_profit(p_employee_id, p_period_start, p_period_end);
  
  -- حساب العمولة (10% من الربح)
  commission_amount := bookings_summary.total_profit * (employee_data.commission_rate / 100);
  
  -- إدراج العمولة المجمعة
-- INSERT INTO public.employee_commission_periods (
--     employee_id,
--     period_start,
--     period_end,
--     total_bookings_count,
--     total_booking_amount,
--     total_supplier_cost,
--     total_profit,
--     commission_rate,
--     commission_amount,
--     currency,
--     status,
--     notes,
--     created_by
--   ) VALUES (
--     p_employee_id,
--     p_period_start,
--     p_period_end,
--     bookings_summary.bookings_count,
--     bookings_summary.total_booking_amount,
--     bookings_summary.total_supplier_cost,
--     bookings_summary.total_profit,
--     employee_data.commission_rate,
--     commission_amount,
--     'EGP',
--     'pending',
--     p_notes,
--     auth.uid()
--   ) RETURNING id INTO existing_period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حساب وحفظ العمولة المجمعة بنجاح',
    'commission_period_id', existing_period_id,
    'summary', jsonb_build_object(
      'bookings_count', bookings_summary.bookings_count,
      'total_profit', bookings_summary.total_profit,
      'commission_amount', commission_amount,
      'commission_rate', employee_data.commission_rate
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CALCULATION_ERROR',
      'message', 'حدث خطأ في حساب العمولة: ' || SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- دالة لتحديث حالة العمولة المجمعة
CREATE OR REPLACE FUNCTION public.update_period_commission_status(
  p_commission_period_id UUID,
  p_status TEXT,
  p_payment_date DATE DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  period_exists BOOLEAN := FALSE;
  old_status TEXT;
  result JSONB;
BEGIN
  -- التحقق من وجود فترة العمولة
  SELECT EXISTS (SELECT 1 FROM public.employee_commission_periods WHERE id = p_commission_period_id), status
  INTO period_exists, old_status
  FROM public.employee_commission_periods 
  WHERE id = p_commission_period_id;
  
  IF NOT period_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERIOD_NOT_FOUND',
      'message', 'فترة العمولة غير موجودة'
    );
  END IF;
  
  -- تحديث حالة العمولة
  UPDATE public.employee_commission_periods 
  SET 
    status = p_status,
    payment_date = CASE WHEN p_status = 'paid' THEN COALESCE(p_payment_date, CURRENT_DATE) ELSE payment_date END,
    payment_method = COALESCE(p_payment_method, payment_method),
    bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
    notes = CASE WHEN p_notes IS NOT NULL THEN 
              CASE WHEN notes IS NOT NULL THEN notes || E'\n' || p_notes ELSE p_notes END 
            ELSE notes END,
    updated_at = now()
  WHERE id = p_commission_period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث حالة العمولة بنجاح',
    'commission_period_id', p_commission_period_id,
    'old_status', old_status,
    'new_status', p_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_ERROR',
      'message', 'حدث خطأ في تحديث حالة العمولة: ' || SQLERRM
    );
END;
$$;

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_commission_periods_updated_at
  BEFORE UPDATE ON public.employee_commission_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- إيقاف الحساب التلقائي للعمولات المنفصلة مؤقتاً
-- سنعيد تفعيلها لاحقاً بطريقة محدثة إذا لزم الأمر
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.hotel_bookings;
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.flight_bookings;
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.transport_bookings;
DROP TRIGGER IF EXISTS auto_commission_trigger ON public.car_rentals;
