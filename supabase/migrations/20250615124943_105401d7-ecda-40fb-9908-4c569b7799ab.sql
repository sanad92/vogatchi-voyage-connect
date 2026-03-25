
-- إنشاء جدول صلاحيات المستخدمين المبسط
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- صلاحيات العملاء
  customers_read BOOLEAN DEFAULT false,
  customers_write BOOLEAN DEFAULT false,
  
  -- صلاحيات الحجوزات
  bookings_read BOOLEAN DEFAULT false,
  bookings_write BOOLEAN DEFAULT false,
  
  -- صلاحيات الموردين
  suppliers_read BOOLEAN DEFAULT false,
  suppliers_write BOOLEAN DEFAULT false,
  
  -- صلاحيات الفواتير
  invoices_read BOOLEAN DEFAULT false,
  invoices_write BOOLEAN DEFAULT false,
  
  -- صلاحيات التقارير
  reports_read BOOLEAN DEFAULT false,
  reports_write BOOLEAN DEFAULT false,
  
  -- صلاحيات الموظفين
  employees_read BOOLEAN DEFAULT false,
  employees_write BOOLEAN DEFAULT false,
  
  -- صلاحيات المصروفات
  expenses_read BOOLEAN DEFAULT false,
  expenses_write BOOLEAN DEFAULT false,
  
  -- صلاحيات إدارة المستخدمين
  users_read BOOLEAN DEFAULT false,
  users_write BOOLEAN DEFAULT false,
  
  -- صلاحيات إعدادات النظام
  settings_read BOOLEAN DEFAULT false,
  settings_write BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

-- تفعيل RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- السوبر أدمن يمكنه رؤية وتعديل كل الصلاحيات
CREATE POLICY "Super admin can manage all permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);

-- المستخدمون يمكنهم رؤية صلاحياتهم فقط
CREATE POLICY "Users can view own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- دالة للتحقق من صلاحية معينة للمستخدم
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_permission_type TEXT,
  p_access_type TEXT -- 'read' or 'write'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN := false;
  column_name TEXT;
BEGIN
  -- بناء اسم العمود
  column_name := p_permission_type || '_' || p_access_type;
  
  -- التحقق من الصلاحية
  EXECUTE format('SELECT %I FROM public.user_permissions WHERE user_id = $1', column_name)
  INTO has_permission
  USING p_user_id;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- دالة لإنشاء صلاحيات افتراضية للمستخدم الجديد
CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
-- INSERT INTO public.user_permissions (user_id)
--   VALUES (NEW.id)
--   ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- تريجر لإنشاء صلاحيات افتراضية عند إنشاء مستخدم جديد
CREATE TRIGGER create_user_permissions_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_permissions();

-- إنشاء صلاحيات للمستخدمين الموجودين
-- INSERT INTO public.user_permissions (user_id)
-- SELECT id FROM public.profiles
-- ON CONFLICT (user_id) DO NOTHING;
