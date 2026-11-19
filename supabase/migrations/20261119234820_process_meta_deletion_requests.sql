CREATE SCHEMA meta_deletion_private;
REVOKE ALL ON SCHEMA meta_deletion_private FROM PUBLIC, anon, authenticated;

CREATE TABLE meta_deletion_private.reviews (
  request_id uuid PRIMARY KEY REFERENCES public.whatsapp_connection_events(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('in_review', 'verification_required', 'completed')),
  case_reference text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'completed') = (case_reference IS NOT NULL))
);
CREATE TABLE meta_deletion_private.review_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.whatsapp_connection_events(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('in_review', 'verification_required', 'completed', 'subject_viewed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE meta_deletion_private.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_deletion_private.review_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX meta_deletion_review_audit_by_request
  ON meta_deletion_private.review_audit (request_id, id DESC);

CREATE UNIQUE INDEX whatsapp_meta_deletion_fingerprint_idx
  ON public.whatsapp_connection_events ((payload->>'request_fingerprint'))
  WHERE event_type = 'meta_data_deletion_request' AND organization_id IS NULL
    AND payload ? 'request_fingerprint';
CREATE INDEX whatsapp_meta_deletion_queue_order
  ON public.whatsapp_connection_events (created_at DESC, id DESC)
  WHERE event_type = 'meta_data_deletion_request' AND organization_id IS NULL;

-- The signed app-scoped ID identifies a Facebook user. WhatsApp inbox settings
-- and conversation rows have different owners and currently lack a trusted link
-- to that identity. Intake must not disable or erase a company mailbox.
CREATE FUNCTION public.receive_meta_deletion_request(
  _meta_user_id text, _confirmation_code uuid, _request_fingerprint text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_code uuid;
BEGIN
  IF _confirmation_code IS NULL OR nullif(btrim(_meta_user_id), '') IS NULL
    OR length(_meta_user_id) > 80 OR (_request_fingerprint IS NOT NULL AND _request_fingerprint !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'Invalid data deletion request' USING ERRCODE = '22023';
  END IF;

  -- Serialize signed retries so Meta always receives the original code.
  IF _request_fingerprint IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(_request_fingerprint, 0));
    SELECT (payload->>'confirmation_code')::uuid INTO v_code
    FROM public.whatsapp_connection_events
    WHERE event_type = 'meta_data_deletion_request' AND organization_id IS NULL
      AND payload ? 'request_fingerprint' AND payload->>'request_fingerprint' = _request_fingerprint;
    IF v_code IS NOT NULL THEN
      RETURN v_code;
    END IF;
  END IF;

  INSERT INTO public.whatsapp_connection_events (organization_id, event_type, payload)
  VALUES (NULL, 'meta_data_deletion_request',
    jsonb_build_object('meta_user_id', _meta_user_id, 'confirmation_code', _confirmation_code)
      || CASE WHEN _request_fingerprint IS NULL THEN '{}'::jsonb
           ELSE jsonb_build_object('request_fingerprint', _request_fingerprint) END);

  RETURN _confirmation_code;
END;
$$;

-- Keep the prior Edge Function contract during rollout.
CREATE OR REPLACE FUNCTION public.record_meta_deletion_request(_meta_user_id text, _confirmation_code uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  PERFORM public.receive_meta_deletion_request(_meta_user_id, _confirmation_code, NULL);
END;
$$;

CREATE FUNCTION meta_deletion_private.require_owner()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT coalesce(public.has_platform_role(v_actor, 'platform_owner'::public.platform_role), false) THEN
    RAISE EXCEPTION 'Platform privacy administrator required' USING ERRCODE = '42501';
  END IF;
  RETURN v_actor;
END;
$$;
REVOKE ALL ON FUNCTION meta_deletion_private.require_owner() FROM PUBLIC, anon, authenticated;

-- The review functions return only fields required by the relevant screen.
CREATE FUNCTION public.list_meta_deletion_reviews(
  _status text DEFAULT NULL, _offset integer DEFAULT 0, _confirmation_code uuid DEFAULT NULL
)
RETURNS TABLE (request_id uuid, received_at timestamptz, review_status text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM meta_deletion_private.require_owner();
  IF (_status IS NOT NULL AND _status NOT IN ('received', 'in_review', 'verification_required', 'completed'))
    OR _offset IS NULL OR _offset < 0 THEN
    RAISE EXCEPTION 'Invalid review filter' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT e.id, e.created_at, coalesce(r.status, 'received'), coalesce(r.updated_at, e.created_at)
  FROM public.whatsapp_connection_events e
  LEFT JOIN meta_deletion_private.reviews r ON r.request_id = e.id
  WHERE e.organization_id IS NULL AND e.event_type = 'meta_data_deletion_request'
    AND e.payload->>'confirmation_code' IS NOT NULL
    AND (_status IS NULL OR coalesce(r.status, 'received') = _status)
    AND (_confirmation_code IS NULL OR e.payload->>'confirmation_code' = _confirmation_code::text)
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT 51 OFFSET _offset;
END;
$$;

CREATE FUNCTION public.set_meta_deletion_review(
  _request_id uuid, _expected_status text, _new_status text, _case_reference text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := meta_deletion_private.require_owner();
  v_old_status text;
  v_reference text := nullif(btrim(_case_reference), '');
BEGIN
  PERFORM e.id FROM public.whatsapp_connection_events e
  WHERE e.id = _request_id AND e.organization_id IS NULL
    AND e.event_type = 'meta_data_deletion_request' AND e.payload->>'confirmation_code' IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown Meta deletion request' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_old_status FROM meta_deletion_private.reviews WHERE request_id = _request_id;
  v_old_status := coalesce(v_old_status, 'received');
  IF v_old_status IS DISTINCT FROM _expected_status THEN
    RAISE EXCEPTION 'Review status changed' USING ERRCODE = '40001';
  END IF;

  IF _new_status IS NULL OR NOT (
    (_new_status = 'in_review' AND v_old_status IN ('received', 'verification_required'))
    OR (v_old_status = 'in_review' AND _new_status IN ('verification_required', 'completed'))
  ) THEN
    RAISE EXCEPTION 'Invalid review transition' USING ERRCODE = '22023';
  END IF;
  IF (_new_status = 'completed' AND (v_reference IS NULL OR v_reference !~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]{2,79}$'))
    OR (_new_status <> 'completed' AND v_reference IS NOT NULL) THEN
    RAISE EXCEPTION 'A verified completion requires an internal case reference' USING ERRCODE = '22023';
  END IF;

  INSERT INTO meta_deletion_private.reviews (request_id, status, case_reference)
  VALUES (_request_id, _new_status, v_reference)
  ON CONFLICT (request_id) DO UPDATE
  SET status = EXCLUDED.status, case_reference = EXCLUDED.case_reference, updated_at = now();
  INSERT INTO meta_deletion_private.review_audit (request_id, actor_id, action)
  VALUES (_request_id, v_actor, _new_status);
  IF _new_status = 'completed' THEN
    -- Retain the receipt and replay fingerprint, and remove the exact subject
    -- identifier from this fulfilled request.
    UPDATE public.whatsapp_connection_events SET payload = payload - 'meta_user_id'
    WHERE id = _request_id;
  END IF;
END;
$$;

CREATE FUNCTION public.get_meta_deletion_subject(_request_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := meta_deletion_private.require_owner();
  v_subject text;
BEGIN
  SELECT e.payload->>'meta_user_id' INTO v_subject
  FROM public.whatsapp_connection_events e
  WHERE e.id = _request_id AND e.organization_id IS NULL AND e.event_type = 'meta_data_deletion_request'
  FOR UPDATE;

  IF v_subject IS NULL OR NOT EXISTS (
    SELECT 1 FROM meta_deletion_private.reviews r
    WHERE r.request_id = _request_id AND r.status = 'in_review'
  ) THEN
    RAISE EXCEPTION 'Subject unavailable for this review' USING ERRCODE = '22023';
  END IF;
  INSERT INTO meta_deletion_private.review_audit (request_id, actor_id, action)
  VALUES (_request_id, v_actor, 'subject_viewed');
  RETURN v_subject;
END;
$$;

CREATE FUNCTION public.get_meta_deletion_review_activity(_request_id uuid)
RETURNS TABLE (event_id text, action text, actor_id uuid, created_at timestamptz, case_reference text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM meta_deletion_private.require_owner();
  RETURN QUERY
  SELECT a.id::text, a.action, a.actor_id, a.created_at, CASE WHEN a.action = 'completed' THEN r.case_reference END
  FROM meta_deletion_private.review_audit a
  JOIN meta_deletion_private.reviews r ON r.request_id = a.request_id
  WHERE a.request_id = _request_id
  ORDER BY a.id DESC
  LIMIT 100;
END;
$$;

CREATE FUNCTION public.get_meta_deletion_request_status(_confirmation_code uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(r.status, 'received')
  FROM public.whatsapp_connection_events e
  LEFT JOIN meta_deletion_private.reviews r ON r.request_id = e.id
  WHERE e.event_type = 'meta_data_deletion_request' AND e.organization_id IS NULL
    AND e.payload->>'confirmation_code' = _confirmation_code::text
  ORDER BY e.created_at, e.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.receive_meta_deletion_request(text, uuid, text),
  public.record_meta_deletion_request(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.receive_meta_deletion_request(text, uuid, text),
  public.record_meta_deletion_request(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.list_meta_deletion_reviews(text, integer, uuid),
  public.set_meta_deletion_review(uuid, text, text, text),
  public.get_meta_deletion_subject(uuid), public.get_meta_deletion_review_activity(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_meta_deletion_reviews(text, integer, uuid),
  public.set_meta_deletion_review(uuid, text, text, text),
  public.get_meta_deletion_subject(uuid), public.get_meta_deletion_review_activity(uuid)
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_meta_deletion_request_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_meta_deletion_request_status(uuid) TO anon, authenticated;
