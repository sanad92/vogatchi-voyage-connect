-- Campaign delivery records belong to both a campaign and a customer in one
-- organization. Enforce that relationship in the database and replace the
-- legacy member-wide policy with role-specific access.

CREATE OR REPLACE FUNCTION public.enforce_campaign_send_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign_org uuid;
  customer_org uuid;
BEGIN
  IF NEW.campaign_id IS NULL OR NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'يجب تحديد الحملة والعميل';
  END IF;

  SELECT organization_id INTO campaign_org
  FROM public.marketing_campaigns
  WHERE id = NEW.campaign_id;

  SELECT organization_id INTO customer_org
  FROM public.customers
  WHERE id = NEW.customer_id;

  IF campaign_org IS NULL THEN RAISE EXCEPTION 'الحملة غير موجودة'; END IF;
  IF customer_org IS NULL THEN RAISE EXCEPTION 'العميل غير موجود'; END IF;
  IF campaign_org <> customer_org THEN
    RAISE EXCEPTION 'الحملة والعميل لا ينتميان إلى نفس المؤسسة';
  END IF;

  IF NEW.organization_id IS NULL THEN NEW.organization_id := campaign_org; END IF;
  IF NEW.organization_id <> campaign_org THEN
    RAISE EXCEPTION 'سجل الإرسال لا ينتمي إلى المؤسسة المحددة';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.campaign_sends AS send
SET organization_id = campaign.organization_id
FROM public.marketing_campaigns AS campaign
WHERE send.campaign_id = campaign.id
  AND send.organization_id IS NULL;

DROP TRIGGER IF EXISTS enforce_campaign_send_organization_trigger ON public.campaign_sends;
CREATE TRIGGER enforce_campaign_send_organization_trigger
BEFORE INSERT OR UPDATE OF campaign_id, customer_id, organization_id ON public.campaign_sends
FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_send_organization();

ALTER TABLE public.campaign_sends
  ALTER COLUMN campaign_id SET NOT NULL,
  ALTER COLUMN customer_id SET NOT NULL,
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'sent',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.campaign_sends DROP CONSTRAINT IF EXISTS campaign_sends_status_valid;
ALTER TABLE public.campaign_sends ADD CONSTRAINT campaign_sends_status_valid
  CHECK (status IN ('sent','delivered','read','failed')) NOT VALID;

DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_sends'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.campaign_sends', policy_record.policyname);
  END LOOP;
END;
$$;

CREATE POLICY campaign_sends_select_by_permission ON public.campaign_sends FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id, 'crm_view'));
CREATE POLICY campaign_sends_insert_by_permission ON public.campaign_sends FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));
CREATE POLICY campaign_sends_update_by_permission ON public.campaign_sends FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));
CREATE POLICY campaign_sends_delete_by_permission ON public.campaign_sends FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id) AND public.has_org_permission(organization_id, 'crm_campaigns'));

REVOKE ALL ON public.campaign_sends FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_sends TO authenticated;

CREATE INDEX IF NOT EXISTS campaign_sends_org_created_idx
  ON public.campaign_sends (organization_id, created_at DESC);
