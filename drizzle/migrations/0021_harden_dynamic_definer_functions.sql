CREATE OR REPLACE FUNCTION public.platform_table_counts()
 RETURNS TABLE(table_name text, row_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT 'organizations'::text, count(*) FROM public.organizations
    UNION ALL SELECT 'customers', count(*) FROM public.customers
    UNION ALL SELECT 'suppliers', count(*) FROM public.suppliers
    UNION ALL SELECT 'hotel_bookings', count(*) FROM public.hotel_bookings
    UNION ALL SELECT 'flight_bookings', count(*) FROM public.flight_bookings
    UNION ALL SELECT 'invoices', count(*) FROM public.invoices
    UNION ALL SELECT 'subscriptions', count(*) FROM public.subscriptions
    UNION ALL SELECT 'employee_commission_periods', count(*) FROM public.employee_commission_periods;
END;
$function$;
REVOKE ALL ON FUNCTION public.platform_table_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_table_counts() TO authenticated;

DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.delete_organization_cascade(uuid)'::regprocedure) INTO d;
  d := replace(d, '_tbl text;', '_tbl record;');
  d := replace(d, $$      SELECT conrelid::regclass::text
      FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'public.organizations'::regclass
        AND conrelid <> 'public.impersonation_sessions'::regclass$$,
  $$      SELECT DISTINCT cl.relname
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl ON cl.oid = con.conrelid
      JOIN pg_catalog.pg_namespace ns ON ns.oid = cl.relnamespace
      WHERE con.contype = 'f' AND con.confrelid = 'public.organizations'::regclass
        AND ns.nspname = 'public' AND cl.relname <> 'impersonation_sessions'
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = cl.oid AND a.attname = 'organization_id' AND NOT a.attisdropped)$$);
  d := replace(d, $$format('DELETE FROM %s WHERE organization_id = $1', _tbl)$$, $$format('DELETE FROM public.%I WHERE organization_id = $1', _tbl.relname)$$);
  IF position('public.%I' in d) = 0 THEN RAISE EXCEPTION 'delete_organization_cascade patch failed'; END IF;
  EXECUTE d;

  SELECT pg_get_functiondef('public.merge_employee_records(uuid,uuid[])'::regprocedure) INTO d;
  d := replace(d, $$AND NOT (ns.nspname='public' AND cl.relname='employee_merge_audit')$$, $$AND ns.nspname='public' AND cl.relname<>'employee_merge_audit'$$);
  d := replace(d, $$format('UPDATE %I.%I SET %I=$1 WHERE %I=ANY($2)',v_fk.schema_name,v_fk.table_name,v_fk.column_name,v_fk.column_name)$$, $$format('UPDATE public.%I SET %I=$1 WHERE %I=ANY($2)',v_fk.table_name,v_fk.column_name,v_fk.column_name)$$);
  IF position('UPDATE public.%I' in d) = 0 THEN RAISE EXCEPTION 'merge_employee_records patch failed'; END IF;
  EXECUTE d;
END $mig$;
REVOKE ALL ON FUNCTION public.delete_organization_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.merge_employee_records(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_employee_records(uuid, uuid[]) TO authenticated;