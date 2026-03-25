
-- تحسين دالة link_user_to_employee مع معالجة أفضل للأخطاء
DROP FUNCTION IF EXISTS public.link_user_to_employee(uuid, uuid);

CREATE OR REPLACE FUNCTION public.link_user_to_employee(
  p_user_id uuid,
  p_employee_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN := FALSE;
  employee_exists BOOLEAN := FALSE;
  employee_active BOOLEAN := FALSE;
  already_linked_user_id UUID;
  result JSONB;
BEGIN
  -- التحقق من وجود المستخدم
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من وجود الموظف
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id) INTO employee_exists;
  IF NOT employee_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_NOT_FOUND',
      'message', 'الموظف غير موجود'
    );
  END IF;
  
  -- التحقق من أن الموظف نشط
  SELECT is_active INTO employee_active FROM public.employees WHERE id = p_employee_id;
  IF NOT employee_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_INACTIVE',
      'message', 'الموظف غير نشط'
    );
  END IF;
  
  -- التحقق من أن الموظف غير مرتبط بمستخدم آخر
  SELECT id INTO already_linked_user_id FROM public.profiles 
  WHERE employee_id = p_employee_id AND id != p_user_id;
  
  IF already_linked_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPLOYEE_ALREADY_LINKED',
      'message', 'الموظف مرتبط بمستخدم آخر بالفعل'
    );
  END IF;
  
  -- ربط المستخدم بالموظف
  UPDATE public.profiles 
  SET 
    employee_id = p_employee_id, 
    updated_at = now()
  WHERE id = p_user_id;
  
  -- التحقق من نجاح العملية
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_FAILED',
      'message', 'فشل في تحديث بيانات المستخدم'
    );
  END IF;
  
  -- مزامنة البيانات الأساسية
  UPDATE public.employees 
  SET 
    email = COALESCE((SELECT email FROM public.profiles WHERE id = p_user_id), email),
    updated_at = now()
  WHERE id = p_employee_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم ربط المستخدم بالموظف بنجاح',
    'user_id', p_user_id,
    'employee_id', p_employee_id
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

-- تحسين دالة unlink_user_from_employee أيضاً
DROP FUNCTION IF EXISTS public.unlink_user_from_employee(uuid);

CREATE OR REPLACE FUNCTION public.unlink_user_from_employee(p_user_id uuid) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- التحقق من وجود المستخدم
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- إلغاء ربط المستخدم من الموظف
  UPDATE public.profiles 
  SET 
    employee_id = NULL, 
    updated_at = now()
  WHERE id = p_user_id;
  
  -- التحقق من نجاح العملية
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_FAILED',
      'message', 'فشل في تحديث بيانات المستخدم'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إلغاء ربط المستخدم من الموظف بنجاح',
    'user_id', p_user_id
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
