
-- إضافة دوال آمنة لإدارة الموظفين (إيقاف وحذف)

-- دالة آمنة لإيقاف/تفعيل الموظف
CREATE OR REPLACE FUNCTION public.toggle_employee_status(
  p_employee_id uuid,
  p_is_active boolean,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_exists BOOLEAN := FALSE;
  employee_name TEXT;
  old_status BOOLEAN;
  result JSONB;
BEGIN
  -- التحقق من وجود الموظف
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id), 
         full_name, is_active
  INTO employee_exists, employee_name, old_status
  FROM public.employees 
  WHERE id = p_employee_id;
  
  IF NOT employee_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'الموظف غير موجود'
    );
  END IF;
  
  -- تحديث حالة الموظف
  UPDATE public.employees 
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_employee_id;
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    CASE WHEN p_is_active THEN 'employee_activated' ELSE 'employee_deactivated' END,
    'employees',
    p_employee_id,
    jsonb_build_object('old_status', old_status),
    jsonb_build_object('new_status', p_is_active, 'reason', p_reason),
    CASE WHEN p_is_active THEN 'تفعيل الموظف: ' ELSE 'إيقاف الموظف: ' END || employee_name
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_is_active THEN 'تم تفعيل الموظف بنجاح' ELSE 'تم إيقاف الموظف بنجاح' END,
    'employee_id', p_employee_id,
    'employee_name', employee_name,
    'new_status', p_is_active
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNKNOWN_ERROR',
      'message', 'حدث خطأ غير متوقع: ' || SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- دالة آمنة لحذف الموظف مع التحقق من الارتباطات
