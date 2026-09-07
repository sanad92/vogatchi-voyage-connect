-- Company-scoped roles and permissions.
--
-- The legacy organization_members.role remains the coarse safety baseline. These
-- tables let each company define its own named roles, assign them to members,
-- and override a single permission without changing the global role enum.

CREATE TABLE IF NOT EXISTS public.organization_permission_catalog (
  permission_key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  default_scope TEXT NOT NULL DEFAULT 'organization'
    CHECK (default_scope IN ('none', 'own', 'team', 'branch', 'organization')),
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_permission_catalog TO authenticated;
ALTER TABLE public.organization_permission_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_permission_catalog_read ON public.organization_permission_catalog;
CREATE POLICY organization_permission_catalog_read
  ON public.organization_permission_catalog FOR SELECT TO authenticated
  USING (true);

-- Keep this catalog aligned with src/lib/accessControl.ts. The generated
-- category/action keys cover the normal CRUD/report screens; the explicit list
-- covers workflow and approval actions that do not follow that shape.
WITH categories(module) AS (
  VALUES
    ('customers'), ('bookings'), ('invoices'), ('suppliers'), ('reports'),
    ('employees'), ('expenses'), ('system'), ('banking'), ('crm'),
    ('payments'), ('team'), ('financial'), ('customer_service'),
    ('customer_portal'), ('whatsapp'), ('admin'), ('automation'), ('audit'),
    ('documents'), ('quotes'), ('marketing')
), actions(action) AS (
  VALUES ('view'), ('create'), ('edit'), ('delete'), ('export'), ('advanced')
)
INSERT INTO public.organization_permission_catalog (permission_key, module, label_ar, is_sensitive)
SELECT c.module || '_' || a.action,
       c.module,
       c.module || ' / ' || a.action,
       c.module IN ('financial', 'banking', 'system', 'admin', 'audit')
FROM categories c
CROSS JOIN actions a
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.organization_permission_catalog
  (permission_key, module, label_ar, is_sensitive)
VALUES
  ('invoices_send', 'invoices', 'إرسال الفواتير', false),
  ('invoices_payment', 'invoices', 'تسجيل سداد الفواتير', true),
  ('bookings_cancel', 'bookings', 'إلغاء الحجوزات', true),
  ('bookings_confirm', 'bookings', 'تأكيد الحجوزات', true),
  ('suppliers_contracts', 'suppliers', 'عقود الموردين', true),
  ('employees_salary', 'employees', 'بيانات الرواتب', true),
  ('employees_commission', 'employees', 'العمولات', true),
  ('expenses_approve', 'expenses', 'اعتماد المصروفات', true),
  ('system_users', 'system', 'إدارة المستخدمين', true),
  ('system_settings', 'system', 'إعدادات النظام', true),
  ('system_backup', 'system', 'النسخ الاحتياطي', true),
  ('system_audit', 'system', 'سجل النظام', true),
  ('banking_transactions', 'banking', 'حركات البنوك', true),
  ('banking_transfer', 'banking', 'التحويلات البنكية', true),
  ('crm_follow_ups', 'crm', 'متابعات العملاء', false),
  ('crm_campaigns', 'crm', 'حملات العملاء', false),
  ('crm_segments', 'crm', 'شرائح العملاء', false),
  ('payments_refund', 'payments', 'رد المدفوعات', true),
  ('payments_process', 'payments', 'معالجة المدفوعات', true),
  ('team_invite', 'team', 'دعوة أعضاء الفريق', true),
  ('team_manage_roles', 'team', 'إدارة الأدوار', true),
  ('financial_view', 'financial', 'عرض البيانات المالية', true),
  ('financial_edit', 'financial', 'تعديل البيانات المالية', true),
  ('customer_service_view', 'customer_service', 'عرض خدمة العملاء', false),
  ('customer_service_edit', 'customer_service', 'تعديل خدمة العملاء', false),
  ('customer_portal_view', 'customer_portal', 'بوابة العميل', false),
  ('whatsapp_view', 'whatsapp', 'صندوق واتساب', false),
  ('whatsapp_admin', 'whatsapp', 'إدارة واتساب', true),
  ('admin_settings', 'admin', 'إعدادات المؤسسة', true),
  ('automation_view', 'automation', 'عرض الأتمتة', false),
  ('automation_edit', 'automation', 'تعديل الأتمتة', true),
  ('audit_view', 'audit', 'عرض سجل التدقيق', true),
  ('documents_view', 'documents', 'عرض المستندات', false),
  ('documents_create', 'documents', 'إنشاء المستندات', false),
  ('quotes_view', 'quotes', 'عرض عروض الأسعار', false),
  ('quotes_create', 'quotes', 'إنشاء عروض الأسعار', false),
  ('quotes_edit', 'quotes', 'تعديل عروض الأسعار', false),
  ('quotes_delete', 'quotes', 'حذف عروض الأسعار', true),
  ('marketing_view', 'marketing', 'عرض التسويق', false),
  ('marketing_edit', 'marketing', 'تعديل التسويق', false),
  -- Legacy detailed-permissions keys remain available while old screens are
  -- migrated to the company-scoped catalog.
  ('view_financial_reports', 'financial', 'التقارير المالية القديمة', true),
  ('manage_invoices', 'invoices', 'إدارة الفواتير القديمة', true),
  ('manage_payments', 'payments', 'إدارة المدفوعات القديمة', true),
  ('manage_exchange_rates', 'financial', 'أسعار الصرف', true),
  ('manage_customers', 'customers', 'إدارة العملاء القديمة', false),
  ('view_customer_history', 'customers', 'تاريخ العملاء', false),
  ('manage_follow_ups', 'crm', 'إدارة المتابعات القديمة', false),
  ('handle_complaints', 'customer_service', 'معالجة الشكاوى', false),
  ('manage_system_settings', 'system', 'إدارة إعدادات النظام القديمة', true),
  ('view_audit_logs', 'audit', 'سجلات التدقيق القديمة', true),
  ('manage_backups', 'system', 'إدارة النسخ الاحتياطية القديمة', true),
  ('view_all_reports', 'reports', 'كل التقارير القديمة', true),
  ('export_data', 'reports', 'تصدير البيانات القديمة', true),
  ('create_users', 'team', 'إنشاء المستخدمين القديمة', true),
  ('edit_users', 'team', 'تعديل المستخدمين القديمة', true),
  ('manage_user_roles', 'team', 'إدارة الأدوار القديمة', true)
ON CONFLICT (permission_key) DO UPDATE SET
  module = EXCLUDED.module,
  label_ar = EXCLUDED.label_ar,
  is_sensitive = EXCLUDED.is_sensitive,
  is_active = true;

CREATE TABLE IF NOT EXISTS public.organization_permission_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  description TEXT,
  inherits_base_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.organization_permission_role_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.organization_permission_catalog(permission_key),
  granted BOOLEAN NOT NULL DEFAULT true,
  data_scope TEXT NOT NULL DEFAULT 'organization'
    CHECK (data_scope IN ('none', 'own', 'team', 'branch', 'organization')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_key),
  FOREIGN KEY (role_id, organization_id)
    REFERENCES public.organization_permission_roles(id, organization_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.organization_permission_role_assignments (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, role_id),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_members(organization_id, user_id)
    ON DELETE CASCADE,
  FOREIGN KEY (role_id, organization_id)
    REFERENCES public.organization_permission_roles(id, organization_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.organization_permission_overrides (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.organization_permission_catalog(permission_key),
  granted BOOLEAN NOT NULL,
  data_scope TEXT NOT NULL DEFAULT 'organization'
    CHECK (data_scope IN ('none', 'own', 'team', 'branch', 'organization')),
  reason TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, permission_key),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_members(organization_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_permission_roles_org
  ON public.organization_permission_roles(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_permission_grants_role
  ON public.organization_permission_role_grants(organization_id, role_id, permission_key);
CREATE INDEX IF NOT EXISTS idx_org_permission_assignments_member
  ON public.organization_permission_role_assignments(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_permission_overrides_member
  ON public.organization_permission_overrides(organization_id, user_id, permission_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_permission_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_permission_role_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_permission_role_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_permission_overrides TO authenticated;
GRANT ALL ON public.organization_permission_roles TO service_role;
GRANT ALL ON public.organization_permission_role_grants TO service_role;
GRANT ALL ON public.organization_permission_role_assignments TO service_role;
GRANT ALL ON public.organization_permission_overrides TO service_role;

ALTER TABLE public.organization_permission_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permission_role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permission_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_permission_roles_read ON public.organization_permission_roles;
DROP POLICY IF EXISTS organization_permission_roles_manage ON public.organization_permission_roles;
CREATE POLICY organization_permission_roles_read ON public.organization_permission_roles
  FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY organization_permission_roles_manage ON public.organization_permission_roles
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS organization_permission_grants_read ON public.organization_permission_role_grants;
DROP POLICY IF EXISTS organization_permission_grants_manage ON public.organization_permission_role_grants;
CREATE POLICY organization_permission_grants_read ON public.organization_permission_role_grants
  FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY organization_permission_grants_manage ON public.organization_permission_role_grants
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS organization_permission_assignments_read ON public.organization_permission_role_assignments;
DROP POLICY IF EXISTS organization_permission_assignments_manage ON public.organization_permission_role_assignments;
CREATE POLICY organization_permission_assignments_read ON public.organization_permission_role_assignments
  FOR SELECT TO authenticated
  USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY organization_permission_assignments_manage ON public.organization_permission_role_assignments
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS organization_permission_overrides_read ON public.organization_permission_overrides;
DROP POLICY IF EXISTS organization_permission_overrides_manage ON public.organization_permission_overrides;
CREATE POLICY organization_permission_overrides_read ON public.organization_permission_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY organization_permission_overrides_manage ON public.organization_permission_overrides
  FOR ALL TO authenticated
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin') OR public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public._org_default_permission(
  _org_id UUID,
  _user_id UUID,
  _role TEXT,
  _permission TEXT
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'manager' THEN _permission = ANY (ARRAY[
      'customers_view','customers_create','customers_edit','customers_export',
      'bookings_view','bookings_create','bookings_edit','bookings_cancel','bookings_confirm',
      'invoices_view','invoices_create','invoices_edit','invoices_send','invoices_payment',
      'suppliers_view','suppliers_create','suppliers_edit',
      'reports_view','reports_export','reports_advanced',
      'employees_view','employees_edit','employees_commission',
      'expenses_view','expenses_create','expenses_approve',
      'banking_view','banking_transactions',
      'crm_view','crm_create','crm_edit','crm_follow_ups','crm_campaigns','crm_segments',
      'payments_view','payments_create','payments_process',
      'team_view','team_invite','team_manage_roles',
      'financial_view',
      'customer_service_view','customer_service_edit',
      'customer_portal_view','whatsapp_view',
      'marketing_view','marketing_edit','documents_view','documents_create',
      'quotes_view','quotes_create','quotes_edit'
    ])
    WHEN _role = 'viewer' THEN _permission = ANY (ARRAY[
      'customers_view','bookings_view','invoices_view','suppliers_view',
      'crm_view','payments_view','documents_view','quotes_view'
    ])
    WHEN _role = 'agent' THEN
      _permission = ANY (ARRAY['team_view','documents_view'])
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.sop_department_members d0
          WHERE d0.organization_id = _org_id AND d0.user_id = _user_id
        )
        AND _permission = ANY (ARRAY['customers_view','bookings_view','crm_view','quotes_view','invoices_view'])
      )
      OR EXISTS (
        SELECT 1
        FROM public.sop_department_members d
        WHERE d.organization_id = _org_id
          AND d.user_id = _user_id
          AND CASE d.department::text
            WHEN 'customer_service' THEN _permission = ANY (ARRAY[
              'customers_view','customers_create','customers_edit','crm_view','crm_create','crm_edit',
              'crm_follow_ups','customer_service_view','customer_service_edit','whatsapp_view',
              'bookings_view','quotes_view','documents_create'
            ])
            WHEN 'sales' THEN _permission = ANY (ARRAY[
              'customers_view','customers_create','customers_edit','crm_view','crm_create','crm_edit',
              'crm_follow_ups','quotes_view','quotes_create','quotes_edit','bookings_view',
              'invoices_view','payments_view','documents_create'
            ])
            WHEN 'reservations' THEN _permission = ANY (ARRAY[
              'customers_view','crm_view','bookings_view','bookings_create','bookings_edit',
              'bookings_confirm','bookings_cancel','suppliers_view','suppliers_create','suppliers_edit',
              'suppliers_contracts','quotes_view','quotes_create','quotes_edit','invoices_view',
              'payments_view','documents_create'
            ])
            WHEN 'operations' THEN _permission = ANY (ARRAY[
              'customers_view','bookings_view','bookings_edit','bookings_confirm','suppliers_view',
              'reports_view','documents_create'
            ])
            WHEN 'finance' THEN _permission = ANY (ARRAY[
              'customers_view','bookings_view','invoices_view','invoices_create','invoices_edit',
              'invoices_send','invoices_payment','payments_view','payments_create','payments_edit',
              'payments_process','payments_refund','expenses_view','expenses_create','expenses_approve',
              'banking_view','banking_transactions','banking_transfer','financial_view','financial_edit',
              'reports_view','reports_export','reports_advanced','suppliers_view','documents_create'
            ])
            WHEN 'marketing' THEN _permission = ANY (ARRAY[
              'customers_view','crm_view','crm_create','crm_edit','crm_campaigns','crm_segments',
              'marketing_view','marketing_edit','reports_view','reports_export','documents_create'
            ])
            WHEN 'management' THEN _permission = ANY (ARRAY[
              'customers_view','customers_create','customers_edit','customers_export','bookings_view',
              'bookings_create','bookings_edit','bookings_cancel','bookings_confirm','invoices_view',
              'invoices_create','invoices_edit','invoices_send','invoices_payment','suppliers_view',
              'suppliers_create','suppliers_edit','reports_view','reports_export','employees_view',
              'employees_edit','employees_commission','expenses_view','expenses_create','expenses_approve',
              'banking_view','banking_transactions','crm_view','crm_create','crm_edit','crm_follow_ups',
              'crm_campaigns','crm_segments','payments_view','payments_create','payments_process','team_view',
              'financial_view','customer_service_view','customer_service_edit','customer_portal_view',
              'whatsapp_view','marketing_view','marketing_edit','documents_view','documents_create',
              'quotes_view','quotes_create','quotes_edit'
            ])
            ELSE false
          END
      )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public._org_permission_state(
  _org_id UUID,
  _user_id UUID,
  _permission TEXT
) RETURNS TABLE(granted BOOLEAN, data_scope TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_override_granted BOOLEAN;
  v_override_scope TEXT;
  v_has_custom BOOLEAN;
  v_has_allow BOOLEAN;
  v_has_deny BOOLEAN;
  v_inherits_base BOOLEAN;
  v_scope TEXT;
BEGIN
  IF _org_id IS NULL OR _user_id IS NULL OR _permission IS NULL THEN
    RETURN QUERY SELECT false, 'none'::TEXT;
    RETURN;
  END IF;

  SELECT om.role::TEXT INTO v_role
  FROM public.organization_members om
  WHERE om.organization_id = _org_id
    AND om.user_id = _user_id
    AND om.is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'none'::TEXT;
    RETURN;
  END IF;

  IF v_role IN ('owner', 'admin') THEN
    RETURN QUERY SELECT true, 'organization'::TEXT;
    RETURN;
  END IF;

  SELECT o.granted, CASE WHEN o.granted THEN o.data_scope ELSE 'none' END
    INTO v_override_granted, v_override_scope
  FROM public.organization_permission_overrides o
  WHERE o.organization_id = _org_id
    AND o.user_id = _user_id
    AND o.permission_key = _permission;
  IF FOUND THEN
    RETURN QUERY SELECT v_override_granted, v_override_scope;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_permission_role_assignments a
    JOIN public.organization_permission_roles r ON r.id = a.role_id
    WHERE a.organization_id = _org_id
      AND a.user_id = _user_id
      AND r.is_active = true
  ) INTO v_has_custom;

  IF v_has_custom THEN
    SELECT
      COALESCE(bool_or(g.granted), false),
      COALESCE(bool_or(NOT g.granted), false),
      COALESCE(bool_or(r.inherits_base_role), false)
    INTO v_has_allow, v_has_deny, v_inherits_base
    FROM public.organization_permission_role_assignments a
    JOIN public.organization_permission_roles r
      ON r.id = a.role_id AND r.organization_id = a.organization_id AND r.is_active = true
    LEFT JOIN public.organization_permission_role_grants g
      ON g.role_id = a.role_id
     AND g.organization_id = a.organization_id
     AND g.permission_key = _permission
    WHERE a.organization_id = _org_id AND a.user_id = _user_id;

    IF v_has_deny THEN
      RETURN QUERY SELECT false, 'none'::TEXT;
      RETURN;
    END IF;
    IF v_has_allow THEN
      SELECT g.data_scope INTO v_scope
      FROM public.organization_permission_role_assignments a
      JOIN public.organization_permission_role_grants g
        ON g.role_id = a.role_id
       AND g.organization_id = a.organization_id
       AND g.permission_key = _permission
       AND g.granted = true
      JOIN public.organization_permission_roles r
        ON r.id = a.role_id AND r.organization_id = a.organization_id AND r.is_active = true
      WHERE a.organization_id = _org_id AND a.user_id = _user_id
      ORDER BY CASE g.data_scope
        WHEN 'organization' THEN 5 WHEN 'branch' THEN 4 WHEN 'team' THEN 3 WHEN 'own' THEN 2 ELSE 1 END DESC
      LIMIT 1;
      RETURN QUERY SELECT true, COALESCE(v_scope, 'organization')::TEXT;
      RETURN;
    END IF;
    IF NOT v_inherits_base THEN
      RETURN QUERY SELECT false, 'none'::TEXT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT public._org_default_permission(_org_id, _user_id, v_role, _permission),
                      CASE WHEN public._org_default_permission(_org_id, _user_id, v_role, _permission)
                           THEN 'organization' ELSE 'none' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_org_permission(_org_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin(auth.uid())
      OR (SELECT s.granted FROM public._org_permission_state(_org_id, auth.uid(), _permission) s);
$$;

REVOKE EXECUTE ON FUNCTION public._org_default_permission(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._org_permission_state(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated, service_role;

-- Financial reports and reconciliation now use the same company-specific
-- financial_view permission instead of membership-only access.
CREATE OR REPLACE FUNCTION public._can_read_org_finance(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_org_permission(_org_id, 'financial_view');
$$;
REVOKE EXECUTE ON FUNCTION public._can_read_org_finance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_read_org_finance(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_org_permission_profile(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_row RECORD;
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND NOT public.user_belongs_to_org(auth.uid(), _org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT c.permission_key
    FROM public.organization_permission_catalog c
    WHERE c.is_active = true
    ORDER BY c.permission_key
  LOOP
    SELECT v_result || jsonb_build_object(
      v_row.permission_key,
      jsonb_build_object('granted', s.granted, 'data_scope', s.data_scope)
    ) INTO v_result
    FROM public._org_permission_state(_org_id, auth.uid(), v_row.permission_key) s;
  END LOOP;
  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_org_permission_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_permission_profile(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_org_permission_catalog()
RETURNS TABLE(permission_key TEXT, module TEXT, label_ar TEXT, default_scope TEXT, is_sensitive BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.permission_key, c.module, c.label_ar, c.default_scope, c.is_sensitive
  FROM public.organization_permission_catalog c
  WHERE c.is_active = true
  ORDER BY c.module, c.permission_key;
$$;
REVOKE EXECUTE ON FUNCTION public.list_org_permission_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_permission_catalog() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_org_permission_roles(_org_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  inherits_base_role BOOLEAN,
  is_active BOOLEAN,
  assigned_user_count BIGINT,
  grants JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND NOT public.user_belongs_to_org(auth.uid(), _org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.name, r.description, r.inherits_base_role, r.is_active,
         (SELECT count(*) FROM public.organization_permission_role_assignments a
          WHERE a.organization_id = _org_id AND a.role_id = r.id),
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'permission_key', g.permission_key, 'granted', g.granted, 'data_scope', g.data_scope
         ) ORDER BY g.permission_key)
         FROM public.organization_permission_role_grants g
         WHERE g.organization_id = _org_id AND g.role_id = r.id), '[]'::jsonb)
  FROM public.organization_permission_roles r
  WHERE r.organization_id = _org_id
  ORDER BY r.is_active DESC, r.name;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.list_org_permission_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_permission_roles(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_org_permission_members(_org_id UUID)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  base_role TEXT,
  assigned_role_ids JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND NOT public.user_belongs_to_org(auth.uid(), _org_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m.user_id,
         COALESCE(p.full_name, ''),
         COALESCE(p.email, ''),
         m.role::TEXT,
         COALESCE(jsonb_agg(a.role_id) FILTER (WHERE a.role_id IS NOT NULL), '[]'::jsonb)
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.organization_permission_role_assignments a
    ON a.organization_id = m.organization_id AND a.user_id = m.user_id
  WHERE m.organization_id = _org_id AND m.is_active = true
  GROUP BY m.user_id, p.full_name, p.email, m.role
  ORDER BY COALESCE(p.full_name, ''), COALESCE(p.email, '');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.list_org_permission_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_permission_members(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_org_permission_role(
  _org_id UUID,
  _name TEXT,
  _description TEXT DEFAULT NULL,
  _inherits_base_role BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can manage permission roles' USING ERRCODE = '42501';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 THEN
    RAISE EXCEPTION 'Role name is required';
  END IF;
  INSERT INTO public.organization_permission_roles
    (organization_id, name, description, inherits_base_role, created_by)
  VALUES (_org_id, btrim(_name), NULLIF(btrim(_description), ''), COALESCE(_inherits_base_role, false), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_org_permission_role(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org_permission_role(uuid, text, text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_org_permission_grant(
  _org_id UUID,
  _role_id UUID,
  _permission_key TEXT,
  _granted BOOLEAN,
  _data_scope TEXT DEFAULT 'organization'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can manage permission roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_roles r WHERE r.id = _role_id AND r.organization_id = _org_id) THEN
    RAISE EXCEPTION 'Role does not belong to this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_catalog c WHERE c.permission_key = _permission_key AND c.is_active) THEN
    RAISE EXCEPTION 'Unknown permission key';
  END IF;
  IF _data_scope NOT IN ('none', 'own', 'team', 'branch', 'organization') THEN
    RAISE EXCEPTION 'Invalid data scope';
  END IF;
  INSERT INTO public.organization_permission_role_grants
    (organization_id, role_id, permission_key, granted, data_scope)
  VALUES (_org_id, _role_id, _permission_key, COALESCE(_granted, false),
          CASE WHEN COALESCE(_granted, false) THEN _data_scope ELSE 'none' END)
  ON CONFLICT (role_id, permission_key) DO UPDATE SET
    granted = EXCLUDED.granted,
    data_scope = EXCLUDED.data_scope,
    updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_org_permission_grant(uuid, uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_org_permission_grant(uuid, uuid, text, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_org_permission_role(
  _org_id UUID,
  _user_id UUID,
  _role_id UUID,
  _assigned BOOLEAN DEFAULT true
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can assign permission roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.is_active) THEN
    RAISE EXCEPTION 'User is not an active member of this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_roles r WHERE r.id = _role_id AND r.organization_id = _org_id AND r.is_active) THEN
    RAISE EXCEPTION 'Role does not belong to this organization';
  END IF;
  IF COALESCE(_assigned, true) THEN
    INSERT INTO public.organization_permission_role_assignments (organization_id, user_id, role_id, assigned_by)
    VALUES (_org_id, _user_id, _role_id, auth.uid())
    ON CONFLICT (organization_id, user_id, role_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by;
  ELSE
    DELETE FROM public.organization_permission_role_assignments
    WHERE organization_id = _org_id AND user_id = _user_id AND role_id = _role_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_org_permission_role(uuid, uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_org_permission_role(uuid, uuid, uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_org_permission_override(
  _org_id UUID,
  _user_id UUID,
  _permission_key TEXT,
  _granted BOOLEAN,
  _data_scope TEXT DEFAULT 'organization',
  _reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT public.is_platform_admin(auth.uid())
    AND public.get_user_org_role(auth.uid(), _org_id) NOT IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization owners or admins can override permissions' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.is_active) THEN
    RAISE EXCEPTION 'User is not an active member of this organization';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_permission_catalog c WHERE c.permission_key = _permission_key AND c.is_active) THEN
    RAISE EXCEPTION 'Unknown permission key';
  END IF;
  IF _data_scope NOT IN ('none', 'own', 'team', 'branch', 'organization') THEN
    RAISE EXCEPTION 'Invalid data scope';
  END IF;
  INSERT INTO public.organization_permission_overrides
    (organization_id, user_id, permission_key, granted, data_scope, reason, updated_by)
  VALUES (_org_id, _user_id, _permission_key, COALESCE(_granted, false),
          CASE WHEN COALESCE(_granted, false) THEN _data_scope ELSE 'none' END,
          NULLIF(btrim(_reason), ''), auth.uid())
  ON CONFLICT (organization_id, user_id, permission_key) DO UPDATE SET
    granted = EXCLUDED.granted,
    data_scope = EXCLUDED.data_scope,
    reason = EXCLUDED.reason,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_org_permission_override(uuid, uuid, text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_org_permission_override(uuid, uuid, text, boolean, text, text) TO authenticated, service_role;
