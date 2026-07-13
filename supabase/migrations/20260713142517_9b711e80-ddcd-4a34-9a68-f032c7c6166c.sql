
-- 1. Revoke EXECUTE from anon/public on SECURITY DEFINER helper/trigger functions in public schema
REVOKE EXECUTE ON FUNCTION public._next_entry_number(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._resolve_account(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._trg_post_expense() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._trg_post_invoice() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._trg_post_supplier_payment() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_whatsapp_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_customer_autolink_wa_conversations() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_wa_conversation_autolink_customer() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_wa_normalize_phone() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_activity() FROM anon, public;

-- 2. can_org_write: split concerns for clarity — subscription check kept but isolated,
--    and enforce it explicitly rather than blended. Also document intent.
CREATE OR REPLACE FUNCTION public.org_has_active_subscription(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.organization_id = _org_id
      AND s.status IN ('active','trialing')
      AND (s.expires_at IS NULL
        OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.org_has_active_subscription(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.org_has_active_subscription(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_org_write(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Write access requires BOTH org membership AND active subscription.
  -- Platform admins bypass both checks.
  SELECT public.is_platform_admin(auth.uid())
    OR (
      public.user_belongs_to_org(auth.uid(), _org_id)
      AND public.org_has_active_subscription(_org_id)
    );
$$;
COMMENT ON FUNCTION public.can_org_write(uuid) IS
  'Authorization gate for org write ops. Membership is authoritative for auth; subscription enforces business gate. Reads are NOT gated by this function.';

-- 3. profiles_select_org_admins: tighten scoping — require target profile to
--    actually belong to at least one shared, active organization with caller
--    where caller has admin role. Existing join already enforces this per-org,
--    but rewrite defensively with an explicit organization_id equality.
DROP POLICY IF EXISTS profiles_select_org_admins ON public.profiles;
CREATE POLICY profiles_select_org_admins ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om_self
    JOIN public.organization_members om_target
      ON om_target.organization_id = om_self.organization_id
    WHERE om_self.user_id = auth.uid()
      AND om_self.is_active = true
      AND om_self.role IN ('owner','admin','manager')
      AND om_target.user_id = profiles.id
      AND om_target.is_active = true
      AND om_target.organization_id = om_self.organization_id
  )
);

-- 4. quick_replies: allow org owners/admins/managers to manage entries created by their org members
DROP POLICY IF EXISTS quick_replies_update_admin ON public.quick_replies;
CREATE POLICY quick_replies_update_admin ON public.quick_replies
FOR UPDATE TO authenticated
USING (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = quick_replies.organization_id
      AND om.is_active = true
      AND om.role IN ('owner','admin','manager')
  )
)
WITH CHECK (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
);

DROP POLICY IF EXISTS quick_replies_delete_admin ON public.quick_replies;
CREATE POLICY quick_replies_delete_admin ON public.quick_replies
FOR DELETE TO authenticated
USING (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = quick_replies.organization_id
      AND om.is_active = true
      AND om.role IN ('owner','admin','manager')
  )
);

DROP POLICY IF EXISTS quick_replies_select_admin ON public.quick_replies;
CREATE POLICY quick_replies_select_admin ON public.quick_replies
FOR SELECT TO authenticated
USING (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = quick_replies.organization_id
      AND om.is_active = true
      AND om.role IN ('owner','admin','manager')
  )
);

-- 5. Storage hotel-imports policies: restrict role to authenticated
DROP POLICY IF EXISTS "Platform admins can read hotel imports" ON storage.objects;
DROP POLICY IF EXISTS "Platform admins can upload hotel imports" ON storage.objects;
DROP POLICY IF EXISTS "Platform admins can delete hotel imports" ON storage.objects;

CREATE POLICY "Platform admins can read hotel imports" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can upload hotel imports" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete hotel imports" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'hotel-imports' AND public.is_platform_admin(auth.uid()));
