
-- Fix ambiguous employee_code reference in calculate_employee_bookings_profit function
CREATE OR REPLACE FUNCTION public.calculate_employee_bookings_profit(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date
) 
RETURNS TABLE(
  booking_type text,
  booking_id uuid,
  booking_amount numeric,
  supplier_cost numeric,
  profit numeric,
  booking_date date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_name text;
  employee_code text;
BEGIN
  -- Get employee details for fallback
  SELECT e.full_name, e.employee_code INTO employee_name, employee_code
  FROM public.employees e
  WHERE e.id = p_employee_id;
  
  -- Return bookings from all tables with both booking_agent_id and booking_agent_name matching
  RETURN QUERY
  -- Hotel bookings
  SELECT 
    'hotel'::text as booking_type,
    hb.id as booking_id,
    COALESCE(hb.total_cost_customer, 0)::numeric as booking_amount,
    COALESCE(hb.cost_per_night * hb.number_of_nights, 0)::numeric as supplier_cost,
    COALESCE(hb.total_profit, 0)::numeric as profit,
    hb.booking_date::date as booking_date
  FROM public.hotel_bookings hb
  WHERE hb.booking_date BETWEEN p_period_start AND p_period_end
    AND (
      hb.booking_agent_id = p_employee_id 
      OR hb.booking_agent_name = employee_name 
      OR hb.booking_agent_name = employee_code
    )
  
  UNION ALL
  
  -- Flight bookings
  SELECT 
    'flight'::text as booking_type,
    fb.id as booking_id,
    COALESCE(fb.total_cost, 0)::numeric as booking_amount,
    COALESCE(fb.supplier_cost, 0)::numeric as supplier_cost,
    COALESCE(fb.total_profit, 0)::numeric as profit,
    fb.booking_date::date as booking_date
  FROM public.flight_bookings fb
  WHERE fb.booking_date BETWEEN p_period_start AND p_period_end
    AND (
      fb.booking_agent_id = p_employee_id 
      OR fb.booking_agent_name = employee_name 
      OR fb.booking_agent_name = employee_code
    )
  
  UNION ALL
  
  -- Car rentals
  SELECT 
    'car_rental'::text as booking_type,
    cr.id as booking_id,
    COALESCE(cr.total_rental_cost, 0)::numeric as booking_amount,
    COALESCE(cr.supplier_total_cost, 0)::numeric as supplier_cost,
    COALESCE(cr.total_profit, 0)::numeric as profit,
    cr.rental_start_date::date as booking_date
  FROM public.car_rentals cr
  WHERE cr.rental_start_date BETWEEN p_period_start AND p_period_end
    AND (
      cr.booking_agent_id = p_employee_id 
      OR cr.booking_agent_name = employee_name 
      OR cr.booking_agent_name = employee_code
    )
  
  ORDER BY booking_date DESC;
END;
$$;

-- Create the missing generate_period_commission function
CREATE OR REPLACE FUNCTION public.generate_period_commission(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_data RECORD;
  bookings_data RECORD;
  commission_period_id UUID;
  result jsonb;
BEGIN
  -- Check if employee exists and is active
  SELECT * INTO employee_data 
  FROM public.employees 
  WHERE id = p_employee_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود أو غير نشط'
    );
  END IF;
  
  -- Check if commission period already exists
  IF EXISTS (
    SELECT 1 FROM public.employee_commission_periods 
    WHERE employee_id = p_employee_id 
      AND period_start = p_period_start 
      AND period_end = p_period_end
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم حساب عمولة هذا الموظف لهذه الفترة مسبقاً'
    );
  END IF;
  
  -- Get bookings and calculate totals
  WITH booking_calculations AS (
    SELECT 
      COUNT(*) as total_bookings,
      SUM(booking_amount) as total_booking_amount,
      SUM(supplier_cost) as total_supplier_cost,
      SUM(profit) as total_profit
    FROM public.calculate_employee_bookings_profit(p_employee_id, p_period_start, p_period_end)
  )
  SELECT * INTO bookings_data FROM booking_calculations;
  
  -- Check if there are any bookings
  IF COALESCE(bookings_data.total_bookings, 0) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا توجد حجوزات للموظف في الفترة المحددة'
    );
  END IF;
  
  -- Calculate commission amount
  DECLARE
    commission_amount NUMERIC;
  BEGIN
    commission_amount := COALESCE(bookings_data.total_profit, 0) * (COALESCE(employee_data.commission_rate, 0) / 100);
  END;
  
  -- Insert commission period
  INSERT INTO public.employee_commission_periods (
    employee_id,
    period_start,
    period_end,
    total_bookings_count,
    total_booking_amount,
    total_supplier_cost,
    total_profit,
    commission_rate,
    commission_amount,
    currency,
    status,
    notes,
    created_by
  ) VALUES (
    p_employee_id,
    p_period_start,
    p_period_end,
    COALESCE(bookings_data.total_bookings, 0),
    COALESCE(bookings_data.total_booking_amount, 0),
    COALESCE(bookings_data.total_supplier_cost, 0),
    COALESCE(bookings_data.total_profit, 0),
    COALESCE(employee_data.commission_rate, 0),
    commission_amount,
    'EGP',
    'pending',
    p_notes,
    auth.uid()
  ) RETURNING id INTO commission_period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حساب وحفظ العمولة المجمعة بنجاح',
    'commission_period_id', commission_period_id,
    'summary', jsonb_build_object(
      'bookings_count', COALESCE(bookings_data.total_bookings, 0),
      'total_profit', COALESCE(bookings_data.total_profit, 0),
      'commission_amount', commission_amount,
      'commission_rate', COALESCE(employee_data.commission_rate, 0)
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ في حساب العمولة: ' || SQLERRM
    );
END;
$$;

-- Create the missing update_period_commission_status function
CREATE OR REPLACE FUNCTION public.update_period_commission_status(
  p_commission_period_id uuid,
  p_status text,
  p_payment_date date DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_bank_account_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  commission_exists BOOLEAN := FALSE;
  old_status TEXT;
  result jsonb;
BEGIN
  -- Check if commission period exists
  SELECT EXISTS (SELECT 1 FROM public.employee_commission_periods WHERE id = p_commission_period_id), status
  INTO commission_exists, old_status
  FROM public.employee_commission_periods 
  WHERE id = p_commission_period_id;
  
  IF NOT commission_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'فترة العمولة غير موجودة'
    );
  END IF;
  
  -- Update commission status
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
    'old_status', old_status,
    'new_status', p_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ في تحديث حالة العمولة: ' || SQLERRM
    );
END;
$$;
