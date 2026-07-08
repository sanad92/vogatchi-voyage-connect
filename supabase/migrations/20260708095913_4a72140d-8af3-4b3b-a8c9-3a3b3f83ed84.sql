
-- 1) Recreate {public}-scoped policies as {authenticated}
DROP POLICY IF EXISTS periods_insert ON public.accounting_periods;
DROP POLICY IF EXISTS periods_select ON public.accounting_periods;
DROP POLICY IF EXISTS periods_update ON public.accounting_periods;
CREATE POLICY periods_select ON public.accounting_periods FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY periods_insert ON public.accounting_periods FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY periods_update ON public.accounting_periods FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

DROP POLICY IF EXISTS usage_select_org ON public.allotment_usage;
DROP POLICY IF EXISTS usage_insert_org ON public.allotment_usage;
DROP POLICY IF EXISTS usage_delete_org ON public.allotment_usage;
CREATE POLICY usage_select_org ON public.allotment_usage FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY usage_insert_org ON public.allotment_usage FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY usage_delete_org ON public.allotment_usage FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS cost_centers_select ON public.cost_centers;
DROP POLICY IF EXISTS cost_centers_insert ON public.cost_centers;
DROP POLICY IF EXISTS cost_centers_update ON public.cost_centers;
DROP POLICY IF EXISTS cost_centers_delete ON public.cost_centers;
CREATE POLICY cost_centers_select ON public.cost_centers FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY cost_centers_insert ON public.cost_centers FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY cost_centers_update ON public.cost_centers FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY cost_centers_delete ON public.cost_centers FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS salaries_select_org ON public.monthly_salaries;
DROP POLICY IF EXISTS salaries_insert_org ON public.monthly_salaries;
DROP POLICY IF EXISTS salaries_update_org ON public.monthly_salaries;
DROP POLICY IF EXISTS salaries_delete_org ON public.monthly_salaries;

DROP POLICY IF EXISTS pages_select_org ON public.pages;
DROP POLICY IF EXISTS pages_insert_org ON public.pages;
DROP POLICY IF EXISTS pages_update_org ON public.pages;
DROP POLICY IF EXISTS pages_delete_org ON public.pages;
CREATE POLICY pages_select_org ON public.pages FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY pages_insert_org ON public.pages FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY pages_update_org ON public.pages FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY pages_delete_org ON public.pages FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS rent_contracts_select_org ON public.rent_contracts;
DROP POLICY IF EXISTS rent_contracts_insert_org ON public.rent_contracts;
DROP POLICY IF EXISTS rent_contracts_update_org ON public.rent_contracts;
DROP POLICY IF EXISTS rent_contracts_delete_org ON public.rent_contracts;
CREATE POLICY rent_contracts_select_org ON public.rent_contracts FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY rent_contracts_insert_org ON public.rent_contracts FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rent_contracts_update_org ON public.rent_contracts FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rent_contracts_delete_org ON public.rent_contracts FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS rent_payments_select_org ON public.rent_payments;
DROP POLICY IF EXISTS rent_payments_insert_org ON public.rent_payments;
DROP POLICY IF EXISTS rent_payments_update_org ON public.rent_payments;
DROP POLICY IF EXISTS rent_payments_delete_org ON public.rent_payments;
CREATE POLICY rent_payments_select_org ON public.rent_payments FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY rent_payments_insert_org ON public.rent_payments FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rent_payments_update_org ON public.rent_payments FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rent_payments_delete_org ON public.rent_payments FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS service_requests_select_org ON public.service_requests;
DROP POLICY IF EXISTS service_requests_update_org ON public.service_requests;
DROP POLICY IF EXISTS service_requests_delete_org ON public.service_requests;
CREATE POLICY service_requests_select_org ON public.service_requests FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY service_requests_update_org ON public.service_requests FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY service_requests_delete_org ON public.service_requests FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS allotments_select_org ON public.supplier_allotments;
DROP POLICY IF EXISTS allotments_insert_org ON public.supplier_allotments;
DROP POLICY IF EXISTS allotments_update_org ON public.supplier_allotments;
DROP POLICY IF EXISTS allotments_delete_org ON public.supplier_allotments;
CREATE POLICY allotments_select_org ON public.supplier_allotments FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY allotments_insert_org ON public.supplier_allotments FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY allotments_update_org ON public.supplier_allotments FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY allotments_delete_org ON public.supplier_allotments FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS rates_select_org ON public.supplier_rates;
DROP POLICY IF EXISTS rates_insert_org ON public.supplier_rates;
DROP POLICY IF EXISTS rates_update_org ON public.supplier_rates;
DROP POLICY IF EXISTS rates_delete_org ON public.supplier_rates;
CREATE POLICY rates_select_org ON public.supplier_rates FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY rates_insert_org ON public.supplier_rates FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rates_update_org ON public.supplier_rates FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY rates_delete_org ON public.supplier_rates FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS whatsapp_conversations_select_org ON public.whatsapp_conversations;
DROP POLICY IF EXISTS whatsapp_conversations_insert_org ON public.whatsapp_conversations;
DROP POLICY IF EXISTS whatsapp_conversations_update_org ON public.whatsapp_conversations;
DROP POLICY IF EXISTS whatsapp_conversations_delete_org ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_select_org ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY whatsapp_conversations_insert_org ON public.whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY whatsapp_conversations_update_org ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY whatsapp_conversations_delete_org ON public.whatsapp_conversations FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS whatsapp_messages_select_org ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_insert_org ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_update_org ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_delete_org ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select_org ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY whatsapp_messages_insert_org ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY whatsapp_messages_update_org ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY whatsapp_messages_delete_org ON public.whatsapp_messages FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS zatca_select ON public.zatca_invoice_data;
DROP POLICY IF EXISTS zatca_insert ON public.zatca_invoice_data;
DROP POLICY IF EXISTS zatca_update ON public.zatca_invoice_data;
CREATE POLICY zatca_select ON public.zatca_invoice_data FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY zatca_insert ON public.zatca_invoice_data FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY zatca_update ON public.zatca_invoice_data FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));

