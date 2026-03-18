
-- إصلاح دالة sync_employee_profile_data لحل مشكلة employee_id
DROP FUNCTION IF EXISTS public.sync_employee_profile_data() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_employee_profile_data()
RETURNS TRIGGER AS $$
DECLARE
  profile_exists BOOLEAN := FALSE;
  employee_exists BOOLEAN := FALSE;
BEGIN
  -- عند تحديث بيانات المستخدم، تحديث بيانات الموظف المرتبط
  IF TG_TABLE_NAME = 'profiles' THEN
    -- التحقق من وجود employee_id في الملف الشخصي
    IF NEW.employee_id IS NOT NULL THEN
      -- التحقق من وجود الموظف
      SELECT EXISTS (SELECT 1 FROM public.employees WHERE id = NEW.employee_id) INTO employee_exists;
      
      IF employee_exists THEN
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
    END IF;
  END IF;
  
  -- عند تحديث بيانات الموظف، تحديث بيانات المستخدمين المرتبطين
  IF TG_TABLE_NAME = 'employees' THEN
    -- البحث عن المستخدمين المرتبطين بهذا الموظف
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
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
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ وإرجاع NEW لعدم إيقاف العملية
    RAISE WARNING 'خطأ في مزامنة البيانات بين profiles و employees: %', SQLERRM;
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
