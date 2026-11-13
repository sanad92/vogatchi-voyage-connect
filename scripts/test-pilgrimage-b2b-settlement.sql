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
    '00000000-0000-4000-8000-000000000013'::uuid, '00000000-0000-4000-8000-000000000014'::uuid)
    AND org = '00000000-0000-4000-8000-000000000001'::uuid)
    OR (u = '00000000-0000-4000-8000-000000000021'::uuid AND org = '00000000-0000-4000-8000-000000000002'::uuid);
$$;
CREATE OR REPLACE FUNCTION public._require_route_code(org uuid, route text) RETURNS text LANGUAGE sql
AS $$ SELECT CASE route WHEN 'cash' THEN '1000' WHEN 'bank' THEN '1010' WHEN 'accounts_receivable' THEN '1100'
  WHEN 'accounts_payable' THEN '2000' WHEN 'refunds_payable' THEN '2050' WHEN 'sales_returns' THEN '4050' END $$;
CREATE FUNCTION public._can_manage_refunds(org uuid) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT public.can_org_write(org) AND public.has_org_permission(org, 'payments_refund') $$;

-- CORE_SETTLEMENT_FUNCTIONS

\i scripts/deploy-pilgrimage-b2b-settlement.sql

ALTER TABLE public.pilgrimage_programs ADD COLUMN name text NOT NULL DEFAULT 'Test program',
  ADD COLUMN departure_date date, ADD COLUMN return_date date,
  ADD COLUMN makkah_hotel text, ADD COLUMN madinah_hotel text,
  ADD COLUMN makkah_nights int NOT NULL DEFAULT 0, ADD COLUMN madinah_nights int NOT NULL DEFAULT 0,
  ADD COLUMN price_quad numeric NOT NULL DEFAULT 500, ADD COLUMN price_triple numeric NOT NULL DEFAULT 750,
  ADD COLUMN price_double numeric NOT NULL DEFAULT 1000, ADD COLUMN price_single numeric NOT NULL DEFAULT 1500;
ALTER TABLE public.pilgrims ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN full_name text, ADD COLUMN name_en text, ADD COLUMN customer_id uuid,
  ADD COLUMN created_by uuid, ADD COLUMN gender text, ADD COLUMN national_id text,
  ADD COLUMN passport_number text, ADD COLUMN passport_expiry date,
  ADD COLUMN visa_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN documents_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN makkah_room text, ADD COLUMN madinah_room text, ADD COLUMN bus_number text,
  ADD COLUMN room_type text NOT NULL DEFAULT 'quad',
  ADD COLUMN total_price numeric NOT NULL DEFAULT 0, ADD COLUMN paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN cancellation_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customer_payments ADD COLUMN pilgrim_id uuid;
CREATE TABLE public.pilgrimage_program_costs (program_id uuid PRIMARY KEY, organization_id uuid, cost_per_person numeric);
ALTER TABLE public.pilgrims ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_pilgrims ON public.pilgrims FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
GRANT SELECT, INSERT, UPDATE ON public.pilgrims TO authenticated;
GRANT SELECT, UPDATE ON public.pilgrimage_programs TO authenticated;
\i scripts/deploy-pilgrimage-guardrails.sql
\i scripts/deploy-pilgrimage-retail-registration.sql
\i scripts/deploy-pilgrimage-b2b-roster.sql
\i scripts/deploy-pilgrimage-b2b-passengers.sql
\i scripts/deploy-pilgrimage-availability-search.sql

CREATE OR REPLACE FUNCTION public._org_permission_state(org uuid, actor uuid, permission text)
RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql STABLE
AS $$
  SELECT public.user_belongs_to_org(actor, org)
    AND (public.get_user_org_role(actor, org) = 'manager'
      OR permission IN ('invoices_view','bookings_view','customers_view')
      OR (actor='00000000-0000-4000-8000-000000000014'::uuid AND permission='quotes_create')),
    'organization'::text
