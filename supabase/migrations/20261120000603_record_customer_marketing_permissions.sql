-- A contact preference is a veto. It is not proof of marketing consent.
CREATE TABLE IF NOT EXISTS operations_private.customer_marketing_consent_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  allowed boolean NOT NULL,
  destination_hash bytea,
  evidence_at timestamptz,
  evidence_reference text,
  source text NOT NULL CHECK (source IN ('recorded_opt_in', 'recorded_withdrawal', 'contact_changed')),
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (NOT allowed OR (destination_hash IS NOT NULL AND evidence_at IS NOT NULL AND evidence_reference IS NOT NULL))
);

ALTER TABLE operations_private.customer_marketing_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON operations_private.customer_marketing_consent_events FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX IF NOT EXISTS customer_marketing_consent_latest_idx ON operations_private.customer_marketing_consent_events
  (customer_id, organization_id, channel, id DESC);
CREATE INDEX IF NOT EXISTS suppressed_emails_normalized_for_marketing_idx
  ON public.suppressed_emails (public.normalize_email_address(email));
CREATE INDEX IF NOT EXISTS used_email_unsubscribes_normalized_for_marketing_idx
  ON public.email_unsubscribe_tokens (public.normalize_email_address(email))
  WHERE used_at IS NOT NULL;

