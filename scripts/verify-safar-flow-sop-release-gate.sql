-- Safar Flow V5 SOP security: fail-closed and READ-ONLY release gate.
-- Run after V5 SQL on a staging clone; never treat fixture pass as production QA.
\set ON_ERROR_STOP on

DO $gate$
DECLARE
  v_oid oid;
  v_rls boolean;
BEGIN
  IF to_regclass('public.sop_approvals') IS NULL THEN
    RAISE EXCEPTION 'Release BLOCKED: existing SOP approval table missing';
  END IF;

  -- A user must not be able to fake an approval with an UPDATE/INSERT
  -- instead of the privileged, audited decision request RPC.
  IF has_table_privilege('authenticated', 'public.sop_approvals','INSERT')
     OR has_table_privilege('authenticated', 'public.sop_approvals','UPDATE')
     OR has_table_privilege('authenticated', 'public.sop_approvals','DELETE') THEN
    RAISE EXCEPTION 'Release BLOCKED: SOP direct-write bypass still present';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.sop_approvals', 'SELECT') THEN
    RAISE EXCEPTION 'Release BLOCKED: SOP read access missing for UI';
  END IF;

  SELECT c.relrowsecurity INTO v_rls
  FROM pg_class c WHERE c.oid='public.sop_approvals'::regclass;
  IF NOT COALESCE(v_rls,false) THEN
    RAISE EXCEPTION 'Release BLOCKED: RLS disabled on SOP approvals';
  END IF;

  FOREACH v_oid IN ARRAY ARRAY[
    to_regprocedure('public.sop_decide_approval(uuid,boolean,text)'),
    to_regprocedure('public.sop_request_approval(uuid,text,uuid,numeric,text)')
  ] LOOP
    -- Request RPC signature is not standardized across project migrations;
    -- only assert the decision RPC strictly, and validate creation separately.
    IF v_oid IS NULL THEN CONTINUE; END IF;
    IF has_function_privilege('anon',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION 'Release BLOCKED: SOP approval RPC callable anonymously';
    END IF;
  END LOOP;

  v_oid := to_regprocedure('public.sop_decide_approval(uuid,boolean,text)');
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Release BLOCKED: decision RPC is missing';
  END IF;
  IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Release BLOCKED: authorized manager cannot call decision RPC';
  END IF;

  -- Verify installed V5 decision function still has critical state/role guards.
  -- This checks that a legacy function was not re-deployed over the fixed one.
  IF position('FOR UPDATE' in pg_get_functiondef(v_oid)) = 0
     OR position('self_approval_forbidden' in pg_get_functiondef(v_oid)) = 0
     OR position('approval_already_decided' in pg_get_functiondef(v_oid)) = 0 THEN
    RAISE EXCEPTION 'Release BLOCKED: installed SOP decision guard is outdated';
  END IF;

  RAISE NOTICE 'Safar Flow SOP READ-ONLY release gate: PASS';
END;
$gate$;
