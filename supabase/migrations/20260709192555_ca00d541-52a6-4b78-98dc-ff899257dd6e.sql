
-- ============================================================
-- Phase 2b: Automatic Journal Posting Engine
-- ============================================================

-- 1) Extend journal_entries with source tracking + FX
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS functional_currency text,
  ADD COLUMN IF NOT EXISTS fx_rate numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- Unique constraint to prevent duplicate auto-postings
CREATE UNIQUE INDEX IF NOT EXISTS uniq_je_source
  ON public.journal_entries(organization_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- Double-entry balance check (NOT VALID to preserve old rows)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='je_debit_equals_credit') THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT je_debit_equals_credit
      CHECK (round(total_debit::numeric, 2) = round(total_credit::numeric, 2)) NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 2) Helper: resolve account by code (org-scoped)
-- ============================================================
CREATE OR REPLACE FUNCTION public._resolve_account(_org uuid, _code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.chart_of_accounts
   WHERE organization_id = _org AND account_code = _code
   ORDER BY created_at ASC
   LIMIT 1;
$$;

-- ============================================================
-- 3) Sequence-style entry number
-- ============================================================
CREATE OR REPLACE FUNCTION public._next_entry_number(_org uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(entry_number, '\D', '', 'g'), '')::int), 0) + 1
    INTO n FROM public.journal_entries WHERE organization_id = _org;
  RETURN 'JE-' || to_char(now(), 'YYYYMM') || '-' || lpad(n::text, 5, '0');
END $$;

-- ============================================================
-- 4) POST INVOICE
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_invoice(_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  je_id uuid;
  ar_acc uuid; rev_acc uuid; tax_acc uuid;
  rev_code text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND OR inv.organization_id IS NULL THEN RETURN NULL; END IF;

  -- Skip if already locked
  SELECT id INTO je_id FROM public.journal_entries
    WHERE organization_id = inv.organization_id
      AND source_type = 'invoice' AND source_id = inv.id;
  IF je_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.journal_entries WHERE id=je_id AND is_locked) THEN
    RETURN je_id;
  END IF;

  -- Pick revenue account by booking_type
  rev_code := CASE inv.booking_type
    WHEN 'hotel' THEN '4000'
    WHEN 'flight' THEN '4010'
    WHEN 'transport' THEN '4020'
    WHEN 'car_rental' THEN '4030'
    ELSE '4040'
  END;

  ar_acc  := public._resolve_account(inv.organization_id, '1100');
  rev_acc := COALESCE(public._resolve_account(inv.organization_id, rev_code),
                      public._resolve_account(inv.organization_id, '4000'));
  tax_acc := public._resolve_account(inv.organization_id, '2100');

  IF ar_acc IS NULL OR rev_acc IS NULL THEN
    RAISE NOTICE 'Missing COA (AR/Revenue) for org %', inv.organization_id;
    RETURN NULL;
  END IF;

  -- Delete existing (unlocked) auto entry to re-post cleanly
  DELETE FROM public.journal_entry_lines WHERE journal_entry_id = je_id;
  DELETE FROM public.journal_entries WHERE id = je_id AND NOT is_locked;

  INSERT INTO public.journal_entries(
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency,
    source_type, source_id, booking_id, functional_currency, fx_rate,
    posted_at, auto_generated
  ) VALUES (
    inv.organization_id, public._next_entry_number(inv.organization_id),
    inv.issued_date, 'invoice', inv.id,
    'فاتورة ' || inv.invoice_number,
    inv.final_amount, inv.final_amount, 'posted', COALESCE(inv.currency,'EGP'),
    'invoice', inv.id, inv.booking_id, COALESCE(inv.currency,'EGP'), 1,
    now(), true
  ) RETURNING id INTO je_id;

  -- AR debit
  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, ar_acc, inv.final_amount, 0, 'ذمم العميل - ' || COALESCE(inv.customer_name,''), 1);

  -- Revenue credit (net of tax)
  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, rev_acc, 0, COALESCE(inv.subtotal, inv.final_amount - COALESCE(inv.vat_amount,0)),
          'إيراد فاتورة ' || inv.invoice_number, 2);

  -- Tax credit
  IF COALESCE(inv.vat_amount,0) > 0 AND tax_acc IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
    VALUES (je_id, tax_acc, 0, inv.vat_amount, 'ضريبة القيمة المضافة', 3);
  END IF;

  RETURN je_id;
END $$;

-- ============================================================
-- 5) POST SUPPLIER PAYMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_supplier_payment(_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sp record; je_id uuid;
  ap_acc uuid; bank_acc uuid;
  org uuid;
BEGIN
  SELECT sp.*, s.organization_id AS sup_org
    INTO sp
    FROM public.supplier_payments sp
    LEFT JOIN public.suppliers s ON s.id = sp.supplier_id
   WHERE sp.id = _payment_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  org := sp.sup_org;
  IF org IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO je_id FROM public.journal_entries
    WHERE organization_id=org AND source_type='supplier_payment' AND source_id=sp.id;
  IF je_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.journal_entries WHERE id=je_id AND is_locked) THEN
    RETURN je_id;
  END IF;

  ap_acc   := public._resolve_account(org, '2000');
  bank_acc := COALESCE(public._resolve_account(org, '1010'), public._resolve_account(org, '1000'));
  IF ap_acc IS NULL OR bank_acc IS NULL THEN RETURN NULL; END IF;

  DELETE FROM public.journal_entry_lines WHERE journal_entry_id = je_id;
  DELETE FROM public.journal_entries WHERE id = je_id AND NOT is_locked;

  INSERT INTO public.journal_entries(
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency,
    source_type, source_id, booking_id, functional_currency, fx_rate,
    posted_at, auto_generated
  ) VALUES (
    org, public._next_entry_number(org),
    sp.payment_date, 'supplier_payment', sp.id,
    'سداد مورد - ' || COALESCE(sp.reference_number,''),
    sp.amount, sp.amount, 'posted', COALESCE(sp.currency,'EGP'),
    'supplier_payment', sp.id, sp.booking_id, COALESCE(sp.currency,'EGP'), 1,
    now(), true
  ) RETURNING id INTO je_id;

  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, ap_acc, sp.amount, 0, 'سداد للمورد', 1);
  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, bank_acc, 0, sp.amount, 'من البنك/الخزينة', 2);

  RETURN je_id;
