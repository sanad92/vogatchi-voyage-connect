-- Complete the core double-entry chain:
-- customer invoice -> customer receipt -> supplier invoice -> supplier payment.
--
-- The launch migration already posts customer invoices/receipts and supplier
-- payments. This migration adds the missing supplier-invoice accrual, treats
-- unallocated supplier payments as advances instead of AP settlements, keeps
-- allocation-driven journals synchronized, and enforces journal integrity.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Accounts needed by the completed posting chain.
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (
  organization_id, account_code, account_name, account_name_ar,
  account_type, is_active, is_system, description
)
SELECT o.id, '1210', 'Supplier Advances', 'دفعات مقدمة للموردين',
       'asset'::public.account_type, true, true,
       'Supplier payments not yet allocated to an approved supplier invoice'
FROM public.organizations o
ON CONFLICT (organization_id, account_code) DO NOTHING;

-- A source can have only one canonical automatic journal.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_je_source
  ON public.journal_entries(organization_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Protect locked journals and verify that posted headers match their lines.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_locked_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_locked THEN
    RAISE EXCEPTION 'Locked journal entries cannot be changed or deleted';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_locked_journal_entry() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_locked_journal_entry ON public.journal_entries;
CREATE TRIGGER trg_guard_locked_journal_entry
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_journal_entry();

CREATE OR REPLACE FUNCTION public.guard_locked_journal_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.journal_entry_id ELSE NEW.journal_entry_id END;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = v_entry_id AND je.is_locked
  ) THEN
    RAISE EXCEPTION 'Lines of a locked journal entry cannot be changed or deleted';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_locked_journal_line() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_locked_journal_line ON public.journal_entry_lines;
CREATE TRIGGER trg_guard_locked_journal_line
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_journal_line();

CREATE OR REPLACE FUNCTION public.assert_journal_entry_balanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id uuid := CASE
    WHEN TG_TABLE_NAME = 'journal_entries' THEN CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
    ELSE CASE WHEN TG_OP = 'DELETE' THEN OLD.journal_entry_id ELSE NEW.journal_entry_id END
  END;
  v_header public.journal_entries%ROWTYPE;
  v_debit numeric;
  v_credit numeric;
  v_lines integer;
BEGIN
  SELECT * INTO v_header FROM public.journal_entries WHERE id = v_entry_id;
  IF NOT FOUND OR v_header.status <> 'posted' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sum(l.debit), 0), COALESCE(sum(l.credit), 0), count(*)
    INTO v_debit, v_credit, v_lines
  FROM public.journal_entry_lines l
  WHERE l.journal_entry_id = v_entry_id;

  IF v_lines < 2 OR v_debit <= 0 OR round(v_debit, 2) <> round(v_credit, 2)
     OR round(v_header.total_debit, 2) <> round(v_debit, 2)
     OR round(v_header.total_credit, 2) <> round(v_credit, 2) THEN
    RAISE EXCEPTION
      'Posted journal % is invalid: header=(%,%), lines=(%,%), count=%',
      v_entry_id, v_header.total_debit, v_header.total_credit,
      v_debit, v_credit, v_lines;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_journal_entry_balanced() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_assert_journal_header_balanced ON public.journal_entries;
CREATE CONSTRAINT TRIGGER trg_assert_journal_header_balanced
AFTER INSERT OR UPDATE ON public.journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_journal_entry_balanced();

DROP TRIGGER IF EXISTS trg_assert_journal_lines_balanced ON public.journal_entry_lines;
CREATE CONSTRAINT TRIGGER trg_assert_journal_lines_balanced
AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_journal_entry_balanced();

-- ---------------------------------------------------------------------------
-- 3) Supplier invoice accrual. Supplier invoices now own AP/COGS; the older
--    booking-cost trigger is retired to prevent the same cost being accrued twice.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_post_booking_cost ON public.bookings;

