ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS opening_balance numeric,
  ADD COLUMN IF NOT EXISTS opening_balance_date date,
  ADD COLUMN IF NOT EXISTS opening_balance_note text,
  ADD COLUMN IF NOT EXISTS opening_balance_set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opening_balance_set_at timestamptz;

CREATE TABLE IF NOT EXISTS public.bank_account_baseline_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('set', 'update', 'clear', 'correction')),
  old_balance numeric,
  old_balance_date date,
  new_balance numeric,
  new_balance_date date,
  note text,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_account_baseline_audit_account
  ON public.bank_account_baseline_audit(bank_account_id, changed_at DESC);

ALTER TABLE public.bank_account_baseline_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bank_account_baseline_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bank_account_baseline_audit TO authenticated;
GRANT SELECT, INSERT ON public.bank_account_baseline_audit TO service_role;

DROP POLICY IF EXISTS bank_account_baseline_audit_read ON public.bank_account_baseline_audit;
CREATE POLICY bank_account_baseline_audit_read
  ON public.bank_account_baseline_audit FOR SELECT TO authenticated
  USING ((SELECT public._can_read_org_finance(organization_id)));

CREATE OR REPLACE FUNCTION public._bank_baseline_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION 'bank_account_baseline_audit is append-only';
END;
$function$;

DROP TRIGGER IF EXISTS trg_bank_baseline_audit_immutable ON public.bank_account_baseline_audit;
CREATE TRIGGER trg_bank_baseline_audit_immutable
  BEFORE UPDATE OR DELETE ON public.bank_account_baseline_audit
  FOR EACH ROW EXECUTE FUNCTION public._bank_baseline_audit_immutable();

CREATE OR REPLACE FUNCTION public._can_manage_bank_baseline(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.is_platform_admin(auth.uid())
      OR (
        COALESCE(public.can_org_write(_org), false)
        AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = _org
            AND m.user_id = auth.uid()
            AND m.is_active = true
        )
        AND (
          public.get_user_org_role(auth.uid(), _org) = 'owner'
          OR COALESCE(public.has_org_permission(_org, 'financial_edit'), false)
          OR COALESCE(public.has_org_permission(_org, 'banking_transactions'), false)
        )
      )
    );
$function$;

