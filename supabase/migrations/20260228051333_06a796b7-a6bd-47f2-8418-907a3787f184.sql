
DROP FUNCTION IF EXISTS public.create_organization_onboarding(text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  _name text,
  _slug text,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_slug text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug from name if not provided
  v_slug := COALESCE(NULLIF(trim(_slug), ''), lower(replace(trim(_name), ' ', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8));

  -- Create organization
-- INSERT INTO public.organizations (name, slug, phone, email, address)
--   VALUES (trim(_name), v_slug, _phone, _email, _address)
--   RETURNING id INTO v_org_id;

  -- Add user as owner
-- INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
--   VALUES (v_org_id, v_user_id, 'owner', true);

  RETURN v_org_id;
END;
$$;
