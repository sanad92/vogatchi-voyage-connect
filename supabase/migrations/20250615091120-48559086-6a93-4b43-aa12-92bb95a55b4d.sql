
-- سياسة للسماح للإدارة والمحاسبين بإدراج الفواتير
DROP POLICY IF EXISTS "Admins and managers can create invoices" ON public.invoices;
CREATE POLICY "Admins, managers, accountants can create invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'accountant')
  );

-- سياسة للسماح لوكلاء الحجوزات (sales_agent) بإدراج فواتير حجوزاتهم فقط
DROP POLICY IF EXISTS "Sales agents can create invoice for their own bookings" ON public.invoices;
CREATE POLICY "Sales agents can create invoice for their own bookings"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hotel_bookings
      WHERE public.hotel_bookings.id = invoices.booking_id
        AND public.hotel_bookings.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.flight_bookings
      WHERE public.flight_bookings.id = invoices.booking_id
        AND public.flight_bookings.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.car_rentals
      WHERE public.car_rentals.id = invoices.booking_id
        AND public.car_rentals.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.transport_bookings
      WHERE public.transport_bookings.id = invoices.booking_id
        AND public.transport_bookings.booking_agent_id = auth.uid()
    )
  );

-- سياسة العرض (SELECT) مثل قبل بصيغة USING
DROP POLICY IF EXISTS "Admins and managers can view all invoices" ON public.invoices;
CREATE POLICY "Relevant users can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'accountant')
    OR EXISTS (
      SELECT 1 FROM public.hotel_bookings
      WHERE public.hotel_bookings.id = invoices.booking_id
        AND public.hotel_bookings.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.flight_bookings
      WHERE public.flight_bookings.id = invoices.booking_id
        AND public.flight_bookings.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.car_rentals
      WHERE public.car_rentals.id = invoices.booking_id
        AND public.car_rentals.booking_agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.transport_bookings
      WHERE public.transport_bookings.id = invoices.booking_id
        AND public.transport_bookings.booking_agent_id = auth.uid()
    )
  );
