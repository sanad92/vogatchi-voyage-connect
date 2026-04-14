
CREATE OR REPLACE FUNCTION public.can_manage_customers()
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
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
$$;
