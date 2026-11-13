-- Disposable PostgreSQL fixture. Run from the repository root.
\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END;
$$;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.user_id', true), '')::uuid
$$;

CREATE TABLE public.organizations (id uuid PRIMARY KEY);
CREATE TABLE public.organization_members (
  organization_id uuid, user_id uuid, role text, is_active boolean DEFAULT true
);
CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
CREATE TABLE public.suppliers (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY, organization_id uuid, customer_id uuid, currency text, booking_type text, booking_number text
);
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY, organization_id uuid, booking_id uuid, customer_id uuid, invoice_number text, booking_type text, customer_name text,
  currency text, subtotal numeric DEFAULT 0, discount_amount numeric DEFAULT 0, vat_rate numeric DEFAULT 0,
  vat_amount numeric, final_amount numeric, total_paid_amount numeric DEFAULT 0, remaining_amount numeric,
  payment_status text, status text DEFAULT 'sent', issued_date date DEFAULT CURRENT_DATE,
  is_demo boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.supplier_payment_orders (
  id uuid PRIMARY KEY, organization_id uuid, supplier_id uuid, booking_id uuid, reference_number text,
  amount numeric, currency text, approval_status text, status text, due_date date,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, supplier_id uuid,
  booking_id uuid, payment_order_id uuid, invoice_number text, booking_type text, invoice_date date DEFAULT CURRENT_DATE,
  amount numeric, amount_paid numeric DEFAULT 0, amount_base numeric, currency text,
  exchange_rate numeric DEFAULT 1, status text, notes text, created_by uuid, due_date date,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY, organization_id uuid, treasury_kind text, currency text,
  current_balance numeric, is_active boolean DEFAULT true, updated_at timestamptz
);
CREATE TABLE public.bank_account_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bank_account_id uuid, transaction_type text,
  amount numeric, description text, transaction_date date, reference_number text,
  related_invoice_id uuid, related_payment_order_id uuid, organization_id uuid, created_by uuid
);
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid, customer_id uuid,
  invoice_id uuid, source_payment_id uuid, treasury_account_id uuid, amount numeric, currency text,
  amount_base numeric, exchange_rate numeric, reason text, status text, rejection_reason text, created_at timestamptz DEFAULT now(),
  approved_at timestamptz, approved_by uuid, requested_by uuid, paid_at timestamptz, updated_at timestamptz
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
CREATE TABLE public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid, customer_id uuid, invoice_id uuid,
  treasury_account_id uuid, amount numeric, currency text, exchange_rate numeric, amount_base numeric, payment_method text,
  reference_number text, payment_date date, notes text, status text, client_ref text, created_by uuid, is_demo boolean DEFAULT false
);
CREATE TABLE public.customer_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, payment_id uuid, invoice_id uuid,
  amount numeric, amount_base numeric
);
CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, supplier_id uuid, booking_id uuid,
  treasury_account_id uuid, amount numeric, currency text, exchange_rate numeric, amount_in_egp numeric, payment_method text,
  reference_number text, payment_date date, paid_date date, notes text, status text, created_by uuid
);
CREATE TABLE public.supplier_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, supplier_payment_id uuid,
  supplier_invoice_id uuid, payment_order_id uuid, amount numeric, amount_base numeric
);
CREATE TABLE public.chart_of_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, account_code text, account_type text);
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, entry_number text, entry_date date,
  reference_type text, reference_id uuid, description text, total_debit numeric, total_credit numeric,
  status text, currency text, source_type text, source_id uuid, booking_id uuid, functional_currency text,
  fx_rate numeric, posted_at timestamptz, auto_generated boolean, is_locked boolean DEFAULT false,
  UNIQUE(organization_id, source_type, source_id)
);
CREATE TABLE public.journal_entry_lines (
  journal_entry_id uuid REFERENCES public.journal_entries ON DELETE CASCADE, account_id uuid NOT NULL REFERENCES public.chart_of_accounts,
  debit numeric, credit numeric, description text, line_order integer
);
CREATE TABLE public.finance_transactions (
  organization_id uuid, booking_id uuid, reference_type text, reference_id uuid, account_code text,
  party_type text, party_id uuid, direction text, amount numeric, currency text,
  exchange_rate numeric, amount_base numeric, memo text, created_by uuid
);
CREATE TABLE public.booking_timeline_events (
  organization_id uuid, booking_id uuid, kind text, actor_id uuid, summary text, payload jsonb
);

