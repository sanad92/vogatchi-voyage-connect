-- 1. admin_audit_log: restrict reads to admins, keep inserts for members, keep immutability
DROP POLICY IF EXISTS "Org members can manage admin_audit_log" ON public.admin_audit_log;

CREATE POLICY "admin_audit_log_select_admins"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (
  organization_id = ANY (get_user_org_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = admin_audit_log.organization_id
      AND om.is_active = true
      AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
  )
);

CREATE POLICY "admin_audit_log_insert_members"
ON public.admin_audit_log FOR INSERT TO authenticated
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

-- 2. Add WITH CHECK to UPDATE policies to prevent cross-org reassignment
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update"
ON public.bookings FOR UPDATE TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "coa_update" ON public.chart_of_accounts;
CREATE POLICY "coa_update"
ON public.chart_of_accounts FOR UPDATE TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())))
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "je_update_draft" ON public.journal_entries;
CREATE POLICY "je_update_draft"
ON public.journal_entries FOR UPDATE TO authenticated
USING (organization_id = ANY (get_user_org_ids(auth.uid())) AND status = 'draft')
WITH CHECK (organization_id = ANY (get_user_org_ids(auth.uid())) AND status = 'draft');

-- 3. media_library: add organization scoping
ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS organization_id uuid;

DROP POLICY IF EXISTS "Users view own media" ON public.media_library;
DROP POLICY IF EXISTS "Users upload media" ON public.media_library;
DROP POLICY IF EXISTS "Users update own media" ON public.media_library;
DROP POLICY IF EXISTS "Users delete own media" ON public.media_library;

CREATE POLICY "media_library_select_org"
ON public.media_library FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())))
);

CREATE POLICY "media_library_insert_org"
ON public.media_library FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (organization_id IS NULL OR organization_id = ANY (get_user_org_ids(auth.uid())))
);

CREATE POLICY "media_library_update_owner"
ON public.media_library FOR UPDATE TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (
  uploaded_by = auth.uid()
  AND (organization_id IS NULL OR organization_id = ANY (get_user_org_ids(auth.uid())))
);

CREATE POLICY "media_library_delete_owner"
ON public.media_library FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = media_library.organization_id
        AND om.is_active = true
        AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role])
    )
  )
);

-- 4. quick_replies: consolidate overlapping SELECT policies into one
DROP POLICY IF EXISTS "quick_replies_select_org" ON public.quick_replies;
DROP POLICY IF EXISTS "quick_replies_select_admin" ON public.quick_replies;

CREATE POLICY "quick_replies_select"
ON public.quick_replies FOR SELECT TO authenticated
USING (
  organization_id = ANY (get_user_org_ids(auth.uid()))
  AND (
    created_by = auth.uid()
    OR is_global = true
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = quick_replies.organization_id
        AND om.is_active = true
        AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
    )
  )
);