-- Appended by the B2B receivables test runner in settlement mode.
ALTER TABLE public.suppliers ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.bank_account_transactions ADD COLUMN related_payment_order_id uuid;
ALTER TABLE public.refund_requests
  ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ADD COLUMN booking_id uuid, ADD COLUMN customer_id uuid, ADD COLUMN treasury_account_id uuid,
  ADD COLUMN amount numeric, ADD COLUMN currency text, ADD COLUMN exchange_rate numeric,
  ADD COLUMN amount_base numeric, ADD COLUMN reason text, ADD COLUMN status text,
  ADD COLUMN requested_by uuid, ADD COLUMN approved_by uuid, ADD COLUMN approved_at timestamptz,
  ADD COLUMN advance_component numeric NOT NULL DEFAULT 0, ADD COLUMN sales_return_component numeric NOT NULL DEFAULT 0,
  ADD COLUMN paid_at timestamptz, ADD COLUMN updated_at timestamptz DEFAULT now();
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, party_type text, party_id uuid,
  invoice_id uuid, note_number text, note_date date, amount numeric, currency text, exchange_rate numeric,
  amount_base numeric, reason text, status text, created_by uuid
);
CREATE TABLE public.supplier_payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, booking_id uuid NOT NULL,
  supplier_id uuid, service_type text, reference_number text, amount numeric, currency text, due_date date,
  status text, approval_status text, approved_by uuid, approved_at timestamptz, rejection_reason text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid, supplier_id uuid,
  payment_order_id uuid, invoice_number text, invoice_date date, due_date date, amount numeric, currency text,
  exchange_rate numeric, amount_base numeric, amount_paid numeric, status text, notes text, created_by uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid, supplier_id uuid,
  amount numeric, currency text, payment_date date, payment_method text, reference_number text,
  notes text, status text, created_by uuid, paid_date date, amount_in_egp numeric, exchange_rate numeric,
  treasury_account_id uuid
);
CREATE TABLE public.supplier_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, supplier_payment_id uuid,
  payment_order_id uuid, supplier_invoice_id uuid, amount numeric, amount_base numeric
);
ALTER TABLE public.bookings ADD COLUMN booking_type text, ADD COLUMN booking_number text;