DROP POLICY IF EXISTS "Org members can manage transport_bookings" ON public.transport_bookings;
CREATE POLICY tb_select_org ON public.transport_bookings FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY tb_delete_org ON public.transport_bookings FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

-- 2) Prevent self-owner escalation on organization_members
DROP POLICY IF EXISTS om_insert_owner_or_first ON public.organization_members;
CREATE POLICY om_insert_owner_or_first ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_org_role(auth.uid(), organization_id) = ANY(ARRAY['owner'::org_role,'admin'::org_role])
    OR public.is_platform_admin(auth.uid())
  );

-- 3) Add subscription write-gating on remaining tables
DROP POLICY IF EXISTS "Org members can manage invoice_items" ON public.invoice_items;
CREATE POLICY invoice_items_select ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND (i.organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()))));
CREATE POLICY invoice_items_write ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND public.can_org_write(i.organization_id)));
CREATE POLICY invoice_items_update ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND public.can_org_write(i.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND public.can_org_write(i.organization_id)));
CREATE POLICY invoice_items_delete ON public.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND public.can_org_write(i.organization_id)));

DROP POLICY IF EXISTS "Org members can manage loyalty_points" ON public.loyalty_points;
CREATE POLICY loyalty_points_select ON public.loyalty_points FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY loyalty_points_write ON public.loyalty_points FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY loyalty_points_update ON public.loyalty_points FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY loyalty_points_delete ON public.loyalty_points FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS "Org members can manage loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY loyalty_rewards_select ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY loyalty_rewards_write ON public.loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY loyalty_rewards_update ON public.loyalty_rewards FOR UPDATE TO authenticated
  USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY loyalty_rewards_delete ON public.loyalty_rewards FOR DELETE TO authenticated
  USING (public.can_org_write(organization_id));

DROP POLICY IF EXISTS "Org members can manage hotel_suppliers" ON public.hotel_suppliers;
CREATE POLICY hotel_suppliers_select ON public.hotel_suppliers FOR SELECT TO authenticated
  USING (organization_id IS NULL
    OR organization_id = ANY(public.get_user_org_ids(auth.uid()))
    OR public.is_platform_admin(auth.uid()));
CREATE POLICY hotel_suppliers_write ON public.hotel_suppliers FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND public.can_org_write(organization_id));
CREATE POLICY hotel_suppliers_update ON public.hotel_suppliers FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.can_org_write(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.can_org_write(organization_id));
CREATE POLICY hotel_suppliers_delete ON public.hotel_suppliers FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND public.can_org_write(organization_id));

-- 4) Revoke EXECUTE on public SECURITY DEFINER functions from anon/PUBLIC
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname, r.args);
  END LOOP;
END $$;
