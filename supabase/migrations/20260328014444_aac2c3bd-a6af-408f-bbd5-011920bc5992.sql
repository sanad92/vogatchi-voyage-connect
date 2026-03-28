
-- Organization settings table
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#6366f1',
  accent_color text DEFAULT '#f59e0b',
  company_name text,
  company_name_ar text,
  phone text,
  email text,
  website text,
  address text,
  tax_number text,
  commercial_register text,
  footer_text text,
  currency text DEFAULT 'EGP',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Members can read their org settings
CREATE POLICY "org_members_select" ON public.organization_settings
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Owner/admin can update
CREATE POLICY "org_admin_insert" ON public.organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "org_admin_update" ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Platform admins can do everything
CREATE POLICY "platform_admin_all" ON public.organization_settings
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Auto update timestamp
CREATE TRIGGER update_org_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
