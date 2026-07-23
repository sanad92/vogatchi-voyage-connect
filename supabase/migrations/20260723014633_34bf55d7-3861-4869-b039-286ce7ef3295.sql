
-- Phase 7: SaaS core tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_org_read" ON public.branches FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "branches_org_write" ON public.branches FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')));

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_org_read" ON public.departments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "departments_org_write" ON public.departments FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')));

-- 3. Add branch/department to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 4. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, flag_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_org_read" ON public.feature_flags FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "flags_org_write" ON public.feature_flags FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')));

-- 5. WHITE LABEL
CREATE TABLE IF NOT EXISTS public.white_label_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  custom_domain TEXT,
  email_from_name TEXT,
  support_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.white_label_settings TO authenticated;
GRANT ALL ON public.white_label_settings TO service_role;
ALTER TABLE public.white_label_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wl_org_read" ON public.white_label_settings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "wl_org_write" ON public.white_label_settings FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')));

-- 6. SECURITY SETTINGS
CREATE TABLE IF NOT EXISTS public.security_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  session_timeout_min INTEGER NOT NULL DEFAULT 480,
  ip_allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,
  password_policy JSONB NOT NULL DEFAULT '{"min_length":8,"require_upper":true,"require_number":true,"require_symbol":false}'::jsonb,
  org_pin_hash TEXT, -- hashed 6-digit PIN for Act-As
  org_pin_set_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_settings TO authenticated;
GRANT ALL ON public.security_settings TO service_role;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
-- Members can read (but pin_hash won't be exposed via UI); only owners/admins can write
CREATE POLICY "sec_org_read" ON public.security_settings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "sec_org_write" ON public.security_settings FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active AND role IN ('owner','admin')));

-- 7. IMPERSONATION SESSIONS (append-only, platform-admin only)
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (length(reason) >= 10),
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  org_pin_verified BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON public.impersonation_sessions(super_admin_id) WHERE ended_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imp_platform_read" ON public.impersonation_sessions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR super_admin_id = auth.uid());
CREATE POLICY "imp_platform_insert" ON public.impersonation_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) AND super_admin_id = auth.uid());
CREATE POLICY "imp_platform_close" ON public.impersonation_sessions FOR UPDATE TO authenticated
  USING (super_admin_id = auth.uid() AND ended_at IS NULL)
  WITH CHECK (super_admin_id = auth.uid());

-- Prevent immutability violations
CREATE OR REPLACE FUNCTION public.impersonation_prevent_reopen()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.ended_at IS NOT NULL THEN RAISE EXCEPTION 'session already closed'; END IF;
  -- only allow closing (setting ended_at)
  IF NEW.reason <> OLD.reason OR NEW.super_admin_id <> OLD.super_admin_id OR NEW.target_org_id <> OLD.target_org_id THEN
    RAISE EXCEPTION 'immutable fields';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_impersonation_immutable ON public.impersonation_sessions;
CREATE TRIGGER trg_impersonation_immutable BEFORE UPDATE ON public.impersonation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.impersonation_prevent_reopen();

-- 8. RPCs: Act-As flow
CREATE OR REPLACE FUNCTION public.set_org_pin(_org_id UUID, _pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = auth.uid() AND role IN ('owner','admin') AND is_active) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _pin !~ '^\d{6}$' THEN RAISE EXCEPTION 'pin must be 6 digits'; END IF;
  INSERT INTO public.security_settings(organization_id, org_pin_hash, org_pin_set_at)
    VALUES (_org_id, crypt(_pin, gen_salt('bf')), now())
    ON CONFLICT (organization_id) DO UPDATE
      SET org_pin_hash = crypt(_pin, gen_salt('bf')), org_pin_set_at = now(), updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.set_org_pin(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_org_pin(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_impersonation(
  _target_org_id UUID, _target_user_id UUID, _org_pin TEXT, _reason TEXT, _mfa_verified BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pin_hash TEXT;
  _session_id UUID;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'not a platform admin'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN RAISE EXCEPTION 'reason required (min 10 chars)'; END IF;
  IF NOT COALESCE(_mfa_verified, false) THEN RAISE EXCEPTION 'MFA verification required'; END IF;
  SELECT org_pin_hash INTO _pin_hash FROM public.security_settings WHERE organization_id = _target_org_id;
  IF _pin_hash IS NULL THEN RAISE EXCEPTION 'target org has no PIN configured'; END IF;
  IF _pin_hash <> crypt(_org_pin, _pin_hash) THEN RAISE EXCEPTION 'invalid org PIN'; END IF;

  -- Auto-close any prior active session for this admin
  UPDATE public.impersonation_sessions SET ended_at = now()
    WHERE super_admin_id = auth.uid() AND ended_at IS NULL;

  INSERT INTO public.impersonation_sessions(super_admin_id, target_org_id, target_user_id, reason, mfa_verified, org_pin_verified)
    VALUES (auth.uid(), _target_org_id, _target_user_id, _reason, true, true)
    RETURNING id INTO _session_id;

  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
    VALUES (auth.uid(), 'impersonation_started', 'impersonation_sessions', _session_id, _target_org_id,
      jsonb_build_object('session_id', _session_id, 'target_user_id', _target_user_id, 'reason', _reason));

  RETURN _session_id;
END $$;
REVOKE ALL ON FUNCTION public.start_impersonation(UUID, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_impersonation(UUID, UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.stop_impersonation()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s RECORD;
BEGIN
  UPDATE public.impersonation_sessions SET ended_at = now()
    WHERE super_admin_id = auth.uid() AND ended_at IS NULL
    RETURNING * INTO _s;
  IF _s.id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
      VALUES (auth.uid(), 'impersonation_stopped', 'impersonation_sessions', _s.id, _s.target_org_id,
        jsonb_build_object('session_id', _s.id, 'duration_seconds', extract(epoch from (now() - _s.started_at))));
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.stop_impersonation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stop_impersonation() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_impersonation()
RETURNS TABLE(session_id UUID, target_org_id UUID, target_user_id UUID, reason TEXT, started_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id, target_org_id, target_user_id, reason, started_at
  FROM public.impersonation_sessions
  WHERE super_admin_id = auth.uid() AND ended_at IS NULL
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_active_impersonation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_impersonation() TO authenticated;

-- 9. Audit trigger: tag admin_audit_log with active session_id if any
CREATE OR REPLACE FUNCTION public.audit_tag_impersonation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid UUID;
BEGIN
  SELECT id INTO _sid FROM public.impersonation_sessions
    WHERE super_admin_id = auth.uid() AND ended_at IS NULL LIMIT 1;
  IF _sid IS NOT NULL THEN
    NEW.details := COALESCE(NEW.details, '{}'::jsonb) || jsonb_build_object('impersonation_session_id', _sid);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_tag_impersonation ON public.admin_audit_log;
CREATE TRIGGER trg_audit_tag_impersonation BEFORE INSERT ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_tag_impersonation();

-- 10. updated_at triggers
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wl_updated BEFORE UPDATE ON public.white_label_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sec_updated BEFORE UPDATE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