END $$;

-- ============================================================
-- 6) POST EXPENSE
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_expense_transaction(_expense_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex record; je_id uuid;
  exp_acc uuid; bank_acc uuid;
BEGIN
  SELECT * INTO ex FROM public.expense_transactions WHERE id = _expense_id;
  IF NOT FOUND OR ex.organization_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO je_id FROM public.journal_entries
    WHERE organization_id=ex.organization_id AND source_type='expense' AND source_id=ex.id;
  IF je_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.journal_entries WHERE id=je_id AND is_locked) THEN
    RETURN je_id;
  END IF;

  exp_acc  := COALESCE(public._resolve_account(ex.organization_id, '5000'),
                       public._resolve_account(ex.organization_id, '6000'));
  bank_acc := COALESCE(public._resolve_account(ex.organization_id, '1010'),
                       public._resolve_account(ex.organization_id, '1000'));
  IF exp_acc IS NULL OR bank_acc IS NULL THEN RETURN NULL; END IF;

  DELETE FROM public.journal_entry_lines WHERE journal_entry_id = je_id;
  DELETE FROM public.journal_entries WHERE id = je_id AND NOT is_locked;

  INSERT INTO public.journal_entries(
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency,
    source_type, source_id, booking_id, functional_currency, fx_rate,
    posted_at, auto_generated
  ) VALUES (
    ex.organization_id, public._next_entry_number(ex.organization_id),
    ex.transaction_date, 'expense', ex.id,
    COALESCE(ex.description, 'مصروف ' || COALESCE(ex.transaction_number,'')),
    ex.amount, ex.amount, 'posted', COALESCE(ex.currency,'EGP'),
    'expense', ex.id, ex.booking_id, COALESCE(ex.currency,'EGP'), 1,
    now(), true
  ) RETURNING id INTO je_id;

  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, exp_acc, ex.amount, 0, COALESCE(ex.description,'مصروف'), 1);
  INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES (je_id, bank_acc, 0, ex.amount, 'من البنك/الخزينة', 2);

  RETURN je_id;
END $$;

-- ============================================================
-- 7) Unpost helper (only unlocked entries)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unpost_journal(_source_type text, _source_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _je uuid;
BEGIN
  SELECT id INTO _je FROM public.journal_entries
   WHERE source_type=_source_type AND source_id=_source_id AND NOT is_locked;
  IF _je IS NULL THEN RETURN false; END IF;
  DELETE FROM public.journal_entry_lines WHERE journal_entry_id=_je;
  DELETE FROM public.journal_entries WHERE id=_je;
  RETURN true;
END $$;

-- ============================================================
-- 8) Triggers to auto-post on insert / update
-- ============================================================
CREATE OR REPLACE FUNCTION public._trg_post_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.post_invoice(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auto-post invoice failed: %', SQLERRM;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._trg_post_supplier_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.post_supplier_payment(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auto-post supplier payment failed: %', SQLERRM;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._trg_post_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.post_expense_transaction(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auto-post expense failed: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_post_invoice ON public.invoices;
CREATE TRIGGER trg_post_invoice
  AFTER INSERT OR UPDATE OF final_amount, subtotal, vat_amount, status, issued_date
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public._trg_post_invoice();

DROP TRIGGER IF EXISTS trg_post_supplier_payment ON public.supplier_payments;
CREATE TRIGGER trg_post_supplier_payment
  AFTER INSERT OR UPDATE OF amount, payment_date, status
  ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public._trg_post_supplier_payment();

DROP TRIGGER IF EXISTS trg_post_expense ON public.expense_transactions;
CREATE TRIGGER trg_post_expense
  AFTER INSERT OR UPDATE OF amount, transaction_date, status
  ON public.expense_transactions
  FOR EACH ROW EXECUTE FUNCTION public._trg_post_expense();

-- ============================================================
-- 9) Backfill RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_journals(_org_id uuid)
RETURNS TABLE(invoices_posted int, supplier_payments_posted int, expenses_posted int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record; i int := 0; s int := 0; e int := 0;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN SELECT id FROM public.invoices WHERE organization_id=_org_id LOOP
    IF public.post_invoice(r.id) IS NOT NULL THEN i := i+1; END IF;
  END LOOP;

  FOR r IN SELECT sp.id FROM public.supplier_payments sp
    JOIN public.suppliers su ON su.id=sp.supplier_id WHERE su.organization_id=_org_id LOOP
    IF public.post_supplier_payment(r.id) IS NOT NULL THEN s := s+1; END IF;
  END LOOP;

  FOR r IN SELECT id FROM public.expense_transactions WHERE organization_id=_org_id LOOP
    IF public.post_expense_transaction(r.id) IS NOT NULL THEN e := e+1; END IF;
  END LOOP;

  RETURN QUERY SELECT i, s, e;
END $$;

-- ============================================================
-- 10) Grants (revoke public, allow authenticated)
-- ============================================================
REVOKE ALL ON FUNCTION public.post_invoice(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.post_supplier_payment(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.post_expense_transaction(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.unpost_journal(text, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.backfill_journals(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.post_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_supplier_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_expense_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpost_journal(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_journals(uuid) TO authenticated;
