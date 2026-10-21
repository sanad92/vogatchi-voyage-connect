CREATE OR REPLACE FUNCTION public.delete_organization_cascade(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tbl text;
  _rows bigint;
  _changed bigint;
  _iter int;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;

  -- Child tables that reference org-owned parents but have no organization_id column
  DELETE FROM public.booking_car_details WHERE booking_id IN (SELECT id FROM public.bookings WHERE organization_id = _org_id);
  DELETE FROM public.booking_flight_details WHERE booking_id IN (SELECT id FROM public.bookings WHERE organization_id = _org_id);
  DELETE FROM public.booking_hotel_details WHERE booking_id IN (SELECT id FROM public.bookings WHERE organization_id = _org_id);
  DELETE FROM public.booking_transport_details WHERE booking_id IN (SELECT id FROM public.bookings WHERE organization_id = _org_id);
  DELETE FROM public.journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM public.journal_entries WHERE organization_id = _org_id);
  DELETE FROM public.ai_assistant_messages WHERE thread_id IN (SELECT id FROM public.ai_assistant_threads WHERE organization_id = _org_id);
  DELETE FROM public.automation_actions WHERE rule_id IN (SELECT id FROM public.automation_rules WHERE organization_id = _org_id);
  DELETE FROM public.journey_step_runs WHERE enrollment_id IN (SELECT id FROM public.journey_enrollments WHERE organization_id = _org_id);
  DELETE FROM public.journey_steps WHERE journey_id IN (SELECT id FROM public.marketing_journeys WHERE organization_id = _org_id);
  DELETE FROM public.supplier_currencies WHERE supplier_id IN (SELECT id FROM public.suppliers WHERE organization_id = _org_id);

  -- References organizations via target_org_id instead of organization_id
  DELETE FROM public.impersonation_sessions WHERE target_org_id = _org_id;

  -- Delete from every table holding organization_id, looping until stable so
  -- inter-table dependencies (e.g. invoice_items -> invoices) resolve.
  FOR _iter IN 1..10 LOOP
    _changed := 0;
    FOR _tbl IN
      SELECT conrelid::regclass::text
      FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'public.organizations'::regclass
        AND conrelid <> 'public.impersonation_sessions'::regclass
    LOOP
      EXECUTE format('DELETE FROM %s WHERE organization_id = $1', _tbl) USING _org_id;
      GET DIAGNOSTICS _rows = ROW_COUNT;
      _changed := _changed + _rows;
    END LOOP;
    EXIT WHEN _changed = 0;
  END LOOP;

  DELETE FROM public.organizations WHERE id = _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) TO authenticated;