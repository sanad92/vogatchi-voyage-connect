
-- إنشاء دالة مساعدة للحصول على دور المستخدم الحالي (تجنب infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- إنشاء دالة للتحقق من صلاحية إضافة العملاء
CREATE OR REPLACE FUNCTION public.can_manage_customers()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'sales_agent')
  );
$$;

-- إنشاء دالة للتحقق من صلاحية الحذف (أدوار عليا فقط)
CREATE OR REPLACE FUNCTION public.can_delete_customers()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  );
$$;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Sales and above can manage customers" ON public.customers;

-- إنشاء سياسات RLS الجديدة لجدول العملاء
CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized roles can insert customers" ON public.customers
  FOR INSERT 
  WITH CHECK (public.can_manage_customers());

CREATE POLICY "Authorized roles can update customers" ON public.customers
  FOR UPDATE 
  USING (public.can_manage_customers());

CREATE POLICY "Senior roles can delete customers" ON public.customers
  FOR DELETE 
  USING (public.can_delete_customers());

-- التأكد من تفعيل RLS على الجدول
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
