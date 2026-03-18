
-- تحديث دالة إدارة العملاء مع الأدوار الصحيحة فقط
CREATE OR REPLACE FUNCTION public.can_manage_customers()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'sales_agent', 'accountant')
  );
$$;
