
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_year text; v_max int;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CASE WHEN entry_number ~ ('^JE-' || v_year || '-[0-9]+$')
         THEN substring(entry_number from '[0-9]+$')::int
         ELSE 0 END
  ), 0)
  INTO v_max
  FROM public.journal_entries
  WHERE organization_id = _org_id;
  RETURN 'JE-' || v_year || '-' || lpad((v_max + 1)::text, 6, '0');
END $$;

-- Backfill again
DO $$
DECLARE r public.bookings%ROWTYPE;
BEGIN
  FOR r IN
    SELECT * FROM public.bookings
    WHERE COALESCE(status,'') IN ('confirmed','completed','ticketed','paid')
      AND (COALESCE(selling_price,0) > 0 OR COALESCE(cost_price,0) > 0)
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries je
                      WHERE je.reference_type='booking' AND je.reference_id = bookings.id)
  LOOP
    PERFORM public.booking_make_journal(r);
  END LOOP;
END $$;
