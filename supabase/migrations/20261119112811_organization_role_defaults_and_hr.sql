-- Organization defaults augment the existing role/department resolver.
CREATE TABLE public.organization_role_permission_defaults (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  base_role text NOT NULL CHECK (base_role IN ('manager', 'agent', 'viewer')),
  permission_key text NOT NULL REFERENCES public.organization_permission_catalog(permission_key)
    CHECK (permission_key !~ '^(admin|system)_' AND permission_key NOT IN (
      'team_manage_roles', 'manage_user_roles', 'team_invite', 'create_users',
      'edit_users', 'manage_system_settings', 'manage_backups'
    )),
  granted boolean NOT NULL,
  PRIMARY KEY (organization_id, base_role, permission_key)
);

ALTER TABLE public.organization_role_permission_defaults ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_role_permission_defaults FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_role_permission_defaults TO authenticated;
CREATE POLICY organization_role_defaults_owner_admin ON public.organization_role_permission_defaults
FOR ALL TO authenticated
USING (public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner', 'admin'));

INSERT INTO public.organization_permission_catalog
  (permission_key, module, label_ar, is_sensitive)
VALUES
  ('employees_view', 'employees', 'عرض ملفات الموظفين', true),
  ('employees_create', 'employees', 'إنشاء ملف موظف', true),
  ('employees_edit', 'employees', 'تعديل ملفات الموظفين', true),
  ('employees_delete', 'employees', 'حذف ملف موظف', true),
  ('employees_export', 'employees', 'تصدير ملفات الموظفين', true),
  ('employees_attendance_view', 'employees', 'عرض الحضور والإجازات', true),
  ('employees_attendance_edit', 'employees', 'تسجيل الحضور والإجازات', true)
ON CONFLICT (permission_key) DO UPDATE
SET label_ar = EXCLUDED.label_ar, is_sensitive = EXCLUDED.is_sensitive;

-- Keep the built-in role and department presets as the fallback.
ALTER FUNCTION public._org_default_permission(uuid, uuid, text, text) SET SCHEMA operations_private;
ALTER FUNCTION operations_private._org_default_permission(uuid, uuid, text, text) RENAME TO system_org_default_permission;
REVOKE ALL ON FUNCTION operations_private.system_org_default_permission(uuid, uuid, text, text)
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public._org_default_permission(_org_id uuid, _user_id uuid, _role text, _permission text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT d.granted FROM public.organization_role_permission_defaults d
     WHERE d.organization_id = _org_id AND d.base_role = _role AND d.permission_key = _permission),
    CASE
      WHEN _permission = 'team_manage_roles' THEN false
      WHEN _permission IN ('employees_create', 'employees_attendance_view', 'employees_attendance_edit') THEN _role = 'manager'
      ELSE operations_private.system_org_default_permission(_org_id, _user_id, _role, _permission)
    END,
    false
  );
$$;
REVOKE ALL ON FUNCTION public._org_default_permission(uuid, uuid, text, text)
FROM PUBLIC, anon, authenticated;

-- HR permissions apply only to active members and organization-wide grants.
CREATE FUNCTION public.has_org_hr_permission(_org_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT FROM public._org_permission_state(_org_id, (SELECT auth.uid()), _permission) p
    WHERE p.granted AND p.data_scope = 'organization'
  );
$$;
REVOKE ALL ON FUNCTION public.has_org_hr_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_hr_permission(uuid, text) TO authenticated, service_role;

CREATE UNIQUE INDEX employees_org_id_key ON public.employees(organization_id, id);
CREATE TABLE public.employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'sick_leave', 'vacation', 'holiday')),
  check_in_time time,
  check_out_time time,
  notes text CHECK (length(notes) <= 1000),
  actual_hours numeric GENERATED ALWAYS AS (
    CASE WHEN check_in_time IS NULL OR check_out_time IS NULL THEN NULL
         ELSE round((extract(epoch from check_out_time - check_in_time)
           + CASE WHEN check_out_time < check_in_time THEN 86400 ELSE 0 END) / 3600, 2)
    END
  ) STORED,
  FOREIGN KEY (organization_id, employee_id) REFERENCES public.employees(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, employee_id, attendance_date),
  CHECK (status = 'present' OR (check_in_time IS NULL AND check_out_time IS NULL))
);