CREATE OR REPLACE FUNCTION public.post_supplier_invoice(_supplier_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i public.supplier_invoices%ROWTYPE;
  v_booking_type text;
  v_booking_number text;
  v_je uuid;
  v_legacy_locked uuid;
  v_cogs uuid;
  v_ap uuid;
  v_cogs_code text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('supplier_invoice:' || _supplier_invoice_id::text, 0));

  SELECT * INTO i
  FROM public.supplier_invoices
  WHERE id = _supplier_invoice_id;
  IF NOT FOUND OR i.organization_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_org_write(i.organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_je
  FROM public.journal_entries
  WHERE organization_id = i.organization_id
    AND source_type = 'supplier_invoice'
    AND source_id = i.id;

  IF i.status = 'cancelled' OR COALESCE(i.amount, 0) <= 0 THEN
    IF v_je IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
    ) THEN
      DELETE FROM public.journal_entries WHERE id = v_je;
    ELSIF v_je IS NOT NULL THEN
      RAISE EXCEPTION 'A locked supplier-invoice journal cannot be cancelled';
    END IF;
    RETURN NULL;
  END IF;

  IF v_je IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
  ) THEN
    RETURN v_je;
  END IF;

  -- Older deployments accrued supplier cost from the booking. Never duplicate a
  -- locked historical accrual; all new/unlocked accruals use supplier invoices.
  IF i.booking_id IS NOT NULL THEN
    SELECT id INTO v_legacy_locked
    FROM public.journal_entries
    WHERE organization_id = i.organization_id
      AND source_type = 'booking_cost'
      AND source_id = i.booking_id
      AND is_locked
    LIMIT 1;
    IF v_legacy_locked IS NOT NULL THEN
      RETURN v_legacy_locked;
    END IF;

    SELECT booking_type, booking_number
      INTO v_booking_type, v_booking_number
    FROM public.bookings
    WHERE id = i.booking_id AND organization_id = i.organization_id;
  END IF;

  v_cogs_code := CASE v_booking_type
    WHEN 'flight' THEN '5010'
    WHEN 'transport' THEN '5020'
    WHEN 'car_rental' THEN '5030'
    ELSE '5000'
  END;
  v_cogs := COALESCE(
    public._resolve_account(i.organization_id, v_cogs_code),
    public._resolve_account(i.organization_id, '5000')
  );
  v_ap := public._resolve_account(i.organization_id, '2000');
  IF v_cogs IS NULL OR v_ap IS NULL THEN
    RAISE EXCEPTION 'Missing COGS/AP account for organization %', i.organization_id;
  END IF;

  DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency,
    source_type, source_id, booking_id, functional_currency, fx_rate,
    posted_at, auto_generated
  ) VALUES (
    i.organization_id, public._next_entry_number(i.organization_id),
    COALESCE(i.invoice_date, i.created_at::date, CURRENT_DATE),
    'supplier_invoice', i.id,
    'فاتورة مورد ' || COALESCE(i.invoice_number, i.id::text),
    i.amount, i.amount, 'posted', COALESCE(i.currency, 'EGP'),
    'supplier_invoice', i.id, i.booking_id, COALESCE(i.currency, 'EGP'),
    COALESCE(i.exchange_rate, 1), now(), true
  ) RETURNING id INTO v_je;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, debit, credit, description, line_order
  ) VALUES
    (v_je, v_cogs, i.amount, 0,
      'تكلفة ' || COALESCE(v_booking_number, i.invoice_number, 'فاتورة مورد'), 1),
    (v_je, v_ap, 0, i.amount,
      'ذمم المورد - ' || COALESCE(i.invoice_number, ''), 2);

  RETURN v_je;
END;
$$;

