-- Finance records stay with their original organization. This keeps validated
-- links intact when a user belongs to more than one organization.
CREATE FUNCTION operations_private.prevent_financial_organization_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'financial_record_organization_immutable' USING ERRCODE = '23514';
END;
$$;

REVOKE ALL ON FUNCTION operations_private.prevent_financial_organization_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER preserve_bank_account_organization BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_bank_movement_organization BEFORE UPDATE ON public.bank_account_transactions
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_commission_payment_organization BEFORE UPDATE ON public.commission_payments
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_journal_organization BEFORE UPDATE ON public.journal_entries
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_ledger_account_organization BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_cost_center_organization BEFORE UPDATE ON public.cost_centers
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE TRIGGER preserve_account_routing_organization BEFORE UPDATE ON public.organization_account_routing
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION operations_private.prevent_financial_organization_change();

CREATE FUNCTION operations_private.require_treasury_account_organization()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.bank_account_id IS NOT NULL THEN
    PERFORM 1
    FROM public.bank_accounts a
    WHERE a.id = NEW.bank_account_id AND a.organization_id = NEW.organization_id
    FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'treasury_account_organization_mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.require_treasury_account_organization() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER check_bank_movement_account_organization
BEFORE INSERT OR UPDATE OF organization_id, bank_account_id ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION operations_private.require_treasury_account_organization();

CREATE TRIGGER check_commission_payment_account_organization
BEFORE INSERT OR UPDATE OF organization_id, bank_account_id ON public.commission_payments
FOR EACH ROW EXECUTE FUNCTION operations_private.require_treasury_account_organization();

CREATE FUNCTION operations_private.require_journal_line_organization()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT j.organization_id INTO v_org
  FROM public.journal_entries j
  WHERE j.id = NEW.journal_entry_id
  FOR KEY SHARE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'journal_line_organization_mismatch' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.journal_entry_id IS DISTINCT FROM NEW.journal_entry_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = OLD.journal_entry_id AND j.organization_id = v_org
    ) THEN
      RAISE EXCEPTION 'journal_line_organization_mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;

  PERFORM 1 FROM public.chart_of_accounts a
  WHERE a.id = NEW.account_id AND a.organization_id = v_org
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_line_organization_mismatch' USING ERRCODE = '23514';
  END IF;

  IF NEW.cost_center_id IS NOT NULL THEN
    PERFORM 1 FROM public.cost_centers c
    WHERE c.id = NEW.cost_center_id AND c.organization_id = v_org
    FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'journal_cost_center_organization_mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.require_journal_line_organization() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER check_journal_line_organization
BEFORE INSERT OR UPDATE OF journal_entry_id, account_id, cost_center_id ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION operations_private.require_journal_line_organization();

CREATE FUNCTION operations_private.require_account_routing_organization()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.chart_of_accounts a
  WHERE a.id = NEW.account_id AND a.organization_id = NEW.organization_id
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_routing_organization_mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.require_account_routing_organization() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER check_account_routing_organization
BEFORE INSERT OR UPDATE OF organization_id, account_id ON public.organization_account_routing
FOR EACH ROW EXECUTE FUNCTION operations_private.require_account_routing_organization();

-- Match by organization as well as account ID in both balance-maintenance paths.
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_delta numeric;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_delta := CASE WHEN OLD.transaction_type IN ('deposit', 'credit', 'income') THEN -OLD.amount ELSE OLD.amount END;
    UPDATE public.bank_accounts
    SET current_balance = coalesce(current_balance, 0) + v_delta, updated_at = now()
    WHERE id = OLD.bank_account_id AND organization_id = OLD.organization_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_delta := CASE WHEN NEW.transaction_type IN ('deposit', 'credit', 'income') THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.bank_accounts
    SET current_balance = coalesce(current_balance, 0) + v_delta, updated_at = now()
    WHERE id = NEW.bank_account_id AND organization_id = NEW.organization_id;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_commission_payment_bank_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.bank_account_id IS NOT NULL AND coalesce(NEW.total_commission_amount, 0) > 0 THEN
    UPDATE public.bank_accounts
    SET current_balance = coalesce(current_balance, 0) - NEW.total_commission_amount, updated_at = now()
    WHERE id = NEW.bank_account_id AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'commission payment bank update failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Callers use authorized posting and reporting functions. These internal
-- resolvers can initialize a chart of accounts and should not be public RPCs.
REVOKE EXECUTE ON FUNCTION public.seed_default_chart_of_accounts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_org_account_route(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_account_id_by_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._resolve_account(uuid, text) FROM PUBLIC, anon, authenticated;

-- Verify pre-existing links while the trigger DDL holds write locks.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bank_account_transactions m
    LEFT JOIN public.bank_accounts a ON a.id = m.bank_account_id
    WHERE m.bank_account_id IS NOT NULL
      AND (m.organization_id IS NULL OR a.organization_id IS DISTINCT FROM m.organization_id)
  ) OR EXISTS (
    SELECT 1 FROM public.commission_payments m
    LEFT JOIN public.bank_accounts a ON a.id = m.bank_account_id
    WHERE m.bank_account_id IS NOT NULL
      AND (m.organization_id IS NULL OR a.organization_id IS DISTINCT FROM m.organization_id)
  ) THEN
    RAISE EXCEPTION 'Existing treasury movements need organization reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.journal_entry_lines l
    JOIN public.journal_entries j ON j.id = l.journal_entry_id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN public.cost_centers c ON c.id = l.cost_center_id
    WHERE j.organization_id IS NULL OR a.organization_id IS DISTINCT FROM j.organization_id
      OR (l.cost_center_id IS NOT NULL AND c.organization_id IS DISTINCT FROM j.organization_id)
  ) OR EXISTS (
    SELECT 1 FROM public.organization_account_routing r
    JOIN public.chart_of_accounts a ON a.id = r.account_id
    WHERE r.organization_id IS NULL OR a.organization_id IS DISTINCT FROM r.organization_id
  ) THEN
    RAISE EXCEPTION 'Existing ledger links need organization reconciliation';
  END IF;
END;
$$;
