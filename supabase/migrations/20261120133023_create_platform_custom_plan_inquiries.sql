CREATE SCHEMA platform_inquiries_private;
REVOKE ALL ON SCHEMA platform_inquiries_private FROM PUBLIC, anon, authenticated;

CREATE TABLE platform_inquiries_private.custom_plan_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  phone_digits text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_inquiries_private.custom_plan_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE platform_inquiries_private.custom_plan_inquiries FROM PUBLIC, anon, authenticated;

CREATE INDEX custom_plan_inquiries_recent_idx
  ON platform_inquiries_private.custom_plan_inquiries (created_at DESC, id DESC);
CREATE INDEX custom_plan_inquiries_status_idx
  ON platform_inquiries_private.custom_plan_inquiries (status, created_at DESC, id DESC);
CREATE INDEX custom_plan_inquiries_email_idx
  ON platform_inquiries_private.custom_plan_inquiries (email, created_at DESC);
CREATE INDEX custom_plan_inquiries_phone_idx
  ON platform_inquiries_private.custom_plan_inquiries (phone_digits, created_at DESC)
  WHERE phone_digits IS NOT NULL;

CREATE FUNCTION public.submit_platform_custom_plan_inquiry(
  _request_id uuid, _company_name text, _contact_name text, _email text,
  _phone text, _message text, _consent boolean, _honeypot text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_company_name text;
  v_contact_name text;
  v_email text;
  v_phone text;
  v_phone_digits text;
  v_message text;
  v_existing platform_inquiries_private.custom_plan_inquiries%ROWTYPE;
  v_reference uuid;
  v_now timestamptz;
BEGIN
  IF _request_id IS NULL OR _request_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR _consent IS DISTINCT FROM true OR nullif(_honeypot, '') IS NOT NULL
    OR octet_length(_company_name) > 480 OR octet_length(_contact_name) > 480
    OR octet_length(_email) > 254 OR octet_length(_phone) > 32 OR octet_length(_message) > 6000
  THEN
    RAISE EXCEPTION 'invalid_custom_plan_inquiry' USING ERRCODE = '22023';
  END IF;

  v_company_name := btrim(coalesce(_company_name, ''));
  v_contact_name := btrim(coalesce(_contact_name, ''));
  v_email := lower(btrim(coalesce(_email, '')));
  v_phone := nullif(btrim(coalesce(_phone, '')), '');
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  v_message := btrim(coalesce(_message, ''), E' \t\r\n');

  IF char_length(v_company_name) NOT BETWEEN 2 AND 120
    OR char_length(v_contact_name) NOT BETWEEN 2 AND 120
    OR v_company_name ~ '[[:cntrl:]]' OR v_contact_name ~ '[[:cntrl:]]'
    OR v_email !~ '^[^[:space:][:cntrl:]@<>]+@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
    OR char_length(split_part(v_email, '@', 1)) > 64
    OR char_length(v_message) NOT BETWEEN 1 AND 1500
    OR regexp_replace(v_message, E'[\t\r\n]', '', 'g') ~ '[[:cntrl:]]'
    OR (v_phone IS NOT NULL AND (
      v_phone !~ '^[+]?[0-9() -]+$' OR char_length(v_phone_digits) NOT BETWEEN 7 AND 15
    ))
  THEN
    RAISE EXCEPTION 'invalid_custom_plan_inquiry' USING ERRCODE = '22023';
  END IF;

  -- Serialize the short quota check and insert so parallel callers cannot exceed the bounds.
  PERFORM pg_advisory_xact_lock(hashtextextended('platform.custom_plan_inquiries', 0));
  SELECT * INTO v_existing
  FROM platform_inquiries_private.custom_plan_inquiries
  WHERE request_id = _request_id;

  IF FOUND THEN
    IF (v_existing.company_name, v_existing.contact_name, v_existing.email, v_existing.phone, v_existing.message)
      IS DISTINCT FROM (v_company_name, v_contact_name, v_email, v_phone, v_message) THEN
      RAISE EXCEPTION 'invalid_custom_plan_inquiry' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('accepted', true, 'reference', v_existing.id);
  END IF;

  v_now := clock_timestamp();
  IF (SELECT count(*) FROM platform_inquiries_private.custom_plan_inquiries
    WHERE email = v_email AND created_at >= v_now - interval '1 day') >= 3
    OR (v_phone_digits IS NOT NULL AND (SELECT count(*) FROM platform_inquiries_private.custom_plan_inquiries
      WHERE phone_digits = v_phone_digits AND created_at >= v_now - interval '1 day') >= 3)
    OR (SELECT count(*) FROM platform_inquiries_private.custom_plan_inquiries
      WHERE created_at >= v_now - interval '1 hour') >= 500
    OR (SELECT count(*) FROM platform_inquiries_private.custom_plan_inquiries
      WHERE created_at >= v_now - interval '1 day') >= 5000
  THEN
    RAISE EXCEPTION 'custom_plan_inquiry_rate_limited' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO platform_inquiries_private.custom_plan_inquiries (
    request_id, company_name, contact_name, email, phone, phone_digits, message,
    consented_at, created_at, updated_at
  ) VALUES (
    _request_id, v_company_name, v_contact_name, v_email, v_phone, v_phone_digits, v_message,
    v_now, v_now, v_now
  ) RETURNING id INTO v_reference;

  RETURN jsonb_build_object('accepted', true, 'reference', v_reference);
END;
$$;

CREATE FUNCTION public.list_platform_custom_plan_inquiries(
  _status text DEFAULT NULL, _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_name text,
  email text,
  phone text,
  message text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin_v2(auth.uid()), false) THEN
    RAISE EXCEPTION 'platform_custom_plan_inquiries_denied' USING ERRCODE = '42501';
  END IF;
  IF (_status IS NOT NULL AND _status NOT IN ('new', 'contacted', 'closed'))
    OR coalesce(_offset, 0) NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'invalid_custom_plan_inquiry_filter' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
    SELECT q.id, q.company_name, q.contact_name, q.email, q.phone, q.message, q.status, q.created_at, q.updated_at
    FROM platform_inquiries_private.custom_plan_inquiries q
    WHERE _status IS NULL OR q.status = _status
    ORDER BY q.created_at DESC, q.id DESC
    LIMIT 51 OFFSET coalesce(_offset, 0);
END;
$$;

CREATE FUNCTION public.update_platform_custom_plan_inquiry_status(_id uuid, _status text, _expected_status text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing platform_inquiries_private.custom_plan_inquiries%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT coalesce(public.is_platform_admin_v2(v_actor), false) THEN
    RAISE EXCEPTION 'platform_custom_plan_inquiries_denied' USING ERRCODE = '42501';
  END IF;
  IF _id IS NULL OR _status IS NULL OR _expected_status IS NULL
    OR _status NOT IN ('new', 'contacted', 'closed') OR _expected_status NOT IN ('new', 'contacted', 'closed') THEN
    RAISE EXCEPTION 'invalid_custom_plan_inquiry_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM platform_inquiries_private.custom_plan_inquiries q
  WHERE q.id = _id FOR UPDATE;
  IF NOT FOUND OR v_existing.status IS DISTINCT FROM _expected_status THEN
    RAISE EXCEPTION 'custom_plan_inquiry_status_changed' USING ERRCODE = '40001';
  END IF;

  IF v_existing.status <> _status THEN
    UPDATE platform_inquiries_private.custom_plan_inquiries
    SET status = _status, updated_at = clock_timestamp()
    WHERE id = _id;

    INSERT INTO public.admin_audit_log (user_id, action, target_table, target_id, details)
    VALUES (v_actor, 'platform_custom_plan_inquiry_status_changed', 'platform_custom_plan_inquiries', _id,
      jsonb_build_object('old_status', v_existing.status, 'new_status', _status));

    SELECT * INTO v_existing
    FROM platform_inquiries_private.custom_plan_inquiries q
    WHERE q.id = _id;
  END IF;

  RETURN jsonb_build_object('id', v_existing.id, 'status', v_existing.status, 'updated_at', v_existing.updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_platform_custom_plan_inquiry(uuid, text, text, text, text, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_platform_custom_plan_inquiries(text, integer),
  public.update_platform_custom_plan_inquiry_status(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_platform_custom_plan_inquiry(uuid, text, text, text, text, text, boolean, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_platform_custom_plan_inquiries(text, integer),
  public.update_platform_custom_plan_inquiry_status(uuid, text, text) TO authenticated;
