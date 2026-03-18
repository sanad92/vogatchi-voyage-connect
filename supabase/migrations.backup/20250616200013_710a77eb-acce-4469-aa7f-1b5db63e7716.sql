
-- إصلاح دالة link_user_to_employee لإزالة التحديث الزائد الذي يسبب المشكلة
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
  
  -- ربط المستخدم بالموظف (فقط - بدون تحديث جدول employees)
  -- الـ trigger سيقوم بالمزامنة تلقائياً
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

-- تحسين دالة sync_employee_profile_data لتجنب التحديثات اللانهائية
DROP FUNCTION IF EXISTS public.sync_employee_profile_data() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_employee_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- عند تحديث بيانات المستخدم، تحديث بيانات الموظف المرتبط
  IF TG_TABLE_NAME = 'profiles' AND NEW.employee_id IS NOT NULL THEN
    -- تحديث فقط إذا كانت هناك تغييرات فعلية
    IF OLD.full_name IS DISTINCT FROM NEW.full_name 
       OR OLD.email IS DISTINCT FROM NEW.email 
       OR OLD.phone IS DISTINCT FROM NEW.phone THEN
      
      UPDATE public.employees 
      SET 
        full_name = COALESCE(NEW.full_name, full_name),
        email = COALESCE(NEW.email, email),
        phone = COALESCE(NEW.phone, phone),
        updated_at = now()
      WHERE id = NEW.employee_id;
    END IF;
  END IF;
  
  -- عند تحديث بيانات الموظف، تحديث بيانات المستخدمين المرتبطين
  IF TG_TABLE_NAME = 'employees' THEN
    -- تحديث فقط إذا كانت هناك تغييرات فعلية
    IF OLD.full_name IS DISTINCT FROM NEW.full_name 
       OR OLD.phone IS DISTINCT FROM NEW.phone THEN
      
      UPDATE public.profiles 
      SET 
        full_name = COALESCE(NEW.full_name, full_name),
        phone = COALESCE(NEW.phone, phone),
        updated_at = now()
      WHERE employee_id = NEW.id;
    END IF;
    
    -- تحديث email فقط إذا تغير وكان فارغاً في profiles
    IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
      UPDATE public.profiles 
      SET 
        email = NEW.email,
        updated_at = now()
      WHERE employee_id = NEW.id AND (email IS NULL OR email = '');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء الـ triggers
DROP TRIGGER IF EXISTS sync_profile_to_employee ON public.profiles;
DROP TRIGGER IF EXISTS sync_employee_to_profile ON public.employees;

-- إنشاء trigger للـ profiles
CREATE TRIGGER sync_profile_to_employee
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_profile_data();

-- إنشاء trigger للـ employees
CREATE TRIGGER sync_employee_to_profile
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_profile_data();
