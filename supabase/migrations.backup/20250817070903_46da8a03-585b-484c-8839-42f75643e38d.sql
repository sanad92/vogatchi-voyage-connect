-- فحص الأنواع الموجودة وحذف المتعارضة
DROP TYPE IF EXISTS public.app_role CASCADE;

-- استخدام user_role الموجود بدلاً من إنشاء نوع جديد
-- أولاً دعنا نرى ما هو موجود ونحدثه
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- إنشاء جدول user_roles جديد باستخدام النوع الموجود
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- تفعيل RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- إنشاء الدوال باستخدام النوع الصحيح
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
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

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role user_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT user_roles.role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::user_role)
$$;

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
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  -- إعطاء دور viewer افتراضي للمستخدمين الجدد
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer'::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
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
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- تحديث سياسات البروفايلات للعمل مع النظام الجديد
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

CREATE POLICY "السوبر أدمن يمكنه إدارة البروفايلات"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));