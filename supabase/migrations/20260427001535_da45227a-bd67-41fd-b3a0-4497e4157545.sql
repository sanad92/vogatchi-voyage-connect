-- ============= 1) monthly_salaries =============
ALTER TABLE public.monthly_salaries
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.monthly_salaries ms
SET organization_id = e.organization_id
FROM public.employees e
WHERE ms.employee_id = e.id AND ms.organization_id IS NULL;

DELETE FROM public.monthly_salaries WHERE organization_id IS NULL;

ALTER TABLE public.monthly_salaries ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_salaries_org ON public.monthly_salaries(organization_id);

ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salaries_select_org" ON public.monthly_salaries;
DROP POLICY IF EXISTS "salaries_insert_org" ON public.monthly_salaries;
DROP POLICY IF EXISTS "salaries_update_org" ON public.monthly_salaries;
DROP POLICY IF EXISTS "salaries_delete_org" ON public.monthly_salaries;

CREATE POLICY "salaries_select_org" ON public.monthly_salaries FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "salaries_insert_org" ON public.monthly_salaries FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "salaries_update_org" ON public.monthly_salaries FOR UPDATE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "salaries_delete_org" ON public.monthly_salaries FOR DELETE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));


-- ============= 2) rent_contracts =============
ALTER TABLE public.rent_contracts
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.rent_contracts rc
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = rc.created_by AND om.is_active = true
  LIMIT 1
)
WHERE rc.organization_id IS NULL AND rc.created_by IS NOT NULL;

UPDATE public.rent_contracts
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

DELETE FROM public.rent_contracts WHERE organization_id IS NULL;

ALTER TABLE public.rent_contracts ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rent_contracts_org ON public.rent_contracts(organization_id);

ALTER TABLE public.rent_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rent_contracts_select_org" ON public.rent_contracts;
DROP POLICY IF EXISTS "rent_contracts_insert_org" ON public.rent_contracts;
DROP POLICY IF EXISTS "rent_contracts_update_org" ON public.rent_contracts;
DROP POLICY IF EXISTS "rent_contracts_delete_org" ON public.rent_contracts;

CREATE POLICY "rent_contracts_select_org" ON public.rent_contracts FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_contracts_insert_org" ON public.rent_contracts FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_contracts_update_org" ON public.rent_contracts FOR UPDATE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_contracts_delete_org" ON public.rent_contracts FOR DELETE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));


-- ============= 3) rent_payments =============
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.rent_payments rp
SET organization_id = rc.organization_id
FROM public.rent_contracts rc
WHERE rp.contract_id = rc.id AND rp.organization_id IS NULL;

DELETE FROM public.rent_payments WHERE organization_id IS NULL;

ALTER TABLE public.rent_payments ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rent_payments_org ON public.rent_payments(organization_id);

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rent_payments_select_org" ON public.rent_payments;
DROP POLICY IF EXISTS "rent_payments_insert_org" ON public.rent_payments;
DROP POLICY IF EXISTS "rent_payments_update_org" ON public.rent_payments;
DROP POLICY IF EXISTS "rent_payments_delete_org" ON public.rent_payments;

CREATE POLICY "rent_payments_select_org" ON public.rent_payments FOR SELECT
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_payments_insert_org" ON public.rent_payments FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_payments_update_org" ON public.rent_payments FOR UPDATE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "rent_payments_delete_org" ON public.rent_payments FOR DELETE
  USING (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), organization_id));


-- ============= 4) Trigger احتياطي: ملء organization_id تلقائياً =============
CREATE OR REPLACE FUNCTION public.auto_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT om.organization_id INTO NEW.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_org_monthly_salaries ON public.monthly_salaries;
CREATE TRIGGER trg_auto_org_monthly_salaries
  BEFORE INSERT ON public.monthly_salaries
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_organization_id();

DROP TRIGGER IF EXISTS trg_auto_org_rent_contracts ON public.rent_contracts;
CREATE TRIGGER trg_auto_org_rent_contracts
  BEFORE INSERT ON public.rent_contracts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_organization_id();

DROP TRIGGER IF EXISTS trg_auto_org_rent_payments ON public.rent_payments;
CREATE TRIGGER trg_auto_org_rent_payments
  BEFORE INSERT ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_organization_id();