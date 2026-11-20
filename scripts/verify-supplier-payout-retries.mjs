import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../supabase/migrations/20261119231740_make_supplier_payout_retries_idempotent.sql', import.meta.url), 'utf8');
const guard = readFileSync(new URL('../supabase/migrations/20261120112156_guard_supplier_cash_and_review_legacy_invoices.sql', import.meta.url), 'utf8');
const db = new PGlite();
const org = '10000000-0000-0000-0000-000000000001';
const order = '20000000-0000-0000-0000-000000000001';
const otherOrg = '10000000-0000-0000-0000-000000000002';
const otherOrder = '20000000-0000-0000-0000-000000000002';
const firstRequest = '30000000-0000-0000-0000-000000000001';
const secondRequest = '30000000-0000-0000-0000-000000000002';
const account = '40000000-0000-0000-0000-000000000001';
const cash = '40000000-0000-0000-0000-000000000002';
const inactiveCash = '40000000-0000-0000-0000-000000000003';
const foreignCash = '40000000-0000-0000-0000-000000000004';
const wrongCurrency = '40000000-0000-0000-0000-000000000005';
const actor = '50000000-0000-0000-0000-000000000001';
const legacyOrder = '20000000-0000-0000-0000-000000000003';
const legacyRequest = '30000000-0000-0000-0000-000000000003';
const invoice = '60000000-0000-0000-0000-000000000001';
const coveredInvoice = '60000000-0000-0000-0000-000000000002';

