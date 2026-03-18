
-- إضافة عمود employee_id لجدول profiles لربط المستخدمين بالموظفين
ALTER TABLE public.profiles 
ADD COLUMN employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX idx_profiles_employee_id ON public.profiles(employee_id);

-- إضافة قيد للتأكد من أن كل موظف مرتبط بمستخدم واحد فقط
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_employee_profile UNIQUE(employee_id);

-- دالة لمزامنة البيانات المشتركة بين الموظفين والمستخدمين
CREATE OR REPLACE FUNCTION sync_employee_profile_data()
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
  
  -- عند تحديث بيانات الموظف، تحديث بيانات المستخدم المرتبط
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

-- إنشاء triggers للمزامنة التلقائية
CREATE TRIGGER sync_profile_to_employee
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_profile_data();

CREATE TRIGGER sync_employee_to_profile
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_profile_data();

-- دالة لربط مستخدم بموظف
CREATE OR REPLACE FUNCTION link_user_to_employee(
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
  
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'الموظف غير موجود';
  END IF;
  
  -- التحقق من أن الموظف غير مرتبط بمستخدم آخر
  IF EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = p_employee_id AND id != p_user_id) THEN
    RAISE EXCEPTION 'الموظف مرتبط بمستخدم آخر بالفعل';
  END IF;
  
  -- ربط المستخدم بالموظف
  UPDATE public.profiles 
  SET employee_id = p_employee_id, updated_at = now()
  WHERE id = p_user_id;
  
  -- مزامنة البيانات
  UPDATE public.employees 
  SET 
    email = (SELECT email FROM public.profiles WHERE id = p_user_id),
    updated_at = now()
  WHERE id = p_employee_id;
  
  RETURN true;
END;
$$;

-- دالة لإلغاء ربط مستخدم من موظف
CREATE OR REPLACE FUNCTION unlink_user_from_employee(p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET employee_id = NULL, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;
