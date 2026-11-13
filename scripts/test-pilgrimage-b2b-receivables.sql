-- Run only in a disposable database with the existing commercial fixture.
\i scripts/test-pilgrimage-b2b-agreements.sql
RESET ROLE;

CREATE TABLE public.organization_settings (organization_id uuid PRIMARY KEY, currency text);
INSERT INTO public.organization_settings VALUES
  ('00000000-0000-4000-8000-000000000001', 'EGP'),
  ('00000000-0000-4000-8000-000000000002', 'SAR');
CREATE FUNCTION public.can_org_write(org uuid) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT public.user_belongs_to_org(auth.uid(), org) $$;
CREATE FUNCTION public._org_permission_state(org uuid, actor uuid, permission text)
RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql STABLE
AS $$
  SELECT public.user_belongs_to_org(actor, org)
    AND (public.get_user_org_role(actor, org) = 'manager' OR permission = 'invoices_view'),
    'organization'::text
$$;
CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT granted FROM public._org_permission_state(org, auth.uid(), permission) $$;
CREATE FUNCTION public.can_process_org_payments(org uuid) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT public.can_org_write(org) AND public.has_org_permission(org, 'payments_process') $$;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE, booking_id uuid, booking_type text,
  customer_id uuid NOT NULL, customer_name text, currency text,
  subtotal numeric(12,2), discount_amount numeric(12,2), vat_rate numeric(5,2),
  vat_amount numeric(12,2), final_amount numeric(12,2), total_paid_amount numeric(12,2),
  remaining_amount numeric(12,2), status text, payment_status text,
  issued_date date, due_date date, created_by uuid, notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  CONSTRAINT invoices_booking_id_exists_chk CHECK (booking_id IS NOT NULL)
);
CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, customer_id uuid);
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY, organization_id uuid, currency text, is_active boolean, treasury_kind text,
  current_balance numeric NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id), booking_id uuid, customer_id uuid,
  treasury_account_id uuid, amount numeric(14,2), currency text, exchange_rate numeric(14,6),
  amount_base numeric(14,2), payment_method text, reference_number text, payment_date date,
  notes text, status text, client_ref text, created_by uuid, updated_at timestamptz DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false, UNIQUE (organization_id, client_ref)
);
CREATE TABLE public.customer_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.customer_payments(id),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id), amount numeric(14,2) NOT NULL, amount_base numeric(14,2)
);
CREATE TABLE public.refund_requests (invoice_id uuid, organization_id uuid, source_payment_id uuid);
CREATE TABLE public.invoice_payments (invoice_id uuid);
CREATE TABLE public.bank_account_transactions (
  bank_account_id uuid, transaction_type text, amount numeric, description text,
  transaction_date date, reference_number text, related_invoice_id uuid, organization_id uuid, created_by uuid
);
CREATE TABLE public.finance_transactions (
  organization_id uuid, booking_id uuid, reference_type text, reference_id uuid, account_code text,
  party_type text, party_id uuid, direction text, amount numeric, currency text,
  exchange_rate numeric, amount_base numeric, memo text, created_by uuid
);
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, entry_number text,
  entry_date date, reference_type text, reference_id uuid, description text, total_debit numeric,
  total_credit numeric, status text, currency text, source_type text, source_id uuid, booking_id uuid,
  functional_currency text, fx_rate numeric, posted_at timestamptz, auto_generated boolean,
  is_locked boolean NOT NULL DEFAULT false, UNIQUE (organization_id, source_type, source_id)
);
CREATE TABLE public.journal_entry_lines (
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL, debit numeric, credit numeric, description text, line_order int
);
CREATE TABLE public.accounting_periods (organization_id uuid, start_date date, end_date date, status text);
CREATE FUNCTION public._next_entry_number(uuid) RETURNS text LANGUAGE sql
AS $$ SELECT gen_random_uuid()::text $$;
CREATE FUNCTION public._resolve_account(org uuid, code text) RETURNS uuid LANGUAGE sql
AS $$ SELECT md5(org::text || code)::uuid $$;
CREATE FUNCTION public._require_route_code(org uuid, route text) RETURNS text LANGUAGE sql
AS $$ SELECT CASE route WHEN 'cash' THEN '1000' WHEN 'bank' THEN '1010'
  WHEN 'accounts_receivable' THEN '1100' WHEN 'refunds_payable' THEN '2050' END $$;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_invoices ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_payments ON public.customer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_allocations ON public.customer_payment_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_refunds ON public.refund_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices, public.customer_payments,
  public.customer_payment_allocations, public.refund_requests, public.invoice_payments TO authenticated;

