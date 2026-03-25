
-- 1) إزالة foreign key الحالي (booking_id -> bookings.id)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_fkey;

-- 2) دالة تتحقق من وجود الحجز (أي نوع)
CREATE OR REPLACE FUNCTION public.booking_exists(booking UUID, bookingtype TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_result BOOLEAN := FALSE;
BEGIN
  IF bookingtype = 'hotel' THEN
    SELECT EXISTS (SELECT 1 FROM public.hotel_bookings WHERE id = booking) INTO exists_result;
  ELSIF bookingtype = 'flight' THEN
    SELECT EXISTS (SELECT 1 FROM public.flight_bookings WHERE id = booking) INTO exists_result;
  ELSIF bookingtype = 'car_rental' THEN
    SELECT EXISTS (SELECT 1 FROM public.car_rentals WHERE id = booking) INTO exists_result;
  ELSIF bookingtype = 'transport' THEN
    SELECT EXISTS (SELECT 1 FROM public.transport_bookings WHERE id = booking) INTO exists_result;
  END IF;
  RETURN exists_result;
END;
$$;

-- 3) إضافة CHECK constraint على جدول الفواتير
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_booking_id_check;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_booking_id_exists_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_booking_id_exists_chk
    CHECK (
      public.booking_exists(booking_id, booking_type)
    );
  END IF;
END $$;

-- 4) تحديث سياسات الإدخال للـ RLS (بالنسبة للوكلاء)
DROP POLICY IF EXISTS "Sales agents can create invoice for their own bookings" ON public.invoices;
CREATE POLICY "Sales agents can create invoice for their own bookings"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    (booking_type = 'hotel' AND EXISTS (
      SELECT 1 FROM public.hotel_bookings
      WHERE public.hotel_bookings.id = invoices.booking_id
        AND public.hotel_bookings.booking_agent_id = auth.uid()
    ))
    OR
    (booking_type = 'flight' AND EXISTS (
      SELECT 1 FROM public.flight_bookings
      WHERE public.flight_bookings.id = invoices.booking_id
        AND public.flight_bookings.booking_agent_id = auth.uid()
    ))
    OR
    (booking_type = 'car_rental' AND EXISTS (
      SELECT 1 FROM public.car_rentals
      WHERE public.car_rentals.id = invoices.booking_id
        AND public.car_rentals.booking_agent_id = auth.uid()
    ))
    OR
    (booking_type = 'transport' AND EXISTS (
      SELECT 1 FROM public.transport_bookings
      WHERE public.transport_bookings.id = invoices.booking_id
        AND public.transport_bookings.booking_agent_id = auth.uid()
    ))
  );


-- يمكن تكرار فكرة استخدام booking_type في باقي السياسات عند الحاجة

