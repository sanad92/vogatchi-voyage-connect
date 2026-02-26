
-- Function: check if org subscription allows writes, platform admins bypass
CREATE OR REPLACE FUNCTION public.can_org_write(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.organization_id = _org_id
        AND s.status IN ('active', 'trialing')
        AND (s.expires_at IS NULL OR s.expires_at > now())
    );
$$;

-- 1. hotel_bookings
CREATE POLICY "sub_write_hotel_bookings" ON public.hotel_bookings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_hotel_bookings" ON public.hotel_bookings AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 2. flight_bookings
CREATE POLICY "sub_write_flight_bookings" ON public.flight_bookings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_flight_bookings" ON public.flight_bookings AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 3. car_rentals
CREATE POLICY "sub_write_car_rentals" ON public.car_rentals AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_car_rentals" ON public.car_rentals AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 4. transport_bookings
CREATE POLICY "sub_write_transport_bookings" ON public.transport_bookings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_transport_bookings" ON public.transport_bookings AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 5. customers
CREATE POLICY "sub_write_customers" ON public.customers AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customers" ON public.customers AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 6. customer_communications
CREATE POLICY "sub_write_customer_communications" ON public.customer_communications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customer_communications" ON public.customer_communications AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 7. customer_follow_ups
CREATE POLICY "sub_write_customer_follow_ups" ON public.customer_follow_ups AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customer_follow_ups" ON public.customer_follow_ups AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 8. customer_notes
CREATE POLICY "sub_write_customer_notes" ON public.customer_notes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customer_notes" ON public.customer_notes AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 9. customer_satisfaction
CREATE POLICY "sub_write_customer_satisfaction" ON public.customer_satisfaction AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customer_satisfaction" ON public.customer_satisfaction AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 10. invoices
CREATE POLICY "sub_write_invoices" ON public.invoices AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_invoices" ON public.invoices AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 11. employees
CREATE POLICY "sub_write_employees" ON public.employees AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_employees" ON public.employees AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 12. employee_commissions
CREATE POLICY "sub_write_employee_commissions" ON public.employee_commissions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_employee_commissions" ON public.employee_commissions AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 13. employee_commission_periods
CREATE POLICY "sub_write_employee_commission_periods" ON public.employee_commission_periods AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_employee_commission_periods" ON public.employee_commission_periods AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 14. commission_payments
CREATE POLICY "sub_write_commission_payments" ON public.commission_payments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_commission_payments" ON public.commission_payments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 15. expense_transactions
CREATE POLICY "sub_write_expense_transactions" ON public.expense_transactions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_expense_transactions" ON public.expense_transactions AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 16. expense_categories
CREATE POLICY "sub_write_expense_categories" ON public.expense_categories AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_expense_categories" ON public.expense_categories AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 17. bank_accounts
CREATE POLICY "sub_write_bank_accounts" ON public.bank_accounts AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_bank_accounts" ON public.bank_accounts AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 18. bank_account_transactions
CREATE POLICY "sub_write_bank_account_transactions" ON public.bank_account_transactions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_bank_account_transactions" ON public.bank_account_transactions AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 19. booking_special_requests
CREATE POLICY "sub_write_booking_special_requests" ON public.booking_special_requests AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_booking_special_requests" ON public.booking_special_requests AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 20. booking_status_history
CREATE POLICY "sub_write_booking_status_history" ON public.booking_status_history AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_booking_status_history" ON public.booking_status_history AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 21. airlines
CREATE POLICY "sub_write_airlines" ON public.airlines AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_airlines" ON public.airlines AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 22. airports
CREATE POLICY "sub_write_airports" ON public.airports AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_airports" ON public.airports AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 23. suppliers
CREATE POLICY "sub_write_suppliers" ON public.suppliers AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_suppliers" ON public.suppliers AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 24. destinations
CREATE POLICY "sub_write_destinations" ON public.destinations AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_destinations" ON public.destinations AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 25. campaign_sends
CREATE POLICY "sub_write_campaign_sends" ON public.campaign_sends AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_campaign_sends" ON public.campaign_sends AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 26. marketing_campaigns
CREATE POLICY "sub_write_marketing_campaigns" ON public.marketing_campaigns AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_marketing_campaigns" ON public.marketing_campaigns AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 27. exchange_rates
CREATE POLICY "sub_write_exchange_rates" ON public.exchange_rates AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_exchange_rates" ON public.exchange_rates AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 28. admin_audit_log (INSERT only)
CREATE POLICY "sub_write_admin_audit_log" ON public.admin_audit_log AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
-- 29. content_blocks
CREATE POLICY "sub_write_content_blocks" ON public.content_blocks AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_content_blocks" ON public.content_blocks AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 30. forms
CREATE POLICY "sub_write_forms" ON public.forms AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_forms" ON public.forms AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 31. form_fields
CREATE POLICY "sub_write_form_fields" ON public.form_fields AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_form_fields" ON public.form_fields AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 32. form_submissions
CREATE POLICY "sub_write_form_submissions" ON public.form_submissions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_form_submissions" ON public.form_submissions AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 33. blocks
CREATE POLICY "sub_write_blocks" ON public.blocks AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_blocks" ON public.blocks AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 34. customer_segments
CREATE POLICY "sub_write_customer_segments" ON public.customer_segments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_customer_segments" ON public.customer_segments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 35. flight_classes
CREATE POLICY "sub_write_flight_classes" ON public.flight_classes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_flight_classes" ON public.flight_classes AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
-- 36. backup_logs
CREATE POLICY "sub_write_backup_logs" ON public.backup_logs AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "sub_update_backup_logs" ON public.backup_logs AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_org_write(organization_id));
