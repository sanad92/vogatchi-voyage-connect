
CREATE OR REPLACE FUNCTION public.calculate_monthly_salary(
  p_employee_id uuid,
  p_salary_month date,
  p_overtime_hours numeric DEFAULT 0,
  p_bonus numeric DEFAULT 0,
  p_deductions numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp record;
  v_org uuid;
  v_user uuid;
  v_month_text text;
  v_existing uuid;
  v_overtime_rate numeric := 0;
  v_overtime_amount numeric := 0;
  v_gross numeric := 0;
  v_net numeric := 0;
  v_salary_id uuid;
BEGIN
  v_user := auth.uid();
  v_month_text := to_char(p_salary_month, 'YYYY-MM');

  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'EMPLOYEE_NOT_FOUND');
  END IF;
  v_org := v_emp.organization_id;

  SELECT id INTO v_existing FROM public.monthly_salaries
    WHERE employee_id = p_employee_id AND salary_month = v_month_text;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'SALARY_EXISTS');
  END IF;

  v_overtime_rate := COALESCE(v_emp.base_salary, 0) / 30.0 / 8.0 * 1.5;
  v_overtime_amount := v_overtime_rate * COALESCE(p_overtime_hours, 0);
  v_gross := COALESCE(v_emp.base_salary, 0) + COALESCE(v_emp.allowances, 0) + v_overtime_amount + COALESCE(p_bonus, 0);
  v_net := GREATEST(0, v_gross - COALESCE(p_deductions, 0));

  INSERT INTO public.monthly_salaries (
    employee_id, organization_id, salary_month, base_salary, allowances,
    overtime_hours, overtime_rate, overtime_amount, bonus, deductions,
    gross_salary, net_salary, currency, status, notes, created_by
  ) VALUES (
    p_employee_id, v_org, v_month_text, COALESCE(v_emp.base_salary,0), COALESCE(v_emp.allowances,0),
    COALESCE(p_overtime_hours,0), v_overtime_rate, v_overtime_amount, COALESCE(p_bonus,0), COALESCE(p_deductions,0),
    v_gross, v_net, 'EGP', 'pending', p_notes, v_user
  ) RETURNING id INTO v_salary_id;

  RETURN jsonb_build_object(
    'success', true, 'salary_id', v_salary_id,
    'calculated_data', jsonb_build_object(
      'base_salary', v_emp.base_salary,
      'allowances', v_emp.allowances,
      'overtime_amount', v_overtime_amount,
      'bonus', p_bonus,
      'deductions', p_deductions,
      'gross_salary', v_gross,
      'net_salary', v_net
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_salary_status(
  p_salary_id uuid,
  p_status text,
  p_payment_date date DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_bank_account_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
BEGIN
  SELECT status INTO v_old FROM public.monthly_salaries WHERE id = p_salary_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'SALARY_NOT_FOUND');
  END IF;

  UPDATE public.monthly_salaries
  SET status = p_status,
      payment_date = COALESCE(p_payment_date, payment_date),
      payment_method = COALESCE(p_payment_method, payment_method),
      bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_salary_id;

  RETURN jsonb_build_object('success', true, 'old_status', v_old, 'new_status', p_status);
END;
$$;