CREATE INDEX employee_attendance_org_date ON public.employee_attendance(organization_id, attendance_date);
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_attendance FROM PUBLIC, anon;
GRANT SELECT ON public.employee_attendance TO authenticated;
GRANT INSERT (organization_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes),
      UPDATE (organization_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes)
ON public.employee_attendance TO authenticated;

CREATE POLICY employee_attendance_read ON public.employee_attendance
FOR SELECT TO authenticated USING (public.has_org_hr_permission(organization_id, 'employees_attendance_view'));
CREATE POLICY employee_attendance_insert ON public.employee_attendance
FOR INSERT TO authenticated WITH CHECK (
  public.has_org_hr_permission(organization_id, 'employees_attendance_view')
  AND public.has_org_hr_permission(organization_id, 'employees_attendance_edit')
  AND public.can_org_write(organization_id)
);
CREATE POLICY employee_attendance_update ON public.employee_attendance
FOR UPDATE TO authenticated
USING (public.has_org_hr_permission(organization_id, 'employees_attendance_edit') AND public.can_org_write(organization_id))
WITH CHECK (public.has_org_hr_permission(organization_id, 'employees_attendance_edit') AND public.can_org_write(organization_id));

-- A conflict update may repeat the key values, but it cannot move an attendance record.
CREATE FUNCTION operations_private.check_attendance_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.organization_id, NEW.employee_id, NEW.attendance_date)
      IS DISTINCT FROM (OLD.organization_id, OLD.employee_id, OLD.attendance_date) THEN
    RAISE EXCEPTION 'Attendance record identity is immutable' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.check_attendance_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER employee_attendance_identity BEFORE UPDATE ON public.employee_attendance
FOR EACH ROW EXECUTE FUNCTION operations_private.check_attendance_identity();

-- Read the staff directory without exposing HR or payroll columns to ordinary members.
REVOKE SELECT ON public.employees FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, organization_id, employee_code, full_name, position, department, email,
  hire_date, is_active, created_at, updated_at) ON public.employees TO authenticated;

CREATE VIEW public.employee_directory WITH (security_barrier = true) AS
SELECT e.id, e.organization_id, e.employee_code, e.full_name, e.position, e.department,
  e.email, e.hire_date, e.is_active, e.created_at, e.updated_at,
  CASE WHEN access.hr THEN e.phone END AS phone,
  CASE WHEN access.hr THEN e.national_id END AS national_id,
  CASE WHEN access.hr THEN e.emergency_contact_name END AS emergency_contact_name,
  CASE WHEN access.hr THEN e.emergency_contact_phone END AS emergency_contact_phone,
  CASE WHEN access.payroll THEN e.base_salary END AS base_salary,
  CASE WHEN access.payroll THEN e.allowances END AS allowances,
  CASE WHEN access.payroll THEN e.salary_scale_level END AS salary_scale_level,
  CASE WHEN access.payroll THEN e.bank_account_number END AS bank_account_number,
  CASE WHEN access.payroll THEN e.bank_name END AS bank_name,
  CASE WHEN access.commissions THEN e.commission_rate END AS commission_rate,
  CASE WHEN access.commissions THEN e.commission_type END AS commission_type,
  CASE WHEN access.commissions THEN e.total_commission_earned END AS total_commission_earned,
  CASE WHEN access.hr THEN (
    SELECT p.id FROM public.profiles p JOIN public.organization_members m ON m.user_id = p.id
    WHERE p.linked_employee_id = e.id AND m.organization_id = e.organization_id
    ORDER BY m.is_active DESC, p.id LIMIT 1
  ) END AS linked_user_id