REVOKE EXECUTE ON FUNCTION public._can_manage_bank_baseline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_manage_bank_baseline(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._bank_baseline_is_locked(_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.bank_reconciliation_sessions s
    WHERE s.bank_account_id = _account AND s.status = 'closed'
  );
$function$;

REVOKE EXECUTE ON FUNCTION public._bank_baseline_is_locked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._bank_baseline_is_locked(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_bank_account_opening_baseline(
  _account uuid,
  _balance numeric,
  _balance_date date,
  _note text,
  _reason text DEFAULT NULL,
  _force_correction boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_account public.bank_accounts%ROWTYPE;
  v_note text := NULLIF(btrim(COALESCE(_note, '')), '');
  v_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
  v_clear boolean := _balance IS NULL;
  v_action text;
  v_locked boolean;
  v_is_owner boolean;
BEGIN
  SELECT * INTO v_account FROM public.bank_accounts WHERE id = _account FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank account not found'; END IF;
  IF v_account.organization_id IS NULL THEN RAISE EXCEPTION 'Bank account has no organization'; END IF;
  IF COALESCE(v_account.is_active, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'Bank account is inactive';
  END IF;
  IF public._can_manage_bank_baseline(v_account.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to set the bank opening baseline';
  END IF;
  IF v_note IS NULL THEN RAISE EXCEPTION 'A note is required for the opening baseline'; END IF;
  IF NOT v_clear AND _balance_date IS NULL THEN
    RAISE EXCEPTION 'An opening baseline date is required';
  END IF;
  IF _balance_date IS NOT NULL AND _balance_date > current_date THEN
    RAISE EXCEPTION 'The opening baseline date cannot be in the future';
  END IF;

  v_locked := public._bank_baseline_is_locked(_account);
  v_is_owner := public.is_platform_admin(auth.uid())
    OR public.get_user_org_role(auth.uid(), v_account.organization_id) = 'owner';

  IF v_locked AND v_account.opening_balance_date IS NOT NULL THEN
    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'The baseline is locked by a closed reconciliation; only the owner may correct it';
    END IF;
    IF _force_correction IS NOT TRUE OR v_reason IS NULL THEN
      RAISE EXCEPTION 'A correction reason is required to change a locked baseline';
    END IF;
    v_action := 'correction';
  ELSIF v_clear THEN
    v_action := 'clear';
  ELSIF v_account.opening_balance_date IS NULL THEN
    v_action := 'set';
  ELSE
    v_action := 'update';
  END IF;

  INSERT INTO public.bank_account_baseline_audit(
    organization_id, bank_account_id, action,
    old_balance, old_balance_date, new_balance, new_balance_date,
    note, reason, changed_by
  ) VALUES (
    v_account.organization_id, _account, v_action,
    v_account.opening_balance, v_account.opening_balance_date,
    CASE WHEN v_clear THEN NULL ELSE _balance END,
    CASE WHEN v_clear THEN NULL ELSE _balance_date END,
    v_note, v_reason, auth.uid()
  );

  UPDATE public.bank_accounts
     SET opening_balance = CASE WHEN v_clear THEN NULL ELSE _balance END,
         opening_balance_date = CASE WHEN v_clear THEN NULL ELSE _balance_date END,
         opening_balance_note = v_note,
         opening_balance_set_by = auth.uid(),
         opening_balance_set_at = now(),
         updated_at = now()
   WHERE id = _account;

  RETURN jsonb_build_object(
    'bank_account_id', _account,
    'action', v_action,
    'opening_balance', CASE WHEN v_clear THEN NULL ELSE _balance END,
    'opening_balance_date', CASE WHEN v_clear THEN NULL ELSE _balance_date END,
    'locked', v_locked
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_bank_account_opening_baseline(uuid, numeric, date, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bank_account_opening_baseline(uuid, numeric, date, text, text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_bank_account_baseline(_account uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_account public.bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM public.bank_accounts WHERE id = _account;
  IF NOT FOUND OR public._can_read_org_finance(v_account.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN jsonb_build_object(
    'bank_account_id', v_account.id,
    'currency', v_account.currency,
    'is_set', v_account.opening_balance_date IS NOT NULL,
    'opening_balance', v_account.opening_balance,
    'opening_balance_date', v_account.opening_balance_date,
    'note', v_account.opening_balance_note,
    'set_at', v_account.opening_balance_set_at,
    'set_by', v_account.opening_balance_set_by,
    'set_by_name', (SELECT p.full_name FROM public.profiles p WHERE p.id = v_account.opening_balance_set_by),
    'locked', public._bank_baseline_is_locked(v_account.id),
    'can_manage', public._can_manage_bank_baseline(v_account.organization_id),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'action', a.action,
        'old_balance', a.old_balance, 'old_balance_date', a.old_balance_date,
        'new_balance', a.new_balance, 'new_balance_date', a.new_balance_date,
        'note', a.note, 'reason', a.reason, 'changed_at', a.changed_at,
        'changed_by_name', (SELECT p.full_name FROM public.profiles p WHERE p.id = a.changed_by)
      ) ORDER BY a.changed_at DESC)
      FROM public.bank_account_baseline_audit a
      WHERE a.bank_account_id = v_account.id
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_bank_account_baseline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_account_baseline(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_bank_reconciliation_workspace(_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_session public.bank_reconciliation_sessions%ROWTYPE; v_account public.bank_accounts%ROWTYPE; v_book_close numeric; v_first boolean; v_result jsonb;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session;
  IF NOT FOUND OR public._can_read_org_finance(v_session.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_account FROM public.bank_accounts WHERE id = v_session.bank_account_id;
  v_book_close := public._bank_book_balance_at(v_session.bank_account_id, v_session.statement_end);
  v_first := NOT EXISTS (
    SELECT 1 FROM public.bank_reconciliation_sessions s
    WHERE s.bank_account_id = v_session.bank_account_id
      AND s.id <> v_session.id
      AND (s.statement_end < v_session.statement_end
        OR (s.statement_end = v_session.statement_end AND s.created_at < v_session.created_at))
  );
  SELECT jsonb_build_object(
    'session', to_jsonb(v_session),
    'baseline', jsonb_build_object(
      'is_first_session', v_first,
      'is_set', v_account.opening_balance_date IS NOT NULL,
      'opening_balance', v_account.opening_balance,
      'opening_balance_date', v_account.opening_balance_date,
      'note', v_account.opening_balance_note,
      'set_at', v_account.opening_balance_set_at,
      'set_by_name', (SELECT p.full_name FROM public.profiles p WHERE p.id = v_account.opening_balance_set_by),
      'locked', public._bank_baseline_is_locked(v_session.bank_account_id),
      'can_manage', public._can_manage_bank_baseline(v_session.organization_id)
    ),
    'summary', jsonb_build_object(
      'statement_movement', COALESCE((SELECT sum(CASE direction WHEN 'credit' THEN amount ELSE -amount END) FROM public.bank_statement_lines WHERE session_id = _session), 0),
      'book_movement', v_book_close - v_session.book_opening_balance,
      'current_book_closing_balance', v_book_close,
      'difference', v_session.statement_closing_balance - v_book_close,
      'line_count', (SELECT count(*) FROM public.bank_statement_lines WHERE session_id = _session),
      'matched_count', (SELECT count(*) FROM public.bank_statement_lines WHERE session_id = _session AND status = 'matched'),
      'ignored_count', (SELECT count(*) FROM public.bank_statement_lines WHERE session_id = _session AND status = 'ignored'),
      'unresolved_count', (SELECT count(*) FROM public.bank_statement_lines WHERE session_id = _session AND status IN ('unmatched','partial'))
    ),
    'lines', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.transaction_date, x.import_row, x.id)
      FROM (
        SELECT l.*, COALESCE(sum(m.matched_amount), 0) AS matched_amount,
          count(m.id) AS match_count
        FROM public.bank_statement_lines l
        LEFT JOIN public.bank_reconciliation_matches m ON m.statement_line_id = l.id
        WHERE l.session_id = _session GROUP BY l.id
      ) x
    ), '[]'::jsonb),
    'matches', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at)
      FROM (
        SELECT m.*, t.transaction_date AS book_date, t.transaction_type,
          t.amount AS book_amount, t.reference_number AS book_reference,
          t.description AS book_description
        FROM public.bank_reconciliation_matches m
        JOIN public.bank_account_transactions t ON t.id = m.bank_transaction_id
        WHERE m.session_id = _session
      ) x
    ), '[]'::jsonb),
    'book_transactions', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.transaction_date, x.created_at, x.id)
      FROM (
        SELECT t.id, COALESCE(t.transaction_date, t.created_at::date) AS transaction_date,
          t.transaction_type, t.amount, t.description, t.reference_number,
          t.currency, t.source_type, t.source_id, t.created_at,
          CASE WHEN public._bank_transaction_is_credit(t.transaction_type) THEN 'credit' ELSE 'debit' END AS direction,
          COALESCE(used.amount, 0) AS matched_amount,
          t.amount - COALESCE(used.amount, 0) AS remaining_amount
        FROM public.bank_account_transactions t
        LEFT JOIN LATERAL (
          SELECT sum(m.matched_amount) AS amount FROM public.bank_reconciliation_matches m WHERE m.bank_transaction_id = t.id
        ) used ON true
        WHERE t.organization_id = v_session.organization_id
          AND t.bank_account_id = v_session.bank_account_id
          AND COALESCE(t.transaction_date, t.created_at::date)
            BETWEEN v_session.statement_start - 30 AND v_session.statement_end + 30
      ) x
    ), '[]'::jsonb),
    'adjustment_accounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'code', a.account_code,
        'name', COALESCE(a.account_name_ar, a.account_name), 'type', a.account_type) ORDER BY a.account_code)
      FROM public.chart_of_accounts a
      WHERE a.organization_id = v_session.organization_id
        AND a.account_code NOT IN ('1000','1010') AND COALESCE(a.is_active, true)
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;