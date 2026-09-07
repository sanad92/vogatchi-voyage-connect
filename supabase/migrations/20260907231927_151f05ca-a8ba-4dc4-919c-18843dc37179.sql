-- Reconciliation controls: preserve the statement opening/book opening check,
-- bound approval tolerance, reject non-finite numeric inputs, and keep ignored
-- line status consistent with existing matches. No historical data changes.

CREATE OR REPLACE FUNCTION public.create_bank_reconciliation_session(
  _org uuid, _bank_account uuid, _statement_start date, _statement_end date,
  _opening_balance numeric, _closing_balance numeric, _notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
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
  IF _statement_start IS NULL OR _statement_end IS NULL
     OR _statement_start::text IN ('infinity', '-infinity')
     OR _statement_end::text IN ('infinity', '-infinity')
     OR _statement_start > _statement_end THEN
    RAISE EXCEPTION 'Invalid statement period';
  END IF;
  IF COALESCE(_opening_balance, 0)::text IN ('NaN', 'Infinity', '-Infinity')
     OR COALESCE(_closing_balance, 0)::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Statement balances must be finite amounts';
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
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
    IF v_date::text IN ('infinity', '-infinity')
       OR v_date NOT BETWEEN v_session.statement_start AND v_session.statement_end THEN
      RAISE EXCEPTION 'Statement row % is outside the session period', COALESCE(v_line->>'row_number', '?');
    END IF;
    IF v_amount::text IN ('NaN', 'Infinity', '-Infinity')
       OR v_direction NOT IN ('credit', 'debit') OR v_amount <= 0 THEN
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

CREATE OR REPLACE FUNCTION public.match_bank_statement_line(
  _line uuid, _bank_transaction uuid, _amount numeric DEFAULT NULL::numeric,
  _notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
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
  IF _amount::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'Match amount must be finite'; END IF;
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

CREATE OR REPLACE FUNCTION public.set_bank_statement_line_ignored(
  _line uuid, _ignored boolean, _reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_status text;
  v_has_matches boolean;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_line.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT status INTO v_status FROM public.bank_reconciliation_sessions WHERE id = v_line.session_id FOR UPDATE;
  IF v_status NOT IN ('draft', 'in_review') THEN RAISE EXCEPTION 'Session is locked'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.bank_reconciliation_matches WHERE statement_line_id = _line) INTO v_has_matches;
  IF _ignored AND v_has_matches THEN
    RAISE EXCEPTION 'A matched line cannot be ignored';
  END IF;
  IF NOT _ignored AND v_has_matches THEN
    PERFORM public._refresh_bank_statement_line_status(_line);
    RETURN;
  END IF;
  UPDATE public.bank_statement_lines SET
    status = CASE WHEN _ignored THEN 'ignored' ELSE 'unmatched' END,
    ignored_reason = CASE WHEN _ignored THEN NULLIF(trim(_reason), '') ELSE NULL END
  WHERE id = _line;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_bank_reconciliation(
  _session uuid, _tolerance numeric DEFAULT 0.01
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_unresolved integer;
  v_book_close numeric;
  v_statement_calc numeric;
  v_tolerance numeric := COALESCE(_tolerance, 0.01);
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_session.status NOT IN ('draft','in_review') THEN RAISE EXCEPTION 'Only an open session can be approved'; END IF;
  IF v_tolerance::text IN ('NaN', 'Infinity', '-Infinity') OR v_tolerance < 0 OR v_tolerance > 0.01 THEN
    RAISE EXCEPTION 'Approval tolerance must be between 0 and 0.01';
  END IF;
  IF v_session.statement_opening_balance::text IN ('NaN', 'Infinity', '-Infinity')
     OR v_session.statement_closing_balance::text IN ('NaN', 'Infinity', '-Infinity')
     OR v_session.book_opening_balance::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Reconciliation balances must be finite amounts';
  END IF;
  SELECT count(*) INTO v_unresolved FROM public.bank_statement_lines
  WHERE session_id = _session AND status IN ('unmatched','partial');
  IF v_unresolved > 0 THEN RAISE EXCEPTION 'Resolve all statement lines before approval'; END IF;
  IF abs(v_session.statement_opening_balance - v_session.book_opening_balance) > v_tolerance THEN
    RAISE EXCEPTION 'Statement opening balance does not equal the book opening balance';
  END IF;
  SELECT v_session.statement_opening_balance + COALESCE(sum(CASE direction WHEN 'credit' THEN amount ELSE -amount END), 0)
    INTO v_statement_calc FROM public.bank_statement_lines WHERE session_id = _session;
  IF v_statement_calc::text IN ('NaN', 'Infinity', '-Infinity')
     OR abs(v_statement_calc - v_session.statement_closing_balance) > v_tolerance THEN
    RAISE EXCEPTION 'Statement opening, movement, and closing balances do not reconcile';
  END IF;
  v_book_close := public._bank_book_balance_at(v_session.bank_account_id, v_session.statement_end);
  IF v_book_close::text IN ('NaN', 'Infinity', '-Infinity')
     OR abs(v_session.statement_closing_balance - v_book_close) > v_tolerance THEN
    RAISE EXCEPTION 'Statement closing balance does not equal the book balance';
  END IF;
  UPDATE public.bank_reconciliation_sessions SET status='reconciled', approved_by=auth.uid(), approved_at=now(),
    book_closing_balance_snapshot=v_book_close WHERE id=_session;
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES(auth.uid(),'bank_reconciliation_approved','bank_reconciliation_sessions',_session,v_session.organization_id,
    jsonb_build_object('book_opening_balance',v_session.book_opening_balance,
      'statement_opening_balance',v_session.statement_opening_balance,
      'book_closing_balance',v_book_close,'statement_closing_balance',v_session.statement_closing_balance));
  RETURN jsonb_build_object('status','reconciled','difference',v_session.statement_closing_balance-v_book_close);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_bank_reconciliation_session(uuid, uuid, date, date, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bank_reconciliation_session(uuid, uuid, date, date, numeric, numeric, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.import_bank_statement_lines(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_bank_statement_lines(uuid, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.match_bank_statement_line(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_bank_statement_line(uuid, uuid, numeric, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_bank_statement_line_ignored(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bank_statement_line_ignored(uuid, boolean, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.approve_bank_reconciliation(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_bank_reconciliation(uuid, numeric) TO authenticated, service_role;