INSERT INTO public.bank_accounts (id, organization_id, currency, is_active, treasury_kind) VALUES
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', 'EGP', true, 'bank'),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000001', 'EGP', true, 'cash'),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000002', 'EGP', true, 'bank');

-- The runner substitutes the actual core invoice, collection and journal
-- functions and trigger definitions from the project's finance migrations.
-- CORE_FINANCE_FUNCTIONS

\i scripts/deploy-pilgrimage-b2b-receivables.sql

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.issue_pilgrimage_b2b_invoice(uuid,numeric)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.record_pilgrimage_b2b_collection(uuid,numeric,text,uuid,date,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.get_pilgrimage_b2b_receivables(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public execution granted';
  END IF;
END $$;

SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
DO $$
DECLARE
  org constant uuid := '00000000-0000-4000-8000-000000000001';
  sale constant uuid := '00000000-0000-4000-8000-000000000303';
  bank constant uuid := '00000000-0000-4000-8000-000000000601';
  cashbox constant uuid := '00000000-0000-4000-8000-000000000602';
  contract uuid;
  bill uuid;
  receipt uuid;
  paid_summary jsonb;
BEGIN
  SELECT id INTO STRICT contract FROM public.pilgrimage_b2b_agreements WHERE sale_id = sale;
  BEGIN
    PERFORM public.issue_pilgrimage_b2b_invoice(contract, NULL);
    RAISE EXCEPTION 'Missing VAT choice accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  bill := public.issue_pilgrimage_b2b_invoice(contract, 14);
  IF public.issue_pilgrimage_b2b_invoice(contract, 14) <> bill THEN RAISE EXCEPTION 'Invoice duplicated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = bill AND booking_id IS NULL
    AND customer_id = '00000000-0000-4000-8000-000000000101' AND status = 'sent'
    AND final_amount = 5000 AND subtotal = 4385.96 AND vat_amount = 614.04
    AND remaining_amount = 5000 AND due_date = date '2027-02-15') THEN
    RAISE EXCEPTION 'Agency invoice does not match approved gross and schedule';
  END IF;
  BEGIN
    INSERT INTO public.invoices (organization_id, invoice_number, customer_id, subtotal, vat_rate, status)
    VALUES (org, 'LEGACY-INVALID', '00000000-0000-4000-8000-000000000101', 100, 14, 'draft');
    RAISE EXCEPTION 'Legacy booking check was relaxed outside B2B';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO public.invoices (organization_id, invoice_number, booking_id, customer_id, subtotal, vat_rate, status)
  VALUES (org, 'LEGACY-VALID', gen_random_uuid(), '00000000-0000-4000-8000-000000000101', 100, 14, 'draft');
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'LEGACY-VALID'
      AND vat_amount = 14 AND final_amount = 114) THEN
    RAISE EXCEPTION 'Existing invoice calculation changed';
  END IF;
  BEGIN
    PERFORM public.issue_pilgrimage_b2b_invoice(contract, 0);
    RAISE EXCEPTION 'Retry silently changed VAT';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    UPDATE public.pilgrimage_sales SET status = 'cancelled' WHERE id = sale;
    RAISE EXCEPTION 'Cancelled an approved agency agreement';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  UPDATE public.invoices SET status = 'paid' WHERE id = bill;
  IF FOUND THEN RAISE EXCEPTION 'Direct status update accepted'; END IF;
  DELETE FROM public.invoices WHERE id = bill;
  IF FOUND THEN RAISE EXCEPTION 'Direct invoice deletion accepted'; END IF;

  BEGIN
    INSERT INTO public.invoice_payments VALUES (bill);
    RAISE EXCEPTION 'Legacy receipt allowed on B2B invoice';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.refund_requests (invoice_id, organization_id) VALUES (bill, org);
    RAISE EXCEPTION 'Direct refund request allowed on B2B invoice';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.record_pilgrimage_b2b_collection(bill, 1, 'bank_transfer',
      '00000000-0000-4000-8000-000000000603', current_date, 'Wrong tenant');
    RAISE EXCEPTION 'Foreign bank account accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Treasury account not found' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.record_pilgrimage_b2b_collection(bill, 5000.01, 'bank_transfer', bank, current_date, 'Overpayment');
    RAISE EXCEPTION 'Overpayment accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  BEGIN
    PERFORM public.record_customer_payment(bill, 1, 'EGP', 1, 'bank_transfer',
      bank, current_date, 'Uncontrolled', NULL, 'manual-ref', NULL, NULL);
    RAISE EXCEPTION 'Generic collection bypassed B2B reference checks';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  receipt := public.record_pilgrimage_b2b_collection(bill, 2300, 'bank_transfer', bank, current_date, 'Bank 123');
  IF public.record_pilgrimage_b2b_collection(bill, 2300, 'bank_transfer', bank, current_date, ' bank 123 ') <> receipt THEN
    RAISE EXCEPTION 'Collection duplicated';
  END IF;
  BEGIN
    PERFORM public.record_pilgrimage_b2b_collection(bill, 100, 'bank_transfer', bank, current_date, 'Bank 123');
    RAISE EXCEPTION 'Receipt reference reused for different amount';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    INSERT INTO public.refund_requests (organization_id, source_payment_id) VALUES (org, receipt);
    RAISE EXCEPTION 'B2B receipt refunded by omitting invoice ID';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  paid_summary := public.get_pilgrimage_b2b_receivables(org, sale);
  IF (paid_summary#>>'{invoice,paid}')::numeric <> 2300 OR
    (paid_summary#>>'{invoice,remaining}')::numeric <> 2700 OR
    jsonb_array_length(paid_summary->'installments') <> 2 OR
    jsonb_array_length(paid_summary->'receipts') <> 1 OR
    public.get_pilgrimage_b2b_receivables(org, NULL, bill) <> paid_summary THEN
    RAISE EXCEPTION 'Sales and invoice views report different balances';
  END IF;

  PERFORM public.record_pilgrimage_b2b_collection(bill, 2600, 'cash', cashbox, current_date, 'Cash 456');
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = bill AND status = 'sent'
      AND total_paid_amount = 4900 AND remaining_amount = 100 AND payment_status = 'partial') THEN
    RAISE EXCEPTION 'Partial collection status or balance is incorrect';
  END IF;
END $$;

SET test.user_id = '00000000-0000-4000-8000-000000000012';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices WHERE pilgrimage_b2b_agreement_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Viewer read confidential B2B invoice';
  END IF;
  IF EXISTS (SELECT 1 FROM public.customer_payments) OR EXISTS (SELECT 1 FROM public.customer_payment_allocations) THEN
    RAISE EXCEPTION 'Viewer read protected B2B receipts';
  END IF;
  BEGIN
    PERFORM public.get_pilgrimage_b2b_receivables('00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000303');
    RAISE EXCEPTION 'Viewer read B2B accounting schedule';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SET test.user_id = '00000000-0000-4000-8000-000000000021';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices WHERE pilgrimage_b2b_agreement_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Second tenant read B2B invoice';
  END IF;
END $$;
RESET ROLE;

INSERT INTO public.accounting_periods VALUES
  ('00000000-0000-4000-8000-000000000001', current_date, current_date, 'closed');
SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
DO $$
DECLARE bill uuid;
BEGIN
  SELECT id INTO STRICT bill FROM public.invoices WHERE pilgrimage_b2b_agreement_id IS NOT NULL;
  BEGIN
    PERFORM public.record_pilgrimage_b2b_collection(bill, 100, 'bank_transfer',
      '00000000-0000-4000-8000-000000000601', current_date, 'Closed period');
    RAISE EXCEPTION 'Closed-period payment posted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'لا يمكن إضافة قيود في فترة محاسبية مقفلة' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.customer_payments WHERE reference_number = 'Closed period')
    OR (SELECT remaining_amount FROM public.invoices WHERE id = bill) <> 100 THEN
    RAISE EXCEPTION 'Failed posting left a receipt or altered balance';
  END IF;
END $$;
RESET ROLE;
DELETE FROM public.accounting_periods WHERE status = 'closed';