ALTER TABLE public.bank_account_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_treasury ON public.bank_account_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_transactions TO authenticated;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_credit ON public.credit_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_orders ON public.supplier_payment_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_supplier_invoices ON public.supplier_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_supplier_payments ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fixture_supplier_allocations ON public.supplier_payment_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes, public.supplier_payment_orders,
  public.supplier_invoices, public.supplier_payments, public.supplier_payment_allocations TO authenticated;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(u uuid, org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT (u IN ('00000000-0000-4000-8000-000000000011'::uuid, '00000000-0000-4000-8000-000000000012'::uuid,
    '00000000-0000-4000-8000-000000000013'::uuid) AND org = '00000000-0000-4000-8000-000000000001'::uuid)
    OR (u = '00000000-0000-4000-8000-000000000021'::uuid AND org = '00000000-0000-4000-8000-000000000002'::uuid);
$$;
CREATE OR REPLACE FUNCTION public._require_route_code(org uuid, route text) RETURNS text LANGUAGE sql
AS $$ SELECT CASE route WHEN 'cash' THEN '1000' WHEN 'bank' THEN '1010' WHEN 'accounts_receivable' THEN '1100'
  WHEN 'accounts_payable' THEN '2000' WHEN 'refunds_payable' THEN '2050' WHEN 'sales_returns' THEN '4050' END $$;
CREATE FUNCTION public._can_manage_refunds(org uuid) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT public.can_org_write(org) AND public.has_org_permission(org, 'payments_refund') $$;

-- CORE_SETTLEMENT_FUNCTIONS

\i scripts/deploy-pilgrimage-b2b-settlement.sql

SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
DO $$
DECLARE
  sale constant uuid := '00000000-0000-4000-8000-000000000303';
  supplier constant uuid := '00000000-0000-4000-8000-000000000111';
  bank constant uuid := '00000000-0000-4000-8000-000000000601';
  order_id uuid;
  supplier_payment uuid;
  request_id uuid;
  bill uuid;
BEGIN
  BEGIN
    PERFORM public.create_pilgrimage_supplier_obligation(sale,
      '00000000-0000-4000-8000-000000000112', 'OTHER-TENANT', 500, current_date);
    RAISE EXCEPTION 'Cross-tenant supplier accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  order_id := public.create_pilgrimage_supplier_obligation(sale, supplier, 'SUP-220', 700, current_date);
  IF public.create_pilgrimage_supplier_obligation(sale, supplier, ' sup-220 ', 700, current_date) <> order_id THEN
    RAISE EXCEPTION 'Duplicate supplier order';
  END IF;
  BEGIN
    PERFORM public.create_pilgrimage_supplier_obligation(sale, supplier, 'SUP-220', 701, current_date);
    RAISE EXCEPTION 'Conflicting invoice retry accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  PERFORM public.approve_supplier_payment_order(order_id, false, 'Missing payment authority');
  IF (SELECT status FROM public.supplier_invoices WHERE payment_order_id = order_id) <> 'unpaid' THEN
    RAISE EXCEPTION 'Rejected payment approval removed supplier liability';
  END IF;
  PERFORM public.approve_supplier_payment_order(order_id, true, NULL);
  supplier_payment := public.record_supplier_payment(order_id, 200, 'EGP', 1, 'bank_transfer', bank,
    current_date, 'SUP-WIRE-1', NULL);
  IF public.record_supplier_payment(order_id, 200, 'EGP', 1, 'bank_transfer', bank,
    current_date, 'sup-wire-1', NULL) <> supplier_payment THEN
    RAISE EXCEPTION 'Duplicate supplier disbursement';
  END IF;
  IF (SELECT amount_paid FROM public.supplier_invoices WHERE payment_order_id = order_id) <> 200 THEN
    RAISE EXCEPTION 'Supplier payment allocation missing';
  END IF;
  DELETE FROM public.bank_account_transactions WHERE related_payment_order_id = order_id;
  IF FOUND THEN RAISE EXCEPTION 'Direct deletion of supplier disbursement accepted'; END IF;
  DELETE FROM public.supplier_invoices WHERE payment_order_id = order_id;
  IF FOUND THEN RAISE EXCEPTION 'Direct supplier invoice deletion accepted'; END IF;
  DELETE FROM public.supplier_payment_allocations WHERE payment_order_id = order_id;
  IF FOUND THEN RAISE EXCEPTION 'Direct supplier allocation deletion accepted'; END IF;

  request_id := public.request_pilgrimage_b2b_cancellation(sale, 'Confirmed cancellation by agency');
  IF public.request_pilgrimage_b2b_cancellation(sale, 'Confirmed cancellation by agency') <> request_id THEN
    RAISE EXCEPTION 'Duplicate cancellation request';
  END IF;
  BEGIN
    PERFORM public.review_pilgrimage_b2b_cancellation(request_id, true);
    RAISE EXCEPTION 'Self approval accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT invoice_id INTO bill FROM public.pilgrimage_b2b_cancellations WHERE id = request_id;
  BEGIN
    PERFORM public.record_pilgrimage_b2b_collection(bill, 100, 'bank_transfer', bank, current_date, 'Frozen');
    RAISE EXCEPTION 'New collection accepted while cancellation is being reviewed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;

SET test.user_id = '00000000-0000-4000-8000-000000000021';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations)
    OR EXISTS (SELECT 1 FROM public.supplier_payment_orders WHERE pilgrimage_b2b_agreement_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cross-tenant settlement data exposed';
  END IF;
END $$;

SET test.user_id = '00000000-0000-4000-8000-000000000013';
DO $$
DECLARE
  request_id uuid;
  bill uuid;
  refund uuid;
  bank constant uuid := '00000000-0000-4000-8000-000000000601';
BEGIN
  SELECT id, invoice_id INTO STRICT request_id, bill FROM public.pilgrimage_b2b_cancellations;
  PERFORM public.review_pilgrimage_b2b_cancellation(request_id, true);
  PERFORM public.review_pilgrimage_b2b_cancellation(request_id, true);
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = bill AND status = 'cancelled' AND remaining_amount = 0)
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_seat_allocations
      WHERE sale_id = '00000000-0000-4000-8000-000000000303' AND status = 'released')
    OR NOT EXISTS (SELECT 1 FROM public.credit_notes WHERE invoice_id = bill AND amount = 5000)
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_b2b_agreements WHERE status = 'voided'
      AND approved_by = '00000000-0000-4000-8000-000000000011' AND approved_at IS NOT NULL)
    OR NOT coalesce((public.get_pilgrimage_b2b_receivables(
      '00000000-0000-4000-8000-000000000001', NULL, bill)->>'cancelled')::boolean, false)
    OR NOT EXISTS (SELECT 1 FROM public.supplier_invoices WHERE amount = 700 AND amount_paid = 200 AND status = 'partial')
    THEN RAISE EXCEPTION 'Cancellation did not reverse the invoice or preserve independent supplier liability'; END IF;

  SELECT refund_id INTO STRICT refund FROM public.pilgrimage_b2b_cancellations WHERE id = request_id;
  IF NOT EXISTS (SELECT 1 FROM public.refund_requests WHERE id = refund AND amount = 4900 AND status = 'approved') THEN
    RAISE EXCEPTION 'Partial collections not recognized as refund liability';
  END IF;
  PERFORM public.pay_refund_request(refund, bank, 'AGENCY-REFUND');
  PERFORM public.pay_refund_request(refund, bank, 'agency-refund');
  DELETE FROM public.bank_account_transactions WHERE related_invoice_id = bill AND transaction_type = 'refund';
  IF FOUND THEN RAISE EXCEPTION 'Direct deletion of refund disbursement accepted'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.refund_requests WHERE id = refund AND status = 'paid') THEN
    RAISE EXCEPTION 'Refund not paid';
  END IF;
  IF (SELECT sum(debit-credit) FROM public.get_customer_ledger(
    '00000000-0000-4000-8000-000000000101', NULL, NULL) WHERE reference <> 'LEGACY-VALID') <> 0 THEN
    RAISE EXCEPTION 'Cancelled agency account did not settle to zero';
  END IF;