CREATE OR REPLACE FUNCTION public.safe_delete_employee(
  p_employee_id uuid,
  p_force_delete boolean DEFAULT false,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_exists BOOLEAN := FALSE;
  employee_name TEXT;
  linked_to_user BOOLEAN := FALSE;
  has_bookings BOOLEAN := FALSE;
  has_commissions BOOLEAN := FALSE;
  has_expenses BOOLEAN := FALSE;
  blocking_reasons TEXT[] := ARRAY[]::TEXT[];
  result JSONB;
BEGIN
  -- التحقق من وجود الموظف
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id), 
         full_name
  INTO employee_exists, employee_name
  FROM public.employees 
  WHERE id = p_employee_id;
  
  IF NOT employee_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'الموظف غير موجود'
    );
  END IF;
  
  -- التحقق من الارتباطات
  -- مرتبط بمستخدم
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = p_employee_id)
  INTO linked_to_user;
  
  -- له حجوزات
  SELECT EXISTS (
    SELECT 1 FROM public.hotel_bookings WHERE booking_agent_id = p_employee_id
    UNION
    SELECT 1 FROM public.flight_bookings WHERE booking_agent_id = p_employee_id
    UNION 
    SELECT 1 FROM public.car_rentals WHERE booking_agent_id = p_employee_id
  ) INTO has_bookings;
  
  -- له عمولات
  SELECT EXISTS (SELECT 1 FROM public.employee_commissions WHERE employee_id = p_employee_id)
  INTO has_commissions;
  
  -- له مصروفات
  SELECT EXISTS (SELECT 1 FROM public.expense_transactions WHERE created_by = p_employee_id)
  INTO has_expenses;
  
  -- جمع أسباب المنع
  IF linked_to_user THEN
    blocking_reasons := array_append(blocking_reasons, 'مرتبط بحساب مستخدم');
  END IF;
  
  IF has_bookings THEN
    blocking_reasons := array_append(blocking_reasons, 'له حجوزات في النظام');
  END IF;
  
  IF has_commissions THEN
    blocking_reasons := array_append(blocking_reasons, 'له عمولات مسجلة');
  END IF;
  
  IF has_expenses THEN
    blocking_reasons := array_append(blocking_reasons, 'له مصروفات مسجلة');
  END IF;
  
  -- إذا كان هناك ارتباطات ولم يتم إجبار الحذف
  IF array_length(blocking_reasons, 1) > 0 AND NOT p_force_delete THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_HAS_DEPENDENCIES',
      'message', 'لا يمكن حذف الموظف لوجود ارتباطات',
      'blocking_reasons', array_to_json(blocking_reasons),
      'can_force_delete', true
    );
  END IF;
  
  -- إذا تم إجبار الحذف، إلغاء الارتباطات أولاً
  IF p_force_delete THEN
    -- إلغاء ربط المستخدم
    UPDATE public.profiles 
    SET employee_id = NULL 
    WHERE employee_id = p_employee_id;
    
    -- تحديث الحجوزات لإزالة مرجع الموظف
    UPDATE public.hotel_bookings 
    SET booking_agent_id = NULL 
    WHERE booking_agent_id = p_employee_id;
    
    UPDATE public.flight_bookings 
    SET booking_agent_id = NULL 
    WHERE booking_agent_id = p_employee_id;
    
    UPDATE public.car_rentals 
    SET booking_agent_id = NULL 
    WHERE booking_agent_id = p_employee_id;
  END IF;
  
  -- حذف الموظف
  DELETE FROM public.employees WHERE id = p_employee_id;
  
  -- تسجيل العملية في audit log
  PERFORM public.log_admin_action(
    'employee_deleted',
    'employees',
    p_employee_id,
    jsonb_build_object('employee_name', employee_name),
    jsonb_build_object(
      'reason', p_reason, 
      'force_delete', p_force_delete,
      'blocking_reasons', array_to_json(blocking_reasons)
    ),
    'حذف الموظف: ' || employee_name
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف الموظف بنجاح',
    'employee_id', p_employee_id,
    'employee_name', employee_name,
    'force_delete', p_force_delete
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNKNOWN_ERROR',
      'message', 'حدث خطأ غير متوقع: ' || SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- دالة للتحقق من إمكانية حذف الموظف بدون حذف فعلي
CREATE OR REPLACE FUNCTION public.check_employee_deletion(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_exists BOOLEAN := FALSE;
  employee_name TEXT;
  linked_to_user BOOLEAN := FALSE;
  has_bookings BOOLEAN := FALSE;
  has_commissions BOOLEAN := FALSE;
  has_expenses BOOLEAN := FALSE;
  blocking_reasons TEXT[] := ARRAY[]::TEXT[];
  dependencies_count INTEGER := 0;
BEGIN
  -- التحقق من وجود الموظف
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id), 
         full_name
  INTO employee_exists, employee_name
  FROM public.employees 
  WHERE id = p_employee_id;
  
  IF NOT employee_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'الموظف غير موجود'
    );
  END IF;
  
  -- فحص الارتباطات
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = p_employee_id)
  INTO linked_to_user;
  
  SELECT EXISTS (
    SELECT 1 FROM public.hotel_bookings WHERE booking_agent_id = p_employee_id
    UNION
    SELECT 1 FROM public.flight_bookings WHERE booking_agent_id = p_employee_id
    UNION 
    SELECT 1 FROM public.car_rentals WHERE booking_agent_id = p_employee_id
  ) INTO has_bookings;
  
  SELECT EXISTS (SELECT 1 FROM public.employee_commissions WHERE employee_id = p_employee_id)
  INTO has_commissions;
  
  SELECT EXISTS (SELECT 1 FROM public.expense_transactions WHERE created_by = p_employee_id)
  INTO has_expenses;
  
  -- حساب عدد الارتباطات وجمع الأسباب
  IF linked_to_user THEN
    blocking_reasons := array_append(blocking_reasons, 'مرتبط بحساب مستخدم');
    dependencies_count := dependencies_count + 1;
  END IF;
  
  IF has_bookings THEN
    blocking_reasons := array_append(blocking_reasons, 'له حجوزات في النظام');
    dependencies_count := dependencies_count + 1;
  END IF;
  
  IF has_commissions THEN
    blocking_reasons := array_append(blocking_reasons, 'له عمولات مسجلة');
    dependencies_count := dependencies_count + 1;
  END IF;
  
  IF has_expenses THEN
    blocking_reasons := array_append(blocking_reasons, 'له مصروفات مسجلة');
    dependencies_count := dependencies_count + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'employee_name', employee_name,
    'can_delete_safely', dependencies_count = 0,
    'dependencies_count', dependencies_count,
    'blocking_reasons', array_to_json(blocking_reasons),
    'linked_to_user', linked_to_user,
    'has_bookings', has_bookings,
    'has_commissions', has_commissions,
    'has_expenses', has_expenses
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNKNOWN_ERROR',
      'message', 'حدث خطأ غير متوقع: ' || SQLERRM
    );
END;
$$;
