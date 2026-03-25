
-- إصلاح دالة sync_employee_profile_data لحل مشكلة employee_id
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
  
  -- عند تحديث بيانات الموظف، تحديث بيانات المستخدمين المرتبطين
  IF TG_TABLE_NAME = 'employees' THEN
    -- البحث عن جميع المستخدمين المرتبطين بهذا الموظف وتحديث بياناتهم
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(NEW.full_name, full_name),
      phone = COALESCE(NEW.phone, phone),
      updated_at = now()
    WHERE employee_id = NEW.id;
    
    -- تحديث email فقط إذا لم يكن موجوداً في جدول profiles
    UPDATE public.profiles 
    SET 
      email = NEW.email,
      updated_at = now()
    WHERE employee_id = NEW.id AND (email IS NULL OR email = '');
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