CREATE OR REPLACE FUNCTION operations_private.marketing_contact_value(_channel text, _email text, _phone text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT CASE
    WHEN _channel = 'email' AND public.normalize_email_address(_email) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      THEN public.normalize_email_address(_email)
    WHEN _channel = 'whatsapp' AND public.normalize_phone_digits(_phone) ~ '^[1-9][0-9]{7,14}$'
      THEN public.normalize_phone_digits(_phone)
  END;
$$;
REVOKE ALL ON FUNCTION operations_private.marketing_contact_value(text, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION operations_private.set_customer_marketing_permission(
  _organization uuid, _customer uuid, _channel text, _allowed boolean, _evidence_at timestamptz, _evidence_reference text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_latest operations_private.customer_marketing_consent_events%ROWTYPE;
  v_contact text;
  v_reference text := nullif(btrim(_evidence_reference), '');
  v_now timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_organization, auth.uid(), 'customers_edit') p
      WHERE p.granted AND p.data_scope = 'organization'
    )
    OR (_allowed IS TRUE AND NOT coalesce(public.can_org_write(_organization), false))
  THEN
    RAISE EXCEPTION 'marketing_consent_access_denied' USING ERRCODE = '42501';
  END IF;
  IF _channel IS NULL OR _channel NOT IN ('email', 'whatsapp') OR _allowed IS NULL
    OR (_allowed AND (_evidence_at IS NULL OR NOT isfinite(_evidence_at)
      OR _evidence_at > v_now OR v_reference IS NULL OR length(v_reference) > 200))
  THEN
    RAISE EXCEPTION 'marketing_consent_evidence_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = _customer AND organization_id = _organization AND is_demo IS NOT TRUE
    AND (_allowed IS FALSE OR archived_at IS NULL)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketing_consent_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_latest FROM operations_private.customer_marketing_consent_events
  WHERE organization_id = _organization AND customer_id = _customer AND channel = _channel
  ORDER BY id DESC LIMIT 1;

  IF _allowed IS FALSE THEN
    IF v_latest.source = 'recorded_withdrawal' THEN RETURN; END IF;
    INSERT INTO operations_private.customer_marketing_consent_events
      (organization_id, customer_id, channel, allowed, source, recorded_by)
    VALUES (_organization, _customer, _channel, false, 'recorded_withdrawal', auth.uid());
    RETURN;
  END IF;

  v_contact := operations_private.marketing_contact_value(_channel, v_customer.email, v_customer.phone);
  IF v_contact IS NULL OR v_customer.communication_preferences->>_channel = 'false'
    OR (_channel = 'whatsapp' AND v_customer.whatsapp_opt_out)
  THEN
    RAISE EXCEPTION 'marketing_consent_contact_unavailable' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM operations_private.customer_marketing_consent_events e
    WHERE e.organization_id = _organization AND e.customer_id = _customer AND e.channel = _channel
      AND NOT e.allowed AND e.recorded_at >= _evidence_at
  ) THEN
    RAISE EXCEPTION 'marketing_consent_evidence_predates_withdrawal' USING ERRCODE = '22023';
  END IF;
  IF v_latest.allowed AND v_latest.evidence_at = _evidence_at AND v_latest.evidence_reference = v_reference
    AND v_latest.destination_hash = sha256(convert_to(v_contact, 'UTF8')) THEN RETURN; END IF;

  INSERT INTO operations_private.customer_marketing_consent_events
    (organization_id, customer_id, channel, allowed, destination_hash, evidence_at, evidence_reference, source, recorded_by)
  VALUES (_organization, _customer, _channel, true, sha256(convert_to(v_contact, 'UTF8')),
    _evidence_at, v_reference, 'recorded_opt_in', auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION operations_private.withdraw_stale_marketing_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_channel text;
BEGIN
  FOR v_channel IN SELECT unnest(ARRAY['email', 'whatsapp']) LOOP
    IF (OLD.organization_id IS DISTINCT FROM NEW.organization_id
      OR operations_private.marketing_contact_value(v_channel, OLD.email, OLD.phone)
         IS DISTINCT FROM operations_private.marketing_contact_value(v_channel, NEW.email, NEW.phone)
      OR ((NEW.communication_preferences->>v_channel) = 'false'
           AND (OLD.communication_preferences->>v_channel) IS DISTINCT FROM 'false')
      OR (v_channel = 'whatsapp' AND NEW.whatsapp_opt_out AND NOT OLD.whatsapp_opt_out))
      AND (SELECT e.allowed FROM operations_private.customer_marketing_consent_events e
        WHERE e.organization_id = OLD.organization_id AND e.customer_id = OLD.id AND e.channel = v_channel
        ORDER BY e.id DESC LIMIT 1)
    THEN
      INSERT INTO operations_private.customer_marketing_consent_events
        (organization_id, customer_id, channel, allowed, source, recorded_by)
      VALUES (OLD.organization_id, OLD.id, v_channel, false, 'contact_changed', auth.uid());
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.withdraw_stale_marketing_permissions() FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE TRIGGER withdraw_stale_marketing_permissions AFTER UPDATE OF email, phone, organization_id, communication_preferences, whatsapp_opt_out
ON public.customers FOR EACH ROW EXECUTE FUNCTION operations_private.withdraw_stale_marketing_permissions();

CREATE OR REPLACE FUNCTION operations_private.get_customer_marketing_permissions(_organization uuid, _customer uuid)
RETURNS TABLE (channel text, state text, evidence_at timestamptz, recorded_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_organization, auth.uid(), 'customers_view') p
      WHERE p.granted AND p.data_scope = 'organization'
    )
  THEN
    RAISE EXCEPTION 'marketing_consent_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = _customer AND organization_id = _organization AND is_demo IS NOT TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketing_consent_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT c.kind, CASE
    WHEN v_customer.archived_at IS NOT NULL THEN 'unavailable'
    WHEN v_customer.communication_preferences->>c.kind = 'false'
      OR (c.kind = 'whatsapp' AND v_customer.whatsapp_opt_out) THEN 'blocked_preference'
    WHEN e.source = 'recorded_withdrawal' THEN 'withdrawn'
    WHEN operations_private.marketing_contact_value(c.kind, v_customer.email, v_customer.phone) IS NULL THEN 'no_contact'
    WHEN e.source = 'contact_changed' THEN 'contact_changed'
    WHEN e.allowed IS FALSE THEN 'withdrawn'
    WHEN e.allowed THEN 'recorded'
    ELSE 'not_recorded'
  END, e.evidence_at, e.recorded_at
  FROM (VALUES ('email'), ('whatsapp')) c(kind)
  LEFT JOIN LATERAL (
    SELECT event.allowed, event.source, event.evidence_at, event.recorded_at
    FROM operations_private.customer_marketing_consent_events event
    WHERE event.organization_id = _organization AND event.customer_id = _customer AND event.channel = c.kind
    ORDER BY event.id DESC LIMIT 1
  ) e ON TRUE;
