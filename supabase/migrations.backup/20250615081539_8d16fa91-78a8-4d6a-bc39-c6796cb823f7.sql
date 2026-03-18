
-- تحديث سياسة إدارة الموردين لتشمل المزيد من الأدوار
DROP POLICY IF EXISTS "Managers and admins can manage suppliers" ON public.suppliers;

-- إنشاء سياسة جديدة تسمح لأدوار إضافية بإدارة الموردين
CREATE POLICY "Suppliers management policy" ON public.suppliers
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'sales_agent')
  );

-- التأكد من وجود دور للمستخدم الحالي إذا لم يكن موجوداً
-- (هذا سيساعد في حالة عدم وجود دور للمستخدم)
INSERT INTO public.user_roles (user_id, role)
SELECT auth.uid(), 'sales_agent'::user_role
WHERE auth.uid() IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  );
