-- إنشاء جدول البروفايلات للمستخدمين
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  employee_id TEXT UNIQUE,
  department TEXT,
  position TEXT,
  hire_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS على جدول البروفايلات
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- إنشاء enum للأدوار
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

-- إنشاء جدول أدوار المستخدمين
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- تفعيل RLS على جدول الأدوار
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- دالة للتحقق من الأدوار (SECURITY DEFINER لتجنب المشاكل الدائرية)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- دالة للحصول على أدوار المستخدم
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role app_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT user_roles.role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- دالة للتحقق من كون المستخدم سوبر أدمن
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- سياسات RLS للبروفايلات
CREATE POLICY "المستخدمون يمكنهم عرض بروفايلهم"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث بروفايلهم"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "السوبر أدمن يمكنه عرض كل البروفايلات"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "السوبر أدمن يمكنه تحديث كل البروفايلات"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "السوبر أدمن يمكنه إنشاء البروفايلات"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- سياسات RLS للأدوار
CREATE POLICY "المستخدمون يمكنهم عرض أدوارهم"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "السوبر أدمن يمكنه عرض كل الأدوار"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "السوبر أدمن يمكنه إدارة الأدوار"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- دالة لإنشاء بروفايل تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- إعطاء دور viewer افتراضي للمستخدمين الجدد
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- تشغيل الدالة عند إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على جدول البروفايلات
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء مستخدم سوبر أدمن افتراضي (سيتم تحديثه لاحقاً)
-- ملاحظة: سيحتاج هذا المستخدم للتسجيل عبر الواجهة أولاً