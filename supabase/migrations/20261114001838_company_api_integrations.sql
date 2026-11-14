BEGIN;

-- Supabase Vault is provisioned by the hosted database and required here.
-- Lovable Cloud permits using the installed Vault extension without recreating it.
CREATE SCHEMA IF NOT EXISTS company_api_private;
REVOKE ALL ON SCHEMA company_api_private FROM PUBLIC, anon, authenticated;

CREATE TABLE company_api_private.connections (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('travelport', 'sabre', 'eta', 'zatca')),
  environment text NOT NULL CHECK (environment IN ('preproduction', 'production')),
  secret_id uuid NOT NULL UNIQUE,
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, provider),
  CHECK (provider <> 'zatca' OR environment = 'preproduction')
);
ALTER TABLE company_api_private.connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON company_api_private.connections FROM PUBLIC, anon, authenticated;

CREATE FUNCTION company_api_private.remove_connection_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = OLD.secret_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION company_api_private.remove_connection_secret() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER remove_company_api_secret
AFTER DELETE ON company_api_private.connections
FOR EACH ROW EXECUTE FUNCTION company_api_private.remove_connection_secret();

-- Service-only entry point. Client sessions cannot read secrets or write metadata.
CREATE FUNCTION public.company_api_connections_list(_org_id uuid)
RETURNS TABLE(provider text, environment text, revision uuid, checked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT c.provider, c.environment, c.revision, c.checked_at
  FROM company_api_private.connections c WHERE c.organization_id = _org_id
  ORDER BY c.provider;
$$;

CREATE FUNCTION public.company_api_connection_read(_org_id uuid, _provider text)
RETURNS TABLE(environment text, credentials jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT c.environment, s.decrypted_secret::jsonb
  FROM company_api_private.connections c
  JOIN vault.decrypted_secrets s ON s.id = c.secret_id
  JOIN public.organizations o ON o.id = c.organization_id AND o.is_active
  WHERE c.organization_id = _org_id AND c.provider = _provider;
$$;

CREATE FUNCTION public.company_api_connection_write(
  _org_id uuid, _provider text, _actor_id uuid, _expected_revision uuid,
  _environment text DEFAULT NULL, _credentials jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  previous company_api_private.connections%ROWTYPE;
  secret uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id AND o.is_active
    WHERE m.organization_id = _org_id AND m.user_id = _actor_id AND m.is_active
      AND m.role::text IN ('owner', 'admin')
  ) OR NOT COALESCE((
    SELECT s.granted FROM public._org_permission_state(_org_id, _actor_id, 'admin_settings') s
  ), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(_org_id::text), pg_catalog.hashtext(_provider));
  SELECT * INTO previous FROM company_api_private.connections c
  WHERE c.organization_id = _org_id AND c.provider = _provider;
  IF previous.revision IS DISTINCT FROM _expected_revision THEN
    RETURN false;
  END IF;

  IF _credentials IS NULL THEN
    DELETE FROM company_api_private.connections c
    WHERE c.organization_id = _org_id AND c.provider = _provider;
    IF FOUND THEN
      INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, details)
      VALUES (_org_id, _actor_id, 'company_api_disconnected', 'company_api_connections', jsonb_build_object('provider', _provider));
    END IF;
    RETURN true;
  END IF;

  IF jsonb_typeof(_credentials) <> 'object' OR octet_length(_credentials::text) > 24576 THEN
    RAISE EXCEPTION 'invalid credentials' USING ERRCODE = '22023';
  END IF;
  IF previous.secret_id IS NULL THEN
    secret := vault.create_secret(_credentials::text);
    INSERT INTO company_api_private.connections (organization_id, provider, environment, secret_id, checked_by)
    VALUES (_org_id, _provider, _environment, secret, _actor_id);
  ELSE
    PERFORM vault.update_secret(previous.secret_id, _credentials::text);
    UPDATE company_api_private.connections
    SET environment = _environment, revision = gen_random_uuid(), checked_at = now(), checked_by = _actor_id
    WHERE organization_id = _org_id AND provider = _provider;
  END IF;
  INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, details)
  VALUES (_org_id, _actor_id, 'company_api_connected', 'company_api_connections',
          jsonb_build_object('provider', _provider, 'environment', _environment));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.company_api_connections_list(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.company_api_connection_read(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.company_api_connection_write(uuid, text, uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_api_connections_list(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.company_api_connection_read(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.company_api_connection_write(uuid, text, uuid, uuid, text, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
