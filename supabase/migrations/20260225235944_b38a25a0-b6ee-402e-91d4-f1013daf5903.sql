
-- Add platform admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- Security definer function to check platform admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Allow platform admins to read all organizations
CREATE POLICY "Platform admins can read all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to update organizations (suspend/activate)
CREATE POLICY "Platform admins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all subscriptions
CREATE POLICY "Platform admins can read all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to manage subscriptions
CREATE POLICY "Platform admins can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all organization members
CREATE POLICY "Platform admins can read all org members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all profiles
CREATE POLICY "Platform admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read subscription plans
CREATE POLICY "Platform admins can read subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));
