-- Restore the employee actions used by the active UI with current tenant
-- isolation. Historical payroll, booking, and commission data is never
-- cascade-deleted by a "force" request.

BEGIN;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_target_table text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.admin_audit_log(
    user_id,action,target_table,target_id,details,old_values,new_values,user_email,entity_name
  ) VALUES (
    auth.uid(),p_action_type,p_target_table,p_target_id,
    CASE WHEN p_description IS NULL THEN NULL ELSE jsonb_build_object('description',p_description) END,
    p_old_values,p_new_values,v_email,p_description
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_employee_status(
  p_employee_id uuid,p_is_active boolean,p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE e public.employees%ROWTYPE;v_role text;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  v_role:=public.get_user_org_role(auth.uid(),e.organization_id)::text;
  IF NOT public.is_platform_admin(auth.uid()) AND COALESCE(v_role,'') NOT IN ('owner','admin','manager') THEN
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
$$;

CREATE OR REPLACE FUNCTION public.check_employee_deletion(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  e public.employees%ROWTYPE;v_role text;
  v_profiles int;v_bookings int;v_legacy_bookings int;v_commissions int;
  v_payroll int;v_quotes int;v_cost_centers int;v_whatsapp int;v_dependencies int;
  v_reasons text[]:=ARRAY[]::text[];
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  v_role:=public.get_user_org_role(auth.uid(),e.organization_id)::text;
  IF NOT public.is_platform_admin(auth.uid()) AND COALESCE(v_role,'') NOT IN ('owner','admin') THEN
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
  v_dependencies:=v_profiles+v_bookings+v_legacy_bookings+v_commissions+v_payroll+v_quotes+v_cost_centers+v_whatsapp;

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
$$;

CREATE OR REPLACE FUNCTION public.safe_delete_employee(
  p_employee_id uuid,p_force_delete boolean DEFAULT false,p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE e public.employees%ROWTYPE;v_role text;v_check jsonb;
BEGIN
  SELECT * INTO e FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','EMPLOYEE_NOT_FOUND','message','الموظف غير موجود');
  END IF;
  v_role:=public.get_user_org_role(auth.uid(),e.organization_id)::text;
  IF NOT public.is_platform_admin(auth.uid()) AND COALESCE(v_role,'') NOT IN ('owner','admin') THEN
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
    auth.uid(),'employee_deleted','employees',e.id,e.organization_id,to_jsonb(e),
    jsonb_build_object('reason',p_reason),e.full_name
  );
  RETURN jsonb_build_object(
    'success',true,'message','تم حذف سجل الموظف غير المستخدم بنجاح',
    'employee_id',e.id,'employee_name',e.full_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_action(text,text,uuid,jsonb,jsonb,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.toggle_employee_status(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.check_employee_deletion(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.safe_delete_employee(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text,text,uuid,jsonb,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_employee_status(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_employee_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_employee(uuid,boolean,text) TO authenticated;

COMMIT;