REVOKE ALL ON FUNCTION public.post_supplier_invoice(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_supplier_invoice(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._trg_post_supplier_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.post_supplier_invoice(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._trg_post_supplier_invoice() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_post_supplier_invoice ON public.supplier_invoices;
CREATE TRIGGER trg_post_supplier_invoice
AFTER INSERT OR UPDATE OF amount, currency, exchange_rate, invoice_date,
  status, booking_id, supplier_id
ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public._trg_post_supplier_invoice();

-- ---------------------------------------------------------------------------
-- 4) Supplier payments settle AP only when allocated to supplier invoices.
--    Any remaining amount is a supplier advance (asset).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_supplier_payment(_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  p public.supplier_payments%ROWTYPE;
  v_je uuid;
  v_cash uuid;
  v_ap uuid;
  v_advance uuid;
  v_treasury_kind text;
  v_treasury_currency text;
  v_allocated numeric;
  v_unallocated numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('supplier_payment:' || _payment_id::text, 0));

  SELECT * INTO p FROM public.supplier_payments WHERE id = _payment_id;
  IF NOT FOUND OR p.organization_id IS NULL THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_org_write(p.organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_je FROM public.journal_entries
  WHERE organization_id = p.organization_id
    AND source_type = 'supplier_payment' AND source_id = p.id;

  IF COALESCE(p.status, 'pending') NOT IN ('paid', 'completed') THEN
    IF v_je IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
    ) THEN
      DELETE FROM public.journal_entries WHERE id = v_je;
    ELSIF v_je IS NOT NULL THEN
      RAISE EXCEPTION 'A locked supplier-payment journal cannot be reversed';
    END IF;
    RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
  ) THEN RETURN v_je; END IF;

  IF p.treasury_account_id IS NOT NULL THEN
    SELECT ba.treasury_kind, COALESCE(ba.currency, 'EGP')
      INTO v_treasury_kind, v_treasury_currency
    FROM public.bank_accounts ba
    WHERE ba.id = p.treasury_account_id
      AND ba.organization_id = p.organization_id
      AND ba.is_active;
    IF NOT FOUND OR v_treasury_currency <> COALESCE(p.currency, 'EGP') THEN
      RAISE EXCEPTION 'Supplier payment treasury is missing, inactive, or uses another currency';
    END IF;
  ELSIF COALESCE(p.payment_method, 'cash') <> 'cash' THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash supplier payments';
  END IF;

  SELECT COALESCE(sum(a.amount), 0) INTO v_allocated
  FROM public.supplier_payment_allocations a
  JOIN public.supplier_invoices i ON i.id = a.supplier_invoice_id
  WHERE a.supplier_payment_id = p.id
    AND a.organization_id = p.organization_id
    AND i.status <> 'cancelled';

  IF v_allocated > p.amount + 0.01 THEN
    RAISE EXCEPTION 'Supplier payment allocations exceed the payment amount';
  END IF;
  v_allocated := LEAST(v_allocated, p.amount);
  v_unallocated := p.amount - v_allocated;

  v_cash := public._resolve_account(
    p.organization_id,
    CASE WHEN COALESCE(v_treasury_kind, p.payment_method, 'cash') = 'cash'
      THEN '1000' ELSE '1010' END
  );
  v_ap := public._resolve_account(p.organization_id, '2000');
  v_advance := public._resolve_account(p.organization_id, '1210');
  IF v_cash IS NULL OR (v_allocated > 0 AND v_ap IS NULL)
     OR (v_unallocated > 0 AND v_advance IS NULL) THEN
    RAISE EXCEPTION 'Missing cash/AP/supplier-advance account for organization %', p.organization_id;
  END IF;

  DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency,
    source_type, source_id, booking_id, functional_currency, fx_rate,
    posted_at, auto_generated
  ) VALUES (
    p.organization_id, public._next_entry_number(p.organization_id),
    COALESCE(p.paid_date, p.payment_date, CURRENT_DATE),
    'supplier_payment', p.id,
    'سداد مورد ' || COALESCE(p.reference_number, p.id::text),
    p.amount, p.amount, 'posted', COALESCE(p.currency, 'EGP'),
    'supplier_payment', p.id, p.booking_id, COALESCE(p.currency, 'EGP'),
    COALESCE(p.exchange_rate, 1), now(), true
  ) RETURNING id INTO v_je;

  IF v_allocated > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_ap, v_allocated, 0, 'تسوية ذمم المورد', 1);
  END IF;
  IF v_unallocated > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_advance, v_unallocated, 0, 'دفعة مقدمة للمورد', 2);
  END IF;
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, debit, credit, description, line_order
  ) VALUES (v_je, v_cash, 0, p.amount, 'صرف للمورد', 3);

  RETURN v_je;
