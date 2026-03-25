
-- ============================================================
-- PRIORITY 1: RLS SECURITY FIXES
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION public.employee_org_match(_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = _employee_id AND e.organization_id = ANY(public.get_user_org_ids(auth.uid()))) $$;

CREATE OR REPLACE FUNCTION public.supplier_org_match(_supplier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = _supplier_id AND s.organization_id = ANY(public.get_user_org_ids(auth.uid()))) $$;

CREATE OR REPLACE FUNCTION public.user_has_any_org()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true) $$;

-- 1. monthly_salaries
DROP POLICY IF EXISTS "Authenticated users can manage monthly_salaries" ON public.monthly_salaries;
CREATE POLICY "Org members can view salaries" ON public.monthly_salaries FOR SELECT TO authenticated USING (public.employee_org_match(employee_id));
CREATE POLICY "Org members can insert salaries" ON public.monthly_salaries FOR INSERT TO authenticated WITH CHECK (public.employee_org_match(employee_id));
CREATE POLICY "Org members can update salaries" ON public.monthly_salaries FOR UPDATE TO authenticated USING (public.employee_org_match(employee_id));
CREATE POLICY "Org members can delete salaries" ON public.monthly_salaries FOR DELETE TO authenticated USING (public.employee_org_match(employee_id));

-- 2. supplier_contracts
DROP POLICY IF EXISTS "Authenticated users can manage supplier_contracts" ON public.supplier_contracts;
CREATE POLICY "Org select supplier_contracts" ON public.supplier_contracts FOR SELECT TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org insert supplier_contracts" ON public.supplier_contracts FOR INSERT TO authenticated WITH CHECK (public.supplier_org_match(supplier_id));
CREATE POLICY "Org update supplier_contracts" ON public.supplier_contracts FOR UPDATE TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org delete supplier_contracts" ON public.supplier_contracts FOR DELETE TO authenticated USING (public.supplier_org_match(supplier_id));

-- 3. supplier_currencies
DROP POLICY IF EXISTS "Authenticated users can manage supplier_currencies" ON public.supplier_currencies;
CREATE POLICY "Org select supplier_currencies" ON public.supplier_currencies FOR SELECT TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org insert supplier_currencies" ON public.supplier_currencies FOR INSERT TO authenticated WITH CHECK (public.supplier_org_match(supplier_id));
CREATE POLICY "Org update supplier_currencies" ON public.supplier_currencies FOR UPDATE TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org delete supplier_currencies" ON public.supplier_currencies FOR DELETE TO authenticated USING (public.supplier_org_match(supplier_id));

-- 4. supplier_payments
DROP POLICY IF EXISTS "Authenticated users can manage supplier_payments" ON public.supplier_payments;
CREATE POLICY "Org select supplier_payments" ON public.supplier_payments FOR SELECT TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org insert supplier_payments" ON public.supplier_payments FOR INSERT TO authenticated WITH CHECK (public.supplier_org_match(supplier_id));
CREATE POLICY "Org update supplier_payments" ON public.supplier_payments FOR UPDATE TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org delete supplier_payments" ON public.supplier_payments FOR DELETE TO authenticated USING (public.supplier_org_match(supplier_id));

-- 5. supplier_ratings
DROP POLICY IF EXISTS "Authenticated users can manage supplier_ratings" ON public.supplier_ratings;
CREATE POLICY "Org select supplier_ratings" ON public.supplier_ratings FOR SELECT TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org insert supplier_ratings" ON public.supplier_ratings FOR INSERT TO authenticated WITH CHECK (public.supplier_org_match(supplier_id));
CREATE POLICY "Org update supplier_ratings" ON public.supplier_ratings FOR UPDATE TO authenticated USING (public.supplier_org_match(supplier_id));
CREATE POLICY "Org delete supplier_ratings" ON public.supplier_ratings FOR DELETE TO authenticated USING (public.supplier_org_match(supplier_id));

