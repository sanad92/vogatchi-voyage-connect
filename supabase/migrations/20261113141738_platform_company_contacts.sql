BEGIN;

-- Employee records have tenant-only RLS. Expose only the work phone of the
-- employee linked to an active owner/admin of this specific organization.
CREATE FUNCTION platform_company_private.contacts(p_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'email', coalesce(nullif(btrim(s.email), ''), nullif(btrim(o.email), '')),
    'phone', coalesce(nullif(btrim(s.phone), ''), nullif(btrim(o.phone), '')),
    'address', coalesce(nullif(btrim(s.address), ''), nullif(btrim(o.address), '')),
    'contacts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.user_id,
        'role', m.role,
        'joined_at', m.joined_at,
        'name', nullif(btrim(p.full_name), ''),
        'position', nullif(btrim(p.position), ''),
        'email', nullif(btrim(p.email), ''),
        'phone', nullif(btrim(p.phone), ''),
        'work_phone', nullif(btrim(e.phone), '')
      ) ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, m.joined_at, m.user_id)
      FROM public.organization_members m
      JOIN public.profiles p ON p.id = m.user_id AND p.is_active
      LEFT JOIN public.employees e ON e.id = p.linked_employee_id AND e.organization_id = m.organization_id AND e.is_active
      WHERE m.organization_id = o.id AND m.is_active AND m.role IN ('owner', 'admin')
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.organizations o
  LEFT JOIN public.organization_settings s ON s.organization_id = o.id
  WHERE o.id = p_organization_id;

  RETURN v_result;
END;
$$;

CREATE FUNCTION public.platform_company_contacts(p_organization_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_company_private.contacts(p_organization_id) $$;

REVOKE EXECUTE ON FUNCTION platform_company_private.contacts(uuid), public.platform_company_contacts(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_company_private.contacts(uuid), public.platform_company_contacts(uuid)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
