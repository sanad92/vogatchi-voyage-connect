CREATE OR REPLACE FUNCTION public._org_permission_state(_org_id uuid, _user_id uuid, _permission text)
 RETURNS TABLE(granted boolean, data_scope text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Callers may only inspect their own permissions unless they administer the organization.
  -- Service/cron contexts (no JWT user) are unrestricted.
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_platform_admin(auth.uid())
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members cm
       WHERE cm.organization_id = _org_id AND cm.user_id = auth.uid()
         AND cm.is_active = true AND COALESCE(cm.role::text, '') IN ('owner', 'admin')
     ) THEN
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
$function$;

REVOKE ALL ON FUNCTION public._workflow_run_step(jsonb, public.domain_events, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._workflow_run_step(jsonb, public.domain_events, uuid) TO service_role;

DROP POLICY IF EXISTS eq_insert ON public.email_queue;
CREATE POLICY eq_insert ON public.email_queue FOR INSERT TO authenticated
WITH CHECK (
  organization_id = ANY (public.get_user_org_ids(auth.uid()))
  AND email_type IN ('welcome','booking_confirmation','invoice','booking_notification','travel_reminder')
  AND COALESCE(status, 'pending') = 'pending'
);

DROP POLICY IF EXISTS ai_messages_via_thread_insert ON public.ai_assistant_messages;
CREATE POLICY ai_messages_via_thread_insert ON public.ai_assistant_messages FOR INSERT TO authenticated
WITH CHECK (
  role = 'user'
  AND thread_id IN (SELECT t.id FROM public.ai_assistant_threads t WHERE t.user_id = auth.uid())
);
DELETE FROM public.ai_assistant_messages WHERE role = 'system';

UPDATE public.generated_documents SET file_url = NULL WHERE file_url ILIKE '%/object/sign/%';
UPDATE public.booking_vouchers SET pdf_url = NULL WHERE pdf_url ILIKE 'http%';