
-- صلاحيات سوبر أدمن كاملة على جداول العملاء والحجوزات والفواتير وغيرها
-- إذا كان هناك جدول مهم آخر أضفه هنا

-- جدول العملاء
DROP POLICY IF EXISTS "Super admins can select all data" ON public.customers;
DROP POLICY IF EXISTS "Super admins can insert all data" ON public.customers;
DROP POLICY IF EXISTS "Super admins can update all data" ON public.customers;
DROP POLICY IF EXISTS "Super admins can delete all data" ON public.customers;

CREATE POLICY "Super admins can select all data" ON public.customers
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert all data" ON public.customers
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all data" ON public.customers
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all data" ON public.customers
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- جدول الموردين
DROP POLICY IF EXISTS "Super admins can select all data" ON public.suppliers;
DROP POLICY IF EXISTS "Super admins can insert all data" ON public.suppliers;
DROP POLICY IF EXISTS "Super admins can update all data" ON public.suppliers;
DROP POLICY IF EXISTS "Super admins can delete all data" ON public.suppliers;

CREATE POLICY "Super admins can select all data" ON public.suppliers
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert all data" ON public.suppliers
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all data" ON public.suppliers
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all data" ON public.suppliers
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- جدول حجوزات الفنادق
DROP POLICY IF EXISTS "Super admins can select all data" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Super admins can insert all data" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Super admins can update all data" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Super admins can delete all data" ON public.hotel_bookings;

CREATE POLICY "Super admins can select all data" ON public.hotel_bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert all data" ON public.hotel_bookings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all data" ON public.hotel_bookings
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all data" ON public.hotel_bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- جدول حجوزات الطيران
DROP POLICY IF EXISTS "Super admins can select all data" ON public.flight_bookings;
DROP POLICY IF EXISTS "Super admins can insert all data" ON public.flight_bookings;
DROP POLICY IF EXISTS "Super admins can update all data" ON public.flight_bookings;
DROP POLICY IF EXISTS "Super admins can delete all data" ON public.flight_bookings;

CREATE POLICY "Super admins can select all data" ON public.flight_bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert all data" ON public.flight_bookings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all data" ON public.flight_bookings
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all data" ON public.flight_bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- جدول الفواتير
DROP POLICY IF EXISTS "Super admins can select all data" ON public.invoices;
DROP POLICY IF EXISTS "Super admins can insert all data" ON public.invoices;
DROP POLICY IF EXISTS "Super admins can update all data" ON public.invoices;
DROP POLICY IF EXISTS "Super admins can delete all data" ON public.invoices;

CREATE POLICY "Super admins can select all data" ON public.invoices
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert all data" ON public.invoices
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all data" ON public.invoices
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all data" ON public.invoices
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- (يمكنك تكرار نفس العملية لأي جدول آخر تحتاج أن يكون للسوبر أدمن صلاحية عليه)
