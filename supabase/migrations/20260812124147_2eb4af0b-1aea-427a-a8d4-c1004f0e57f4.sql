-- 1) Revoke anon/public EXECUTE on SECURITY DEFINER trigger functions
REVOKE ALL ON FUNCTION public.sop_trg_event_history() FROM anon, public;
REVOKE ALL ON FUNCTION public.sop_trg_lead_history() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_trg_event_history() TO service_role;
GRANT EXECUTE ON FUNCTION public.sop_trg_lead_history() TO service_role;

-- 2) documents: confidential docs restricted to elevated roles / uploader
DROP POLICY IF EXISTS "documents org members read" ON public.documents;
CREATE POLICY "documents org members read"
ON public.documents
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = documents.organization_id
        AND m.user_id = auth.uid()
    )
    AND (
      COALESCE(documents.is_confidential, false) = false
      OR documents.uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = documents.organization_id
          AND om.is_active = true
          AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
      )
    )
  )
);

-- 3) employees: restrictive DELETE requires active subscription
DROP POLICY IF EXISTS sub_delete_employees ON public.employees;
CREATE POLICY sub_delete_employees
ON public.employees
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.can_org_write(organization_id));

-- 4) notifications: admin insert must target an active member of the same org
DROP POLICY IF EXISTS "Admins can insert notifications in their org" ON public.notifications;
CREATE POLICY "Admins can insert notifications in their org"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = notifications.organization_id
          AND om.is_active = true
          AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
      )
      AND EXISTS (
        SELECT 1 FROM public.organization_members target
        WHERE target.user_id = notifications.user_id
          AND target.organization_id = notifications.organization_id
          AND target.is_active = true
      )
    )
  )
);