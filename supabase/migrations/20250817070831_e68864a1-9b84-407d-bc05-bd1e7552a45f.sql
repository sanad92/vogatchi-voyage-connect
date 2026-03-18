-- إنشاء enum للأدوار أولاً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    WHERE t.typname = 'app_role'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.app_role AS ENUM (
      'super_admin',
      'admin',
      'manager',
      'sales_agent',
      'customer_service',
      'booking_agent',
      'accountant',
      'viewer'
    );
  END IF;
END $$;

-- الآن إنشاء/تحديث جدول أدوار المستخدمين
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- تفعيل RLS على جدول الأدوار
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- إنشاء الدوال الأساسية للأدوار
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role text)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT user_roles.role::text
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- سياسات RLS للأدوار
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض أدوارهم" ON public.user_roles;
CREATE POLICY "المستخدمون يمكنهم عرض أدوارهم"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "السوبر أدمن يمكنه عرض كل الأدوار" ON public.user_roles;
CREATE POLICY "السوبر أدمن يمكنه عرض كل الأدوار"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "السوبر أدمن يمكنه إدارة الأدوار" ON public.user_roles;
CREATE POLICY "السوبر أدمن يمكنه إدارة الأدوار"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- تحديث profiles table إذا كانت الأعمدة المطلوبة غير موجودة
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- دالة لإنشاء بروفايل تلقائياً عند التسجيل
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

-- إنشاء trigger لإنشاء البروفايل التلقائي
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
