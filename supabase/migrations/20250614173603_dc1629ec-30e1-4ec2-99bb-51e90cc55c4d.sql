
-- تحديث function للتحقق من الصلاحيات لتشمل السوبر أدمن
CREATE OR REPLACE FUNCTION public.has_role_or_higher(user_id UUID, required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    WITH role_hierarchy AS (
      SELECT 'super_admin'::user_role as role, 1 as level
      UNION SELECT 'admin'::user_role, 2
      UNION SELECT 'manager'::user_role, 3
      UNION SELECT 'sales_agent'::user_role, 4
      UNION SELECT 'accountant'::user_role, 4
      UNION SELECT 'viewer'::user_role, 5
    ),
    user_role_level AS (
      SELECT rh.level
      FROM public.user_roles ur
      JOIN role_hierarchy rh ON ur.role = rh.role
      WHERE ur.user_id = $1
    ),
    required_role_level AS (
      SELECT rh.level
      FROM role_hierarchy rh
      WHERE rh.role = $2
    )
    SELECT 1
    FROM user_role_level url, required_role_level rrl
    WHERE url.level <= rrl.level
  );
$$;

-- تحديث سياسات الأمان لتشمل السوبر أدمن
DROP POLICY IF EXISTS "Super admins and admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins and admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- سياسة للأدمن العادي لإدارة الأدوار (ما عدا super_admin)
CREATE POLICY "Admins can manage non-super-admin roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') AND 
    role != 'super_admin'
  );

-- تحديث trigger لإنشاء المستخدمين الجدد بدون دور افتراضي
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط إنشاء profile بدون دور (سيتم تحديد الدور من السوبر أدمن)
-- INSERT INTO public.profiles (id, email, full_name, is_active)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
--     false  -- غير نشط افتراضياً حتى يفعله السوبر أدمن
--   );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إنشاء جدول لطلبات إنشاء الحسابات الجديدة
CREATE TABLE IF NOT EXISTS public.user_creation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  requested_role user_role NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage user creation requests" ON public.user_creation_requests
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view their own requests" ON public.user_creation_requests
  FOR SELECT USING (created_by = auth.uid());
