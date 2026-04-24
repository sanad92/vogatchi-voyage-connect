-- Function: ensure each org member has a linked employee record (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_employee_for_user(_user_id uuid, _org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_existing_emp_id uuid;
  v_new_emp_id uuid;
  v_emp_code text;
  v_seq int;
  v_full_name text;
  v_email text;
  v_phone text;
BEGIN
  IF _user_id IS NULL OR _org_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get profile data
  SELECT id, full_name, email, phone, linked_employee_id
    INTO v_profile
  FROM public.profiles
  WHERE id = _user_id;

  IF v_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already linked AND that employee belongs to this org, do nothing
  IF v_profile.linked_employee_id IS NOT NULL THEN
    PERFORM 1 FROM public.employees
      WHERE id = v_profile.linked_employee_id AND organization_id = _org_id;
    IF FOUND THEN
      RETURN v_profile.linked_employee_id;
    END IF;
  END IF;

  -- Try to find an existing employee in this org with matching email
  IF v_profile.email IS NOT NULL THEN
    SELECT id INTO v_existing_emp_id
      FROM public.employees
      WHERE organization_id = _org_id
        AND lower(email) = lower(v_profile.email)
        AND is_active = true
      LIMIT 1;

    IF v_existing_emp_id IS NOT NULL THEN
      UPDATE public.profiles
        SET linked_employee_id = v_existing_emp_id, updated_at = now()
        WHERE id = _user_id;
      RETURN v_existing_emp_id;
    END IF;
  END IF;

  -- Create a new employee record
  v_full_name := COALESCE(NULLIF(trim(v_profile.full_name), ''), split_part(COALESCE(v_profile.email, 'مستخدم'), '@', 1));
  v_email := v_profile.email;
  v_phone := v_profile.phone;

  -- Generate a unique employee_code within the org
  SELECT COUNT(*) + 1 INTO v_seq FROM public.employees WHERE organization_id = _org_id;
  LOOP
    v_emp_code := 'EMP-' || lpad(v_seq::text, 4, '0');
    PERFORM 1 FROM public.employees WHERE employee_code = v_emp_code;
    EXIT WHEN NOT FOUND;
    v_seq := v_seq + 1;
  END LOOP;

  INSERT INTO public.employees (
    organization_id, employee_code, full_name, email, phone,
    position, department, base_salary, hire_date, is_active
  ) VALUES (
    _org_id, v_emp_code, v_full_name, v_email, v_phone,
    'موظف', NULL, 0, CURRENT_DATE, true
  )
  RETURNING id INTO v_new_emp_id;

  -- Link profile to the new employee
  UPDATE public.profiles
    SET linked_employee_id = v_new_emp_id, updated_at = now()
    WHERE id = _user_id;

  RETURN v_new_emp_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ensure_employee_for_user failed for user % org %: %', _user_id, _org_id, SQLERRM;
  RETURN NULL;
END;
$$;

-- Trigger function on organization_members insert
CREATE OR REPLACE FUNCTION public.trg_ensure_employee_on_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    PERFORM public.ensure_employee_for_user(NEW.user_id, NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_employee_after_member_insert ON public.organization_members;
CREATE TRIGGER ensure_employee_after_member_insert
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_ensure_employee_on_membership();

-- Backfill: ensure every active membership has a linked employee
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT om.user_id, om.organization_id
    FROM public.organization_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
    WHERE om.is_active = true
      AND (p.linked_employee_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM public.employees e
             WHERE e.id = p.linked_employee_id AND e.organization_id = om.organization_id
           ))
  LOOP
    PERFORM public.ensure_employee_for_user(r.user_id, r.organization_id);
  END LOOP;
END $$;