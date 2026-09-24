-- Tighten reference-catalog read policies: only active organization staff may read them.
DROP POLICY IF EXISTS "auth read workflow stages" ON public.workflow_stages;
CREATE POLICY "workflow_stages_select_staff" ON public.workflow_stages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
  ) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "auth read workflow defs" ON public.workflow_definitions;
CREATE POLICY "workflow_definitions_select_staff" ON public.workflow_definitions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
  ) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "organization_permission_catalog_read" ON public.organization_permission_catalog;
CREATE POLICY "organization_permission_catalog_select_staff" ON public.organization_permission_catalog
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
  ) OR public.is_platform_admin(auth.uid()));