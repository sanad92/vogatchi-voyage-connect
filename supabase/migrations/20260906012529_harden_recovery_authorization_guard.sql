-- Fail closed when a user has no organization role. SQL boolean expressions
-- can evaluate to NULL, and `IF NOT NULL` does not enter the rejection branch
-- in PL/pgSQL callers.

BEGIN;

CREATE OR REPLACE FUNCTION public._recovery_can_manage(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(
      public.get_user_org_role(auth.uid(), _org) IN ('owner', 'admin', 'manager'),
      false
    )
    OR COALESCE(public.is_platform_admin(auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public._recovery_can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._recovery_can_manage(uuid)
  TO authenticated, service_role;

COMMIT;
