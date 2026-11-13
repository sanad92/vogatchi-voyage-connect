BEGIN;

DROP POLICY IF EXISTS "Admin manage system_settings" ON public.system_settings;
CREATE POLICY platform_owner_reads_system_settings ON public.system_settings
  FOR SELECT TO authenticated
  USING ((SELECT public.has_platform_role(auth.uid(), 'platform_owner')));

CREATE POLICY read_safar_landing_settings ON public.system_settings
  FOR SELECT TO anon, authenticated
  USING (is_public AND category = 'landing' AND setting_key IN
    ('safar_landing_headline', 'safar_landing_intro', 'safar_landing_footer', 'safar_landing_phone'));

INSERT INTO public.system_settings (setting_key, setting_value, category, description, is_public)
VALUES
  ('safar_landing_headline', 'نظام إدارة شركات السياحة', 'landing', 'العنوان أسفل اسم المنصة', true),
  ('safar_landing_intro', 'SafarERP يجمع إدارة العملاء، عروض الأسعار، الحجوزات، التشغيل والحسابات في منصة واحدة مصممة لطريقة عمل شركات السياحة العربية.', 'landing', 'مقدمة الصفحة الرئيسية', true),
  ('safar_landing_footer', 'منصة لإدارة دورة العمل داخل شركات السياحة والسفر—من طلب العميل حتى الحجز والتحصيل والربحية.', 'landing', 'الوصف أسفل الصفحة', true),
  ('safar_landing_phone', '+201103442886', 'landing', 'هاتف التواصل على الصفحة الرئيسية', true)
ON CONFLICT (setting_key) DO NOTHING;

CREATE FUNCTION platform_company_private.save_safar_platform_setting(p_key text, p_value text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_previous text;
  v_id uuid;
  v_value text := btrim(p_value);
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  IF p_key IS NULL OR p_key NOT IN ('site_name', 'site_description', 'company_name', 'company_phone', 'company_email', 'company_address',
      'safar_landing_headline', 'safar_landing_intro', 'safar_landing_footer', 'safar_landing_phone')
     OR v_value IS NULL OR char_length(v_value) NOT BETWEEN 1 AND 500
     OR (p_key IN ('site_name', 'company_name', 'safar_landing_headline') AND char_length(v_value) > 100)
     OR (p_key = 'company_email' AND v_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
     OR (p_key = 'company_phone' AND v_value !~ '^[+]?[0-9][0-9 ()-]{6,23}[0-9]$')
     OR (p_key = 'safar_landing_phone' AND v_value !~ '^[+][1-9][0-9]{7,14}$') THEN
    RAISE EXCEPTION 'Invalid setting or value' USING ERRCODE = '22023';
  END IF;
  SELECT id, setting_value INTO v_id, v_previous FROM public.system_settings WHERE setting_key = p_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown setting' USING ERRCODE = '22023'; END IF;
  IF v_previous IS DISTINCT FROM v_value THEN
    UPDATE public.system_settings SET setting_value = v_value, updated_at = now() WHERE id = v_id;
    INSERT INTO public.admin_audit_log (user_id, action, target_table, target_id, details)
    VALUES (auth.uid(), 'platform_setting_updated', 'system_settings', v_id, jsonb_build_object('setting_key', p_key));
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.update_system_setting(setting_key_param text, setting_value_param text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT platform_company_private.save_safar_platform_setting(setting_key_param, setting_value_param)
$$;

CREATE FUNCTION platform_company_private.list_safar_platform_security_events()
RETURNS TABLE(id uuid, action text, target_table text, setting_key text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false) THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT l.id, l.action, l.target_table,
    CASE WHEN l.action = 'platform_setting_updated' THEN l.details->>'setting_key' END,
    l.created_at
  FROM public.admin_audit_log l
  WHERE l.organization_id IS NULL OR (
    l.target_table = 'impersonation_sessions'
    AND l.action IN ('impersonation_started', 'impersonation_stopped')
    AND EXISTS (SELECT 1 FROM public.impersonation_sessions s
      WHERE s.id = l.target_id AND s.target_org_id = l.organization_id AND s.super_admin_id = l.user_id)
  )
  ORDER BY l.created_at DESC NULLS LAST, l.id DESC
  LIMIT 50;
END $$;

CREATE FUNCTION public.platform_security_events()
RETURNS TABLE(id uuid, action text, target_table text, setting_key text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM platform_company_private.list_safar_platform_security_events()
$$;

REVOKE ALL ON FUNCTION platform_company_private.save_safar_platform_setting(text, text),
  platform_company_private.list_safar_platform_security_events(), public.update_system_setting(text, text),
  public.platform_security_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_company_private.save_safar_platform_setting(text, text),
  platform_company_private.list_safar_platform_security_events(), public.update_system_setting(text, text),
  public.platform_security_events() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
