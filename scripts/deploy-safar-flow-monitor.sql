-- Safar Flow V3 — readonly, tenant-scoped queue observability RPC.
-- STAGED ONLY. Install AFTER scripts/deploy-safar-flow-job-queue.sql.
-- No job execution or database mutations are exposed to application users.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_safar_flow_job_health(
  p_organization_id uuid,
  p_limit integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_counts jsonb;
  v_jobs jsonb;
BEGIN
  IF p_organization_id IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid Safar Flow monitoring parameters' USING ERRCODE = '22023';
  END IF;

  -- Must be a signed-in, *active* member AND have automation viewing permission.
  -- This is deliberately stricter than generic platform-admin permission bypasses.
  IF auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = p_organization_id
        AND m.is_active IS TRUE
    )
    OR NOT COALESCE(public.has_org_permission(p_organization_id, 'automation_view'), FALSE)
  THEN
    RAISE EXCEPTION 'You are not authorized to view Safar Flow jobs for this company'
      USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'scheduled', COUNT(*) FILTER (WHERE j.status = 'scheduled'),
    'retrying', COUNT(*) FILTER (WHERE j.status = 'retrying'),
    'succeeded', COUNT(*) FILTER (WHERE j.status = 'succeeded'),
    'skipped', COUNT(*) FILTER (WHERE j.status = 'skipped'),
    'dead', COUNT(*) FILTER (WHERE j.status = 'dead'),
    'cancelled', COUNT(*) FILTER (WHERE j.status = 'cancelled'),
    'due', COUNT(*) FILTER (
      WHERE j.status IN ('scheduled', 'retrying') AND j.available_at <= pg_catalog.now()
    ),
    'all', COUNT(*)
  )
  INTO v_counts
  FROM safar_flow.jobs j
  WHERE j.organization_id = p_organization_id;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', recent.id,
        'booking_id', recent.booking_id,
        'template_key', recent.template_key,
        'status', recent.status,
        'attempts', recent.attempts,
        'max_attempts', recent.max_attempts,
        'available_at', recent.available_at,
        'updated_at', recent.updated_at,
        'processed_at', recent.processed_at
      ) ORDER BY recent.updated_at DESC, recent.id DESC
    ),
    '[]'::jsonb
  )
  INTO v_jobs
  FROM (
    SELECT
      j.id, j.booking_id, j.template_key, j.status, j.attempts,
      j.max_attempts, j.available_at, j.updated_at, j.processed_at
    FROM safar_flow.jobs j
    WHERE j.organization_id = p_organization_id
    ORDER BY j.updated_at DESC, j.id DESC
    LIMIT p_limit
  ) AS recent;

  -- Intentionally omit last_error, event payload and customer details: these
  -- can contain sensitive supplier or customer information.
  RETURN pg_catalog.jsonb_build_object(
    'counts', v_counts,
    'jobs', v_jobs,
    'generated_at', pg_catalog.now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_safar_flow_job_health(uuid,integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safar_flow_job_health(uuid,integer)
TO authenticated;
COMMIT;
