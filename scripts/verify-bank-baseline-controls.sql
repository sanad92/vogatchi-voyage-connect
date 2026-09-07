-- Run in a privileged connection inside BEGIN ... ROLLBACK only.
-- Required transaction-local settings: qa.baseline_org, qa.baseline_owner,
-- qa.baseline_agent, qa.baseline_inactive, qa.baseline_foreign.
-- The owner and active agent must belong to the subscribed test organization;
-- the foreign user must have no access to it. Every business row is a fixture.
-- For migration preflight, prepend the candidate DDL in the same transaction.
CREATE TEMP TABLE qa_baseline_context AS SELECT
  current_setting('qa.baseline_org')::uuid AS org,
  current_setting('qa.baseline_owner')::uuid AS owner_id,
  current_setting('qa.baseline_agent')::uuid AS agent_id,
  current_setting('qa.baseline_inactive')::uuid AS inactive_id,
  current_setting('qa.baseline_foreign')::uuid AS foreign_id,
  gen_random_uuid() AS account_id, gen_random_uuid() AS session_id;
CREATE TEMP TABLE qa_baseline_results(name text, passed boolean);
GRANT SELECT ON qa_baseline_context TO authenticated;
GRANT SELECT, INSERT ON qa_baseline_results TO authenticated;

CREATE FUNCTION pg_temp.baseline_assert(_name text, _ok boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', _name; END IF;
  INSERT INTO qa_baseline_results VALUES (_name, true);
END; $$;
CREATE FUNCTION pg_temp.baseline_reject(_name text, _sql text, _state text, _message text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> _state OR position(_message IN SQLERRM) = 0 THEN RAISE; END IF;
    rejected := true;
  END;
  PERFORM pg_temp.baseline_assert(_name, rejected);
END; $$;

-- Only fixture records and rollback-only overrides; never change live balances.
INSERT INTO public.organization_permission_overrides
  (organization_id, user_id, permission_key, granted, data_scope, reason)
SELECT c.org, c.agent_id, p.key, false, 'none', 'Rollback-only baseline QA'
FROM qa_baseline_context c CROSS JOIN
  (VALUES ('financial_view'), ('financial_edit'), ('banking_transactions')) AS p(key)
ON CONFLICT (organization_id, user_id, permission_key)
DO UPDATE SET granted = false, data_scope = 'none';

SET LOCAL ROLE authenticated;
DO $$
DECLARE c record; b jsonb; n bigint;
BEGIN
  SELECT * INTO c FROM qa_baseline_context;
  PERFORM set_config('request.jwt.claim.sub', c.owner_id::text, true);
  PERFORM pg_temp.baseline_assert('owner can manage', public._can_manage_bank_baseline(c.org));
  INSERT INTO public.bank_accounts(id, organization_id, account_name, bank_name, account_number, currency)
  VALUES(c.account_id, c.org, 'Rollback-only baseline QA', 'QA', c.account_id::text, 'USD');
  UPDATE public.bank_accounts SET notes = 'ordinary metadata remains editable' WHERE id = c.account_id;
  PERFORM pg_temp.baseline_assert('ordinary account create and update',
    (SELECT notes = 'ordinary metadata remains editable' FROM public.bank_accounts WHERE id = c.account_id));

  PERFORM set_config('request.jwt.claim.sub', c.agent_id::text, true);
  PERFORM pg_temp.baseline_assert('agent lacks baseline management', NOT public._can_manage_bank_baseline(c.org));
  PERFORM pg_temp.baseline_reject('agent direct update denied',
    format('UPDATE public.bank_accounts SET opening_balance = 12345 WHERE id = %L', c.account_id), '42501', 'permission denied');
  PERFORM pg_temp.baseline_reject('agent direct insert denied',
    format('INSERT INTO public.bank_accounts(organization_id, account_name, bank_name, account_number, opening_balance) VALUES (%L, ''QA'', ''QA'', ''QA'', 12345)', c.org), '42501', 'permission denied');
  PERFORM pg_temp.baseline_reject('account cannot be reparented',
    format('UPDATE public.bank_accounts SET organization_id = organization_id WHERE id = %L', c.account_id), '42501', 'permission denied');
  PERFORM pg_temp.baseline_reject('agent setter denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'Not authorized');
  PERFORM pg_temp.baseline_reject('agent getter denied',
    format('SELECT public.get_bank_account_baseline(%L)', c.account_id), 'P0001', 'Not authorized');

  PERFORM set_config('request.jwt.claim.sub', c.owner_id::text, true);
  PERFORM pg_temp.baseline_reject('owner direct update still requires audit RPC',
    format('UPDATE public.bank_accounts SET opening_balance_note = ''bypass'' WHERE id = %L', c.account_id), '42501', 'permission denied');
  PERFORM pg_temp.baseline_reject('nonfinite amount denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, ''NaN''::numeric, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'finite amount');
  PERFORM pg_temp.baseline_reject('infinite amount denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, ''Infinity''::numeric, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'finite amount');
  PERFORM pg_temp.baseline_reject('future date denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE + 1, ''QA'')', c.account_id), 'P0001', 'future');
  PERFORM pg_temp.baseline_reject('note required',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, '' '')', c.account_id), 'P0001', 'note is required');
  b := public.set_bank_account_opening_baseline(c.account_id, 100, CURRENT_DATE - 1, 'QA owner set');
  PERFORM pg_temp.baseline_assert('owner setter works', b->>'action' = 'set');
  b := public.get_bank_account_baseline(c.account_id);
  PERFORM pg_temp.baseline_assert('successful setter creates exactly one audit row',
    jsonb_array_length(b->'history') = 1 AND (b->>'opening_balance')::numeric = 100);
  PERFORM pg_temp.baseline_assert('baseline never changes book balance',
    (SELECT current_balance = 0 FROM public.bank_accounts WHERE id = c.account_id)
    AND NOT EXISTS (SELECT 1 FROM public.bank_account_transactions WHERE bank_account_id = c.account_id));
  PERFORM pg_temp.baseline_reject('audit insert denied',
    format('INSERT INTO public.bank_account_baseline_audit(organization_id, bank_account_id, action) VALUES(%L, %L, ''set'')', c.org, c.account_id), '42501', 'permission denied');
  PERFORM pg_temp.baseline_reject('audit truncate denied',
    'TRUNCATE public.bank_account_baseline_audit', '42501', 'permission denied');
END; $$;
RESET ROLE;

-- A company-specific finance permission, without elevating the base employee role.
UPDATE public.organization_permission_overrides SET granted = true, data_scope = 'organization'
WHERE (organization_id, user_id) = (SELECT org, agent_id FROM qa_baseline_context)
  AND permission_key IN ('financial_view', 'financial_edit');
SET LOCAL ROLE authenticated;
DO $$
DECLARE c record; b jsonb;
BEGIN
  SELECT * INTO c FROM qa_baseline_context;
  PERFORM set_config('request.jwt.claim.sub', c.agent_id::text, true);
  b := public.set_bank_account_opening_baseline(c.account_id, 200, CURRENT_DATE - 1, 'QA finance update');
  PERFORM pg_temp.baseline_assert('company-specific finance permission works', b->>'action' = 'update');
  PERFORM public.set_bank_account_opening_baseline(c.account_id, NULL, NULL, 'QA clear before closing');
END; $$;
RESET ROLE;
INSERT INTO public.bank_reconciliation_sessions
  (id, organization_id, bank_account_id, statement_start, statement_end,
   statement_opening_balance, statement_closing_balance, currency, status)
SELECT session_id, org, account_id, CURRENT_DATE - 1, CURRENT_DATE, 0, 0, 'USD', 'reconciled'
FROM qa_baseline_context;

SET LOCAL ROLE authenticated;
DO $$
DECLARE c record; b jsonb;
BEGIN
  SELECT * INTO c FROM qa_baseline_context;
  PERFORM set_config('request.jwt.claim.sub', c.owner_id::text, true);
  b := public.close_bank_reconciliation(c.session_id);
  PERFORM pg_temp.baseline_assert('close RPC succeeds', b->>'status' = 'closed');
  PERFORM set_config('request.jwt.claim.sub', c.agent_id::text, true);
  b := public.get_bank_account_baseline(c.account_id);
  PERFORM pg_temp.baseline_assert('closed unset baseline is locked in UI permissions',
    (b->>'locked')::boolean AND NOT (b->>'is_set')::boolean
    AND NOT (b->>'can_manage')::boolean AND NOT (b->>'can_correct')::boolean);
  PERFORM pg_temp.baseline_reject('finance cannot set an unset closed baseline',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'only the owner');
  PERFORM set_config('request.jwt.claim.sub', c.owner_id::text, true);
  PERFORM pg_temp.baseline_reject('owner correction requires reason',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'', NULL, true)', c.account_id), 'P0001', 'correction reason');
  PERFORM pg_temp.baseline_reject('owner correction requires explicit intent',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'', ''reason'', false)', c.account_id), 'P0001', 'correction reason');
  b := public.set_bank_account_opening_baseline(c.account_id, 300, CURRENT_DATE, 'QA correction', 'QA documented correction', true);
  PERFORM pg_temp.baseline_assert('owner documented correction works', b->>'action' = 'correction');
  PERFORM public.set_bank_account_opening_baseline(c.account_id, NULL, NULL, 'QA clear', 'QA documented clear', true);
  PERFORM set_config('request.jwt.claim.sub', c.agent_id::text, true);
  PERFORM pg_temp.baseline_reject('clear cannot reopen baseline for finance',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'', ''reason'', true)', c.account_id), 'P0001', 'only the owner');
  PERFORM set_config('request.jwt.claim.sub', c.inactive_id::text, true);
  PERFORM pg_temp.baseline_reject('inactive member setter denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'Not authorized');
  PERFORM set_config('request.jwt.claim.sub', c.foreign_id::text, true);
  PERFORM pg_temp.baseline_reject('foreign getter denied',
    format('SELECT public.get_bank_account_baseline(%L)', c.account_id), 'P0001', 'Not authorized');
  PERFORM pg_temp.baseline_reject('foreign setter denied',
    format('SELECT public.set_bank_account_opening_baseline(%L, 10, CURRENT_DATE, ''QA'')', c.account_id), 'P0001', 'Not authorized');
  PERFORM pg_temp.baseline_assert('lock helper does not leak foreign account state',
    public._bank_baseline_is_locked(c.account_id) IS FALSE);
  PERFORM set_config('request.jwt.claim.sub', c.owner_id::text, true);
  b := public.get_bank_account_baseline(c.account_id);
  PERFORM pg_temp.baseline_assert('exact audit count; all rejected writes atomic', jsonb_array_length(b->'history') = 5);
  PERFORM pg_temp.baseline_assert('owner correction permission matches server',
    (b->>'can_manage')::boolean AND (b->>'can_correct')::boolean);
  PERFORM pg_temp.baseline_assert('baseline operations do not post money',
    (SELECT current_balance = 0 FROM public.bank_accounts WHERE id = c.account_id)
    AND NOT EXISTS (SELECT 1 FROM public.bank_account_transactions WHERE bank_account_id = c.account_id));
  INSERT INTO public.bank_account_transactions(bank_account_id, organization_id, transaction_type, amount, currency)
  VALUES(c.account_id, c.org, 'deposit', 25, 'USD');
  PERFORM pg_temp.baseline_assert('normal bank posting trigger still works',
    (SELECT current_balance = 25 FROM public.bank_accounts WHERE id = c.account_id));
END; $$;
RESET ROLE;
SELECT jsonb_build_object('passed', count(*), 'failed', count(*) FILTER (WHERE NOT passed),
  'checks', jsonb_agg(name ORDER BY name)) AS baseline_regression FROM qa_baseline_results;
-- Caller must ROLLBACK; do not commit this test or its settings/overrides.
