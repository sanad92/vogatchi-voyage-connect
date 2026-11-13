BEGIN;

CREATE POLICY platform_owner_reads_domain_events ON public.domain_events FOR SELECT TO authenticated
  USING ((SELECT public.has_platform_role(auth.uid(), 'platform_owner'::public.platform_role)));
CREATE POLICY platform_owner_reads_event_deliveries ON public.event_deliveries FOR SELECT TO authenticated
  USING ((SELECT public.has_platform_role(auth.uid(), 'platform_owner'::public.platform_role)));

CREATE OR REPLACE FUNCTION public.retry_event_delivery(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.event_deliveries SET status = 'pending', attempts = 0, next_retry_at = now(), last_error = NULL, updated_at = now()
  WHERE id = p_delivery_id AND status IN ('failed', 'dead');
  IF NOT FOUND THEN RAISE EXCEPTION 'No failed delivery to retry' USING ERRCODE = '22023'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.replay_event(p_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.event_deliveries SET status = 'pending', attempts = 0, next_retry_at = now(), last_error = NULL, updated_at = now()
  WHERE event_id = p_event_id AND status IN ('failed', 'dead');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION public.process_event_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_event_deliveries(integer) TO service_role;

-- Old browser-created sessions are ineligible for the new, token-bound flow.
ALTER TABLE public.impersonation_sessions ADD COLUMN auth_session_id uuid;
REVOKE INSERT, UPDATE ON public.impersonation_sessions FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS imp_platform_insert ON public.impersonation_sessions;
DROP POLICY IF EXISTS imp_platform_close ON public.impersonation_sessions;

REVOKE SELECT, INSERT, UPDATE ON public.security_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (organization_id, mfa_required, session_timeout_min, ip_allowlist, password_policy, org_pin_set_at, created_at, updated_at)
  ON public.security_settings TO authenticated;
GRANT INSERT (organization_id, mfa_required, session_timeout_min, ip_allowlist, password_policy),
  UPDATE (organization_id, mfa_required, session_timeout_min, ip_allowlist, password_policy)
  ON public.security_settings TO authenticated;

CREATE FUNCTION platform_company_private.verified_support_session_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id FROM auth.sessions s
  WHERE s.id = (auth.jwt()->>'session_id')::uuid AND s.user_id = auth.uid()
    AND auth.jwt()->>'aal' = 'aal2' AND s.aal::text = 'aal2'
    AND (s.not_after IS NULL OR s.not_after > now())
    AND coalesce(public.is_platform_admin(auth.uid()), false)
$$;
REVOKE ALL ON FUNCTION platform_company_private.verified_support_session_id() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_org_pin(_org_id uuid, _pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id
    AND user_id = auth.uid() AND role IN ('owner','admin') AND is_active) THEN
    RAISE EXCEPTION 'Organization administrator required' USING ERRCODE = '42501';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'PIN must be 6 digits' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.security_settings(organization_id, org_pin_hash, org_pin_set_at)
    VALUES (_org_id, extensions.crypt(_pin, extensions.gen_salt('bf')), now())
  ON CONFLICT (organization_id) DO UPDATE
    SET org_pin_hash = excluded.org_pin_hash, org_pin_set_at = now(), updated_at = now();
END $$;

DROP FUNCTION public.start_impersonation(uuid, uuid, text, text, boolean);
CREATE FUNCTION public.start_impersonation(_target_org_id uuid, _org_pin text, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_auth_session uuid := platform_company_private.verified_support_session_id();
  v_pin_hash text;
  v_session uuid;
  v_reason text := btrim(coalesce(_reason, ''));
BEGIN
  IF v_auth_session IS NULL THEN RAISE EXCEPTION 'Verified MFA session required' USING ERRCODE = '42501'; END IF;
  IF char_length(v_reason) NOT BETWEEN 10 AND 500 OR _org_pin IS NULL OR _org_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Valid PIN and a reason of 10 to 500 characters are required' USING ERRCODE = '22023';
  END IF;
  SELECT s.org_pin_hash INTO v_pin_hash FROM public.security_settings s
  JOIN public.organizations o ON o.id = s.organization_id WHERE o.id = _target_org_id;
  IF v_pin_hash IS NULL OR extensions.crypt(_org_pin, v_pin_hash) IS DISTINCT FROM v_pin_hash THEN
    RAISE EXCEPTION 'Organization PIN is missing or incorrect' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 9052));
  UPDATE public.impersonation_sessions SET ended_at = now() WHERE super_admin_id = auth.uid() AND ended_at IS NULL;
  INSERT INTO public.impersonation_sessions(super_admin_id, target_org_id, reason, mfa_verified, org_pin_verified, auth_session_id)
  VALUES (auth.uid(), _target_org_id, v_reason, true, true, v_auth_session) RETURNING id INTO v_session;
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES (auth.uid(), 'impersonation_started', 'impersonation_sessions', v_session, _target_org_id,
    jsonb_build_object('session_id', v_session, 'reason', v_reason));
  RETURN v_session;
END $$;

CREATE OR REPLACE FUNCTION public.get_active_impersonation()
RETURNS TABLE(session_id uuid, target_org_id uuid, target_user_id uuid, reason text, started_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id, s.target_org_id, s.target_user_id, s.reason, s.started_at FROM public.impersonation_sessions s
  WHERE s.super_admin_id = auth.uid() AND s.auth_session_id = platform_company_private.verified_support_session_id()
    AND s.ended_at IS NULL AND s.started_at + interval '30 minutes' > now()
  ORDER BY s.started_at DESC, s.id DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.stop_impersonation()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  WITH closed AS (
    UPDATE public.impersonation_sessions s SET ended_at = now()
    WHERE s.super_admin_id = auth.uid() AND s.auth_session_id::text = auth.jwt()->>'session_id' AND s.ended_at IS NULL
    RETURNING s.id, s.target_org_id, s.started_at
  )
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  SELECT auth.uid(), 'impersonation_stopped', 'impersonation_sessions', c.id, c.target_org_id,
    jsonb_build_object('session_id', c.id, 'duration_seconds', extract(epoch from (now() - c.started_at))) FROM closed c;
END $$;

CREATE OR REPLACE FUNCTION public.audit_tag_impersonation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_session uuid;
BEGIN
  SELECT s.session_id INTO v_session FROM public.get_active_impersonation() s WHERE s.target_org_id = NEW.organization_id;
  IF v_session IS NOT NULL THEN
    NEW.details := coalesce(NEW.details, '{}'::jsonb) || jsonb_build_object('impersonation_session_id', v_session);
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.platform_support_booking_snapshot()
RETURNS TABLE (booking_number text, booking_type text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org uuid;
BEGIN
  SELECT s.target_org_id INTO v_org FROM public.get_active_impersonation() s;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Active support session required' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT b.booking_number, b.booking_type, b.status, b.created_at FROM public.bookings b
    WHERE b.organization_id = v_org ORDER BY b.created_at DESC NULLS LAST, b.id DESC LIMIT 20;
END $$;

REVOKE ALL ON FUNCTION public.start_impersonation(uuid,text,text), public.platform_support_booking_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_impersonation(uuid,text,text), public.platform_support_booking_snapshot() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
