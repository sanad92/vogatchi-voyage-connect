-- 1) Documents storage bucket
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view their org documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update their org documents" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete their org documents" ON storage.objects;

CREATE POLICY "Org members can view their org documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can upload to their org folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update their org documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can delete their org documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_org_ids(auth.uid()))
  AND public.get_user_org_role(auth.uid(), (storage.foldername(name))[1]::uuid) IN ('owner', 'admin'));

-- 2) whatsapp_templates: add org scoping
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org ON public.whatsapp_templates(organization_id);

DO $$ DECLARE pol record;
BEGIN FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='whatsapp_templates' AND schemaname='public' LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_templates', pol.policyname);
END LOOP; END $$;

CREATE POLICY "wa_templates_select" ON public.whatsapp_templates FOR SELECT TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "wa_templates_manage" ON public.whatsapp_templates FOR ALL TO authenticated
USING ((organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'))
  OR public.is_platform_admin(auth.uid()))
WITH CHECK ((organization_id = ANY(public.get_user_org_ids(auth.uid()))
  AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'))
  OR public.is_platform_admin(auth.uid()));

-- 3) email_queue
DO $$ DECLARE pol record;
BEGIN FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='email_queue' AND schemaname='public' LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_queue', pol.policyname);
END LOOP; END $$;

CREATE POLICY "eq_select" ON public.email_queue FOR SELECT TO authenticated
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "eq_insert" ON public.email_queue FOR INSERT TO authenticated
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "eq_service" ON public.email_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) organization_members
DO $$ DECLARE pol record;
BEGIN FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='organization_members' AND schemaname='public' LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_members', pol.policyname);
END LOOP; END $$;

CREATE POLICY "om_select_self_or_org" ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR organization_id = ANY(public.get_user_org_ids(auth.uid()))
  OR public.is_platform_admin(auth.uid()));

CREATE POLICY "om_insert_owner_or_first" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')
  OR (user_id = auth.uid() AND role = 'owner'
      AND NOT EXISTS (SELECT 1 FROM public.organization_members om
                      WHERE om.organization_id = organization_members.organization_id))
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "om_update_admin" ON public.organization_members FOR UPDATE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')
  OR public.is_platform_admin(auth.uid()));

CREATE POLICY "om_delete_owner" ON public.organization_members FOR DELETE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) = 'owner'
  OR public.is_platform_admin(auth.uid()));

-- 5) Harden can_org_write
CREATE OR REPLACE FUNCTION public.can_org_write(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin(auth.uid())
  OR (public.user_belongs_to_org(auth.uid(), _org_id)
      AND EXISTS (SELECT 1 FROM public.subscriptions s
        WHERE s.organization_id = _org_id
          AND s.status IN ('active','trialing')
          AND (s.expires_at IS NULL
            OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now())));
$$;

-- 6) whatsapp_settings: add org scoping
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_org ON public.whatsapp_settings(organization_id);

DO $$ DECLARE pol record;
BEGIN FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='whatsapp_settings' AND schemaname='public' LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_settings', pol.policyname);
END LOOP; END $$;

CREATE POLICY "ws_select" ON public.whatsapp_settings FOR SELECT TO authenticated
USING ((organization_id IS NOT NULL AND organization_id = ANY(public.get_user_org_ids(auth.uid())))
  OR public.is_platform_admin(auth.uid()));

CREATE POLICY "ws_manage" ON public.whatsapp_settings FOR ALL TO authenticated
USING ((organization_id IS NOT NULL
  AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  OR public.is_platform_admin(auth.uid()))
WITH CHECK ((organization_id IS NOT NULL
  AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
  OR public.is_platform_admin(auth.uid()));

CREATE POLICY "ws_service" ON public.whatsapp_settings FOR ALL TO service_role USING (true) WITH CHECK (true);