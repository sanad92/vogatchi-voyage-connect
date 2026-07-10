
-- 1) Fix mutable search_path on tg_touch_updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) enforce_period_lock is a trigger function; revoke public/anon execute
REVOKE EXECUTE ON FUNCTION public.enforce_period_lock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_period_lock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_period_lock() FROM authenticated;

-- 3) Tighten platform admin checks (only admin/owner roles grant access)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin'::platform_role, 'platform_owner'::platform_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin_v2(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin'::platform_role, 'platform_owner'::platform_role)
  );
$$;

-- 4) Restrict profiles peer exposure to admins/managers only
DROP POLICY IF EXISTS "profiles_select_org_peers" ON public.profiles;

CREATE POLICY "profiles_select_org_admins"
ON public.profiles
FOR SELECT
TO authenticated
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
  )
);

-- 5) Add organization scoping to quick_replies
ALTER TABLE public.quick_replies
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- (table is empty per verification; enforce NOT NULL going forward)
ALTER TABLE public.quick_replies
  ALTER COLUMN organization_id SET NOT NULL;

DROP POLICY IF EXISTS "Users view quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Users insert quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Users update own quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Users delete own quick_replies" ON public.quick_replies;

CREATE POLICY "quick_replies_select_org"
ON public.quick_replies
FOR SELECT
TO authenticated
USING (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND (
    created_by = auth.uid()
    OR is_global = true
  )
);

CREATE POLICY "quick_replies_insert_org"
ON public.quick_replies
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "quick_replies_update_own"
ON public.quick_replies
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "quick_replies_delete_own"
ON public.quick_replies
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND organization_id = ANY (public.get_user_org_ids(auth.uid()))
);

-- 6) Document shared reference tables (writes already restricted to platform admins)
COMMENT ON TABLE public.vehicle_types IS
  'Shared reference data (non-sensitive). Read: all authenticated users. Write: platform admins only.';
COMMENT ON TABLE public.special_request_types IS
  'Shared reference data (non-sensitive). Read: all authenticated users. Write: platform admins only.';
