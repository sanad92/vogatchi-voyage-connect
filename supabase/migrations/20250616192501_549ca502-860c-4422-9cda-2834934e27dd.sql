
-- إصلاح function sync_employee_profile_data لحل مشكلة employee_id
DROP FUNCTION IF EXISTS public.sync_employee_profile_data() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_employee_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- عند تحديث بيانات المستخدم، تحديث بيانات الموظف المرتبط
  IF TG_TABLE_NAME = 'profiles' AND NEW.employee_id IS NOT NULL THEN
    UPDATE public.employees 
    SET 
      full_name = COALESCE(NEW.full_name, full_name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      updated_at = now()
    WHERE id = NEW.employee_id;
  END IF;
  
  -- عند تحديث بيانات الموظف، تحديث بيانات المستخدم المرتبط (إن وجد)
  IF TG_TABLE_NAME = 'employees' THEN
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(NEW.full_name, full_name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      updated_at = now()
    WHERE employee_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف الـ triggers القديمة وإعادة إنشائها
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

-- تحسين function link_user_to_employee
DROP FUNCTION IF EXISTS public.link_user_to_employee(uuid, uuid);

CREATE OR REPLACE FUNCTION public.link_user_to_employee(
  p_user_id uuid,
  p_employee_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من وجود المستخدم والموظف
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id AND is_active = true) THEN
    RAISE EXCEPTION 'الموظف غير موجود أو غير نشط';
  END IF;
  
  -- التحقق من أن الموظف غير مرتبط بمستخدم آخر
  IF EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = p_employee_id AND id != p_user_id) THEN
    RAISE EXCEPTION 'الموظف مرتبط بمستخدم آخر بالفعل';
  END IF;
  
  -- ربط المستخدم بالموظف
  UPDATE public.profiles 
  SET 
    employee_id = p_employee_id, 
    updated_at = now()
  WHERE id = p_user_id;
  
  -- مزامنة البيانات الأساسية
  UPDATE public.employees 
  SET 
    email = COALESCE((SELECT email FROM public.profiles WHERE id = p_user_id), email),
    updated_at = now()
  WHERE id = p_employee_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ وإرجاع false
    RAISE WARNING 'خطأ في ربط المستخدم بالموظف: %', SQLERRM;
    RETURN false;
END;
$$;

-- تحسين function unlink_user_from_employee
DROP FUNCTION IF EXISTS public.unlink_user_from_employee(uuid);

CREATE OR REPLACE FUNCTION public.unlink_user_from_employee(p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إلغاء ربط المستخدم من الموظف
  UPDATE public.profiles 
  SET 
    employee_id = NULL, 
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'خطأ في إلغاء ربط المستخدم من الموظف: %', SQLERRM;
    RETURN false;
END;
$$;
