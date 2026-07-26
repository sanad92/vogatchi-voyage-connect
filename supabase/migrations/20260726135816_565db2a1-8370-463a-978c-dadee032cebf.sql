
-- 1. Revoke EXECUTE from anon/public on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.trg_emit_refund() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_booking() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_timeline_append(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_run_booking_automation(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_run_booking_automation() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_customer_payment_to_journal() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.audit_tag_impersonation() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_ai_summary_refresh(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_invoice() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_enqueue_email(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_notify_in_app(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_finance_post(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_enqueue_whatsapp_suggestion(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_customer_payment() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_supplier_po() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_enrich_domain_event() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_supplier_payment() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_voucher() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handler_audit_write(p_event domain_events) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_emit_quote() FROM anon, public;

-- 2. Invitations: scope self-read to authenticated
DROP POLICY IF EXISTS "Users can read their own invitations" ON public.invitations;
CREATE POLICY "Users can read their own invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text
    AND accepted_at IS NULL
    AND status = 'pending'
    AND expires_at > now()
  );

-- 3. Notifications: prevent org members spoofing notifications for other users
DROP POLICY IF EXISTS "Org members can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications in their org"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT unnest(get_user_org_ids(auth.uid())))
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = notifications.organization_id
          AND om.is_active = true
          AND om.role IN ('owner','admin','manager')
      )
    )
  );

-- 4. Profiles: scope self policies to authenticated
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
CREATE POLICY "Allow insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 5. transport_routes admin policies -> authenticated
DROP POLICY IF EXISTS transport_routes_admin_delete ON public.transport_routes;
CREATE POLICY transport_routes_admin_delete ON public.transport_routes
  FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS transport_routes_admin_insert ON public.transport_routes;
CREATE POLICY transport_routes_admin_insert ON public.transport_routes
  FOR INSERT TO authenticated WITH CHECK (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS transport_routes_admin_update ON public.transport_routes;
CREATE POLICY transport_routes_admin_update ON public.transport_routes
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()));

-- 6. vehicle_types + special_request_types admin policies -> authenticated
DROP POLICY IF EXISTS vehicle_types_admin_delete ON public.vehicle_types;
CREATE POLICY vehicle_types_admin_delete ON public.vehicle_types
  FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS vehicle_types_admin_insert ON public.vehicle_types;
CREATE POLICY vehicle_types_admin_insert ON public.vehicle_types
  FOR INSERT TO authenticated WITH CHECK (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS vehicle_types_admin_update ON public.vehicle_types;
CREATE POLICY vehicle_types_admin_update ON public.vehicle_types
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS special_request_types_admin_delete ON public.special_request_types;
CREATE POLICY special_request_types_admin_delete ON public.special_request_types
  FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS special_request_types_admin_insert ON public.special_request_types;
CREATE POLICY special_request_types_admin_insert ON public.special_request_types
  FOR INSERT TO authenticated WITH CHECK (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS special_request_types_admin_update ON public.special_request_types;
CREATE POLICY special_request_types_admin_update ON public.special_request_types
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()));
