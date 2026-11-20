-- Reject new zero divisors while keeping older settings readable until corrected.
ALTER TABLE public.organization_salary_settings
  ADD CONSTRAINT organization_salary_settings_positive_working_time_check
  CHECK (setting_key NOT IN ('working_days_per_month', 'working_hours_per_day') OR setting_value > 0)
  NOT VALID;

CREATE OR REPLACE FUNCTION public.calculate_monthly_salary(p_employee_id uuid, p_salary_month date, p_overtime_hours numeric DEFAULT 0, p_bonus numeric DEFAULT 0, p_deductions numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_emp public.employees%ROWTYPE;
  v_month text := to_char(p_salary_month, 'YYYY-MM');
  v_working_days numeric;
  v_working_hours numeric;
  v_overtime_multiplier numeric;
  v_overtime_rate numeric;
  v_overtime_amount numeric;
  v_gross numeric;
  v_net numeric;
  v_salary_id uuid;
BEGIN
  SELECT * INTO v_emp
  FROM public.employees
  WHERE id = p_employee_id AND is_active
    AND public.has_org_hr_permission(organization_id, 'employees_salary')
  FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'EMPLOYEE_NOT_FOUND');
  END IF;
  IF NOT coalesce(public.can_org_write(v_emp.organization_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.monthly_salaries
    WHERE employee_id = p_employee_id
      AND salary_month = v_month
      AND status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'SALARY_EXISTS');
  END IF;
  IF LEAST(COALESCE(p_overtime_hours, 0), COALESCE(p_bonus, 0), COALESCE(p_deductions, 0)) < 0 THEN
    RAISE EXCEPTION 'Salary inputs must be non-negative';
  END IF;

  SELECT
    coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'working_days_per_month'), 0), 30),
    coalesce(nullif(max(setting_value) FILTER (WHERE setting_key = 'working_hours_per_day'), 0), 8),
    coalesce(max(setting_value) FILTER (WHERE setting_key = 'overtime_multiplier'), 1.5)
  INTO v_working_days, v_working_hours, v_overtime_multiplier
  FROM public.organization_salary_settings
  WHERE organization_id = v_emp.organization_id
    AND setting_key IN ('working_days_per_month', 'working_hours_per_day', 'overtime_multiplier');

  v_overtime_rate := round(
    COALESCE(v_emp.base_salary, 0) / v_working_days / v_working_hours * v_overtime_multiplier,
    2
  );
  v_overtime_amount := round(v_overtime_rate * COALESCE(p_overtime_hours, 0), 2);
  v_gross := round(
    COALESCE(v_emp.base_salary, 0) + COALESCE(v_emp.allowances, 0)
    + v_overtime_amount + COALESCE(p_bonus, 0), 2
  );
  IF COALESCE(p_deductions, 0) > v_gross THEN
    RAISE EXCEPTION 'Payroll deductions cannot exceed gross salary';
  END IF;
  v_net := round(v_gross - COALESCE(p_deductions, 0), 2);

  INSERT INTO public.monthly_salaries (
    employee_id, organization_id, salary_month, base_salary, allowances,
    overtime_hours, overtime_rate, overtime_amount, bonus, deductions,
    gross_salary, net_salary, net_salary_egp, exchange_rate, currency,
    status, notes, created_by
  ) VALUES (
    p_employee_id, v_emp.organization_id, v_month,
    COALESCE(v_emp.base_salary, 0), COALESCE(v_emp.allowances, 0),
    COALESCE(p_overtime_hours, 0), v_overtime_rate, v_overtime_amount,
    COALESCE(p_bonus, 0), COALESCE(p_deductions, 0), v_gross, v_net,
    v_net, 1, 'EGP', 'pending', p_notes, auth.uid()
  ) RETURNING id INTO v_salary_id;

  RETURN jsonb_build_object(
    'success', true, 'salary_id', v_salary_id,
    'calculated_data', jsonb_build_object(
      'base_salary', v_emp.base_salary,
      'allowances', v_emp.allowances,
      'overtime_rate', v_overtime_rate,
      'overtime_amount', v_overtime_amount,
      'bonus', p_bonus,
      'deductions', p_deductions,
      'gross_salary', v_gross,
      'net_salary', v_net
    )
  );
END;
$function$
;