const payout = (amount, request, paymentOrder = order, method = 'bank_transfer', treasury = account) => db.query(`
  SELECT public.record_supplier_payout($1, $2, $3, 'EGP', 1, $4, $5, '2026-11-01', NULL, NULL) AS payment
`, [paymentOrder, request, amount, method, treasury]);
const directPayout = (amount, method, treasury) => db.query(`
  SELECT public.record_supplier_payment($1, $2, 'EGP', 1, $3, $4, '2026-11-01', NULL, NULL)
`, [order, amount, method, treasury]);
const historicalReview = company => db.query('SELECT * FROM public.list_legacy_paid_invoice_review($1)', [company]);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${actor}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION public.user_belongs_to_org(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT $1 = '${actor}'::uuid AND $2 = '${org}'::uuid $$;
    CREATE FUNCTION public._org_permission_state(uuid,uuid,text) RETURNS TABLE(granted boolean,data_scope text)
    LANGUAGE sql STABLE AS $$ SELECT public.user_belongs_to_org($2,$1), 'organization'::text $$;
    CREATE FUNCTION public._require_route_code(uuid,text) RETURNS text LANGUAGE sql AS $$ SELECT $2 $$;
    CREATE TABLE public.supplier_payment_orders (id uuid PRIMARY KEY, organization_id uuid, outstanding numeric,
      amount numeric DEFAULT 100, booking_id uuid, supplier_id uuid, status text DEFAULT 'approved',
      approval_status text DEFAULT 'approved', currency text DEFAULT 'EGP', updated_at timestamptz);
    CREATE TABLE public.supplier_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, amount numeric,
      supplier_id uuid, currency text, payment_date date, payment_method text, reference_number text,
      booking_id uuid, notes text, status text, created_by uuid, paid_date date, amount_in_egp numeric, exchange_rate numeric,
      organization_id uuid, treasury_account_id uuid);
    CREATE TABLE public.supplier_payment_allocations (organization_id uuid, supplier_payment_id uuid, payment_order_id uuid, amount numeric, amount_base numeric);
    CREATE TABLE public.refund_balance_settlements (supplier_order_id uuid, amount numeric);
    CREATE TABLE public.bank_accounts (id uuid, organization_id uuid, currency text, treasury_kind text, is_active boolean);
    CREATE TABLE public.bank_account_transactions (
      bank_account_id uuid, transaction_type text, amount numeric, description text, transaction_date date,
      reference_number text, related_payment_order_id uuid, organization_id uuid, created_by uuid);
    CREATE TABLE public.finance_transactions (
      organization_id uuid, booking_id uuid, reference_type text, reference_id uuid, account_code text,
      party_type text, party_id uuid, direction text, amount numeric CHECK (amount <> 42), currency text,
      exchange_rate numeric, amount_base numeric, memo text, created_by uuid);
    CREATE TABLE public.bookings (id uuid, organization_id uuid, booking_number text);
    CREATE TABLE public.invoices (id uuid, organization_id uuid, booking_id uuid, issued_date date,
      total_paid_amount numeric, currency text, invoice_number text, notes text, is_demo boolean, status text, payment_status text);
    CREATE TABLE public.customer_payments (id uuid, organization_id uuid, invoice_id uuid, status text, is_demo boolean, amount numeric);
    CREATE TABLE public.customer_payment_allocations (organization_id uuid, payment_id uuid, invoice_id uuid, amount numeric);
    GRANT SELECT ON public.bookings, public.invoices, public.customer_payments, public.customer_payment_allocations TO authenticated;
    CREATE FUNCTION public.can_process_org_payments(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '${org}'::uuid $$;
    CREATE FUNCTION public.record_supplier_payment(uuid, numeric, text, numeric, text, uuid, date, text, text)
    RETURNS uuid LANGUAGE plpgsql AS $$
    DECLARE payment uuid;
    BEGIN
      UPDATE public.supplier_payment_orders SET outstanding = outstanding - $2 WHERE id = $1 AND outstanding >= $2;
      IF NOT FOUND THEN RAISE EXCEPTION 'Payment exceeds the remaining payment-order balance'; END IF;
      INSERT INTO public.supplier_payments (order_id, amount) VALUES ($1, $2) RETURNING id INTO payment;
      RETURN payment;
    END $$;
    INSERT INTO public.supplier_payment_orders(id, organization_id, outstanding) VALUES
      ('${order}', '${org}', 100), ('${otherOrder}', '${otherOrg}', 100), ('${legacyOrder}', '${org}', 100);
    INSERT INTO public.bank_accounts VALUES
      ('${account}', '${org}', 'EGP', 'bank', true),
      ('${cash}', '${org}', 'EGP', 'cash', true),
      ('${inactiveCash}', '${org}', 'EGP', 'cash', false),
      ('${foreignCash}', '${otherOrg}', 'EGP', 'cash', true),
      ('${wrongCurrency}', '${org}', 'USD', 'cash', true);
    INSERT INTO public.invoices VALUES
      ('${invoice}', '${org}', NULL, '2026-11-01', 120, 'EGP', 'LEGACY-UNMATCHED',
        'تسوية تلقائية - مدفوعة', false, 'paid', 'paid'),
      ('${coveredInvoice}', '${org}', NULL, '2026-11-01', 120, 'EGP', 'LEGACY-COVERED',
        'تسوية تلقائية - مدفوعة', false, 'paid', 'paid'),
      ('60000000-0000-0000-0000-000000000003', '${otherOrg}', NULL, '2026-11-01', 120, 'EGP', 'OTHER-LEGACY',
        'تسوية تلقائية - مدفوعة', false, 'paid', 'paid');
    INSERT INTO public.customer_payments VALUES
      ('70000000-0000-0000-0000-000000000001', '${org}', NULL, 'completed', false, 120),
      ('70000000-0000-0000-0000-000000000002', '${org}', '${invoice}', 'reversed', false, 120);
    INSERT INTO public.customer_payment_allocations VALUES
      ('${org}', '70000000-0000-0000-0000-000000000001', '${coveredInvoice}', 120);
  `);
  await db.exec(migration);
  await db.exec(migration);
  const legacy = (await payout(5, legacyRequest, legacyOrder, 'cash', null)).rows[0].payment;
  await db.exec(guard);
  await db.exec(guard);
  await db.exec('SET ROLE anon');
  await assert.rejects(() => payout(60, firstRequest), { code: '42501' });
  await assert.rejects(() => directPayout(60, 'cash', cash), { code: '42501' });
  await assert.rejects(() => historicalReview(org), { code: '42501' });
  await db.exec('SET ROLE authenticated');
  await assert.rejects(() => payout(60, firstRequest, otherOrder), { code: '42501' });
  await assert.rejects(() => historicalReview(otherOrg), { code: '42501' });
  const evidence = (await historicalReview(org)).rows;
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].invoice_id, invoice);
  assert.equal(evidence[0].reason, 'legacy_paid_invoice_evidence_missing');
  assert.equal((await db.query('SELECT * FROM public.list_legacy_paid_invoice_review($1, 1)', [org])).rows.length, 0);

  assert.equal((await payout(5, legacyRequest, legacyOrder, 'cash', null)).rows[0].payment, legacy);
  await assert.rejects(() => directPayout(20, 'cash', null), /اختر حساب الخزنة/);
  await assert.rejects(() => payout(60, firstRequest, order, 'cash', null), /اختر حساب الخزنة/);
  await assert.rejects(() => directPayout(20, 'cash', inactiveCash), /غير متاح لهذه المؤسسة/);
  await assert.rejects(() => directPayout(20, 'cash', foreignCash), /غير متاح لهذه المؤسسة/);
  await assert.rejects(() => directPayout(20, 'cash', wrongCurrency), /تطابق عملة الصرف/);
  await assert.rejects(() => directPayout(20, 'cash', account), /غير مناسب لطريقة الصرف/);
  await assert.rejects(() => directPayout(20, 'bank_transfer', cash), /غير مناسب لطريقة الصرف/);
  await assert.rejects(() => directPayout(42, 'cash', cash), { code: '23514' });

  const first = (await payout(60, firstRequest, order, 'cash', cash)).rows[0].payment;
  assert.equal((await payout(60, firstRequest, order, 'cash', cash)).rows[0].payment, first);
  await assert.rejects(() => payout(61, firstRequest, order, 'cash', cash), /request ID is already in use/);

  const second = (await payout(40, secondRequest)).rows[0].payment;
  assert.notEqual(first, second);
  assert.equal((await payout(40, secondRequest)).rows[0].payment, second);

  await db.exec('RESET ROLE');
  const result = await db.query(`
    SELECT count(*) AS payments, sum(amount) AS paid FROM public.supplier_payments
  `);
  assert.deepEqual(result.rows, [{ payments: 3, paid: '105' }]);
  const withdrawals = await db.query(`
    SELECT bank_account_id, amount FROM public.bank_account_transactions ORDER BY amount DESC
  `);
  assert.deepEqual(withdrawals.rows, [{ bank_account_id: cash, amount: '60' }, { bank_account_id: account, amount: '40' }]);
  const journal = await db.query(`
    SELECT account_code, amount FROM public.finance_transactions WHERE direction='credit' ORDER BY amount DESC
  `);
  assert.deepEqual(journal.rows, [{ account_code: 'cash', amount: '60' }, { account_code: 'bank', amount: '40' }]);
  console.log('Supplier payout treasury validation, atomic posting, historical retry, and scoped evidence review passed.');
} finally {
  await db.close();
}
