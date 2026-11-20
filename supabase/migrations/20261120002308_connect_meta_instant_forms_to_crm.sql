BEGIN;

CREATE SCHEMA meta_lead_ads_private;
REVOKE ALL ON SCHEMA meta_lead_ads_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE meta_lead_ads_private.routes (
  page_id text NOT NULL CHECK (page_id ~ '^[0-9]{1,32}$'),
  form_id text NOT NULL CHECK (form_id ~ '^[0-9]{1,32}$'),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  secret_id uuid UNIQUE,
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  verified_at timestamptz NOT NULL DEFAULT now(),
  last_imported_at timestamptz,
  PRIMARY KEY (page_id, form_id)
);
CREATE INDEX meta_lead_ads_routes_org_idx ON meta_lead_ads_private.routes (organization_id);
ALTER TABLE meta_lead_ads_private.routes ENABLE ROW LEVEL SECURITY;

CREATE TABLE meta_lead_ads_private.receipts (
  leadgen_id text PRIMARY KEY CHECK (leadgen_id ~ '^[0-9]{1,32}$'),
  page_id text NOT NULL,
  form_id text NOT NULL,
  lead_id uuid REFERENCES public.sop_leads(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (page_id, form_id) REFERENCES meta_lead_ads_private.routes(page_id, form_id) ON DELETE CASCADE
);
CREATE INDEX meta_lead_ads_receipts_route_idx ON meta_lead_ads_private.receipts (page_id, form_id);
CREATE INDEX meta_lead_ads_receipts_lead_idx ON meta_lead_ads_private.receipts (lead_id) WHERE lead_id IS NOT NULL;
ALTER TABLE meta_lead_ads_private.receipts ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION meta_lead_ads_private.remove_route_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF OLD.secret_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = OLD.secret_id; END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION meta_lead_ads_private.remove_route_secret() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER remove_meta_lead_ads_route_secret
AFTER DELETE ON meta_lead_ads_private.routes FOR EACH ROW
EXECUTE FUNCTION meta_lead_ads_private.remove_route_secret();

CREATE FUNCTION meta_lead_ads_private.can_manage(_org_id uuid, _actor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id AND o.is_active
    WHERE m.organization_id = _org_id AND m.user_id = _actor_id AND m.is_active
      AND m.role::text IN ('owner', 'admin')
  ) AND coalesce((
    SELECT p.granted FROM public._org_permission_state(_org_id, _actor_id, 'admin_settings') p
  ), false);
$$;
REVOKE ALL ON FUNCTION meta_lead_ads_private.can_manage(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

-- The authenticated Edge Function verifies the user's JWT and the provider's
-- Page/form ownership before writing. The browser never reads saved tokens.
CREATE FUNCTION public.meta_lead_ads_routes_list(_org_id uuid, _actor_id uuid)
RETURNS TABLE(page_id text, form_id text, revision uuid, active boolean, verified_at timestamptz, last_imported_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT meta_lead_ads_private.can_manage(_org_id, _actor_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT r.page_id, r.form_id, r.revision, r.secret_id IS NOT NULL, r.verified_at, r.last_imported_at
  FROM meta_lead_ads_private.routes r WHERE r.organization_id = _org_id
  ORDER BY r.verified_at DESC, r.page_id, r.form_id;
END;
$$;

CREATE FUNCTION public.meta_lead_ads_route_write(
  _org_id uuid, _actor_id uuid, _page_id text, _form_id text, _expected_revision uuid,
  _page_token text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  prior meta_lead_ads_private.routes%ROWTYPE;
  credential_id uuid;
BEGIN
  IF NOT meta_lead_ads_private.can_manage(_org_id, _actor_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _page_id IS NULL OR _page_id !~ '^[0-9]{1,32}$'
    OR _form_id IS NULL OR _form_id !~ '^[0-9]{1,32}$'
    OR (_page_token IS NOT NULL AND (octet_length(_page_token) NOT BETWEEN 16 AND 4096 OR _page_token !~ '^[[:graph:]]+$')) THEN
    RAISE EXCEPTION 'invalid input' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-lead-config:' || _org_id::text, 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-lead-route:' || _page_id || ':' || _form_id, 0));
  SELECT * INTO prior FROM meta_lead_ads_private.routes r
    WHERE r.page_id = _page_id AND r.form_id = _form_id FOR UPDATE;
  IF (prior.organization_id IS NOT NULL AND prior.organization_id <> _org_id)
    OR prior.revision IS DISTINCT FROM _expected_revision THEN
    RETURN false;
  END IF;

  IF _page_token IS NULL THEN
    IF prior.secret_id IS NOT NULL THEN
      UPDATE meta_lead_ads_private.routes r SET secret_id = NULL, revision = gen_random_uuid()
        WHERE r.page_id = _page_id AND r.form_id = _form_id;
      DELETE FROM vault.secrets WHERE id = prior.secret_id;
    END IF;
  ELSIF prior.organization_id IS NULL THEN
    IF (SELECT count(*) FROM meta_lead_ads_private.routes r WHERE r.organization_id = _org_id) >= 50 THEN
      RAISE EXCEPTION 'meta lead route limit reached' USING ERRCODE = '22023';
    END IF;
    credential_id := vault.create_secret(_page_token);
    INSERT INTO meta_lead_ads_private.routes (page_id, form_id, organization_id, secret_id)
      VALUES (_page_id, _form_id, _org_id, credential_id);
  ELSE
    credential_id := prior.secret_id;
    IF credential_id IS NULL THEN
      credential_id := vault.create_secret(_page_token);
    ELSE
      PERFORM vault.update_secret(credential_id, _page_token);
    END IF;
    UPDATE meta_lead_ads_private.routes r
      SET secret_id = credential_id, revision = gen_random_uuid(), verified_at = now()
      WHERE r.page_id = _page_id AND r.form_id = _form_id;
  END IF;

  IF _page_token IS NOT NULL OR prior.secret_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (organization_id, user_id, action, target_table, details)
    VALUES (_org_id, _actor_id,
      CASE WHEN _page_token IS NULL THEN 'meta_lead_route_disconnected' ELSE 'meta_lead_route_connected' END,
      'meta_lead_ads_routes', jsonb_build_object('page_id', _page_id, 'form_id', _form_id));
  END IF;
  RETURN true;
END;
$$;

CREATE FUNCTION public.meta_lead_ads_route_resolve(_page_id text, _form_id text, _leadgen_id text)
RETURNS TABLE(revision uuid, page_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT r.revision, s.decrypted_secret
  FROM meta_lead_ads_private.routes r
  JOIN vault.decrypted_secrets s ON s.id = r.secret_id
  JOIN public.organizations o ON o.id = r.organization_id AND o.is_active
  WHERE r.page_id = _page_id AND r.form_id = _form_id
    AND coalesce(public.org_has_active_subscription(r.organization_id), false)
    AND NOT EXISTS (SELECT 1 FROM meta_lead_ads_private.receipts d WHERE d.leadgen_id = _leadgen_id);
$$;

-- The webhook provides provider-verified identifiers and only allowlisted lead
-- fields. Resolve the organization here, never from the request or the Graph payload.
CREATE FUNCTION public.meta_lead_ads_import(
  _page_id text, _form_id text, _leadgen_id text, _revision uuid,
  _name text, _email text, _phone text, _campaign_id text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  route meta_lead_ads_private.routes%ROWTYPE;
  new_lead_id uuid := gen_random_uuid();
  contact_email text := lower(nullif(btrim(_email), ''));
  contact_phone text := nullif(btrim(_phone), '');
  contact_name text := nullif(btrim(_name), '');
BEGIN
  IF _leadgen_id IS NULL OR _leadgen_id !~ '^[0-9]{1,32}$'
    OR (_campaign_id IS NOT NULL AND _campaign_id !~ '^[0-9]{1,32}$') THEN
    RAISE EXCEPTION 'invalid input' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO route FROM meta_lead_ads_private.routes r
    WHERE r.page_id = _page_id AND r.form_id = _form_id FOR UPDATE;
  IF NOT FOUND OR route.secret_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.organizations o WHERE o.id = route.organization_id AND o.is_active
    ) OR NOT coalesce(public.org_has_active_subscription(route.organization_id), false) THEN
    RETURN 'unavailable';
  END IF;
  IF route.revision IS DISTINCT FROM _revision THEN RETURN 'route_changed'; END IF;

  INSERT INTO meta_lead_ads_private.receipts (leadgen_id, page_id, form_id)
  VALUES (_leadgen_id, _page_id, _form_id) ON CONFLICT (leadgen_id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'already_processed'; END IF;

  IF length(contact_email) > 254 OR contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    contact_email := NULL;
  END IF;
  IF contact_phone !~ '^\+?[0-9]{7,15}$' THEN contact_phone := NULL; END IF;
  IF contact_email IS NULL AND contact_phone IS NULL THEN RETURN 'missing_contact'; END IF;

  INSERT INTO public.sop_leads (
    id, organization_id, lead_number, contact_name, contact_email, contact_phone, lead_source, campaign
  ) VALUES (
    new_lead_id, route.organization_id,
    'LD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(new_lead_id::text, '-', ''), 1, 12)),
    left(contact_name, 160), contact_email, contact_phone, 'meta_lead_ads', _campaign_id
  );
  UPDATE meta_lead_ads_private.receipts d SET lead_id = new_lead_id WHERE d.leadgen_id = _leadgen_id;
  UPDATE meta_lead_ads_private.routes r SET last_imported_at = now() WHERE r.page_id = _page_id AND r.form_id = _form_id;
  RETURN 'imported';
END;
$$;

REVOKE ALL ON FUNCTION public.meta_lead_ads_routes_list(uuid, uuid),
  public.meta_lead_ads_route_write(uuid, uuid, text, text, uuid, text),
  public.meta_lead_ads_route_resolve(text, text, text),
  public.meta_lead_ads_import(text, text, text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meta_lead_ads_routes_list(uuid, uuid),
  public.meta_lead_ads_route_write(uuid, uuid, text, text, uuid, text),
  public.meta_lead_ads_route_resolve(text, text, text),
  public.meta_lead_ads_import(text, text, text, uuid, text, text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