END;
$$;

REVOKE ALL ON FUNCTION public.post_supplier_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_supplier_payment(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Allocation integrity and synchronization.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_payment_allocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_payment public.customer_payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_payment_allocated numeric;
  v_invoice_allocated numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.organization_id = OLD.organization_id
        AND je.source_type = 'customer_payment'
        AND je.source_id = OLD.payment_id
        AND je.is_locked
    ) THEN
      RAISE EXCEPTION 'Allocations of a locked customer payment cannot be changed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT * INTO v_payment FROM public.customer_payments WHERE id = NEW.payment_id FOR UPDATE;
  SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NOT FOUND OR v_payment.id IS NULL OR v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Customer payment or invoice not found';
  END IF;
  IF v_payment.organization_id <> NEW.organization_id
     OR v_invoice.organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Customer payment allocation crosses organizations';
  END IF;
  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled customer invoice cannot receive allocations';
  END IF;
  IF COALESCE(v_payment.currency, 'EGP') <> COALESCE(v_invoice.currency, 'EGP') THEN
    RAISE EXCEPTION 'Customer payment currency must match invoice currency';
  END IF;
  IF v_payment.customer_id IS NOT NULL AND v_invoice.customer_id IS NOT NULL
     AND v_payment.customer_id <> v_invoice.customer_id THEN
    RAISE EXCEPTION 'Customer payment allocation uses another customer';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.organization_id = NEW.organization_id
      AND je.source_type = 'customer_payment'
      AND je.source_id = NEW.payment_id
      AND je.is_locked
  ) THEN
    RAISE EXCEPTION 'Allocations of a locked customer payment cannot be changed';
  END IF;

  SELECT COALESCE(sum(a.amount), 0) INTO v_payment_allocated
  FROM public.customer_payment_allocations a
  WHERE a.payment_id = NEW.payment_id
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id);
  IF v_payment_allocated + NEW.amount > v_payment.amount + 0.01 THEN
    RAISE EXCEPTION 'Customer allocations exceed the payment amount';
  END IF;

  SELECT COALESCE(sum(a.amount), 0) INTO v_invoice_allocated
  FROM public.customer_payment_allocations a
  WHERE a.invoice_id = NEW.invoice_id
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id);
  IF v_invoice_allocated + NEW.amount > v_invoice.final_amount + 0.01 THEN
    RAISE EXCEPTION 'Customer allocations exceed the invoice amount';
  END IF;

  NEW.amount_base := round(NEW.amount * COALESCE(v_payment.exchange_rate, 1), 2);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_customer_payment_allocation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_customer_payment_allocation ON public.customer_payment_allocations;
CREATE TRIGGER trg_guard_customer_payment_allocation
BEFORE INSERT OR UPDATE OR DELETE
ON public.customer_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_payment_allocation();

