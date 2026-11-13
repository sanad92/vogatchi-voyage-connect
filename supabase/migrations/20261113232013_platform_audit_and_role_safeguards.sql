BEGIN;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_platform_time ON public.admin_audit_log
  (created_at DESC NULLS LAST, id DESC);

CREATE TABLE platform_company_private.platform_role_lock (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 0
);
INSERT INTO platform_company_private.platform_role_lock DEFAULT VALUES;
REVOKE ALL ON platform_company_private.platform_role_lock FROM PUBLIC, anon, authenticated;

CREATE FUNCTION platform_company_private.serialize_platform_role_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE platform_company_private.platform_role_lock SET revision = revision + 1 WHERE singleton;
  RETURN NULL;
END $$;

CREATE TRIGGER serialize_platform_role_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.platform_roles
  FOR EACH STATEMENT EXECUTE FUNCTION platform_company_private.serialize_platform_role_changes();

CREATE FUNCTION platform_company_private.protect_last_platform_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.role = 'platform_owner'
    AND NOT EXISTS (SELECT 1 FROM public.platform_roles WHERE role = 'platform_owner') THEN
    RAISE EXCEPTION 'The platform must keep at least one owner' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER protect_last_platform_owner
  AFTER UPDATE OF role OR DELETE ON public.platform_roles
  FOR EACH ROW EXECUTE FUNCTION platform_company_private.protect_last_platform_owner();

CREATE FUNCTION platform_company_private.audit_platform_role_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.admin_audit_log (user_id, action, target_table, target_id, details)
  VALUES (coalesce(auth.uid(), NEW.assigned_by), 'platform_role_granted', 'platform_roles', NEW.user_id,
    jsonb_build_object('new_role', NEW.role));
  RETURN NULL;
END $$;

CREATE TRIGGER audit_platform_role_grant
  AFTER INSERT ON public.platform_roles
  FOR EACH ROW EXECUTE FUNCTION platform_company_private.audit_platform_role_grant();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.platform_roles FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Only platform_owner can assign roles" ON public.platform_roles;
DROP POLICY IF EXISTS "Only platform_owner can remove roles" ON public.platform_roles;

CREATE FUNCTION platform_company_private.change_platform_account_role(
  p_role_id uuid, p_expected_role public.platform_role, p_new_role public.platform_role
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_previous public.platform_roles%ROWTYPE;
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  UPDATE platform_company_private.platform_role_lock SET revision = revision + 1 WHERE singleton;
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_previous FROM public.platform_roles WHERE id = p_role_id;
  IF NOT FOUND OR v_previous.role IS DISTINCT FROM p_expected_role THEN
    RAISE EXCEPTION 'Platform role changed. Refresh the list.' USING ERRCODE = '40001';
  END IF;
  IF p_new_role = v_previous.role THEN RETURN v_previous.id; END IF;

  IF p_new_role IS NULL OR EXISTS (
    SELECT 1 FROM public.platform_roles WHERE user_id = v_previous.user_id AND role = p_new_role
  ) THEN
    DELETE FROM public.platform_roles WHERE id = v_previous.id;
  ELSE
    UPDATE public.platform_roles SET role = p_new_role, assigned_by = auth.uid() WHERE id = v_previous.id;
  END IF;

  INSERT INTO public.admin_audit_log (user_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_new_role IS NULL THEN 'platform_role_removed' ELSE 'platform_role_changed' END,
    'platform_roles', v_previous.user_id,
    jsonb_build_object('old_role', v_previous.role, 'new_role', p_new_role)
  );
  RETURN v_previous.id;
END $$;

CREATE FUNCTION public.change_platform_account_role(
  p_role_id uuid, p_expected_role public.platform_role, p_new_role public.platform_role DEFAULT NULL
)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT platform_company_private.change_platform_account_role(p_role_id, p_expected_role, p_new_role)
$$;

CREATE FUNCTION platform_company_private.read_platform_audit(
  p_scope text, p_action text, p_from date, p_to date, p_page integer
)
RETURNS TABLE (
  id uuid, occurred_at timestamptz, action text, organization_id uuid, organization_name text,
  actor_id uuid, actor_name text, actor_email text, target_table text, target_id uuid,
  setting_key text, old_role text, new_role text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  IF p_scope NOT IN ('all', 'platform') THEN v_org := p_scope::uuid; END IF;
  IF p_from > p_to OR p_page NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Invalid audit filters' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT a.id, a.created_at, a.action, a.organization_id, o.name, a.user_id, p.full_name,
    coalesce(a.user_email, p.email), a.target_table, a.target_id,
    CASE WHEN a.organization_id IS NULL AND a.action = 'platform_setting_updated' THEN a.details->>'setting_key' END,
    CASE WHEN a.organization_id IS NULL AND a.target_table = 'platform_roles' THEN a.details->>'old_role' END,
    CASE WHEN a.organization_id IS NULL AND a.target_table = 'platform_roles' THEN a.details->>'new_role' END
  FROM public.admin_audit_log a
  LEFT JOIN public.organizations o ON o.id = a.organization_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE (coalesce(p_scope, 'all') = 'all' OR (p_scope = 'platform' AND a.organization_id IS NULL) OR a.organization_id = v_org)
    AND (p_action IS NULL OR a.action = p_action)
    AND (p_from IS NULL OR a.created_at >= (p_from::timestamp AT TIME ZONE 'Africa/Cairo'))
    AND (p_to IS NULL OR a.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo'))
  ORDER BY a.created_at DESC NULLS LAST, a.id DESC
  LIMIT 31 OFFSET (coalesce(p_page, 0) * 30);
END $$;

CREATE FUNCTION public.platform_audit_entries(
  p_scope text DEFAULT 'all', p_action text DEFAULT NULL,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_page integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, occurred_at timestamptz, action text, organization_id uuid, organization_name text,
  actor_id uuid, actor_name text, actor_email text, target_table text, target_id uuid,
  setting_key text, old_role text, new_role text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM platform_company_private.read_platform_audit(p_scope, p_action, p_from, p_to, p_page)
$$;

CREATE FUNCTION platform_company_private.read_platform_audit_actions()
RETURNS TABLE(action text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT DISTINCT a.action FROM public.admin_audit_log a ORDER BY a.action;
END $$;

CREATE FUNCTION public.platform_audit_actions()
RETURNS TABLE(action text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM platform_company_private.read_platform_audit_actions()
$$;

REVOKE ALL ON FUNCTION platform_company_private.serialize_platform_role_changes(),
  platform_company_private.protect_last_platform_owner(), platform_company_private.audit_platform_role_grant(),
  platform_company_private.change_platform_account_role(uuid, public.platform_role, public.platform_role),
  platform_company_private.read_platform_audit(text, text, date, date, integer),
  platform_company_private.read_platform_audit_actions(),
  public.change_platform_account_role(uuid, public.platform_role, public.platform_role),
  public.platform_audit_entries(text, text, date, date, integer), public.platform_audit_actions()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  platform_company_private.change_platform_account_role(uuid, public.platform_role, public.platform_role),
  platform_company_private.read_platform_audit(text, text, date, date, integer),
  platform_company_private.read_platform_audit_actions(),
  public.change_platform_account_role(uuid, public.platform_role, public.platform_role),
  public.platform_audit_entries(text, text, date, date, integer), public.platform_audit_actions()
TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