END;
$$;

-- Evaluates platform suppressions only for a trusted worker and its exact current destination.
CREATE OR REPLACE FUNCTION operations_private.customer_marketing_contact_allowed(
  _organization uuid, _customer uuid, _channel text, _destination text
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_contact text;
BEGIN
  IF _channel IS NULL OR _channel NOT IN ('email', 'whatsapp')
    OR NOT coalesce(public.org_has_active_subscription(_organization), false)
  THEN RETURN false; END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = _customer AND organization_id = _organization AND is_demo IS NOT TRUE AND archived_at IS NULL;
  IF NOT FOUND OR v_customer.communication_preferences->>_channel = 'false'
    OR (_channel = 'whatsapp' AND v_customer.whatsapp_opt_out)
  THEN RETURN false; END IF;

  v_contact := operations_private.marketing_contact_value(_channel, v_customer.email, v_customer.phone);
  IF v_contact IS NULL OR v_contact IS DISTINCT FROM operations_private.marketing_contact_value(_channel, _destination, _destination)
  THEN RETURN false; END IF;

  IF _channel = 'email' AND (
    EXISTS (SELECT 1 FROM public.suppressed_emails WHERE public.normalize_email_address(email) = v_contact)
    OR EXISTS (SELECT 1 FROM public.email_unsubscribe_tokens
      WHERE used_at IS NOT NULL AND public.normalize_email_address(email) = v_contact)
  ) THEN RETURN false; END IF;

  RETURN coalesce((
    SELECT e.allowed AND e.destination_hash = sha256(convert_to(v_contact, 'UTF8'))
    FROM operations_private.customer_marketing_consent_events e
    WHERE e.organization_id = _organization AND e.customer_id = _customer AND e.channel = _channel
    ORDER BY e.id DESC LIMIT 1
  ), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_marketing_permission(
  _organization uuid, _customer uuid, _channel text, _allowed boolean, _evidence_at timestamptz, _evidence_reference text
)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT operations_private.set_customer_marketing_permission(
  _organization, _customer, _channel, _allowed, _evidence_at, _evidence_reference); $$;

CREATE OR REPLACE FUNCTION public.get_customer_marketing_permissions(_organization uuid, _customer uuid)
RETURNS TABLE (channel text, state text, evidence_at timestamptz, recorded_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM operations_private.get_customer_marketing_permissions(_organization, _customer); $$;

CREATE OR REPLACE FUNCTION public.customer_marketing_contact_allowed(_organization uuid, _customer uuid, _channel text, _destination text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT operations_private.customer_marketing_contact_allowed(_organization, _customer, _channel, _destination); $$;

REVOKE ALL ON FUNCTION operations_private.set_customer_marketing_permission(uuid, uuid, text, boolean, timestamptz, text),
  operations_private.get_customer_marketing_permissions(uuid, uuid),
  public.set_customer_marketing_permission(uuid, uuid, text, boolean, timestamptz, text),
  public.get_customer_marketing_permissions(uuid, uuid)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION operations_private.set_customer_marketing_permission(uuid, uuid, text, boolean, timestamptz, text),
  operations_private.get_customer_marketing_permissions(uuid, uuid),
  public.set_customer_marketing_permission(uuid, uuid, text, boolean, timestamptz, text),
  public.get_customer_marketing_permissions(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION operations_private.customer_marketing_contact_allowed(uuid, uuid, text, text),
  public.customer_marketing_contact_allowed(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA operations_private TO service_role;
GRANT EXECUTE ON FUNCTION operations_private.customer_marketing_contact_allowed(uuid, uuid, text, text),
  public.customer_marketing_contact_allowed(uuid, uuid, text, text) TO service_role;