FROM public.employees e
CROSS JOIN LATERAL (
  SELECT public.has_org_hr_permission(e.organization_id, 'employees_view') AS hr,
         public.has_org_hr_permission(e.organization_id, 'employees_salary') AS payroll,
         public.has_org_hr_permission(e.organization_id, 'employees_commission') AS commissions
) access
WHERE public.get_user_org_role((SELECT auth.uid()), e.organization_id) IS NOT NULL;
REVOKE ALL ON public.employee_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.employee_directory TO authenticated;

CREATE POLICY employee_hr_insert ON public.employees AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_org_hr_permission(organization_id, 'employees_create'));
CREATE POLICY employee_hr_update ON public.employees AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_org_hr_permission(organization_id, 'employees_edit')
  OR public.has_org_hr_permission(organization_id, 'employees_commission'))
WITH CHECK (public.has_org_hr_permission(organization_id, 'employees_edit')
  OR public.has_org_hr_permission(organization_id, 'employees_commission'));
REVOKE DELETE ON public.employees FROM PUBLIC, anon, authenticated;

CREATE FUNCTION operations_private.check_employee_hr_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (coalesce(NEW.base_salary,0) <> 0 OR coalesce(NEW.allowances,0) <> 0
        OR NEW.bank_name IS NOT NULL OR NEW.bank_account_number IS NOT NULL
        OR coalesce(NEW.salary_scale_level,1) <> 1)
      AND NOT public.has_org_hr_permission(NEW.organization_id, 'employees_salary') THEN
      RAISE EXCEPTION 'Payroll permission required' USING ERRCODE = '42501';
    END IF;
    IF (coalesce(NEW.commission_rate,0) <> 0 OR coalesce(NEW.total_commission_earned,0) <> 0)
      AND NOT public.has_org_hr_permission(NEW.organization_id, 'employees_commission') THEN
      RAISE EXCEPTION 'Commission permission required' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Employee organization is immutable' USING ERRCODE = '22023';
  END IF;
  IF (NEW.base_salary, NEW.allowances, NEW.bank_name, NEW.bank_account_number, NEW.salary_scale_level)
      IS DISTINCT FROM (OLD.base_salary, OLD.allowances, OLD.bank_name, OLD.bank_account_number, OLD.salary_scale_level)
    AND NOT public.has_org_hr_permission(NEW.organization_id, 'employees_salary') THEN
    RAISE EXCEPTION 'Payroll permission required' USING ERRCODE = '42501';
  END IF;
  IF (NEW.commission_rate, NEW.commission_type, NEW.total_commission_earned)
      IS DISTINCT FROM (OLD.commission_rate, OLD.commission_type, OLD.total_commission_earned)
    AND NOT public.has_org_hr_permission(NEW.organization_id, 'employees_commission') THEN
    RAISE EXCEPTION 'Commission permission required' USING ERRCODE = '42501';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['commission_rate','commission_type','total_commission_earned','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['commission_rate','commission_type','total_commission_earned','updated_at'])
    AND NOT public.has_org_hr_permission(NEW.organization_id, 'employees_edit') THEN
    RAISE EXCEPTION 'Employee edit permission required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.check_employee_hr_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER employee_hr_fields BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW WHEN (current_user = 'authenticated')
EXECUTE FUNCTION operations_private.check_employee_hr_fields();

CREATE POLICY employee_payroll_access ON public.monthly_salaries AS RESTRICTIVE FOR ALL TO authenticated
USING (public.has_org_hr_permission(organization_id, 'employees_salary'))
WITH CHECK (public.has_org_hr_permission(organization_id, 'employees_salary')
  AND EXISTS (SELECT FROM public.employees e
    WHERE e.id = employee_id AND e.organization_id = monthly_salaries.organization_id));
CREATE POLICY employee_payroll_write_insert ON public.monthly_salaries AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY employee_payroll_write_update ON public.monthly_salaries AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY employee_payroll_write_delete ON public.monthly_salaries AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.can_org_write(organization_id));

