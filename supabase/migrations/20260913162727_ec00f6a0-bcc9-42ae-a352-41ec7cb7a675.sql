-- 1. Revoke public/anon EXECUTE on SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public._trg_post_customer_payment() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._trg_post_invoice_legacy_receipt() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_campaign_segment_organization() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_campaign_send_organization() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_child_organization() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_segment_organization() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_booking_refresh_customer_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_customer_phone() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_customer_last_follow_up() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_organization_subscription_snapshot() FROM PUBLIC, anon;

-- 2. event_subscriptions: platform admins only
DROP POLICY IF EXISTS "authenticated read subscriptions" ON public.event_subscriptions;
CREATE POLICY "platform admins read subscriptions"
ON public.event_subscriptions
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- 3. organization_permission_overrides: self or owner/admin/manager
DROP POLICY IF EXISTS organization_permission_overrides_read ON public.organization_permission_overrides;
CREATE POLICY organization_permission_overrides_read
ON public.organization_permission_overrides
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role, 'manager'::org_role])
  OR public.is_platform_admin(auth.uid())
);