CREATE UNIQUE INDEX IF NOT EXISTS organization_settings_organization_id_key_idx ON public.organization_settings(organization_id);

CREATE OR REPLACE FUNCTION public._trg_seed_org_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.organization_settings (organization_id, company_name, email, phone, address)
  VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, NEW.address)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._trg_seed_org_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_org_settings ON public.organizations;
CREATE TRIGGER trg_seed_org_settings
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public._trg_seed_org_settings();

-- Backfill: companies without settings get default currency EGP
INSERT INTO public.organization_settings (organization_id, company_name, email, phone, address)
SELECT o.id, o.name, o.email, o.phone, o.address
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings s WHERE s.organization_id = o.id);