$$;
CREATE OR REPLACE FUNCTION public.get_user_org_role(u uuid, org uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT CASE WHEN NOT public.user_belongs_to_org(u,org) THEN 'none'
    WHEN u='00000000-0000-4000-8000-000000000012'::uuid THEN 'viewer'
    WHEN u='00000000-0000-4000-8000-000000000014'::uuid THEN 'agent' ELSE 'manager' END;
$$;

SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000011';
DO $$
DECLARE
  program constant uuid := '00000000-0000-4000-8000-000000000201';
  sale constant uuid := '00000000-0000-4000-8000-000000000303';
  agreement uuid;
  entry uuid;
  traveler uuid;
BEGIN
  SELECT id INTO STRICT agreement FROM public.pilgrimage_b2b_agreements WHERE sale_id=sale;
  UPDATE public.pilgrimage_programs SET capacity=11, status='full' WHERE id=program;
  entry := public.add_pilgrimage_b2b_roster_name(agreement, gen_random_uuid(), 'Agency Test Passenger', 'double');
  traveler := public.register_pilgrimage_b2b_passenger(entry, 'double', 'female', '201', '310', 'B2');
  IF public.register_pilgrimage_b2b_passenger(entry, 'double', 'female', '201', '310', 'B2') <> traveler
    OR NOT EXISTS (SELECT 1 FROM public.pilgrims WHERE id=traveler AND program_id=program
      AND b2b_roster_entry_id=entry AND makkah_room='201' AND madinah_room='310' AND bus_number='B2'
      AND gender='female' AND customer_id IS NULL AND total_price=0 AND paid_amount=0)
  THEN RAISE EXCEPTION 'Reserved passenger registration or retry failed'; END IF;
  BEGIN
    PERFORM public.register_pilgrimage_b2b_passenger(entry, 'double', 'female', '202', '310', 'B2');
    RAISE EXCEPTION 'Conflicting registration retry accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  UPDATE public.pilgrimage_programs SET capacity=12, status='open' WHERE id=program;
  INSERT INTO public.pilgrims (organization_id,program_id,full_name)
    VALUES ('00000000-0000-4000-8000-000000000001',program,'Additional Retail Passenger');
  BEGIN
    INSERT INTO public.pilgrims (organization_id,program_id,full_name)
      VALUES ('00000000-0000-4000-8000-000000000001',program,'Unallocated Retail Passenger');
    RAISE EXCEPTION 'Retail registration consumed a reserved agency seat';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    UPDATE public.pilgrims SET status='cancelled' WHERE id=traveler;
    RAISE EXCEPTION 'Direct agency passenger cancellation succeeded';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    UPDATE public.pilgrims SET b2b_roster_entry_id=NULL WHERE id=traveler;
    RAISE EXCEPTION 'Direct removal of the reserved-seat link succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.customer_payments (organization_id,pilgrim_id,amount)
      VALUES ('00000000-0000-4000-8000-000000000001',traveler,1);
    RAISE EXCEPTION 'Individual payment accepted for an agency passenger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.pilgrims SET room_type='triple' WHERE id=traveler;
  IF (SELECT total_price FROM public.pilgrims WHERE id=traveler) <> 0 THEN
    RAISE EXCEPTION 'Room change created a retail receivable';
  END IF;
  PERFORM public.remove_pilgrimage_b2b_roster_name(entry);
  entry := public.add_pilgrimage_b2b_roster_name(agreement, gen_random_uuid(), 'Replacement Agency Passenger', 'triple');
  PERFORM public.register_pilgrimage_b2b_passenger(entry, 'triple');
  IF (SELECT status FROM public.pilgrims WHERE id=traveler) <> 'cancelled'
    OR (SELECT seat_count FROM public.pilgrimage_seat_allocations WHERE sale_id=sale AND status='allocated') <> 10
  THEN RAISE EXCEPTION 'Replacement lost its contracted seat or original history'; END IF;

  PERFORM set_config('test.user_id','00000000-0000-4000-8000-000000000012',true);
  BEGIN
    PERFORM public.register_pilgrimage_b2b_passenger(entry, 'triple');
    RAISE EXCEPTION 'Viewer registered a passenger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('test.user_id','00000000-0000-4000-8000-000000000021',true);
  BEGIN
    PERFORM public.register_pilgrimage_b2b_passenger(entry, 'triple');
    RAISE EXCEPTION 'Foreign tenant registered a passenger';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- Two retail travelers plus one named B2B traveler in an existing 10-seat
-- allocation consume 12 seats, with no extra seat for the named traveler.
UPDATE public.pilgrimage_programs SET capacity=15, departure_date=current_date+10, return_date=current_date+17
  WHERE id='00000000-0000-4000-8000-000000000201';
SET ROLE authenticated;
SET test.user_id = '00000000-0000-4000-8000-000000000014';
DO $$
DECLARE
  org constant uuid := '00000000-0000-4000-8000-000000000001';
  program constant uuid := '00000000-0000-4000-8000-000000000201';
  customer constant uuid := '00000000-0000-4000-8000-000000000101';
  request uuid := gen_random_uuid();
  quote uuid;
BEGIN
  IF has_function_privilege('anon','public.search_pilgrimage_availability(uuid,text,date,date,integer,text,uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Search callable anonymously'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.search_pilgrimage_availability(org,'umrah',current_date+5,current_date+12,3,'double')
    WHERE program_id=program AND available_seats=3 AND unit_price=1000)
    OR EXISTS (SELECT 1 FROM public.search_pilgrimage_availability(org,'umrah',NULL,NULL,4,'double'))
    OR EXISTS (SELECT 1 FROM public.search_pilgrimage_availability(org,'hajj',NULL,NULL,1,'double'))
    OR EXISTS (SELECT 1 FROM public.search_pilgrimage_availability(org,'umrah',current_date+11,NULL,1,'double'))
  THEN RAISE EXCEPTION 'Seat, date, type, or room-price filtering failed'; END IF;
  quote := public.create_pilgrimage_quote_from_availability(org,request,program,customer,3,'double',1000,'EGP');
  IF quote<>request OR public.create_pilgrimage_quote_from_availability(org,request,program,customer,3,'double',1000,'EGP')<>quote
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_sales s WHERE s.id=quote AND s.status='draft' AND s.party_size=3)
    OR (SELECT count(*) FROM public.pilgrimage_sale_items WHERE sale_id=quote)<>1
    OR NOT EXISTS (SELECT 1 FROM public.pilgrimage_sale_items WHERE sale_id=quote AND line_sell=3000 AND room_type='double')
    OR (SELECT available_seats FROM public.search_pilgrimage_availability(org,_program_id=>program))<>3
  THEN RAISE EXCEPTION 'Atomic quote, duplicate prevention or unchanged availability failed'; END IF;
  PERFORM set_config('test.user_id','00000000-0000-4000-8000-000000000011',true);
  UPDATE public.pilgrimage_sales SET status='quoted' WHERE id=quote;
  PERFORM public.transition_pilgrimage_seat_allocation(quote,'hold',5);
  IF (SELECT available_seats FROM public.search_pilgrimage_availability(org,_program_id=>program))<>0
  THEN RAISE EXCEPTION 'Search ignored an active hold'; END IF;
  PERFORM public.transition_pilgrimage_seat_allocation(quote,'release');
  IF (SELECT available_seats FROM public.search_pilgrimage_availability(org,_program_id=>program))<>3
  THEN RAISE EXCEPTION 'Search ignored a released hold'; END IF;
  BEGIN
    PERFORM public.create_pilgrimage_quote_from_availability(org,gen_random_uuid(),program,customer,3,'double',999,'EGP');
    RAISE EXCEPTION 'Stale price accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.create_pilgrimage_quote_from_availability(org,gen_random_uuid(),program,customer,4,'double',1000,'EGP');
    RAISE EXCEPTION 'Unavailable seats accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.create_pilgrimage_quote_from_availability(org,gen_random_uuid(),program,
      '00000000-0000-4000-8000-000000000102',3,'double',1000,'EGP');
    RAISE EXCEPTION 'Foreign customer accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM set_config('test.user_id','00000000-0000-4000-8000-000000000012',true);
  BEGIN
    PERFORM public.create_pilgrimage_quote_from_availability(org,gen_random_uuid(),program,customer,1,'double',1000,'EGP');
    RAISE EXCEPTION 'Viewer created a quote';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('test.user_id','00000000-0000-4000-8000-000000000021',true);
  BEGIN
    PERFORM public.search_pilgrimage_availability(org);
    RAISE EXCEPTION 'Foreign tenant searched the organization';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

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
    OR EXISTS (SELECT 1 FROM public.pilgrims WHERE b2b_roster_entry_id IS NOT NULL AND status <> 'cancelled')
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
