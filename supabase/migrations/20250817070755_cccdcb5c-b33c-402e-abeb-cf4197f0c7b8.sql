-- تحديث جدول البروفايلات الموجود ليصبح متوافق مع نظام الأدوار الجديد
-- إضافة الأعمدة المفقودة
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- التأكد من أن الdatabase functions تعمل مع الجدول الجديد
-- (functions already defined earlier; skip redefinition to avoid dependency drops)

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- تحديث trigger لإنشاء البروفايل التلقائي
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
-- INSERT INTO public.profiles (user_id, full_name, phone)
--   VALUES (
--     NEW.id,
--     COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
--     NEW.raw_user_meta_data ->> 'phone'
--   );
  
  -- إعطاء دور viewer افتراضي للمستخدمين الجدد
-- INSERT INTO public.user_roles (user_id, role)
--   VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
