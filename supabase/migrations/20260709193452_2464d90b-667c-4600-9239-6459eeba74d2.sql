
-- 1) General Ledger RPC (running balance for a single account)
CREATE OR REPLACE FUNCTION public.get_general_ledger(
  _org_id uuid,
  _account_id uuid,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  line_id uuid,
  entry_date date,
  entry_number text,
  description text,
  line_description text,
  source_type text,
  source_id uuid,
  booking_id uuid,
  reference_type text,
  reference_id uuid,
  debit numeric,
  credit numeric,
  running_balance numeric,
  currency text,
  status text,
  is_locked boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _acc_type text;
  _opening numeric := 0;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT account_type::text INTO _acc_type
  FROM public.chart_of_accounts
  WHERE id = _account_id AND organization_id = _org_id;

  IF _acc_type IS NULL THEN
    RETURN;
  END IF;

  -- opening balance up to (but not including) _start_date
  IF _start_date IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE WHEN _acc_type IN ('asset','expense')
           THEN l.debit - l.credit
           ELSE l.credit - l.debit
      END
    ), 0)
    INTO _opening
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE l.account_id = _account_id
      AND e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.entry_date < _start_date;
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT
      e.id AS entry_id,
      l.id AS line_id,
      e.entry_date,
      e.entry_number,
      e.description,
      l.description AS line_description,
      e.source_type,
      e.source_id,
      e.booking_id,
      e.reference_type,
      e.reference_id,
      l.debit,
      l.credit,
      CASE WHEN _acc_type IN ('asset','expense')
           THEN l.debit - l.credit
           ELSE l.credit - l.debit
      END AS delta,
      e.currency,
      e.status,
      e.is_locked
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE l.account_id = _account_id
      AND e.organization_id = _org_id
      AND e.status = 'posted'
      AND (_start_date IS NULL OR e.entry_date >= _start_date)
      AND (_end_date IS NULL OR e.entry_date <= _end_date)
    ORDER BY e.entry_date, e.entry_number, l.id
  )
  SELECT
    m.entry_id, m.line_id, m.entry_date, m.entry_number, m.description, m.line_description,
    m.source_type, m.source_id, m.booking_id, m.reference_type, m.reference_id,
    m.debit, m.credit,
    _opening + SUM(m.delta) OVER (ORDER BY m.entry_date, m.entry_number, m.line_id
                                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance,
    m.currency, m.status, m.is_locked
  FROM movements m;
END;
$$;

REVOKE ALL ON FUNCTION public.get_general_ledger(uuid,uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_ledger(uuid,uuid,date,date) TO authenticated, service_role;

-- 2) Period close enforcement on journal_entries
CREATE OR REPLACE FUNCTION public.enforce_period_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_date date;
  _org uuid;
  _closed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _target_date := OLD.entry_date;
    _org := OLD.organization_id;
  ELSE
    _target_date := NEW.entry_date;
    _org := NEW.organization_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE organization_id = _org
      AND status IN ('closed','locked')
      AND _target_date BETWEEN start_date AND end_date
  ) INTO _closed;

  IF _closed THEN
    -- allow service_role bypass for admin recovery
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE EXCEPTION 'Accounting period covering % is closed. Reopen the period before modifying journal entries.', _target_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_period_lock_ins ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_enforce_period_lock_upd ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_enforce_period_lock_del ON public.journal_entries;

CREATE TRIGGER trg_enforce_period_lock_ins
BEFORE INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();

CREATE TRIGGER trg_enforce_period_lock_upd
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();

CREATE TRIGGER trg_enforce_period_lock_del
BEFORE DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();
