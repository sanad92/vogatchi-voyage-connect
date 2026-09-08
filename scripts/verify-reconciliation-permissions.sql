-- Privileged connection; caller MUST wrap candidate + this script in BEGIN/ROLLBACK.
-- Fixture settings: qa.baseline_org, qa.baseline_owner, qa.baseline_agent,
-- qa.baseline_inactive, qa.baseline_foreign. No fixtures are committed.
CREATE TEMP TABLE qa_reconciliation_results(name text, passed boolean);
GRANT SELECT, INSERT ON qa_reconciliation_results TO authenticated;
CREATE FUNCTION pg_temp.reconciliation_assert(label text, ok boolean)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  INSERT INTO qa_reconciliation_results VALUES(label,true);
END $$;

INSERT INTO public.sop_department_members(organization_id,user_id,department)
SELECT current_setting('qa.baseline_org')::uuid,
       current_setting('qa.baseline_agent')::uuid,'finance'
WHERE NOT EXISTS (SELECT 1 FROM public.sop_department_members
  WHERE organization_id=current_setting('qa.baseline_org')::uuid
  AND user_id=current_setting('qa.baseline_agent')::uuid AND department::text='finance');
INSERT INTO public.organization_permission_overrides
  (organization_id,user_id,permission_key,granted,data_scope)
VALUES(current_setting('qa.baseline_org')::uuid,current_setting('qa.baseline_agent')::uuid,
       'banking_transactions',false,'none')
ON CONFLICT(organization_id,user_id,permission_key)
DO UPDATE SET granted=false,data_scope='none';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('qa.baseline_agent'),true);
SELECT pg_temp.reconciliation_assert('finance employee explicit deny',
  NOT public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
DO $$ DECLARE denied boolean := false; BEGIN
  BEGIN
    PERFORM public.create_bank_reconciliation_session(
      current_setting('qa.baseline_org')::uuid,gen_random_uuid(),
      current_date,current_date,0,0,'permission regression');
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Not authorized to manage bank reconciliation' THEN RAISE; END IF;
    denied := true;
  END;
  PERFORM pg_temp.reconciliation_assert('real create RPC rejects before account access',denied);
END $$;
RESET ROLE;

UPDATE public.organization_members SET role='manager'
WHERE organization_id=current_setting('qa.baseline_org')::uuid
AND user_id=current_setting('qa.baseline_agent')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.reconciliation_assert('manager explicit deny',
  NOT public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
RESET ROLE;

UPDATE public.organization_permission_overrides SET granted=true,data_scope='organization'
WHERE organization_id=current_setting('qa.baseline_org')::uuid
AND user_id=current_setting('qa.baseline_agent')::uuid AND permission_key='banking_transactions';
SET LOCAL ROLE authenticated;
SELECT pg_temp.reconciliation_assert('explicit grant',
  public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
RESET ROLE;

UPDATE public.organization_members SET is_active=false
WHERE organization_id=current_setting('qa.baseline_org')::uuid
AND user_id=current_setting('qa.baseline_agent')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.reconciliation_assert('inactive granted member denied',
  NOT public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
SELECT set_config('request.jwt.claim.sub',current_setting('qa.baseline_foreign'),true);
SELECT pg_temp.reconciliation_assert('foreign organization denied',
  NOT public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
SELECT set_config('request.jwt.claim.sub',current_setting('qa.baseline_owner'),true);
SELECT pg_temp.reconciliation_assert('owner allowed',
  public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{}',true);
SELECT pg_temp.reconciliation_assert('no identity denied',
  NOT public._can_manage_bank_reconciliation(current_setting('qa.baseline_org')::uuid));
RESET ROLE;
SELECT jsonb_agg(to_jsonb(r)) AS permission_results FROM qa_reconciliation_results r;
