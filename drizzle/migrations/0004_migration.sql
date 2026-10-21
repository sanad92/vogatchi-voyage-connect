CREATE OR REPLACE FUNCTION public._trg_seed_org_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._ensure_account_routing_defaults(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._trg_seed_org_accounting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_org_accounting ON public.organizations;
CREATE TRIGGER trg_seed_org_accounting
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public._trg_seed_org_accounting();

-- Backfill companies created without accounts
SELECT public._ensure_account_routing_defaults(o.id)
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts c WHERE c.organization_id = o.id);