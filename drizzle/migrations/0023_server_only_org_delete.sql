CREATE OR REPLACE FUNCTION public.delete_organization_cascade(_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tbl record;
  _rows bigint;
  _changed bigint;
  _iter int;
BEGIN
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' AND NOT COALESCE(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;

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
  DELETE FROM public.impersonation_sessions WHERE target_org_id = _org_id;

  FOR _iter IN 1..15 LOOP
    _changed := 0;
    FOR _tbl IN
      SELECT DISTINCT cl.relname
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
      JOIN pg_catalog.pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE con.contype = 'f' AND con.confrelid = 'public.organizations'::regclass
        AND ns.nspname = 'public' AND cl.relname <> 'impersonation_sessions'
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = cl.oid AND a.attname = 'organization_id' AND NOT a.attisdropped)
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE organization_id = $1', _tbl.relname) USING _org_id;
        GET DIAGNOSTICS _rows = ROW_COUNT;
        _changed := _changed + _rows;
      EXCEPTION
        WHEN foreign_key_violation OR restrict_violation THEN
          NULL;
      END;
    END LOOP;
    EXIT WHEN _changed = 0;
  END LOOP;

  DELETE FROM public.organizations WHERE id = _org_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) TO service_role;