CREATE POLICY salary_settings_hr_access ON public.organization_salary_settings AS RESTRICTIVE FOR ALL TO authenticated
USING (public.has_org_hr_permission(organization_id, 'employees_salary'))
WITH CHECK (public.has_org_hr_permission(organization_id, 'employees_salary'));

-- Payroll RPCs retain the live calculation and payment behavior and check HR access.
CREATE OR REPLACE FUNCTION public.calculate_monthly_salary(p_employee_id uuid, p_salary_month date, p_overtime_hours numeric DEFAULT 0, p_bonus numeric DEFAULT 0, p_deductions numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_emp public.employees%ROWTYPE;
  v_month text := to_char(p_salary_month, 'YYYY-MM');
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

  v_overtime_rate := round(COALESCE(v_emp.base_salary, 0) / 30 / 8 * 1.5, 2);
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

CREATE OR REPLACE FUNCTION public.get_organization_salary_settings(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_org_hr_permission(_org_id, 'employees_salary') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.setting_key),'[]'::jsonb) INTO v_result
  FROM public.organization_salary_settings s WHERE s.organization_id=_org_id;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_organization_salary_setting(_setting_id uuid, _setting_value numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_row public.organization_salary_settings%ROWTYPE;
BEGIN
  IF _setting_value IS NULL OR _setting_value < 0 THEN RAISE EXCEPTION 'Invalid salary setting value'; END IF;
  SELECT * INTO v_row FROM public.organization_salary_settings WHERE id=_setting_id FOR UPDATE;
  IF v_row.id IS NULL OR NOT public.has_org_hr_permission(v_row.organization_id, 'employees_salary')
    OR NOT coalesce(public.can_org_write(v_row.organization_id), false) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_salary_settings SET setting_value=_setting_value WHERE id=_setting_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_salary_status(p_salary_id uuid, p_status text, p_payment_date date DEFAULT NULL::date, p_payment_method text DEFAULT NULL::text, p_bank_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.monthly_salaries%ROWTYPE;
  v_bank_currency text;
BEGIN
  SELECT * INTO s
  FROM public.monthly_salaries
  WHERE id = p_salary_id
    AND public.has_org_hr_permission(organization_id, 'employees_salary')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'SALARY_NOT_FOUND');
  END IF;
  IF NOT coalesce(public.can_org_write(s.organization_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid salary status';
  END IF;
  IF s.status = 'paid' AND p_status <> 'paid' THEN
    RAISE EXCEPTION 'A paid salary requires an explicit reversal';
  END IF;

  IF p_status = 'paid' THEN
    IF COALESCE(p_payment_method, s.payment_method, '') = '' THEN
      RAISE EXCEPTION 'اختر طريقة الدفع قبل صرف الراتب';
    END IF;
    IF COALESCE(p_payment_method, s.payment_method) <> 'cash' THEN
      IF COALESCE(p_bank_account_id, s.bank_account_id) IS NULL THEN
        RAISE EXCEPTION 'اختر حساب الخزينة قبل صرف الراتب';
      END IF;
      SELECT COALESCE(currency, 'EGP') INTO v_bank_currency
      FROM public.bank_accounts
      WHERE id = COALESCE(p_bank_account_id, s.bank_account_id)
        AND organization_id = s.organization_id
        AND is_active;
      IF NOT FOUND OR v_bank_currency IS DISTINCT FROM s.currency THEN
        RAISE EXCEPTION 'حساب الخزينة غير موجود أو عملته مختلفة';
      END IF;
    END IF;
  END IF;

  UPDATE public.monthly_salaries
  SET status = p_status,
      payment_date = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_date, payment_date, CURRENT_DATE) ELSE NULL END,
      payment_method = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_method, payment_method) ELSE NULL END,
      bank_account_id = CASE
        WHEN p_status <> 'paid' THEN NULL
        WHEN COALESCE(p_payment_method, payment_method) = 'cash' THEN NULL
        ELSE COALESCE(p_bank_account_id, bank_account_id) END,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_salary_id;

  RETURN jsonb_build_object(
    'success', true, 'old_status', s.status, 'new_status', p_status
  );
END;
$function$
;

REVOKE ALL ON FUNCTION public.calculate_monthly_salary(uuid, date, numeric, numeric, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_salary_status(uuid, text, date, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_salary(uuid, date, numeric, numeric, numeric, text),
  public.update_salary_status(uuid, text, date, text, uuid, text) TO authenticated, service_role;

-- Keep historical attendance when a file is deactivated or removed.
CREATE OR REPLACE FUNCTION public.check_employee_deletion(p_employee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  e public.employees%ROWTYPE;
  v_profiles int;v_bookings int;v_legacy_bookings int;v_commissions int;
  v_payroll int;v_quotes int;v_cost_centers int;v_whatsapp int;v_dependencies int;v_attendance int;
  v_reasons text[]:=ARRAY[]::text[];
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  IF NOT public.has_org_hr_permission(e.organization_id, 'employees_delete') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_profiles FROM public.profiles WHERE linked_employee_id=e.id;
  SELECT COUNT(*) INTO v_bookings FROM public.bookings WHERE employee_id=e.id;
  SELECT
    (SELECT COUNT(*) FROM public.hotel_bookings WHERE employee_id=e.id)
    +(SELECT COUNT(*) FROM public.flight_bookings WHERE employee_id=e.id)
    +(SELECT COUNT(*) FROM public.transport_bookings WHERE employee_id=e.id)
    +(SELECT COUNT(*) FROM public.car_rentals WHERE employee_id=e.id)
  INTO v_legacy_bookings;
  SELECT
    (SELECT COUNT(*) FROM public.employee_commissions WHERE employee_id=e.id)
    +(SELECT COUNT(*) FROM public.employee_commission_periods WHERE employee_id=e.id)
    +(SELECT COUNT(*) FROM public.commission_payments WHERE employee_id=e.id)
  INTO v_commissions;
  SELECT COUNT(*) INTO v_payroll FROM public.monthly_salaries WHERE employee_id=e.id;
  SELECT COUNT(*) INTO v_quotes FROM public.quotes WHERE assigned_employee_id=e.id;
  SELECT COUNT(*) INTO v_cost_centers FROM public.cost_centers WHERE manager_employee_id=e.id;
  SELECT COUNT(*) INTO v_whatsapp FROM public.whatsapp_conversations WHERE assigned_to=e.id;
  SELECT count(*) INTO v_attendance FROM public.employee_attendance WHERE organization_id=e.organization_id AND employee_id=e.id;
  v_dependencies:=v_attendance+v_profiles+v_bookings+v_legacy_bookings+v_commissions+v_payroll+v_quotes+v_cost_centers+v_whatsapp;

  IF v_attendance>0 THEN v_reasons:=array_append(v_reasons,'له سجلات حضور أو إجازات ('||v_attendance||')'); END IF;
  IF v_profiles>0 THEN v_reasons:=array_append(v_reasons,'مرتبط بحساب مستخدم ('||v_profiles||')'); END IF;
  IF v_bookings+v_legacy_bookings>0 THEN v_reasons:=array_append(v_reasons,'له حجوزات تاريخية ('||(v_bookings+v_legacy_bookings)||')'); END IF;
  IF v_commissions>0 THEN v_reasons:=array_append(v_reasons,'له عمولات مسجلة ('||v_commissions||')'); END IF;
  IF v_payroll>0 THEN v_reasons:=array_append(v_reasons,'له رواتب مسجلة ('||v_payroll||')'); END IF;
  IF v_quotes>0 THEN v_reasons:=array_append(v_reasons,'مسند إليه عروض أسعار ('||v_quotes||')'); END IF;
  IF v_cost_centers>0 THEN v_reasons:=array_append(v_reasons,'مدير لمركز تكلفة ('||v_cost_centers||')'); END IF;
  IF v_whatsapp>0 THEN v_reasons:=array_append(v_reasons,'مسند إليه محادثات واتساب ('||v_whatsapp||')'); END IF;

  RETURN jsonb_build_object(
    'success',true,'employee_name',e.full_name,'can_delete_safely',v_dependencies=0,
    'can_force_delete',false,'dependencies_count',v_dependencies,
    'blocking_reasons',to_jsonb(v_reasons),'linked_to_user',v_profiles>0,
    'has_bookings',(v_bookings+v_legacy_bookings)>0,'has_commissions',v_commissions>0,
    'has_expenses',false
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.safe_delete_employee(p_employee_id uuid, p_force_delete boolean DEFAULT false, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.employees%ROWTYPE;v_check jsonb;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  IF NOT public.has_org_hr_permission(e.organization_id, 'employees_delete')
    OR NOT coalesce(public.can_org_write(e.organization_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  v_check:=public.check_employee_deletion(e.id);
  IF COALESCE((v_check->>'dependencies_count')::int,0)>0 THEN
    RETURN jsonb_build_object(
      'success',false,'error','EMPLOYEE_HAS_DEPENDENCIES',
      'message','لا يمكن حذف الموظف نهائياً مع وجود بيانات تاريخية؛ أوقف تفعيله بدلاً من ذلك',
      'blocking_reasons',v_check->'blocking_reasons','can_force_delete',false
    );
  END IF;
  IF p_force_delete THEN
    -- Kept for API compatibility. With no dependencies it is equivalent to a
    -- normal safe delete; it never bypasses the dependency check above.
    NULL;
  END IF;
  DELETE FROM public.employees WHERE id=e.id;
  INSERT INTO public.admin_audit_log(
    user_id,action,target_table,target_id,organization_id,old_values,new_values,entity_name
  ) VALUES (
    auth.uid(),'employee_deleted','employees',e.id,e.organization_id,jsonb_build_object('employee_code',e.employee_code,'is_active',e.is_active),
    jsonb_build_object('reason',p_reason),e.full_name
  );
  RETURN jsonb_build_object(
    'success',true,'message','تم حذف سجل الموظف غير المستخدم بنجاح',
    'employee_id',e.id,'employee_name',e.full_name
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_employee_status(p_employee_id uuid, p_is_active boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.employees%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  IF NOT public.has_org_hr_permission(e.organization_id, 'employees_edit')
    OR NOT coalesce(public.can_org_write(e.organization_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.employees SET is_active=p_is_active,updated_at=now() WHERE id=e.id;
  INSERT INTO public.admin_audit_log(
    user_id,action,target_table,target_id,organization_id,old_values,new_values,entity_name
  ) VALUES (
    auth.uid(),CASE WHEN p_is_active THEN 'employee_activated' ELSE 'employee_deactivated' END,
    'employees',e.id,e.organization_id,
    jsonb_build_object('is_active',e.is_active),
    jsonb_build_object('is_active',p_is_active,'reason',p_reason),e.full_name
  );
  RETURN jsonb_build_object(
    'success',true,
    'message',CASE WHEN p_is_active THEN 'تم تفعيل الموظف بنجاح' ELSE 'تم إيقاف الموظف بنجاح' END,
    'employee_id',e.id,'employee_name',e.full_name,'new_status',p_is_active
  );
END;
$function$
;

REVOKE ALL ON FUNCTION public.toggle_employee_status(uuid,boolean,text),
  public.check_employee_deletion(uuid), public.safe_delete_employee(uuid,boolean,text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_employee_status(uuid,boolean,text),
  public.check_employee_deletion(uuid), public.safe_delete_employee(uuid,boolean,text)
TO authenticated, service_role;
