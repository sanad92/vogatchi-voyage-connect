CREATE OR REPLACE FUNCTION public.has_org_permission(_org_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.organization_id = _org_id
        AND member.user_id = auth.uid()
        AND member.is_active = true
        AND (
          member.role::text IN ('owner', 'admin')
          OR (
            member.role::text = 'manager'
            AND _permission = ANY (ARRAY[
              'customers_view','customers_create','customers_edit','customers_export',
              'crm_view','crm_create','crm_edit','crm_follow_ups','crm_campaigns','crm_segments'
            ])
          )
          OR (
            member.role::text = 'viewer'
            AND _permission = ANY (ARRAY['customers_view','crm_view'])
          )
          OR (
            member.role::text = 'agent'
            AND (
              _permission = ANY (ARRAY['team_view','documents_view'])
              OR (
                -- Unassigned agents keep a read-only baseline.
                NOT EXISTS (
                  SELECT 1 FROM public.sop_department_members AS d0
                  WHERE d0.organization_id = _org_id AND d0.user_id = auth.uid()
                )
                AND _permission = ANY (ARRAY['customers_view','crm_view'])
              )
              OR EXISTS (
                SELECT 1
                FROM public.sop_department_members AS department
                WHERE department.organization_id = _org_id
                  AND department.user_id = auth.uid()
                  AND CASE department.department::text
                    WHEN 'customer_service' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit',
                      'crm_view','crm_create','crm_edit','crm_follow_ups'
                    ])
                    WHEN 'sales' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit',
                      'crm_view','crm_create','crm_edit','crm_follow_ups'
                    ])
                    WHEN 'reservations' THEN _permission = ANY (ARRAY['customers_view','crm_view'])
                    WHEN 'operations' THEN _permission = 'customers_view'
                    WHEN 'finance' THEN _permission = 'customers_view'
                    WHEN 'marketing' THEN _permission = ANY (ARRAY[
                      'customers_view','crm_view','crm_create','crm_edit','crm_campaigns','crm_segments'
                    ])
                    WHEN 'management' THEN _permission = ANY (ARRAY[
                      'customers_view','customers_create','customers_edit','customers_export',
                      'crm_view','crm_create','crm_edit','crm_follow_ups','crm_campaigns','crm_segments'
                    ])
                    ELSE false
                  END
              )
            )
          )
        )
    );
$function$;

REVOKE EXECUTE ON FUNCTION public.has_org_permission(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated, service_role;