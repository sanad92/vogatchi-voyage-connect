-- 1. documents: apply confidentiality restriction to UPDATE (and DELETE for consistency of the flag)
DROP POLICY IF EXISTS "documents org members update" ON public.documents;
CREATE POLICY "documents org members update"
ON public.documents FOR UPDATE TO authenticated
USING (
  is_platform_admin(auth.uid()) OR (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = documents.organization_id AND m.user_id = auth.uid())
    AND (
      COALESCE(is_confidential, false) = false
      OR uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.organization_id = documents.organization_id
          AND om.is_active = true AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
      )
    )
  )
)
WITH CHECK (
  is_platform_admin(auth.uid()) OR (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = documents.organization_id AND m.user_id = auth.uid())
    AND (
      COALESCE(is_confidential, false) = false
      OR uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.organization_id = documents.organization_id
          AND om.is_active = true AND om.role = ANY (ARRAY['owner'::org_role,'admin'::org_role,'manager'::org_role])
      )
    )
  )
);

-- 2. email tables: scope policies explicitly to service_role grantee
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role manages suppressed emails"
ON public.suppressed_emails FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
GRANT ALL ON public.suppressed_emails TO service_role;

DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role manages send log"
ON public.email_send_log FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
GRANT ALL ON public.email_send_log TO service_role;

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role manages unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

-- 3. monthly_salaries: add direct organization_id validation
DROP POLICY IF EXISTS "Org members can view salaries" ON public.monthly_salaries;
DROP POLICY IF EXISTS "Org members can insert salaries" ON public.monthly_salaries;
DROP POLICY IF EXISTS "Org members can update salaries" ON public.monthly_salaries;
DROP POLICY IF EXISTS "Org members can delete salaries" ON public.monthly_salaries;

CREATE POLICY "Org members can view salaries"
ON public.monthly_salaries FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())) AND employee_org_match(employee_id));

CREATE POLICY "Org members can insert salaries"
ON public.monthly_salaries FOR INSERT TO authenticated
WITH CHECK (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())) AND employee_org_match(employee_id));

CREATE POLICY "Org members can update salaries"
ON public.monthly_salaries FOR UPDATE TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())) AND employee_org_match(employee_id))
WITH CHECK (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())) AND employee_org_match(employee_id));

CREATE POLICY "Org members can delete salaries"
ON public.monthly_salaries FOR DELETE TO authenticated
USING (organization_id IS NOT NULL AND organization_id = ANY (get_user_org_ids(auth.uid())) AND employee_org_match(employee_id));

-- 4. supplier_payments: restrictive subscription gate on writes
DROP POLICY IF EXISTS "supplier_payments_write_requires_subscription" ON public.supplier_payments;
CREATE POLICY "supplier_payments_write_requires_subscription"
ON public.supplier_payments AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (can_org_write(organization_id));

DROP POLICY IF EXISTS "supplier_payments_update_requires_subscription" ON public.supplier_payments;
CREATE POLICY "supplier_payments_update_requires_subscription"
ON public.supplier_payments AS RESTRICTIVE FOR UPDATE TO authenticated
USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

DROP POLICY IF EXISTS "supplier_payments_delete_requires_subscription" ON public.supplier_payments;
CREATE POLICY "supplier_payments_delete_requires_subscription"
ON public.supplier_payments AS RESTRICTIVE FOR DELETE TO authenticated
USING (can_org_write(organization_id));