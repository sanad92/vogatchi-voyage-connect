
-- إنشاء stored procedure لحساب الرواتب بشكل آمن
CREATE OR REPLACE FUNCTION public.calculate_monthly_salary(
  p_employee_id UUID,
  p_salary_month DATE,
  p_overtime_hours NUMERIC DEFAULT 0,
  p_bonus NUMERIC DEFAULT 0,
  p_deductions NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_data RECORD;
  attendance_data RECORD;
  salary_settings RECORD;
  calculated_salary RECORD;
  existing_salary_id UUID;
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
  
  -- التحقق من عدم وجود راتب لنفس الشهر
  SELECT id INTO existing_salary_id 
  FROM public.monthly_salaries 
  WHERE employee_id = p_employee_id 
    AND DATE_TRUNC('month', salary_month) = DATE_TRUNC('month', p_salary_month);
  
  IF existing_salary_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SALARY_EXISTS',
      'message', 'تم حساب راتب هذا الموظف لهذا الشهر مسبقاً'
    );
  END IF;
  
  -- جلب إعدادات الراتب (أو استخدام القيم الافتراضية)
  SELECT 
    COALESCE(
      (SELECT setting_value::NUMERIC FROM public.system_settings WHERE setting_key = 'tax_rate'), 
      0
    ) as tax_rate,
    COALESCE(
      (SELECT setting_value::NUMERIC FROM public.system_settings WHERE setting_key = 'insurance_rate'), 
      5
    ) as insurance_rate,
    COALESCE(
      (SELECT setting_value::NUMERIC FROM public.system_settings WHERE setting_key = 'overtime_multiplier'), 
      1.5
    ) as overtime_multiplier,
    COALESCE(
      (SELECT setting_value::NUMERIC FROM public.system_settings WHERE setting_key = 'working_days_per_month'), 
      30
    ) as working_days_per_month,
    COALESCE(
      (SELECT setting_value::NUMERIC FROM public.system_settings WHERE setting_key = 'working_hours_per_day'), 
      8
    ) as working_hours_per_day
  INTO salary_settings;
  
  -- محاولة جلب بيانات الحضور (أو استخدام القيم الافتراضية)
  SELECT 
    COALESCE(present_days, salary_settings.working_days_per_month) as attendance_days,
    COALESCE(absent_days, 0) as absence_days,
    COALESCE(late_hours, 0) as late_hours,
    COALESCE(overtime_hours, 0) as system_overtime_hours
  INTO attendance_data
  FROM (
    SELECT 
      salary_settings.working_days_per_month as present_days,
      0 as absent_days,
      0 as late_hours,
      0 as overtime_hours
  ) default_attendance;
  
  -- حساب الراتب
  WITH salary_calculation AS (
    SELECT 
      employee_data.base_salary,
      employee_data.allowances,
      (p_overtime_hours + attendance_data.system_overtime_hours) as total_overtime_hours,
      (employee_data.base_salary / (salary_settings.working_days_per_month * salary_settings.working_hours_per_day)) * salary_settings.overtime_multiplier as overtime_rate,
      p_bonus as bonus,
      p_deductions as deductions,
      attendance_data.attendance_days,
      attendance_data.absence_days,
      attendance_data.late_hours
  ),
  amounts AS (
    SELECT 
      *,
      (total_overtime_hours * overtime_rate) as overtime_amount,
      (base_salary + allowances + (total_overtime_hours * overtime_rate) + bonus) as gross_salary
    FROM salary_calculation
  ),
  final_calculation AS (
    SELECT 
      *,
      (gross_salary * (salary_settings.tax_rate / 100)) as tax_amount,
      (base_salary * (salary_settings.insurance_rate / 100)) as insurance_deduction,
      (gross_salary - deductions - (gross_salary * (salary_settings.tax_rate / 100)) - (base_salary * (salary_settings.insurance_rate / 100))) as net_salary
    FROM amounts
  )
  SELECT * INTO calculated_salary FROM final_calculation;
  
  -- إدراج الراتب المحسوب
  INSERT INTO public.monthly_salaries (
    employee_id,
    salary_month,
    base_salary,
    allowances,
    overtime_hours,
    overtime_rate,
    overtime_amount,
    bonus,
    deductions,
    gross_salary,
    tax_amount,
    insurance_deduction,
    net_salary,
    attendance_days,
    absence_days,
    late_hours,
    currency,
    exchange_rate,
    net_salary_egp,
    status,
    notes,
    created_by
  ) VALUES (
    p_employee_id,
    p_salary_month,
    calculated_salary.base_salary,
    calculated_salary.allowances,
    calculated_salary.total_overtime_hours,
    calculated_salary.overtime_rate,
    calculated_salary.overtime_amount,
    calculated_salary.bonus,
    calculated_salary.deductions,
    calculated_salary.gross_salary,
    calculated_salary.tax_amount,
    calculated_salary.insurance_deduction,
    calculated_salary.net_salary,
    calculated_salary.attendance_days,
    calculated_salary.absence_days,
    calculated_salary.late_hours,
    'EGP',
    1.00,
    calculated_salary.net_salary,
    'pending',
    p_notes,
    auth.uid()
  ) RETURNING id INTO existing_salary_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حساب وحفظ الراتب بنجاح',
    'salary_id', existing_salary_id,
    'calculated_data', row_to_json(calculated_salary)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CALCULATION_ERROR',
      'message', 'حدث خطأ في حساب الراتب: ' || SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- إنشاء stored procedure لتحديث حالة الراتب
CREATE OR REPLACE FUNCTION public.update_salary_status(
  p_salary_id UUID,
  p_status TEXT,
  p_payment_date DATE DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salary_exists BOOLEAN := FALSE;
  old_status TEXT;
  result JSONB;
BEGIN
  -- التحقق من وجود الراتب
  SELECT EXISTS (SELECT 1 FROM public.monthly_salaries WHERE id = p_salary_id), status
  INTO salary_exists, old_status
  FROM public.monthly_salaries 
  WHERE id = p_salary_id;
  
  IF NOT salary_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SALARY_NOT_FOUND',
      'message', 'الراتب غير موجود'
    );
  END IF;
  
  -- تحديث حالة الراتب
  UPDATE public.monthly_salaries 
  SET 
    status = p_status,
    payment_date = CASE WHEN p_status = 'paid' THEN COALESCE(p_payment_date, CURRENT_DATE) ELSE payment_date END,
    payment_method = COALESCE(p_payment_method, payment_method),
    bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
    notes = CASE WHEN p_notes IS NOT NULL THEN 
              CASE WHEN notes IS NOT NULL THEN notes || E'\n' || p_notes ELSE p_notes END 
            ELSE notes END,
    updated_at = now()
  WHERE id = p_salary_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث حالة الراتب بنجاح',
    'salary_id', p_salary_id,
    'old_status', old_status,
    'new_status', p_status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_ERROR',
      'message', 'حدث خطأ في تحديث حالة الراتب: ' || SQLERRM
    );
END;
$$;
