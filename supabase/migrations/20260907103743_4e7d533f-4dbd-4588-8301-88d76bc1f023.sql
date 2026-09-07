DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['booking_hotel_details','booking_flight_details','booking_transport_details','booking_car_details']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = %I.booking_id AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))))
      WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = %I.booking_id AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))))
    $f$, t || '_update', t, t, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = %I.booking_id AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))))
    $f$, t || '_delete', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;