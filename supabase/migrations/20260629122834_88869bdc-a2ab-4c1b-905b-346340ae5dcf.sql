
-- 1. Fix RLS USING(true) / overly-broad INSERT policies on log tables
DROP POLICY IF EXISTS "Insert api_logs" ON public.api_logs;
CREATE POLICY "Insert api_logs" ON public.api_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR organization_id = ANY (public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Insert error_logs" ON public.error_logs;
CREATE POLICY "Insert error_logs" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR organization_id = ANY (public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Insert performance_logs" ON public.performance_logs;
CREATE POLICY "Insert performance_logs" ON public.performance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NULL OR organization_id = ANY (public.get_user_org_ids(auth.uid())))
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 2. service_requests insert must be org-scoped
DROP POLICY IF EXISTS "Authenticated insert service_requests" ON public.service_requests;
CREATE POLICY "Authenticated insert service_requests" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (organization_id IS NULL OR public.user_belongs_to_org(auth.uid(), organization_id))
  );

-- 3. organizations UPDATE restricted to owner/admin (or platform admin)
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
CREATE POLICY "Owners and admins can update their organizations" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.get_user_org_role(auth.uid(), id) IN ('owner','admin'))
  WITH CHECK (public.get_user_org_role(auth.uid(), id) IN ('owner','admin'));

-- 4. whatsapp_settings SELECT restricted to owner/admin (hides access_token from agents)
DROP POLICY IF EXISTS "ws_select" ON public.whatsapp_settings;
CREATE POLICY "ws_select" ON public.whatsapp_settings
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL
      AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'))
    OR public.is_platform_admin(auth.uid())
  );

-- 5. Re-scope journal_entries / journal_entry_lines / chart_of_accounts policies from public -> authenticated
DROP POLICY IF EXISTS "jel_select" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "jel_insert" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "jel_update_draft" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "jel_delete_draft" ON public.journal_entry_lines;

CREATE POLICY "jel_select" ON public.journal_entry_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND (je.organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()))
  ));
CREATE POLICY "jel_insert" ON public.journal_entry_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.organization_id = ANY (public.get_user_org_ids(auth.uid()))
  ));
CREATE POLICY "jel_update_draft" ON public.journal_entry_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.organization_id = ANY (public.get_user_org_ids(auth.uid()))
      AND je.status = 'draft'
  ));
CREATE POLICY "jel_delete_draft" ON public.journal_entry_lines
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.organization_id = ANY (public.get_user_org_ids(auth.uid()))
      AND je.status = 'draft'
  ));

DROP POLICY IF EXISTS "je_select" ON public.journal_entries;
DROP POLICY IF EXISTS "je_insert" ON public.journal_entries;
DROP POLICY IF EXISTS "je_update_draft" ON public.journal_entries;
DROP POLICY IF EXISTS "je_delete_draft" ON public.journal_entries;

CREATE POLICY "je_select" ON public.journal_entries
  FOR SELECT TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "je_insert" ON public.journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = ANY (public.get_user_org_ids(auth.uid())));
CREATE POLICY "je_update_draft" ON public.journal_entries
  FOR UPDATE TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) AND status = 'draft');
CREATE POLICY "je_delete_draft" ON public.journal_entries
  FOR DELETE TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) AND status = 'draft');

DROP POLICY IF EXISTS "coa_select" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_insert" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_update" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_delete" ON public.chart_of_accounts;

CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "coa_insert" ON public.chart_of_accounts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = ANY (public.get_user_org_ids(auth.uid())));
CREATE POLICY "coa_update" ON public.chart_of_accounts
  FOR UPDATE TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())));
CREATE POLICY "coa_delete" ON public.chart_of_accounts
  FOR DELETE TO authenticated
  USING (organization_id = ANY (public.get_user_org_ids(auth.uid())) AND is_system = false);

-- 6. Revoke EXECUTE from authenticated/anon/public for SECURITY DEFINER internal helpers
--    (kept invocable via SECURITY DEFINER from triggers and other server-side functions)
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'post_journal_entry(uuid,date,text,text,uuid,jsonb)',
    'post_journal_entry(uuid,date,text,text,uuid,jsonb,text)',
    'booking_make_journal(public.bookings)',
    'seed_default_chart_of_accounts(uuid)',
    'generate_booking_number()',
    'generate_invoice_number()',
    'generate_quote_number()',
    'generate_journal_entry_number(uuid)',
    'get_account_id_by_code(uuid,text)',
    'ensure_employee_for_user(uuid,uuid)',
    'update_system_setting(text,text)'
  ]) LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
