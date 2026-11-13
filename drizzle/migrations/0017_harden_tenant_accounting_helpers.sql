-- Tenant authorization hardening for accounting/workflow helpers
DO $mig$
DECLARE d text; n text;
BEGIN
  d := pg_get_functiondef('public.advance_workflow(uuid,text,text)'::regprocedure);
  n := replace(d, 'WHERE m.organization_id = v_org AND m.user_id = auth.uid())',
                  'WHERE m.organization_id = v_org AND m.user_id = auth.uid() AND m.is_active = true)');
  IF n = d THEN RAISE EXCEPTION 'advance_workflow membership check not found'; END IF;
  EXECUTE n;

  d := pg_get_functiondef('public.sync_booking_financials(uuid)'::regprocedure);
  n := replace(d, 'AND NOT public.user_belongs_to_org(auth.uid(), b.organization_id) THEN',
                  'AND NOT ((public.user_belongs_to_org(auth.uid(), b.organization_id) AND public.has_org_permission(b.organization_id, ''bookings_edit'')) OR public.is_platform_admin(auth.uid())) THEN');
  IF n = d THEN RAISE EXCEPTION 'sync_booking_financials membership check not found'; END IF;
  EXECUTE n;
END
$mig$;

CREATE OR REPLACE FUNCTION public.get_org_account_route_code(_org_id uuid, _routing_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.user_belongs_to_org(auth.uid(), _org_id)
     AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT a.account_code FROM public.chart_of_accounts a
          WHERE a.id = public.get_org_account_route(_org_id, _routing_key));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._ensure_account_routing_defaults(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._require_route_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._module_pulse_window(uuid, date, date) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS car_details_insert ON public.booking_car_details;
CREATE POLICY car_details_insert ON public.booking_car_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_car_details.booking_id
    AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.has_org_permission(b.organization_id, 'bookings_edit')));
DROP POLICY IF EXISTS booking_car_details_update ON public.booking_car_details;
CREATE POLICY booking_car_details_update ON public.booking_car_details FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_car_details.booking_id
    AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.has_org_permission(b.organization_id, 'bookings_edit')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_car_details.booking_id
    AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.has_org_permission(b.organization_id, 'bookings_edit')));
DROP POLICY IF EXISTS booking_car_details_delete ON public.booking_car_details;
CREATE POLICY booking_car_details_delete ON public.booking_car_details FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_car_details.booking_id
    AND b.organization_id = ANY (public.get_user_org_ids(auth.uid()))
    AND public.has_org_permission(b.organization_id, 'bookings_edit')));