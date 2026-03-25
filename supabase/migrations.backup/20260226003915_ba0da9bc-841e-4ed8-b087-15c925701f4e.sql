
-- Create platform role enum
CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'platform_owner');

-- Create platform_roles table (isolated from profiles)
CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role platform_role NOT NULL DEFAULT 'platform_admin',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform role (no RLS recursion)
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid, _role platform_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Security definer: check if user has ANY platform role
CREATE OR REPLACE FUNCTION public.is_platform_admin_v2(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
  );
$$;

-- RLS: Only platform_owner can INSERT new roles
CREATE POLICY "Only platform_owner can assign roles"
ON public.platform_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_platform_role(auth.uid(), 'platform_owner')
);

-- RLS: Only platform_owner can DELETE roles
CREATE POLICY "Only platform_owner can remove roles"
ON public.platform_roles
FOR DELETE
TO authenticated
USING (
  public.has_platform_role(auth.uid(), 'platform_owner')
);

-- RLS: Platform admins can view all roles (read-only)
CREATE POLICY "Platform admins can view roles"
ON public.platform_roles
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin_v2(auth.uid())
);

-- RLS: NO UPDATE policy — prevents users from modifying their own or any role
-- (Roles are immutable; delete + re-insert via owner only)

-- Migrate existing platform admins from profiles to platform_roles
INSERT INTO public.platform_roles (user_id, role)
SELECT id, 'platform_owner'::platform_role
FROM public.profiles
WHERE is_platform_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop the old column and function
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_platform_admin;

-- Replace old is_platform_admin function to use new table
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
  );
$$;
