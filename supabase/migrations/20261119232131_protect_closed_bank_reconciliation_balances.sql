-- A backdated amount changes every later closing balance for that account.
CREATE INDEX IF NOT EXISTS bank_reconciliation_closed_end_idx
  ON public.bank_reconciliation_sessions (bank_account_id, statement_end) WHERE status = 'closed';

CREATE OR REPLACE FUNCTION public.guard_closed_bank_reconciliation_movements()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  old_account uuid;
  new_account uuid;
  old_date date;
  new_date date;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_account := OLD.bank_account_id;
    old_date := COALESCE(OLD.transaction_date, OLD.created_at::date);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_account := NEW.bank_account_id;
    new_date := COALESCE(NEW.transaction_date, NEW.created_at::date);
  END IF;
  IF TG_OP = 'UPDATE' AND (old_account, old_date, OLD.amount, OLD.transaction_type, OLD.currency, OLD.organization_id)
     IS NOT DISTINCT FROM (new_account, new_date, NEW.amount, NEW.transaction_type, NEW.currency, NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  -- Closing takes the same account lock before reading the final book balance.
  PERFORM 1 FROM public.bank_accounts WHERE id IN (old_account, new_account) ORDER BY id FOR NO KEY UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.bank_reconciliation_sessions s
    WHERE s.status = 'closed' AND (
      (s.bank_account_id = old_account AND s.statement_end >= old_date)
      OR (s.bank_account_id = new_account AND s.statement_end >= new_date)
    )
  ) THEN
    RAISE EXCEPTION 'التسوية البنكية مقفلة لهذا التاريخ. سجّل التصحيح في فترة مفتوحة.' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_closed_bank_reconciliation_movements() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER guard_closed_bank_reconciliation_movements
  BEFORE INSERT OR UPDATE OF bank_account_id, transaction_date, created_at, amount, transaction_type, currency, organization_id
    OR DELETE ON public.bank_account_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_closed_bank_reconciliation_movements();

CREATE OR REPLACE FUNCTION public.close_bank_reconciliation(_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_session public.bank_reconciliation_sessions%ROWTYPE;
  v_account uuid;
BEGIN
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  v_account := v_session.bank_account_id;
  PERFORM 1 FROM public.bank_accounts
    WHERE id = v_account AND organization_id = v_session.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank account not found'; END IF;
  SELECT * INTO v_session FROM public.bank_reconciliation_sessions WHERE id = _session FOR UPDATE;
  IF NOT FOUND OR v_session.bank_account_id IS DISTINCT FROM v_account
    OR public._can_manage_bank_reconciliation(v_session.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_session.status <> 'reconciled' THEN
    RAISE EXCEPTION 'Approve the reconciliation before closing it';
  END IF;
  IF public._bank_book_balance_at(v_account, v_session.statement_end) IS DISTINCT FROM v_session.book_closing_balance_snapshot THEN
    RAISE EXCEPTION 'رصيد الدفاتر تغيّر بعد الاعتماد. طابق الرصيد المعتمد قبل إقفال التسوية.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bank_reconciliation_sessions
    SET status = 'closed', closed_by = auth.uid(), closed_at = now() WHERE id = _session;
  INSERT INTO public.admin_audit_log(user_id, action, target_table, target_id, organization_id, details)
  VALUES(auth.uid(), 'bank_reconciliation_closed', 'bank_reconciliation_sessions', _session,
    v_session.organization_id, jsonb_build_object('statement_start', v_session.statement_start,
      'statement_end', v_session.statement_end));
  RETURN jsonb_build_object('status', 'closed');
END;
$function$;
