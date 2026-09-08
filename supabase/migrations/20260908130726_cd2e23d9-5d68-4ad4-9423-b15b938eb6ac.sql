CREATE OR REPLACE FUNCTION public._can_manage_bank_reconciliation(_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE(public.can_org_write(_org), false)
    AND COALESCE(public.has_org_permission(_org, 'banking_transactions'), false);
$function$;

REVOKE EXECUTE ON FUNCTION public._can_manage_bank_reconciliation(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_manage_bank_reconciliation(uuid)
  TO authenticated, service_role;