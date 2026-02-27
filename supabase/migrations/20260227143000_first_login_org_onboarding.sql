-- First-login organization onboarding hardening
-- - Fix organizations RLS for create/read/update/delete
-- - Auto-add owner membership on organization creation
-- - Provide atomic onboarding API endpoint (RPC)

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Rebuild organizations policies to match onboarding security requirements
DROP POLICY IF EXISTS "Users can view their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can read their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can read all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Platform admins can read all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Platform admins can update all organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can read their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.is_active = true
  )
);

CREATE POLICY "Owners can delete their organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.is_active = true
  )
);

CREATE POLICY "Platform admins can read all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Keep membership visibility to current user for policy subqueries
DROP POLICY IF EXISTS "Members can read own memberships" ON public.organization_members;
CREATE POLICY "Members can read own memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trigger: automatically add creator as org owner after organization insert
CREATE OR REPLACE FUNCTION public.auto_add_org_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
  VALUES (NEW.id, v_user_id, 'owner', true)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role = 'owner',
    is_active = true;

  RETURN NEW;
END;
$$;

-- Ensure trial/user-limit race is safe for first owner insert
CREATE OR REPLACE FUNCTION public.enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  SELECT pl.max_users INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans pl ON pl.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT COUNT(*)::integer INTO v_current
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND is_active = true;

  IF v_max IS NULL THEN
    IF v_current = 0 AND NEW.role = 'owner' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'لا يوجد اشتراك صالح لهذه المؤسسة. يرجى تفعيل الاشتراك أو فترة التجربة.';
  END IF;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'تم الوصول للحد الأقصى من المستخدمين (%). يرجى ترقية الخطة.', v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_z_auto_add_org_owner_membership ON public.organizations;
CREATE TRIGGER trg_z_auto_add_org_owner_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_org_owner_membership();

-- API endpoint (RPC): create organization in one atomic transaction
CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  _name text,
  _slug text,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_has_owner boolean;
  v_has_subscription boolean;
  v_plan_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(BTRIM(_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF COALESCE(BTRIM(_slug), '') = '' THEN
    RAISE EXCEPTION 'Organization slug is required';
  END IF;

  INSERT INTO public.organizations (
    name,
    slug,
    phone,
    email,
    address
  )
  VALUES (
    BTRIM(_name),
    LOWER(BTRIM(_slug)),
    NULLIF(BTRIM(_phone), ''),
    NULLIF(BTRIM(_email), ''),
    NULLIF(BTRIM(_address), '')
  )
  RETURNING id INTO v_org_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.is_active = true
  ) INTO v_has_owner;

  IF NOT v_has_owner THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org_id, auth.uid(), 'owner', true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'owner', is_active = true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = v_org_id
      AND s.status IN ('active', 'trialing')
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE name = 'Pro' AND is_active = true
    LIMIT 1;

    IF v_plan_id IS NULL THEN
      SELECT id INTO v_plan_id
      FROM public.subscription_plans
      WHERE is_active = true
      ORDER BY price_monthly DESC
      LIMIT 1;
    END IF;

    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'No active subscription plan is configured';
    END IF;

    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      notes,
      activated_by
    ) VALUES (
      v_org_id,
      v_plan_id,
      'trialing',
      now(),
      now() + interval '14 days',
      'First-login onboarding trial',
      auth.uid()
    );
  END IF;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_onboarding(text, text, text, text, text) TO authenticated;
