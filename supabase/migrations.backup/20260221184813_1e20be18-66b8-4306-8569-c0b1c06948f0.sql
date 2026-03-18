
-- Drop the partially created policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Recreate all policies
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can read their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (id = ANY (get_user_org_ids(auth.uid())));

CREATE POLICY "Users can add themselves as org member"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can read own memberships"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can read all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can manage all members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);
