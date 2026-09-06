-- Production bank reconciliation. Statement imports remain separate from treasury transactions.
BEGIN;

CREATE TABLE IF NOT EXISTS public.bank_reconciliation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  statement_start date NOT NULL,
  statement_end date NOT NULL,
  statement_opening_balance numeric NOT NULL,
  statement_closing_balance numeric NOT NULL,
  book_opening_balance numeric NOT NULL DEFAULT 0,
  book_closing_balance_snapshot numeric NOT NULL DEFAULT 0,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','reconciled','closed')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (statement_start <= statement_end)
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.bank_reconciliation_sessions(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  value_date date,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  reference text,
  description text,
  external_id text,
  fingerprint text NOT NULL,
  import_row integer,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','partial','matched','ignored')),
  ignored_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank_account_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS public.bank_reconciliation_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.bank_reconciliation_sessions(id) ON DELETE CASCADE,
  statement_line_id uuid NOT NULL REFERENCES public.bank_statement_lines(id) ON DELETE CASCADE,
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_account_transactions(id) ON DELETE RESTRICT,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  matched_amount numeric NOT NULL CHECK (matched_amount > 0),
  match_type text NOT NULL CHECK (match_type IN ('automatic','manual','adjustment')),
  confidence numeric CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_sessions_org_account_period ON public.bank_reconciliation_sessions(organization_id, bank_account_id, statement_end DESC);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_session_status_date ON public.bank_statement_lines(session_id, status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_org_account_date ON public.bank_statement_lines(organization_id, bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_matches_line ON public.bank_reconciliation_matches(statement_line_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_matches_transaction ON public.bank_reconciliation_matches(bank_transaction_id);

DROP TRIGGER IF EXISTS trg_bank_reconciliation_sessions_updated ON public.bank_reconciliation_sessions;
CREATE TRIGGER trg_bank_reconciliation_sessions_updated BEFORE UPDATE ON public.bank_reconciliation_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_bank_statement_lines_updated ON public.bank_statement_lines;
CREATE TRIGGER trg_bank_statement_lines_updated BEFORE UPDATE ON public.bank_statement_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bank_reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_reconciliation_sessions_read ON public.bank_reconciliation_sessions;
CREATE POLICY bank_reconciliation_sessions_read ON public.bank_reconciliation_sessions FOR SELECT TO authenticated USING ((SELECT public._can_read_org_finance(organization_id)));
DROP POLICY IF EXISTS bank_statement_lines_read ON public.bank_statement_lines;
CREATE POLICY bank_statement_lines_read ON public.bank_statement_lines FOR SELECT TO authenticated USING ((SELECT public._can_read_org_finance(organization_id)));
DROP POLICY IF EXISTS bank_reconciliation_matches_read ON public.bank_reconciliation_matches;
CREATE POLICY bank_reconciliation_matches_read ON public.bank_reconciliation_matches FOR SELECT TO authenticated USING ((SELECT public._can_read_org_finance(organization_id)));

REVOKE ALL ON public.bank_reconciliation_sessions, public.bank_statement_lines, public.bank_reconciliation_matches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bank_reconciliation_sessions, public.bank_statement_lines, public.bank_reconciliation_matches TO authenticated;
GRANT ALL ON public.bank_reconciliation_sessions, public.bank_statement_lines, public.bank_reconciliation_matches TO service_role;

CREATE OR REPLACE FUNCTION public._can_manage_bank_reconciliation(_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE(public.can_org_write(_org), false)
    AND (
      COALESCE(public._recovery_can_manage(_org), false)
      OR EXISTS (
        SELECT 1
        FROM public.organization_members m
        JOIN public.sop_department_members d
          ON d.organization_id = m.organization_id AND d.user_id = m.user_id
        WHERE m.organization_id = _org
          AND m.user_id = auth.uid()
          AND m.is_active = true
          AND d.department::text = 'finance'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public._bank_transaction_is_credit(_type text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT lower(COALESCE(_type, '')) = ANY (
    ARRAY['deposit', 'credit', 'income', 'receipt', 'transfer_in']
  );
$function$;

CREATE OR REPLACE FUNCTION public._bank_book_balance_at(_account uuid, _as_of date)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(a.current_balance, 0) - COALESCE((
    SELECT SUM(
      CASE WHEN public._bank_transaction_is_credit(t.transaction_type)
        THEN t.amount ELSE -t.amount END
    )
    FROM public.bank_account_transactions t
    WHERE t.bank_account_id = a.id
      AND COALESCE(t.transaction_date, t.created_at::date) > _as_of
  ), 0)
  FROM public.bank_accounts a
  WHERE a.id = _account
    AND public._can_read_org_finance(a.organization_id);
$function$;

CREATE OR REPLACE FUNCTION public.create_bank_reconciliation_session(_org uuid, _bank_account uuid, _statement_start date, _statement_end date, _opening_balance numeric, _closing_balance numeric, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_account public.bank_accounts%ROWTYPE;
  v_id uuid;
  v_book_open numeric;
  v_book_close numeric;
BEGIN
  IF public._can_manage_bank_reconciliation(_org) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to manage bank reconciliation';
  END IF;
  IF _statement_start IS NULL OR _statement_end IS NULL OR _statement_start > _statement_end THEN
    RAISE EXCEPTION 'Invalid statement period';
  END IF;
  SELECT * INTO v_account FROM public.bank_accounts
  WHERE id = _bank_account AND organization_id = _org AND COALESCE(is_active, true)
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank account not found'; END IF;

  v_book_open := public._bank_book_balance_at(_bank_account, _statement_start - 1);
  v_book_close := public._bank_book_balance_at(_bank_account, _statement_end);
  INSERT INTO public.bank_reconciliation_sessions(
    organization_id, bank_account_id, statement_start, statement_end,
    statement_opening_balance, statement_closing_balance,
    book_opening_balance, book_closing_balance_snapshot, currency, notes, created_by
  ) VALUES (
    _org, _bank_account, _statement_start, _statement_end,
    COALESCE(_opening_balance, 0), COALESCE(_closing_balance, 0),
    COALESCE(v_book_open, 0), COALESCE(v_book_close, 0),
    upper(COALESCE(v_account.currency, 'EGP')), NULLIF(trim(_notes), ''), auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.import_bank_statement_lines(_session uuid, _lines jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_line jsonb;
  v_date date;
  v_value_date date;
  v_direction text;
  v_amount numeric;
  v_fingerprint text;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_row_count integer;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions
  WHERE id = _session FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to import this statement';
  END IF;
  IF v_session.status NOT IN ('draft', 'in_review') THEN
    RAISE EXCEPTION 'A reconciled or closed session cannot be changed';
  END IF;
  IF jsonb_typeof(_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(_lines) = 0 THEN
    RAISE EXCEPTION 'Statement lines are required';
  END IF;
  IF jsonb_array_length(_lines) > 5000 THEN
    RAISE EXCEPTION 'A single import is limited to 5000 lines';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    BEGIN
      v_date := (v_line->>'transaction_date')::date;
      v_value_date := NULLIF(v_line->>'value_date', '')::date;
      v_direction := lower(v_line->>'direction');
      v_amount := abs((v_line->>'amount')::numeric);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid statement row %', COALESCE(v_line->>'row_number', '?');
    END;
    IF v_date NOT BETWEEN v_session.statement_start AND v_session.statement_end THEN
      RAISE EXCEPTION 'Statement row % is outside the session period', COALESCE(v_line->>'row_number', '?');
    END IF;
    IF v_direction NOT IN ('credit', 'debit') OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Statement row % has invalid direction or amount', COALESCE(v_line->>'row_number', '?');
    END IF;
    v_fingerprint := md5(concat_ws('|',
      v_session.bank_account_id::text,
      COALESCE(NULLIF(v_line->>'external_id', ''), ''),
      v_date::text, v_direction, round(v_amount, 2)::text,
      lower(trim(COALESCE(v_line->>'reference', ''))),
      lower(trim(COALESCE(v_line->>'description', ''))),
      COALESCE(NULLIF(v_line->>'occurrence', ''), '1')
    ));
    INSERT INTO public.bank_statement_lines(
      organization_id, session_id, bank_account_id, transaction_date, value_date,
      direction, amount, currency, reference, description, external_id,
      fingerprint, import_row, raw_data, created_by
    ) VALUES (
      v_session.organization_id, v_session.id, v_session.bank_account_id,
      v_date, v_value_date, v_direction, v_amount, v_session.currency,
      NULLIF(trim(v_line->>'reference'), ''), NULLIF(trim(v_line->>'description'), ''),
      NULLIF(trim(v_line->>'external_id'), ''), v_fingerprint,
      NULLIF(v_line->>'row_number', '')::integer, COALESCE(v_line->'raw_data', '{}'::jsonb), auth.uid()
    ) ON CONFLICT (bank_account_id, fingerprint) DO NOTHING;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 1 THEN v_inserted := v_inserted + 1; ELSE v_skipped := v_skipped + 1; END IF;
  END LOOP;
  UPDATE public.bank_reconciliation_sessions SET status = 'in_review' WHERE id = _session;
  RETURN jsonb_build_object('inserted', v_inserted, 'duplicates_skipped', v_skipped);
END;
$function$;

CREATE OR REPLACE FUNCTION public._refresh_bank_statement_line_status(_line uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_amount numeric; v_matched numeric; v_status text;
BEGIN
  SELECT amount, status INTO v_amount, v_status FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND OR v_status = 'ignored' THEN RETURN; END IF;
  SELECT COALESCE(sum(matched_amount), 0) INTO v_matched
  FROM public.bank_reconciliation_matches WHERE statement_line_id = _line;
  UPDATE public.bank_statement_lines
  SET status = CASE
    WHEN v_matched >= v_amount - 0.005 THEN 'matched'
    WHEN v_matched > 0 THEN 'partial'
    ELSE 'unmatched' END
  WHERE id = _line;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_match_bank_reconciliation(_session uuid, _tolerance numeric DEFAULT 0.01, _date_window_days integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_line record;
  v_transaction record;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to reconcile this account';
  END IF;
  IF v_session.status NOT IN ('draft', 'in_review') THEN RAISE EXCEPTION 'Session is locked'; END IF;
  _tolerance := GREATEST(COALESCE(_tolerance, 0.01), 0);
  _date_window_days := LEAST(GREATEST(COALESCE(_date_window_days, 3), 0), 30);

  FOR v_line IN
    SELECT l.*, l.amount - COALESCE(sum(m.matched_amount), 0) AS remaining
    FROM public.bank_statement_lines l
    LEFT JOIN public.bank_reconciliation_matches m ON m.statement_line_id = l.id
    WHERE l.session_id = _session AND l.status IN ('unmatched', 'partial')
    GROUP BY l.id
    ORDER BY l.transaction_date, l.id
  LOOP
    SELECT t.id, t.amount - COALESCE(used.amount, 0) AS remaining
    INTO v_transaction
    FROM public.bank_account_transactions t
    LEFT JOIN LATERAL (
      SELECT sum(m.matched_amount) AS amount
      FROM public.bank_reconciliation_matches m
      WHERE m.bank_transaction_id = t.id
    ) used ON true
    WHERE t.organization_id = v_session.organization_id
      AND t.bank_account_id = v_session.bank_account_id
      AND upper(COALESCE(t.currency, v_session.currency)) = v_session.currency
      AND (CASE WHEN public._bank_transaction_is_credit(t.transaction_type) THEN 'credit' ELSE 'debit' END) = v_line.direction
      AND abs(COALESCE(t.transaction_date, t.created_at::date) - v_line.transaction_date) <= _date_window_days
      AND abs((t.amount - COALESCE(used.amount, 0)) - v_line.remaining) <= _tolerance
    ORDER BY
      CASE WHEN NULLIF(lower(trim(t.reference_number)), '') = NULLIF(lower(trim(v_line.reference)), '') THEN 0 ELSE 1 END,
      abs(COALESCE(t.transaction_date, t.created_at::date) - v_line.transaction_date),
      t.created_at, t.id
    LIMIT 1
    FOR UPDATE OF t;
    IF FOUND THEN
      INSERT INTO public.bank_reconciliation_matches(
        organization_id, session_id, statement_line_id, bank_transaction_id,
        matched_amount, match_type, confidence, created_by
      ) VALUES (
        v_session.organization_id, _session, v_line.id, v_transaction.id,
        v_line.remaining, 'automatic',
        CASE WHEN v_line.reference IS NOT NULL THEN 1 ELSE 0.9 END, auth.uid()
      );
      PERFORM public._refresh_bank_statement_line_status(v_line.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('matched_lines', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_bank_statement_line(_line uuid, _bank_transaction uuid, _amount numeric DEFAULT NULL::numeric, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_tx public.bank_account_transactions%ROWTYPE;
  v_line_remaining numeric;
  v_tx_remaining numeric;
  v_amount numeric;
  v_id uuid;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Statement line not found'; END IF;
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = v_line.session_id FOR UPDATE;
  IF public._can_manage_bank_reconciliation(v_line.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_session.status NOT IN ('draft', 'in_review') OR v_line.status = 'ignored' THEN RAISE EXCEPTION 'Statement line is locked'; END IF;
  SELECT * INTO v_tx FROM public.bank_account_transactions WHERE id = _bank_transaction FOR UPDATE;
  IF NOT FOUND OR v_tx.organization_id IS DISTINCT FROM v_line.organization_id
     OR v_tx.bank_account_id IS DISTINCT FROM v_line.bank_account_id THEN
    RAISE EXCEPTION 'Book transaction does not belong to this bank account';
  END IF;
  IF (CASE WHEN public._bank_transaction_is_credit(v_tx.transaction_type) THEN 'credit' ELSE 'debit' END) <> v_line.direction THEN
    RAISE EXCEPTION 'Statement and book transaction directions differ';
  END IF;
  SELECT v_line.amount - COALESCE(sum(matched_amount), 0) INTO v_line_remaining
  FROM public.bank_reconciliation_matches WHERE statement_line_id = v_line.id;
  SELECT v_tx.amount - COALESCE(sum(matched_amount), 0) INTO v_tx_remaining
  FROM public.bank_reconciliation_matches WHERE bank_transaction_id = v_tx.id;
  v_amount := COALESCE(_amount, LEAST(v_line_remaining, v_tx_remaining));
  IF v_amount <= 0 OR v_amount > v_line_remaining + 0.005 OR v_amount > v_tx_remaining + 0.005 THEN
    RAISE EXCEPTION 'Match amount exceeds the remaining statement or book amount';
  END IF;
  INSERT INTO public.bank_reconciliation_matches(
    organization_id, session_id, statement_line_id, bank_transaction_id,
    matched_amount, match_type, confidence, notes, created_by
  ) VALUES (
    v_line.organization_id, v_line.session_id, v_line.id, v_tx.id,
    v_amount, 'manual', 1, NULLIF(trim(_notes), ''), auth.uid()
  ) RETURNING id INTO v_id;
  PERFORM public._refresh_bank_statement_line_status(v_line.id);
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unmatch_bank_reconciliation(_match uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_match public.bank_reconciliation_matches%ROWTYPE; v_status text;
BEGIN
  SELECT * INTO v_match FROM public.bank_reconciliation_matches WHERE id = _match FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT status INTO v_status FROM public.bank_reconciliation_sessions WHERE id = v_match.session_id FOR UPDATE;
  IF public._can_manage_bank_reconciliation(v_match.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_status NOT IN ('draft', 'in_review') THEN RAISE EXCEPTION 'Session is locked'; END IF;
  IF v_match.match_type = 'adjustment' THEN RAISE EXCEPTION 'Adjustment matches cannot be removed; reverse the accounting entry instead'; END IF;
  DELETE FROM public.bank_reconciliation_matches WHERE id = _match;
  PERFORM public._refresh_bank_statement_line_status(v_match.statement_line_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_bank_statement_line_ignored(_line uuid, _ignored boolean, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_line public.bank_statement_lines%ROWTYPE; v_status text;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_line.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT status INTO v_status FROM public.bank_reconciliation_sessions WHERE id = v_line.session_id FOR UPDATE;
  IF v_status NOT IN ('draft', 'in_review') THEN RAISE EXCEPTION 'Session is locked'; END IF;
  IF _ignored AND EXISTS (SELECT 1 FROM public.bank_reconciliation_matches WHERE statement_line_id = _line) THEN
    RAISE EXCEPTION 'A matched line cannot be ignored';
  END IF;
  UPDATE public.bank_statement_lines SET
    status = CASE WHEN _ignored THEN 'ignored' ELSE 'unmatched' END,
    ignored_reason = CASE WHEN _ignored THEN NULLIF(trim(_reason), '') ELSE NULL END
  WHERE id = _line;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_bank_reconciliation_adjustment(_line uuid, _counter_account uuid, _description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_bank public.bank_accounts%ROWTYPE;
  v_counter public.chart_of_accounts%ROWTYPE;
  v_bank_gl uuid;
  v_remaining numeric;
  v_journal uuid;
  v_transaction uuid;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_line.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = v_line.session_id FOR UPDATE;
  IF v_session.status NOT IN ('draft', 'in_review') OR v_line.status = 'ignored' THEN RAISE EXCEPTION 'Statement line is locked'; END IF;
  SELECT * INTO v_bank FROM public.bank_accounts WHERE id = v_line.bank_account_id AND organization_id = v_line.organization_id FOR UPDATE;
  SELECT * INTO v_counter FROM public.chart_of_accounts WHERE id = _counter_account AND organization_id = v_line.organization_id;
  IF NOT FOUND OR v_counter.account_code IN ('1000', '1010') THEN RAISE EXCEPTION 'Choose a valid counter account'; END IF;
  SELECT v_line.amount - COALESCE(sum(matched_amount), 0) INTO v_remaining
  FROM public.bank_reconciliation_matches WHERE statement_line_id = v_line.id;
  IF v_remaining <= 0.005 THEN RAISE EXCEPTION 'Statement line is already fully matched'; END IF;
  v_bank_gl := public._resolve_account(v_line.organization_id,
    CASE WHEN v_bank.treasury_kind = 'cash' THEN '1000' ELSE '1010' END);
  IF v_bank_gl IS NULL THEN RAISE EXCEPTION 'Bank ledger control account is missing'; END IF;

  INSERT INTO public.journal_entries(
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, created_by, currency,
    source_type, source_id, posted_at, is_locked, auto_generated
  ) VALUES (
    v_line.organization_id, public._next_entry_number(v_line.organization_id),
    v_line.transaction_date, 'bank_reconciliation', v_line.session_id,
    COALESCE(NULLIF(trim(_description), ''), v_line.description, 'Bank reconciliation adjustment'),
    v_remaining, v_remaining, 'posted', auth.uid(), v_line.currency,
    'bank_reconciliation_adjustment', v_line.id, now(), false, true
  ) RETURNING id INTO v_journal;
  IF v_line.direction = 'debit' THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
    VALUES
      (v_journal, v_counter.id, v_remaining, 0, 'Bank statement adjustment', 1),
      (v_journal, v_bank_gl, 0, v_remaining, 'Bank statement adjustment', 2);
  ELSE
    INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
    VALUES
      (v_journal, v_bank_gl, v_remaining, 0, 'Bank statement adjustment', 1),
      (v_journal, v_counter.id, 0, v_remaining, 'Bank statement adjustment', 2);
  END IF;
  INSERT INTO public.bank_account_transactions(
    bank_account_id, transaction_type, amount, description, transaction_date,
    reference_number, organization_id, created_by, source_type, source_id, currency
  ) VALUES (
    v_bank.id, CASE WHEN v_line.direction = 'credit' THEN 'deposit' ELSE 'withdrawal' END,
    v_remaining, COALESCE(NULLIF(trim(_description), ''), v_line.description, 'Bank reconciliation adjustment'),
    v_line.transaction_date, v_line.reference, v_line.organization_id, auth.uid(),
    'bank_reconciliation_adjustment', v_line.id, v_line.currency
  ) RETURNING id INTO v_transaction;
  INSERT INTO public.bank_reconciliation_matches(
    organization_id, session_id, statement_line_id, bank_transaction_id,
    journal_entry_id, matched_amount, match_type, confidence, notes, created_by
  ) VALUES (
    v_line.organization_id, v_line.session_id, v_line.id, v_transaction,
    v_journal, v_remaining, 'adjustment', 1, 'Created from bank statement difference', auth.uid()
  );
  PERFORM public._refresh_bank_statement_line_status(v_line.id);
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES (auth.uid(), 'bank_reconciliation_adjustment', 'bank_statement_lines', v_line.id,
    v_line.organization_id, jsonb_build_object('journal_entry_id', v_journal, 'bank_transaction_id', v_transaction, 'amount', v_remaining));
  RETURN jsonb_build_object('journal_entry_id', v_journal, 'bank_transaction_id', v_transaction, 'amount', v_remaining);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_bank_reconciliation_sessions(_org uuid, _bank_account uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.statement_end DESC, x.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT s.*, a.account_name, a.bank_name,
      (SELECT count(*) FROM public.bank_statement_lines l WHERE l.session_id = s.id) AS line_count,
      (SELECT count(*) FROM public.bank_statement_lines l WHERE l.session_id = s.id AND l.status = 'matched') AS matched_count,
      (SELECT count(*) FROM public.bank_statement_lines l WHERE l.session_id = s.id AND l.status IN ('unmatched','partial')) AS unresolved_count
    FROM public.bank_reconciliation_sessions s
    JOIN public.bank_accounts a ON a.id = s.bank_account_id
    WHERE s.organization_id = _org
      AND (_bank_account IS NULL OR s.bank_account_id = _bank_account)
      AND public._can_read_org_finance(_org)
  ) x;
$function$;

CREATE OR REPLACE FUNCTION public.get_bank_reconciliation_workspace(_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_session public.bank_reconciliation_sessions%ROWTYPE; v_book_close numeric; v_result jsonb;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session;
  IF NOT FOUND OR public._can_read_org_finance(v_session.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_book_close := public._bank_book_balance_at(v_session.bank_account_id, v_session.statement_end);
  SELECT jsonb_build_object(
    'session', to_jsonb(v_session),
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

CREATE OR REPLACE FUNCTION public.approve_bank_reconciliation(_session uuid, _tolerance numeric DEFAULT 0.01)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_session public.bank_reconciliation_sessions%ROWTYPE; v_unresolved integer; v_book_close numeric; v_statement_calc numeric;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_session.status NOT IN ('draft','in_review') THEN RAISE EXCEPTION 'Only an open session can be approved'; END IF;
  SELECT count(*) INTO v_unresolved FROM public.bank_statement_lines WHERE session_id = _session AND status IN ('unmatched','partial');
  IF v_unresolved > 0 THEN RAISE EXCEPTION 'Resolve all statement lines before approval'; END IF;
  SELECT v_session.statement_opening_balance + COALESCE(sum(CASE direction WHEN 'credit' THEN amount ELSE -amount END), 0)
    INTO v_statement_calc FROM public.bank_statement_lines WHERE session_id = _session;
  IF abs(v_statement_calc - v_session.statement_closing_balance) > GREATEST(COALESCE(_tolerance,0.01),0) THEN
    RAISE EXCEPTION 'Statement opening, movement, and closing balances do not reconcile';
  END IF;
  v_book_close := public._bank_book_balance_at(v_session.bank_account_id, v_session.statement_end);
  IF abs(v_session.statement_closing_balance - v_book_close) > GREATEST(COALESCE(_tolerance,0.01),0) THEN
    RAISE EXCEPTION 'Statement closing balance does not equal the book balance';
  END IF;
  UPDATE public.bank_reconciliation_sessions SET status='reconciled', approved_by=auth.uid(), approved_at=now(),
    book_closing_balance_snapshot=v_book_close WHERE id=_session;
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES(auth.uid(),'bank_reconciliation_approved','bank_reconciliation_sessions',_session,v_session.organization_id,
    jsonb_build_object('book_closing_balance',v_book_close,'statement_closing_balance',v_session.statement_closing_balance));
  RETURN jsonb_build_object('status','reconciled','difference',v_session.statement_closing_balance-v_book_close);
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_bank_reconciliation(_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_session public.bank_reconciliation_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id=_session FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_session.status <> 'reconciled' THEN RAISE EXCEPTION 'Approve the reconciliation before closing it'; END IF;
  UPDATE public.bank_reconciliation_sessions SET status='closed',closed_by=auth.uid(),closed_at=now() WHERE id=_session;
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES(auth.uid(),'bank_reconciliation_closed','bank_reconciliation_sessions',_session,v_session.organization_id,
    jsonb_build_object('statement_start',v_session.statement_start,'statement_end',v_session.statement_end));
  RETURN jsonb_build_object('status','closed');
END;
$function$;

REVOKE ALL ON FUNCTION public._can_manage_bank_reconciliation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._bank_book_balance_at(uuid,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._refresh_bank_statement_line_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_bank_reconciliation_session(uuid,uuid,date,date,numeric,numeric,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_bank_statement_lines(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auto_match_bank_reconciliation(uuid,numeric,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_bank_statement_line(uuid,uuid,numeric,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unmatch_bank_reconciliation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_bank_statement_line_ignored(uuid,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_bank_reconciliation_adjustment(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_bank_reconciliation_sessions(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_bank_reconciliation_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_bank_reconciliation(uuid,numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_bank_reconciliation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_manage_bank_reconciliation(uuid), public._bank_book_balance_at(uuid,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._refresh_bank_statement_line_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_bank_reconciliation_session(uuid,uuid,date,date,numeric,numeric,text), public.import_bank_statement_lines(uuid,jsonb), public.auto_match_bank_reconciliation(uuid,numeric,integer), public.match_bank_statement_line(uuid,uuid,numeric,text), public.unmatch_bank_reconciliation(uuid), public.set_bank_statement_line_ignored(uuid,boolean,text), public.create_bank_reconciliation_adjustment(uuid,uuid,text), public.list_bank_reconciliation_sessions(uuid,uuid), public.get_bank_reconciliation_workspace(uuid), public.approve_bank_reconciliation(uuid,numeric), public.close_bank_reconciliation(uuid) TO authenticated, service_role;

COMMIT;