CREATE FUNCTION public.has_org_permission(_org uuid, _permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT FROM public.organization_members WHERE organization_id = _org
    AND user_id = auth.uid() AND is_active AND (role = 'owner' OR role = 'viewer' AND _permission = 'financial_view'))
$$;
CREATE FUNCTION public._org_permission_state(_org uuid, _user uuid, _permission text)
RETURNS TABLE (granted boolean, data_scope text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN role = 'limited' THEN true ELSE public.has_org_permission(_org, _permission) END,
    CASE WHEN role = 'limited' THEN 'own' ELSE 'organization' END
  FROM public.organization_members WHERE organization_id = _org AND user_id = _user AND is_active
$$;
CREATE FUNCTION public._can_read_org_finance(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.has_org_permission($1, 'financial_view')
$$;
CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.has_org_permission($1, 'payments_process')
$$;
CREATE FUNCTION public.can_process_org_payments(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.can_org_write($1)
$$;
CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public._next_entry_number(uuid) RETURNS text LANGUAGE sql AS $$ SELECT gen_random_uuid()::text $$;
CREATE FUNCTION public._resolve_account(_org uuid, _code text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM public.chart_of_accounts WHERE organization_id = _org AND account_code = _code
$$;
CREATE FUNCTION public.get_org_account_route(_org uuid, _key text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT public._resolve_account(_org, CASE _key
    WHEN 'cash' THEN '1000' WHEN 'bank' THEN '1010' WHEN 'accounts_receivable' THEN '1100'
    WHEN 'supplier_advances' THEN '1210' WHEN 'accounts_payable' THEN '2000'
    WHEN 'refunds_payable' THEN '2050' WHEN 'tax_payable' THEN '2100' WHEN 'sales_returns' THEN '4050' END)
$$;
CREATE FUNCTION public._require_route_code(_org uuid, _key text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT account_code FROM public.chart_of_accounts WHERE id = public.get_org_account_route(_org, _key)
$$;

\i /tmp/safar-refund-existing-finance.sql
\i supabase/migrations/20260822144000_refund_workflow_hardening.sql
\i supabase/migrations/20260904100616_booking_supplier_payable_integrity.sql
\i supabase/migrations/20260907160253_3951a969-8a9d-4656-bbdc-bf859cf5178a.sql
\i supabase/migrations/20261113110937_finance_refund_balances.sql

-- Compact, deterministic fixture IDs. Authentication is simulated with SET ROLE
-- and a transaction-local user ID. The actual finance RPCs do the posting.
CREATE FUNCTION public.fixture_id(integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT lpad($1::text, 32, '0')::uuid
$$;
CREATE FUNCTION public.fixture_assert(_result boolean, _message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF _result IS DISTINCT FROM true THEN RAISE EXCEPTION '%', _message; END IF; END;
$$;

INSERT INTO public.organizations VALUES (fixture_id(1)), (fixture_id(2));
INSERT INTO public.organization_members VALUES
  (fixture_id(1), fixture_id(10), 'owner', true),
  (fixture_id(1), fixture_id(11), 'viewer', true),
  (fixture_id(1), fixture_id(12), 'limited', true),
  (fixture_id(2), fixture_id(20), 'owner', true);
INSERT INTO public.customers VALUES (fixture_id(101),fixture_id(1)),(fixture_id(102),fixture_id(1));
INSERT INTO public.suppliers VALUES (fixture_id(201),fixture_id(1)),(fixture_id(202),fixture_id(1));
INSERT INTO public.bookings VALUES
  (fixture_id(301),fixture_id(1),fixture_id(101),'EGP','hotel','ORIGINAL'),
  (fixture_id(302),fixture_id(1),fixture_id(101),'EGP','hotel','NEW'),
  (fixture_id(303),fixture_id(1),fixture_id(102),'EGP','hotel','OTHER');
INSERT INTO public.chart_of_accounts (organization_id, account_code, account_type)
SELECT fixture_id(1), code, kind FROM (VALUES
  ('1000','asset'), ('1010','asset'), ('1100','asset'), ('1210','asset'), ('2000','liability'),
  ('2050','liability'), ('2100','liability'), ('4000','revenue'), ('4050','revenue'), ('5000','expense')
) AS routes(code,kind);
INSERT INTO public.bank_accounts (id,organization_id,treasury_kind,currency,current_balance) VALUES
  (fixture_id(401),fixture_id(1),'cash','EGP',500),
  (fixture_id(402),fixture_id(1),'bank','USD',500),
  (fixture_id(403),fixture_id(2),'bank','EGP',500);
INSERT INTO public.invoices (id,organization_id,booking_id,customer_id,invoice_number,currency,subtotal,vat_rate,booking_type) VALUES
  (fixture_id(501),fixture_id(1),fixture_id(301),fixture_id(101),'VAT-SOURCE','EGP',100,10,'hotel'),
  (fixture_id(502),fixture_id(1),fixture_id(302),fixture_id(101),'NEW-INVOICE','EGP',100,0,'hotel'),
  (fixture_id(503),fixture_id(1),fixture_id(303),fixture_id(102),'OTHER-CUSTOMER','EGP',100,0,'hotel');
INSERT INTO public.supplier_payment_orders (id,organization_id,supplier_id,booking_id,reference_number,amount,currency,approval_status,status) VALUES
  (fixture_id(601),fixture_id(1),fixture_id(201),fixture_id(301),'SOURCE-ORDER',100,'EGP','approved','approved'),
  (fixture_id(602),fixture_id(1),fixture_id(201),fixture_id(302),'TARGET-ORDER',100,'EGP','approved','approved'),
  (fixture_id(603),fixture_id(1),fixture_id(202),fixture_id(303),'OTHER-SUPPLIER',100,'EGP','approved','approved');

GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid),
  public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) TO authenticated;
GRANT SELECT ON public.supplier_invoices TO authenticated;
SELECT fixture_assert(NOT has_table_privilege('authenticated','refund_balance_settlements','INSERT')
  AND NOT has_table_privilege('authenticated','refund_requests','UPDATE')
  AND NOT has_function_privilege('anon','public.settle_refund_balance(uuid,uuid,numeric,uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'),
  'Refund grants permit unsafe writes');

SET ROLE authenticated;
SET test.user_id = '00000000-0000-0000-0000-000000000010';
DO $$
DECLARE
  v_refund uuid;
  v_supplier_invoice uuid;
BEGIN
  PERFORM public.record_customer_payment(fixture_id(501),110,'EGP',1,'cash',fixture_id(401));
  v_refund := public.create_refund_request(fixture_id(301),55,'EGP',1,NULL,'Booking changed');
  PERFORM public.approve_refund_request(v_refund,true);

  BEGIN
    PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(701),20,_refund=>v_refund,_treasury=>fixture_id(402));
    RAISE EXCEPTION 'Wrong currency treasury was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Select an active treasury%' THEN RAISE; END IF;
  END;
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(701),20,_refund=>v_refund,_treasury=>fixture_id(401));
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(701),20,_refund=>v_refund,_treasury=>fixture_id(401));
  PERFORM fixture_assert((SELECT status='approved' FROM public.refund_requests WHERE id=v_refund), 'Partial refund closed early');
  BEGIN
    PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(702),10,_refund=>v_refund,_invoice=>fixture_id(503),_reference=>'consent');
    RAISE EXCEPTION 'Wrong customer invoice was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Select an open invoice%' THEN RAISE; END IF;
  END;
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(702),25,_refund=>v_refund,_invoice=>fixture_id(502),_reference=>'consent');
  BEGIN
    PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(703),11,_refund=>v_refund,_treasury=>fixture_id(401));
    RAISE EXCEPTION 'Over-settlement was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Settlement exceeds%' THEN RAISE; END IF;
  END;
  PERFORM public.pay_refund_request(v_refund,fixture_id(401),'final customer payment');
  PERFORM fixture_assert((SELECT status='paid' FROM public.refund_requests WHERE id=v_refund), 'Full settlement did not close');
  PERFORM public.record_customer_payment(fixture_id(502),75,'EGP',1,'cash',fixture_id(401));
  BEGIN
    PERFORM public.create_refund_request(fixture_id(302),100,'EGP',1,NULL,'Attempt to cash-refund wallet funds');
    RAISE EXCEPTION 'Wallet offset could be converted into a duplicate cash refund';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Refund exceeds available paid amount%' THEN RAISE; END IF;
  END;

  PERFORM public.record_supplier_payment(fixture_id(601),100,'EGP',1,'bank_transfer',fixture_id(401));
  SELECT id INTO STRICT v_supplier_invoice FROM public.supplier_invoices WHERE payment_order_id=fixture_id(601);
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'create',v_supplier_invoice,60,'CREDIT-001');
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'create',v_supplier_invoice,60,'CREDIT-001');
  BEGIN
    PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(711),10,_claim=>fixture_id(801),_treasury=>fixture_id(401),_reference=>'receipt');
    RAISE EXCEPTION 'Pending claim was settled';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Refund must be approved%' THEN RAISE; END IF;
  END;
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'confirm');
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(802),'create',v_supplier_invoice,50,'CREDIT-002');
  BEGIN
    PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(802),'confirm');
    RAISE EXCEPTION 'Supplier invoice refunded above paid amount';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Supplier refund exceeds%' THEN RAISE; END IF;
  END;
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(802),'reject');
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(711),10,_claim=>fixture_id(801),_treasury=>fixture_id(401),_reference=>'supplier bank receipt');
  BEGIN
    PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(712),50,_claim=>fixture_id(801),_order=>fixture_id(603),_reference=>'offset');
    RAISE EXCEPTION 'Wrong supplier order was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Select an approved order%' THEN RAISE; END IF;
  END;
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(712),50,_claim=>fixture_id(801),_order=>fixture_id(602),_reference=>'offset');
  BEGIN
    PERFORM public.record_supplier_payment(fixture_id(602),51,'EGP',1,'bank_transfer',fixture_id(401));
    RAISE EXCEPTION 'Cash overpayment after wallet offset was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Payment exceeds%' THEN RAISE; END IF;
  END;
  PERFORM public.record_supplier_payment(fixture_id(602),50,'EGP',1,'bank_transfer',fixture_id(401));
