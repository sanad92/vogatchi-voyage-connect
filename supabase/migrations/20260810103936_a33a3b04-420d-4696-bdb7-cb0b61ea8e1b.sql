CREATE OR REPLACE FUNCTION public.sop_set_department(_user_id uuid, _department sop_department DEFAULT NULL::sop_department, _is_available boolean DEFAULT true, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _role text;
  _old record;
  _load int := 0;
BEGIN
  SELECT organization_id INTO _org FROM public.organization_members
   WHERE user_id = auth.uid() AND is_active
   ORDER BY joined_at NULLS LAST LIMIT 1;

  IF _org IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('no_organization'));
  END IF;

  SELECT role::text INTO _role FROM public.organization_members
   WHERE organization_id = _org AND user_id = auth.uid() AND is_active LIMIT 1;
  IF _role IS NULL OR _role NOT IN ('owner','admin','manager') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('management_only'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organization_members
                  WHERE organization_id = _org AND user_id = _user_id AND is_active) THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('user_not_in_organization'));
  END IF;

  SELECT * INTO _old FROM public.sop_department_members
   WHERE organization_id = _org AND user_id = _user_id LIMIT 1;

  IF _department IS NULL THEN
    DELETE FROM public.sop_department_members
     WHERE organization_id = _org AND user_id = _user_id;

    INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, target_id, old_values, new_values, details)
    VALUES (_org, auth.uid(), 'sop_department_unassigned', 'sop_department_members', _user_id,
            to_jsonb(_old), NULL, jsonb_build_object('reason', _reason, 'target_user_id', _user_id));

    RETURN jsonb_build_object('allowed', true, 'department', NULL);
  END IF;

  SELECT count(*) INTO _load FROM public.sop_leads
   WHERE organization_id = _org AND current_owner_id = _user_id
     AND stage NOT IN ('won','lost','cancelled');

  IF _old.id IS NULL THEN
    INSERT INTO public.sop_department_members (organization_id, user_id, department, is_available, active_load, last_assigned_at)
    VALUES (_org, _user_id, _department, COALESCE(_is_available, true), _load, NULL);
  ELSIF _old.department IS DISTINCT FROM _department THEN
    UPDATE public.sop_department_members
       SET department = _department,
           is_available = COALESCE(_is_available, _old.is_available),
           active_load = _load,
           last_assigned_at = NULL,
           updated_at = now()
     WHERE id = _old.id;
  ELSE
    UPDATE public.sop_department_members
       SET is_available = COALESCE(_is_available, _old.is_available),
           active_load = _load,
           updated_at = now()
     WHERE id = _old.id;
  END IF;

  INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, target_id, old_values, new_values, details)
  VALUES (_org, auth.uid(),
          CASE WHEN _old.id IS NULL THEN 'sop_department_assigned'
               WHEN _old.department IS DISTINCT FROM _department THEN 'sop_department_transferred'
               ELSE 'sop_department_updated' END,
          'sop_department_members', _user_id,
          to_jsonb(_old),
          jsonb_build_object('department', _department, 'is_available', COALESCE(_is_available, true), 'active_load', _load),
          jsonb_build_object('reason', _reason, 'target_user_id', _user_id));

  RETURN jsonb_build_object('allowed', true, 'department', _department, 'active_load', _load);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sop_set_availability(_user_id uuid, _is_available boolean, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _role text;
  _old record;
BEGIN
  SELECT organization_id INTO _org FROM public.organization_members
   WHERE user_id = auth.uid() AND is_active
   ORDER BY joined_at NULLS LAST LIMIT 1;

  IF _org IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('no_organization'));
  END IF;

  SELECT role::text INTO _role FROM public.organization_members
   WHERE organization_id = _org AND user_id = auth.uid() AND is_active LIMIT 1;
  IF _role IS NULL OR _role NOT IN ('owner','admin','manager') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('management_only'));
  END IF;

  SELECT * INTO _old FROM public.sop_department_members
   WHERE organization_id = _org AND user_id = _user_id LIMIT 1;
  IF _old.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', jsonb_build_array('user_not_in_department'));
  END IF;

  UPDATE public.sop_department_members
     SET is_available = _is_available, updated_at = now()
   WHERE id = _old.id;

  INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, target_id, old_values, new_values, details)
  VALUES (_org, auth.uid(), 'sop_availability_changed', 'sop_department_members', _user_id,
          jsonb_build_object('is_available', _old.is_available),
          jsonb_build_object('is_available', _is_available),
          jsonb_build_object('reason', _reason, 'target_user_id', _user_id, 'department', _old.department));

  RETURN jsonb_build_object('allowed', true, 'is_available', _is_available);
END;
$function$;