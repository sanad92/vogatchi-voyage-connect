-- Safar Flow V3 isolated authorization QA.
-- Run only AFTER scripts/test-safar-flow-job-queue.sql on a throwaway database.
\set ON_ERROR_STOP on

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT NULLIF(pg_catalog.current_setting('test.user_id', true),'')::uuid
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
INSERT INTO public.organization_members VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',true),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000014',false);

CREATE FUNCTION public.has_org_permission(p_org uuid,p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active IS TRUE
      AND m.user_id <> '00000000-0000-4000-8000-000000000013'::uuid
      AND p_permission = 'automation_view'
  )
$$;

\i scripts/deploy-safar-flow-monitor.sql

-- Never expose raw internal failure context through the monitoring API.
UPDATE safar_flow.jobs
SET last_error = 'SECRET_SUPPLIER_TOKEN_MUST_NOT_LEAK'
WHERE organization_id='00000000-0000-4000-8000-000000000001';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_safar_flow_job_health(uuid,integer)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_safar_flow_job_health(uuid,integer)', 'EXECUTE')
     OR has_schema_privilege('authenticated', 'safar_flow', 'USAGE')
  THEN
    RAISE EXCEPTION 'Monitoring grants expose private queue or deny legitimate user';
  END IF;
END $$;

-- Test SQL caller with signed-in user role, not the database owner.
SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';

DO $$
DECLARE result jsonb; raw text;
BEGIN
  result := public.get_safar_flow_job_health(
    '00000000-0000-4000-8000-000000000001',15);
  IF result->'counts'->>'all' IS NULL OR result->'counts'->>'succeeded' IS NULL THEN
    RAISE EXCEPTION 'Missing monitoring counters';
  END IF;
  IF pg_catalog.jsonb_array_length(result->'jobs') < 1
    OR pg_catalog.jsonb_array_length(result->'jobs') > 15 THEN
    RAISE EXCEPTION 'Monitoring list length invalid';
  END IF;
  raw := result::text;
  IF raw LIKE '%SECRET_SUPPLIER_TOKEN_MUST_NOT_LEAK%'
     OR raw LIKE '%last_error%' OR raw LIKE '%source_event_id%' THEN
    RAISE EXCEPTION 'Sensitive queue context leaked into monitoring';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(result->'jobs') AS j
    WHERE (j->>'booking_id') IN (
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000108'
    )
  ) THEN
    RAISE EXCEPTION 'Monitoring displayed another organization booking';
  END IF;
END $$;

-- Role-limited actor A must NOT request org B.
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_job_health(
      '00000000-0000-4000-8000-000000000002');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-organization RPC access permitted'; END IF;
END $$;

-- Invalid request inputs rejected.
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_job_health(
      '00000000-0000-4000-8000-000000000001',0);
  EXCEPTION WHEN invalid_parameter_value THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid monitoring pagination accepted'; END IF;
END $$;

-- Another valid member can read only their own org.
SET test.user_id = '00000000-0000-4000-8000-000000000012';
DO $$
DECLARE result jsonb;
BEGIN
  result := public.get_safar_flow_job_health(
    '00000000-0000-4000-8000-000000000002',1);
  IF result->'counts'->>'all' IS NULL
    OR pg_catalog.jsonb_array_length(result->'jobs') > 1 THEN
    RAISE EXCEPTION 'Org B valid read failed or limit ignored';
  END IF;
END $$;

-- An active member without the automation_view permission must be denied.
SET test.user_id = '00000000-0000-4000-8000-000000000013';
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_job_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Missing automation permission was ignored'; END IF;
END $$;

-- An inactive organization membership is never sufficient.
SET test.user_id = '00000000-0000-4000-8000-000000000014';
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_job_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Inactive member was allowed'; END IF;
END $$;

-- Unauthenticated caller must also be denied, even via explicit role session.
RESET test.user_id;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_job_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unauthenticated caller was allowed'; END IF;
END $$;

RESET ROLE;
SELECT 'Safar Flow read-only monitoring and tenant permission checks passed' AS result;
