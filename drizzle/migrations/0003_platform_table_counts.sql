CREATE OR REPLACE FUNCTION public.platform_table_counts()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  FOREACH t IN ARRAY ARRAY['organizations','customers','suppliers','hotel_bookings','flight_bookings','invoices','subscriptions','employee_commission_periods'] LOOP
    table_name := t;
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO row_count;
    RETURN NEXT;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.platform_table_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_table_counts() TO authenticated;