END $$;
RESET ROLE;

DO $$
DECLARE org constant uuid := '00000000-0000-4000-8000-000000000001';
BEGIN
  IF (SELECT count(*) FROM public.journal_entries WHERE source_type = 'pilgrimage_b2b_cancellation') <> 1
    OR (SELECT count(*) FROM public.bank_account_transactions WHERE transaction_type = 'refund') <> 1
    OR (SELECT count(*) FROM public.bank_account_transactions WHERE transaction_type = 'withdrawal') <> 1
    OR (SELECT count(*) FROM public.journal_entries WHERE source_type = 'invoice' AND is_locked) <> 1
    OR (SELECT sum(l.debit-l.credit) FROM public.journal_entry_lines l
      WHERE l.account_id IN (public._resolve_account(org,'1100'), public._resolve_account(org,'2050'))) <> 0
    OR (SELECT sum(l.credit-l.debit) FROM public.journal_entry_lines l
      WHERE l.account_id = public._resolve_account(org,'2000')) <> 500
  THEN RAISE EXCEPTION 'Duplicate movements or out-of-balance agency AR/AP/refund controls'; END IF;
END $$;
-- An approved, uninvoiced agreement can be cancelled without a credit note,
-- and a declined request can be resubmitted and reviewed independently.
SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
DO $$
DECLARE
  org constant uuid := '00000000-0000-4000-8000-000000000001';
  sale constant uuid := '00000000-0000-4000-8000-000000000399';
  agreement uuid;
BEGIN
  INSERT INTO public.pilgrimage_sales (id, organization_id, program_type, sale_model, fulfillment_role,
    name, program_id, buyer_agency_id, party_size, currency)
  VALUES (sale, org, 'umrah', 'b2b_group', 'organizer', 'Uninvoiced agreement cancellation',
    '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', 1, 'EGP');
  INSERT INTO public.pilgrimage_sale_items (organization_id, sale_id, item_kind, description, room_type, quantity, unit_sell)
  VALUES (org, sale, 'program_seat', 'Test seat', 'double', 1, 100);
  UPDATE public.pilgrimage_sales SET status = 'quoted' WHERE id = sale;
  agreement := public.prepare_pilgrimage_b2b_agreement(sale,
    '00000000-0000-4000-8000-000000000101', 'Synthetic booking terms',
    jsonb_build_array(jsonb_build_object('due_date', current_date + 1, 'amount', 100)));
  PERFORM public.transition_pilgrimage_seat_allocation(sale, 'hold', 120);
  PERFORM public.transition_pilgrimage_seat_allocation(sale, 'allocate', 120);
  PERFORM public.approve_pilgrimage_b2b_agreement(agreement);
  PERFORM public.request_pilgrimage_b2b_cancellation(sale, 'Initial cancellation request');
  BEGIN
    PERFORM public.issue_pilgrimage_b2b_invoice(agreement, 0);
    RAISE EXCEPTION 'Invoice issued while cancellation pending';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;
SET test.user_id = '00000000-0000-4000-8000-000000000013';
SELECT public.review_pilgrimage_b2b_cancellation(id, false, 'Additional documentation required')
FROM public.pilgrimage_b2b_cancellations WHERE status = 'requested' AND invoice_id IS NULL;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
SELECT public.request_pilgrimage_b2b_cancellation(
  '00000000-0000-4000-8000-000000000399', 'Documentation now confirmed');
SET test.user_id = '00000000-0000-4000-8000-000000000013';
SELECT public.review_pilgrimage_b2b_cancellation(id, true)
FROM public.pilgrimage_b2b_cancellations WHERE status = 'requested' AND invoice_id IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations WHERE status = 'approved'
    AND invoice_id IS NULL AND credit_note_id IS NULL AND refund_id IS NULL AND reversal_journal_id IS NULL)
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations WHERE status = 'rejected')
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_seat_allocations
      WHERE sale_id = '00000000-0000-4000-8000-000000000399' AND status = 'released')
  THEN RAISE EXCEPTION 'Uninvoiced cancellation or decision history was incorrect'; END IF;
END $$;
RESET ROLE;

SELECT 'B2B supplier obligation, controlled cancellation, credit note and refund passed' AS result;
