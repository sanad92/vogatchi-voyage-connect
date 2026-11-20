BEGIN;

-- A test receipt is separate from Safar ERP invoice accounting.
CREATE TABLE company_api_private.eta_preprod_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_id text NOT NULL CHECK (internal_id ~ '^[A-Za-z0-9._/-]{1,50}$'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  connection_revision uuid NOT NULL,
  attempt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('sending', 'not_sent', 'unknown', 'submitted', 'valid', 'invalid', 'rejected', 'cancelled')),
  submission_id text CHECK (submission_id ~ '^[A-Za-z0-9]{26}$'),
  document_id text CHECK (document_id ~ '^[A-Za-z0-9]{26}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, internal_id),
  CHECK ((submission_id IS NULL) = (document_id IS NULL)),
  CHECK (status NOT IN ('submitted', 'valid', 'invalid', 'cancelled') OR submission_id IS NOT NULL)
);
CREATE INDEX eta_preprod_samples_latest ON company_api_private.eta_preprod_samples (organization_id, created_at DESC, id);
ALTER TABLE company_api_private.eta_preprod_samples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON company_api_private.eta_preprod_samples FROM PUBLIC, anon, authenticated;

CREATE FUNCTION company_api_private.authorize_eta_preprod_sample(_org_id uuid, _actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id AND o.is_active
    WHERE m.organization_id = _org_id AND m.user_id = _actor_id AND m.is_active
      AND m.role::text IN ('owner', 'admin')
  ) OR NOT COALESCE((
    SELECT s.granted FROM public._org_permission_state(_org_id, _actor_id, 'admin_settings') s
  ), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE FUNCTION company_api_private.eta_sample_summary(sample company_api_private.eta_preprod_samples)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', sample.id, 'internal_id', sample.internal_id,
    'status', CASE WHEN sample.status = 'sending' AND sample.checked_at < now() - interval '60 seconds'
                   THEN 'unknown' ELSE sample.status END,
    'submission_id', sample.submission_id, 'document_id', sample.document_id,
    'created_at', sample.created_at, 'checked_at', sample.checked_at
  );
$$;

CREATE FUNCTION public.company_eta_samples_list(_org_id uuid, _actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM company_api_private.authorize_eta_preprod_sample(_org_id, _actor_id);
  RETURN COALESCE((
    SELECT jsonb_agg(sample.summary ORDER BY sample.created_at DESC, sample.id)
    FROM (SELECT company_api_private.eta_sample_summary(s) AS summary, s.created_at, s.id
          FROM company_api_private.eta_preprod_samples s
          WHERE s.organization_id = _org_id ORDER BY s.created_at DESC, s.id LIMIT 30) sample
  ), '[]'::jsonb);
END;
$$;

CREATE FUNCTION public.company_eta_sample_claim(
  _org_id uuid, _actor_id uuid, _revision uuid, _internal_id text, _payload_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  sample company_api_private.eta_preprod_samples;
  v_secret_id uuid;
  credentials jsonb;
BEGIN
  PERFORM company_api_private.authorize_eta_preprod_sample(_org_id, _actor_id);
  SELECT c.secret_id INTO v_secret_id FROM company_api_private.connections c
    WHERE c.organization_id = _org_id AND c.provider = 'eta'
      AND c.environment = 'preproduction' AND c.revision = _revision FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'eta_test_connection_required'); END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(_org_id::text), pg_catalog.hashtext('eta-sample:' || _internal_id));
  SELECT s.* INTO sample FROM company_api_private.eta_preprod_samples s
    WHERE s.organization_id = _org_id AND s.internal_id = _internal_id FOR UPDATE;
  IF FOUND AND sample.payload_hash IS DISTINCT FROM _payload_hash THEN
    RETURN jsonb_build_object('error', 'eta_sample_id_conflict');
  END IF;
  IF FOUND AND sample.status <> 'not_sent' THEN
    RETURN jsonb_build_object('sample', company_api_private.eta_sample_summary(sample));
  END IF;

  SELECT v.decrypted_secret::jsonb INTO credentials FROM vault.decrypted_secrets v WHERE v.id = v_secret_id;
  IF credentials IS NULL THEN RETURN jsonb_build_object('error', 'configuration_unavailable'); END IF;

  IF sample.id IS NULL THEN
    INSERT INTO company_api_private.eta_preprod_samples
      (organization_id, created_by, internal_id, payload_hash, connection_revision, status)
    VALUES (_org_id, _actor_id, _internal_id, _payload_hash, _revision, 'sending')
    RETURNING * INTO sample;
  ELSE
    UPDATE company_api_private.eta_preprod_samples s
      SET attempt_id = gen_random_uuid(), connection_revision = _revision, status = 'sending', checked_at = now()
      WHERE s.id = sample.id RETURNING * INTO sample;
  END IF;

  RETURN jsonb_build_object('sample', company_api_private.eta_sample_summary(sample),
    'credentials', credentials, 'attempt_id', sample.attempt_id);