-- 6. notifications
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. media_library
DROP POLICY IF EXISTS "Authenticated users can manage media_library" ON public.media_library;
CREATE POLICY "Users view media" ON public.media_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upload media" ON public.media_library FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Users update own media" ON public.media_library FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());
CREATE POLICY "Users delete own media" ON public.media_library FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- 8. rent_contracts
DROP POLICY IF EXISTS "Authenticated users can manage rent_contracts" ON public.rent_contracts;
CREATE POLICY "Org view rent_contracts" ON public.rent_contracts FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org insert rent_contracts" ON public.rent_contracts FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Org update rent_contracts" ON public.rent_contracts FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete rent_contracts" ON public.rent_contracts FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 9. rent_payments
DROP POLICY IF EXISTS "Authenticated users can manage rent_payments" ON public.rent_payments;
CREATE POLICY "Org view rent_payments" ON public.rent_payments FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org insert rent_payments" ON public.rent_payments FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Org update rent_payments" ON public.rent_payments FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete rent_payments" ON public.rent_payments FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 10. quick_replies
DROP POLICY IF EXISTS "Authenticated users can manage quick_replies" ON public.quick_replies;
CREATE POLICY "Users view quick_replies" ON public.quick_replies FOR SELECT TO authenticated USING (created_by = auth.uid() OR is_global = true);
CREATE POLICY "Users insert quick_replies" ON public.quick_replies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update own quick_replies" ON public.quick_replies FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users delete own quick_replies" ON public.quick_replies FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 11. pages
DROP POLICY IF EXISTS "Authenticated users can manage pages" ON public.pages;
CREATE POLICY "Org view pages" ON public.pages FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org insert pages" ON public.pages FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Org update pages" ON public.pages FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete pages" ON public.pages FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 12. whatsapp_conversations
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_conversations" ON public.whatsapp_conversations;
CREATE POLICY "Org view whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org insert whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Org update whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete whatsapp_conversations" ON public.whatsapp_conversations FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 13. whatsapp_messages
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Org view whatsapp_messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org insert whatsapp_messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Org update whatsapp_messages" ON public.whatsapp_messages FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete whatsapp_messages" ON public.whatsapp_messages FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 14. service_requests (public form)
DROP POLICY IF EXISTS "Authenticated users can manage service_requests" ON public.service_requests;
CREATE POLICY "Anyone insert service_requests" ON public.service_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Org view service_requests" ON public.service_requests FOR SELECT TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org update service_requests" ON public.service_requests FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Org delete service_requests" ON public.service_requests FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 15. special_request_types (reference data)
DROP POLICY IF EXISTS "Authenticated users can manage special_request_types" ON public.special_request_types;
CREATE POLICY "Read special_request_types" ON public.special_request_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write special_request_types" ON public.special_request_types FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Update special_request_types" ON public.special_request_types FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Delete special_request_types" ON public.special_request_types FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 16. transport_routes (reference data)
DROP POLICY IF EXISTS "Authenticated users can manage transport_routes" ON public.transport_routes;
CREATE POLICY "Read transport_routes" ON public.transport_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write transport_routes" ON public.transport_routes FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Update transport_routes" ON public.transport_routes FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Delete transport_routes" ON public.transport_routes FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 17. vehicle_types (reference data)
DROP POLICY IF EXISTS "Authenticated users can manage vehicle_types" ON public.vehicle_types;
CREATE POLICY "Read vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write vehicle_types" ON public.vehicle_types FOR INSERT TO authenticated WITH CHECK (public.user_has_any_org());
CREATE POLICY "Update vehicle_types" ON public.vehicle_types FOR UPDATE TO authenticated USING (public.user_has_any_org());
CREATE POLICY "Delete vehicle_types" ON public.vehicle_types FOR DELETE TO authenticated USING (public.user_has_any_org());

-- 18. system_settings (platform admin only)
DROP POLICY IF EXISTS "Authenticated users can manage system_settings" ON public.system_settings;
CREATE POLICY "Admin manage system_settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "Read public settings" ON public.system_settings FOR SELECT TO authenticated USING (is_public = true);

-- 19. user_creation_requests (platform admin + own)
DROP POLICY IF EXISTS "Authenticated users can manage user_creation_requests" ON public.user_creation_requests;
CREATE POLICY "Admin manage user_creation_requests" ON public.user_creation_requests FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "Users insert creation requests" ON public.user_creation_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Users view own creation requests" ON public.user_creation_requests FOR SELECT TO authenticated USING (requested_by = auth.uid());

-- 20. Logging tables: org-based
DROP POLICY IF EXISTS "Service role full access api_logs" ON public.api_logs;
CREATE POLICY "Org view api_logs" ON public.api_logs FOR SELECT TO authenticated USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Insert api_logs" ON public.api_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access email_queue" ON public.email_queue;
CREATE POLICY "Org view email_queue" ON public.email_queue FOR SELECT TO authenticated USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Insert email_queue" ON public.email_queue FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated can insert error_logs" ON public.error_logs;
CREATE POLICY "Org view error_logs" ON public.error_logs FOR SELECT TO authenticated USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Insert error_logs" ON public.error_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access performance_logs" ON public.performance_logs;
DROP POLICY IF EXISTS "Authenticated can insert performance_logs" ON public.performance_logs;
CREATE POLICY "Org view performance_logs" ON public.performance_logs FOR SELECT TO authenticated USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Insert performance_logs" ON public.performance_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- PRIORITY 2: ACCOUNTING FIXES
-- ============================================================

-- Add booking linkage to expense_transactions
ALTER TABLE public.expense_transactions ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.expense_transactions ADD COLUMN IF NOT EXISTS booking_type text;

-- Bank balance auto-update trigger
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'credit', 'income') THEN v_delta := NEW.amount; ELSE v_delta := -NEW.amount; END IF;
    UPDATE public.bank_accounts SET current_balance = COALESCE(current_balance, 0) + v_delta, updated_at = now() WHERE id = NEW.bank_account_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.transaction_type IN ('deposit', 'credit', 'income') THEN v_delta := -OLD.amount; ELSE v_delta := OLD.amount; END IF;
    UPDATE public.bank_accounts SET current_balance = COALESCE(current_balance, 0) + v_delta, updated_at = now() WHERE id = OLD.bank_account_id;
    IF NEW.transaction_type IN ('deposit', 'credit', 'income') THEN v_delta := NEW.amount; ELSE v_delta := -NEW.amount; END IF;
    UPDATE public.bank_accounts SET current_balance = COALESCE(current_balance, 0) + v_delta, updated_at = now() WHERE id = NEW.bank_account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('deposit', 'credit', 'income') THEN v_delta := -OLD.amount; ELSE v_delta := OLD.amount; END IF;
    UPDATE public.bank_accounts SET current_balance = COALESCE(current_balance, 0) + v_delta, updated_at = now() WHERE id = OLD.bank_account_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_bank_balance_update
AFTER INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction();