CREATE OR REPLACE FUNCTION public.refresh_customer_invoice_payment_state(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_paid numeric;
BEGIN
  IF _invoice_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(sum(a.amount), 0) INTO v_paid
  FROM public.customer_payment_allocations a
  JOIN public.customer_payments p ON p.id = a.payment_id
  WHERE a.invoice_id = _invoice_id AND p.status = 'completed';

  UPDATE public.invoices
  SET total_paid_amount = LEAST(final_amount, v_paid), updated_at = now()
  WHERE id = _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_customer_invoice_payment_state(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_customer_payment_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_customer_invoice_payment_state(OLD.invoice_id);
    PERFORM public.post_customer_payment(OLD.payment_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_customer_invoice_payment_state(NEW.invoice_id);
    PERFORM public.post_customer_payment(NEW.payment_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_customer_payment_allocation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_customer_payment_allocation ON public.customer_payment_allocations;
CREATE TRIGGER trg_sync_customer_payment_allocation
AFTER INSERT OR UPDATE OR DELETE ON public.customer_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_payment_allocation();

CREATE OR REPLACE FUNCTION public.sync_customer_invoices_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_invoice_id uuid;
BEGIN
  FOR v_invoice_id IN
    SELECT DISTINCT a.invoice_id
    FROM public.customer_payment_allocations a
    WHERE a.payment_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
  LOOP
    PERFORM public.refresh_customer_invoice_payment_state(v_invoice_id);
  END LOOP;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_customer_invoices_from_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_customer_invoices_from_payment ON public.customer_payments;
CREATE TRIGGER trg_sync_customer_invoices_from_payment
AFTER UPDATE OF status OR DELETE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_invoices_from_payment();

CREATE OR REPLACE FUNCTION public.guard_supplier_payment_total_allocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_payment public.supplier_payments%ROWTYPE;
  v_existing numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.organization_id = OLD.organization_id
        AND je.source_type = 'supplier_payment'
        AND je.source_id = OLD.supplier_payment_id
        AND je.is_locked
    ) THEN
      RAISE EXCEPTION 'Allocations of a locked supplier payment cannot be changed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT * INTO v_payment
  FROM public.supplier_payments
  WHERE id = NEW.supplier_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier payment not found'; END IF;
  IF v_payment.organization_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Supplier payment allocation crosses organizations';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.organization_id = NEW.organization_id
      AND je.source_type = 'supplier_payment'
      AND je.source_id = NEW.supplier_payment_id
      AND je.is_locked
  ) THEN
    RAISE EXCEPTION 'Allocations of a locked supplier payment cannot be changed';
  END IF;
  SELECT COALESCE(sum(a.amount), 0) INTO v_existing
  FROM public.supplier_payment_allocations a
  WHERE a.supplier_payment_id = NEW.supplier_payment_id
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id);
  IF v_existing + NEW.amount > v_payment.amount + 0.01 THEN
    RAISE EXCEPTION 'Supplier allocations exceed the payment amount';
  END IF;
  NEW.amount_base := round(NEW.amount * COALESCE(v_payment.exchange_rate, 1), 2);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_supplier_payment_total_allocation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_supplier_payment_total_allocation
ON public.supplier_payment_allocations;
CREATE TRIGGER trg_guard_supplier_payment_total_allocation
BEFORE INSERT OR UPDATE OR DELETE
ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_payment_total_allocation();

CREATE OR REPLACE FUNCTION public.sync_supplier_payment_allocation_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.post_supplier_payment(OLD.supplier_payment_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.post_supplier_payment(NEW.supplier_payment_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_supplier_payment_allocation_journal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_supplier_payment_allocation_journal
ON public.supplier_payment_allocations;
CREATE TRIGGER trg_sync_supplier_payment_allocation_journal
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_payment_allocation_journal();

-- ---------------------------------------------------------------------------
-- 6) Prevent source edits that would desynchronize explicitly locked journals.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_locked_financial_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_source_type text := TG_ARGV[0];
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.organization_id = OLD.organization_id
      AND je.source_type = v_source_type
      AND je.source_id = OLD.id
      AND je.is_locked
  ) THEN
    RAISE EXCEPTION 'The financial source is locked by a posted journal entry';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_locked_financial_source() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_locked_invoice ON public.invoices;
CREATE TRIGGER trg_guard_locked_invoice
BEFORE UPDATE OF subtotal, discount_amount, vat_rate, vat_amount, final_amount,
  issued_date, currency, booking_type
ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_invoice_cancellation ON public.invoices;
CREATE TRIGGER trg_guard_locked_invoice_cancellation
BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW
WHEN (NEW.status IN ('draft', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.guard_locked_financial_source('invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_invoice ON public.supplier_invoices;
CREATE TRIGGER trg_guard_locked_supplier_invoice
BEFORE UPDATE OF amount, currency, exchange_rate, invoice_date, booking_id, supplier_id
ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('supplier_invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_invoice_cancellation ON public.supplier_invoices;
CREATE TRIGGER trg_guard_locked_supplier_invoice_cancellation
BEFORE UPDATE OF status ON public.supplier_invoices
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.guard_locked_financial_source('supplier_invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_customer_payment ON public.customer_payments;
CREATE TRIGGER trg_guard_locked_customer_payment
BEFORE UPDATE OF amount, currency, exchange_rate, payment_date, payment_method,
  treasury_account_id, status
ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('customer_payment');

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_payment ON public.supplier_payments;
CREATE TRIGGER trg_guard_locked_supplier_payment
BEFORE UPDATE OF amount, currency, exchange_rate, payment_date, paid_date,
  payment_method, treasury_account_id, status
ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('supplier_payment');

DROP TRIGGER IF EXISTS trg_guard_locked_invoice_delete ON public.invoices;
CREATE TRIGGER trg_guard_locked_invoice_delete
BEFORE DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_customer_payment_delete ON public.customer_payments;
CREATE TRIGGER trg_guard_locked_customer_payment_delete
BEFORE DELETE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('customer_payment');

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_invoice_delete ON public.supplier_invoices;
CREATE TRIGGER trg_guard_locked_supplier_invoice_delete
BEFORE DELETE ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('supplier_invoice');

DROP TRIGGER IF EXISTS trg_guard_locked_supplier_payment_delete ON public.supplier_payments;
CREATE TRIGGER trg_guard_locked_supplier_payment_delete
BEFORE DELETE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.guard_locked_financial_source('supplier_payment');

-- ---------------------------------------------------------------------------
-- 7) Replace unlocked legacy booking accruals with supplier-invoice accruals,
--    then rebuild the affected payment journals using their allocations.
-- ---------------------------------------------------------------------------
INSERT INTO public.financial_repair_audit (
  migration_key, organization_id, entity_type, entity_id, before_data, reason
)
SELECT '20260904_double_entry_core', je.organization_id, 'journal_entry', je.id,
       to_jsonb(je) || jsonb_build_object(
         'lines', COALESCE((
           SELECT jsonb_agg(to_jsonb(l) ORDER BY l.line_order, l.id)
           FROM public.journal_entry_lines l WHERE l.journal_entry_id = je.id
         ), '[]'::jsonb)
       ),
       'Replace unlocked booking-level AP accrual with supplier-invoice accrual'
FROM public.journal_entries je
WHERE je.source_type = 'booking_cost'
  AND NOT je.is_locked
  AND EXISTS (
    SELECT 1 FROM public.supplier_invoices i
    WHERE i.organization_id = je.organization_id
      AND i.booking_id = je.source_id
      AND i.status <> 'cancelled'
  );

DELETE FROM public.journal_entries je
WHERE je.source_type = 'booking_cost'
  AND NOT je.is_locked
  AND EXISTS (
    SELECT 1 FROM public.supplier_invoices i
    WHERE i.organization_id = je.organization_id
      AND i.booking_id = je.source_id
      AND i.status <> 'cancelled'
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.supplier_invoices LOOP
    PERFORM public.post_supplier_invoice(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.customer_payments WHERE status = 'completed' LOOP
    PERFORM public.post_customer_payment(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.supplier_payments WHERE status IN ('paid', 'completed') LOOP
    PERFORM public.post_supplier_payment(r.id);
  END LOOP;
END;
$$;

-- Direct posting remains internal/service-only. Authenticated users use the
-- transaction-safe record_customer_payment/record_supplier_payment RPCs.
REVOKE ALL ON FUNCTION public.assert_journal_entry_balanced() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_locked_journal_entry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_locked_journal_line() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_customer_payment_allocation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_payment_total_allocation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_customer_payment_allocation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_supplier_payment_allocation_journal() FROM PUBLIC, anon, authenticated;

COMMIT;