END;
$$;

CREATE FUNCTION public.company_eta_sample_for_refresh(_org_id uuid, _actor_id uuid, _sample_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  sample company_api_private.eta_preprod_samples;
  credentials jsonb;
BEGIN
  PERFORM company_api_private.authorize_eta_preprod_sample(_org_id, _actor_id);
  SELECT s.* INTO sample FROM company_api_private.eta_preprod_samples s
    WHERE s.organization_id = _org_id AND s.id = _sample_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'eta_sample_not_found'); END IF;
  IF sample.status <> 'submitted' THEN
    RETURN jsonb_build_object('sample', company_api_private.eta_sample_summary(sample));
  END IF;

  SELECT v.decrypted_secret::jsonb INTO credentials FROM company_api_private.connections c
    JOIN vault.decrypted_secrets v ON v.id = c.secret_id
    WHERE c.organization_id = _org_id AND c.provider = 'eta'
      AND c.environment = 'preproduction' AND c.revision = sample.connection_revision;
  IF credentials IS NULL THEN RETURN jsonb_build_object('error', 'eta_test_connection_required'); END IF;
  RETURN jsonb_build_object('sample', company_api_private.eta_sample_summary(sample),
    'credentials', credentials, 'attempt_id', sample.attempt_id);
END;
$$;

CREATE FUNCTION public.company_eta_sample_record(
  _org_id uuid, _sample_id uuid, _attempt_id uuid, _expected_status text, _status text,
  _submission_id text DEFAULT NULL, _document_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  sample company_api_private.eta_preprod_samples;
BEGIN
  IF NOT COALESCE(
    (_expected_status = 'sending' AND _status IN ('not_sent', 'unknown', 'submitted', 'rejected')
      AND ((_status = 'submitted' AND _submission_id IS NOT NULL AND _document_id IS NOT NULL)
        OR (_status <> 'submitted' AND _submission_id IS NULL AND _document_id IS NULL)))
    OR (_expected_status = 'submitted' AND _status IN ('submitted', 'valid', 'invalid', 'rejected', 'cancelled')
      AND _submission_id IS NULL AND _document_id IS NULL), false
  ) THEN RAISE EXCEPTION 'invalid ETA sample status' USING ERRCODE = '22023'; END IF;

  UPDATE company_api_private.eta_preprod_samples s
    SET status = _status, submission_id = COALESCE(_submission_id, s.submission_id),
        document_id = COALESCE(_document_id, s.document_id), checked_at = now()
    WHERE s.organization_id = _org_id AND s.id = _sample_id
      AND s.attempt_id = _attempt_id AND s.status = _expected_status
    RETURNING * INTO sample;
  IF NOT FOUND THEN
    SELECT s.* INTO sample FROM company_api_private.eta_preprod_samples s
      WHERE s.organization_id = _org_id AND s.id = _sample_id AND s.attempt_id = _attempt_id;
  END IF;
  IF sample.id IS NULL THEN RETURN NULL; END IF;
  RETURN company_api_private.eta_sample_summary(sample);
END;
$$;

REVOKE ALL ON FUNCTION company_api_private.authorize_eta_preprod_sample(uuid, uuid),
  company_api_private.eta_sample_summary(company_api_private.eta_preprod_samples)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.company_eta_samples_list(uuid, uuid),
  public.company_eta_sample_claim(uuid, uuid, uuid, text, text),
  public.company_eta_sample_for_refresh(uuid, uuid, uuid),
  public.company_eta_sample_record(uuid, uuid, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_eta_samples_list(uuid, uuid),
  public.company_eta_sample_claim(uuid, uuid, uuid, text, text),
  public.company_eta_sample_for_refresh(uuid, uuid, uuid),
  public.company_eta_sample_record(uuid, uuid, uuid, text, text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