END;
$$;

SET test.user_id = '00000000-0000-0000-0000-000000000011';
SELECT fixture_assert((SELECT count(*) = 5 FROM refund_balance_settlements), 'Finance viewer cannot read wallet history');
DO $$
BEGIN
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'confirm');
  RAISE EXCEPTION 'Viewer can confirm claims';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
SET test.user_id = '00000000-0000-0000-0000-000000000012';
SELECT fixture_assert((SELECT count(*) = 0 FROM refund_balance_settlements), 'Own-scope role sees organization-wide balances');
DO $$
BEGIN
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'confirm');
  RAISE EXCEPTION 'Own-scope role can confirm claims';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
SET test.user_id = '00000000-0000-0000-0000-000000000020';
SELECT fixture_assert((SELECT count(*) = 0 FROM refund_balance_settlements)
  AND (SELECT count(*) = 0 FROM supplier_refund_claims)
  AND (SELECT count(*) = 0 FROM refund_requests), 'Cross-company balance visible');
DO $$
BEGIN
  PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'confirm');
  RAISE EXCEPTION 'Other company can confirm claims';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

RESET ROLE;
SELECT fixture_assert((SELECT current_balance = 515 FROM bank_accounts WHERE id=fixture_id(401)), 'Treasury was posted twice or incorrectly');
SELECT fixture_assert((SELECT total_paid_amount=100 AND remaining_amount=0 FROM invoices WHERE id=fixture_id(502)), 'Cash payment overwrote the customer offset');
SELECT fixture_assert((SELECT amount_paid=100 AND status='paid' FROM supplier_invoices WHERE payment_order_id=fixture_id(602)), 'Cash payment overwrote the supplier offset');
SELECT fixture_assert(NOT EXISTS(SELECT FROM journal_entries WHERE source_type IN ('legacy_invoice_receipt','customer_refund')), 'Offset generated a false cash receipt or duplicate refund');
SELECT fixture_assert((SELECT sum(l.debit)=5 FROM journal_entries e JOIN journal_entry_lines l ON l.journal_entry_id=e.id
  JOIN chart_of_accounts a ON a.id=l.account_id WHERE e.source_type='customer_refund_due' AND a.account_code='2100'), 'VAT reversal did not post correctly');
SELECT fixture_assert(NOT EXISTS(
  SELECT FROM journal_entries e JOIN journal_entry_lines l ON l.journal_entry_id=e.id
  GROUP BY e.id HAVING sum(l.debit) <> sum(l.credit) OR sum(l.debit) <> e.total_debit
), 'Unbalanced journal detected');

SELECT fixture_assert((SELECT count(*)=7 AND bool_and(is_locked) FROM journal_entries
  WHERE source_type IN ('customer_refund_due','supplier_refund_confirmed','refund_balance_settlement')), 'Wallet journals must remain locked');
DO $$
BEGIN
  UPDATE bank_account_transactions SET amount = amount + 1
  WHERE id = (SELECT bank_transaction_id FROM refund_balance_settlements WHERE bank_transaction_id IS NOT NULL LIMIT 1);
  RAISE EXCEPTION 'Wallet bank transaction allowed direct edits';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'A bank transaction linked%' THEN RAISE; END IF;
END;
$$;
