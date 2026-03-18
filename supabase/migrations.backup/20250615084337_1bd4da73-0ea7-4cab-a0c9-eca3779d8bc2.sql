
-- المرحلة الأولى: سياسات صلاحيات السوبر أدمن لجداول الموردين وكل ما يتعلق بهم

-- 1. تحديث سياسة الموردين لتأكيد وصول السوبر أدمن بالكامل
DROP POLICY IF EXISTS "Suppliers management policy" ON public.suppliers;

CREATE POLICY "Super Admins and allowed roles can manage suppliers" ON public.suppliers
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'sales_agent')
  );

-- السماح للسوبر أدمن بالقراءة دائمًا (احتياطيًا)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

CREATE POLICY "All allowed users including super admins can view suppliers" ON public.suppliers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'sales_agent') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'viewer')
  );

-- 2. سياسات العملات المرتبطة بالموردين
ALTER TABLE public.supplier_currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers managers can manage supplier currencies" ON public.supplier_currencies;
CREATE POLICY "Super Admins and allowed roles can manage supplier currencies" ON public.supplier_currencies
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'sales_agent')
  );
  
-- 3. مراجعة سجل العمليات (audit log) والتأكد أن السوبر أدمن يستطيع قراءته
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "default" ON public.admin_audit_log;
CREATE POLICY "Super admins can view audit log" ON public.admin_audit_log
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin')
  );

-- 4. سياسات مدفوعات الموردين (supplier_payments) مرتبطة غالباً بالأدوار المحاسبية
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accountants and above can manage payments" ON public.supplier_payments;
CREATE POLICY "Super Admins and allowed roles can manage supplier payments" ON public.supplier_payments
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'accountant')
  );

-- 5. مراجعة باقي الجداول الحساسة وإضافة السوبر أدمن إن لم يكن موجودًا بالفعل
-- مثال: العقود، التقييمات ... إلخ
-- (أضف هنا أي جدول مرتبط ترغب في رفع صلاحيات السوبر أدمن إليه)

