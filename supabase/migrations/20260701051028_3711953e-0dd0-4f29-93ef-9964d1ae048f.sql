
-- 1) invitations
DROP POLICY IF EXISTS "Org members can manage invitations" ON public.invitations;
CREATE POLICY "Org members can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

-- 2) supplier_payments
ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.supplier_payments sp
SET organization_id = s.organization_id
FROM public.suppliers s
WHERE sp.supplier_id = s.id AND sp.organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_supplier_payment_org_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.supplier_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_supplier_payment_org_id ON public.supplier_payments;
CREATE TRIGGER trg_set_supplier_payment_org_id
BEFORE INSERT OR UPDATE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.set_supplier_payment_org_id();

CREATE INDEX IF NOT EXISTS idx_supplier_payments_org_id ON public.supplier_payments(organization_id);

DROP POLICY IF EXISTS "Org delete supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org insert supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org select supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Org update supplier_payments" ON public.supplier_payments;

CREATE POLICY "Org select supplier_payments" ON public.supplier_payments FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Org insert supplier_payments" ON public.supplier_payments FOR INSERT TO authenticated
WITH CHECK (
  (organization_id IS NULL OR organization_id = ANY (get_user_org_ids(auth.uid())))
  AND (supplier_id IS NULL OR supplier_org_match(supplier_id))
);

CREATE POLICY "Org update supplier_payments" ON public.supplier_payments FOR UPDATE TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())))
WITH CHECK (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Org delete supplier_payments" ON public.supplier_payments FOR DELETE TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())));

-- 3) whatsapp_settings token exposure
REVOKE SELECT (access_token, webhook_verify_token) ON public.whatsapp_settings FROM authenticated;

-- 4) internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.count_org_bookings_this_month(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.count_org_members(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_org_plan_limits(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_expired(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_in_grace_period(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.check_subscription_active(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_zatca_qr(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.create_manual_journal_entry(uuid, date, text, jsonb) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_account_balance(uuid, date, date) FROM authenticated, anon, public;
