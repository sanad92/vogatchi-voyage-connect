import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `56e10150-901f-4000-8000-${String(n).padStart(12, '0')}`;
const org = id(1);
const otherOrg = id(2);
const account = id(3);
const wrongAccount = id(4);
const owner = id(5);
const scoped = id(6);
const foreign = id(7);
const booking = id(8);
const invoice = id(9);
const foreignBooking = id(10);
const financeOnly = id(93);
const supplier = id(94);
const foreignSupplier = id(95);
const hiddenSupplierPayout = id(96);

try {
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE ROLE anon;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    CREATE TABLE public.members (organization_id uuid, user_id uuid, scope text);
    CREATE FUNCTION public.user_belongs_to_org(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    AS 'SELECT EXISTS (SELECT 1 FROM public.members WHERE user_id=$1 AND organization_id=$2)';
    CREATE FUNCTION public._org_permission_state(uuid,uuid,text) RETURNS TABLE(granted boolean, data_scope text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS 'SELECT ($3 = ''financial_view'' OR ($3 = ''invoices_view'' AND $2 <> ''${financeOnly}''::uuid)), scope
      FROM public.members WHERE organization_id=$1 AND user_id=$2';
    CREATE TABLE public.bank_accounts (id uuid, organization_id uuid, account_name text, currency text);
    CREATE TABLE public.bookings (id uuid, organization_id uuid, booking_number text);
    CREATE TABLE public.invoices (id uuid, organization_id uuid, invoice_number text, booking_id uuid);
    CREATE TABLE public.suppliers (id uuid, organization_id uuid, name text);
    CREATE TABLE public.supplier_payments (
      id uuid, organization_id uuid, supplier_id uuid, booking_id uuid, treasury_account_id uuid,
      status text, payment_method text, payment_date date, paid_date date, amount numeric, currency text, reference_number text
    );
    CREATE TABLE public.customer_payments (
      id uuid, organization_id uuid, treasury_account_id uuid, amount numeric(14,2), currency text,
      payment_date date, reference_number text, booking_id uuid, invoice_id uuid, status text,
      payment_method text, is_demo boolean DEFAULT false
    );
    CREATE TABLE public.bank_account_transactions (
      organization_id uuid, bank_account_id uuid, transaction_date date,
      source_type text, source_id uuid, reference_number text, amount numeric(12,2),
      currency text, transaction_type text, related_invoice_id uuid, id uuid DEFAULT gen_random_uuid()
    );
    ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_payments ON public.customer_payments FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(auth.uid(), organization_id));
    ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_supplier_payments ON public.supplier_payments FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(auth.uid(), organization_id) AND id <> '${hiddenSupplierPayout}'::uuid);
    GRANT SELECT ON public.customer_payments, public.bank_account_transactions, public.bank_accounts,
      public.bookings, public.invoices, public.suppliers, public.supplier_payments TO authenticated;
    INSERT INTO public.members VALUES ('${org}', '${owner}', 'organization'), ('${org}', '${scoped}', 'own'),
      ('${otherOrg}', '${foreign}', 'organization'), ('${org}', '${financeOnly}', 'organization');
    INSERT INTO public.bank_accounts VALUES ('${account}', '${org}', 'Office cash', 'EGP'), ('${wrongAccount}', '${otherOrg}', 'Other cash', 'EGP');
    INSERT INTO public.bookings VALUES ('${booking}', '${org}', 'BK-TEST'), ('${foreignBooking}', '${otherOrg}', 'OTHER-BOOKING');
    INSERT INTO public.invoices VALUES ('${invoice}', '${org}', 'INV-TEST', '${booking}');
    INSERT INTO public.suppliers VALUES ('${supplier}', '${org}', 'Fixture supplier'),
      ('${foreignSupplier}', '${otherOrg}', 'Other supplier');
    INSERT INTO public.supplier_payments VALUES
      ('${id(200)}', '${org}', '${supplier}', '${booking}', NULL,
        'paid', 'cash', '2026-11-10', '2026-11-11', 110, 'EGP', 'SP-200'),
      ('${id(201)}', '${org}', '${foreignSupplier}', '${foreignBooking}', NULL,
        'completed', 'cash', '2026-11-09', NULL, 50, 'EGP', 'SP-201'),
      ('${id(202)}', '${org}', '${supplier}', '${booking}', '${account}',
        'paid', 'cash', '2026-11-11', NULL, 80, 'EGP', 'SP-202'),
      ('${id(203)}', '${org}', '${supplier}', '${booking}', NULL,
        'paid', 'bank_transfer', '2026-11-11', NULL, 80, 'EGP', 'SP-203'),
      ('${id(204)}', '${org}', '${supplier}', '${booking}', NULL,
        'pending', 'cash', '2026-11-11', NULL, 80, 'EGP', 'SP-204'),
      ('${id(205)}', '${org}', '${supplier}', '${booking}', NULL,
        'paid', 'cash', '2026-11-11', NULL, 0, 'EGP', 'SP-205'),
      ('${id(206)}', '${otherOrg}', '${foreignSupplier}', '${foreignBooking}', NULL,
        'paid', 'cash', '2026-11-11', NULL, 80, 'EGP', 'SP-206'),
      ('${hiddenSupplierPayout}', '${org}', '${supplier}', '${booking}', NULL,
        'paid', 'cash', '2026-11-11', NULL, 80, 'EGP', 'SP-207');
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261119173503_list_receipts_for_treasury_review.sql', import.meta.url), 'utf8'));
  const depositMigration = readFileSync(new URL('../supabase/migrations/20261119232020_review_linked_customer_receipt_deposits.sql', import.meta.url), 'utf8');
  await db.exec(depositMigration);
  await db.exec(depositMigration);
  const supplierReviewMigration = readFileSync(
    new URL('../supabase/migrations/20261120115544_list_legacy_supplier_cash_payout_review.sql', import.meta.url), 'utf8',
  );
  await db.exec(supplierReviewMigration);
  await db.exec(supplierReviewMigration);

  const receipt = (number, { target = account, reference = 'R-' + number, company = org, status = 'completed', method = 'cash', demo = false, bookingId = null } = {}) =>
    db.query(`INSERT INTO public.customer_payments VALUES
      ($1,$2,$3,100,'EGP','2026-11-19',$4,$5,$6,$7,$8,$9)`,
    [id(number), company, target, reference, bookingId, invoice, status, method, demo]);
  const deposit = (reference, { payment = null, amount = 100, currency = 'EGP', count = 1, direction = 'deposit', company = org } = {}) =>
    db.query(`INSERT INTO public.bank_account_transactions
      SELECT $1,$2,'2026-11-19',CASE WHEN $4::uuid IS NOT NULL THEN 'customer_payment' END,$4,$3,$5,$6,$7,$8
      FROM generate_series(1,$9)`, [company, account, reference, payment, amount, currency, direction, invoice, count]);

  await receipt(11, { target: null });
  await receipt(12, { bookingId: foreignBooking });
  await receipt(13);
  await deposit('R-13', { payment: id(13) });
  await receipt(14);
  await deposit('R-14', { currency: null });
  await receipt(15, { reference: 'shared' });
  await receipt(16, { reference: 'shared' });
  await deposit('shared');
  await receipt(17);
  await deposit('R-17', { payment: id(17), amount: 99 });
  await receipt(18, { demo: true });
  await receipt(19, { status: 'reversed' });
  await receipt(20, { status: 'pending' });
  await receipt(21, { target: null, method: 'bank_transfer' });
  await receipt(22, { company: otherOrg, target: wrongAccount });
  await receipt(23);
  await deposit('R-23', { count: 2 });
  await receipt(24);
  await deposit('R-24', { currency: 'USD' });
  await receipt(25);
  await deposit('R-25', { direction: 'withdrawal' });
  await deposit('reversed', { payment: id(19) });
  await deposit('orphan', { payment: id(90) });
  await deposit('withdrawal', { payment: id(91), direction: 'withdrawal' });
  await deposit('foreign', { payment: id(92), company: otherOrg });

  const as = async user => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec('SET ROLE authenticated');
  };
  const list = (organization = org, offset = 0) => db.query('SELECT * FROM public.list_treasury_receipt_review($1,$2)', [organization, offset]);
  const deposits = (organization = org) => db.query('SELECT * FROM public.list_treasury_deposit_review($1)', [organization]);
  const supplierPayouts = (organization = org, offset = 0) =>
    db.query('SELECT *, payment_date::text AS paid_on FROM public.list_legacy_supplier_cash_payout_review($1,$2)', [organization, offset]);
  await as(owner);
  const { rows } = await list();
  assert.deepEqual(rows.map(r => r.payment_id), [25, 24, 23, 17, 16, 15, 12, 11].map(id));
  const missing = rows.find(r => r.payment_id === id(11));
  assert.equal(missing.reason, 'account_missing');
  assert.equal(missing.booking_id, booking);
  assert.equal(missing.invoice_number, 'INV-TEST');
  const unmatched = rows.find(r => r.payment_id === id(12));
  assert.equal(unmatched.reason, 'deposit_unmatched');
  assert.equal(unmatched.account_name, 'Office cash');
  assert.equal(unmatched.booking_id, null);
  assert.deepEqual(Object.fromEntries((await deposits()).rows.map(row => [row.reference_number, row.reason])), {
    'R-17': 'deposit_mismatch', reversed: 'receipt_not_current', orphan: 'receipt_missing',
  });
  assert.deepEqual((await list(org, 7)).rows.map(r => r.payment_id), [id(11)]);
  const { rows: payoutRows } = await supplierPayouts();
  assert.deepEqual(payoutRows.map(r => r.payment_id), [id(200), id(201)]);
  assert.equal(payoutRows[0].reason, 'supplier_cash_treasury_missing');
  assert.equal(payoutRows[0].paid_on, '2026-11-11');
  assert.equal(payoutRows[0].supplier_name, 'Fixture supplier');
  assert.equal(payoutRows[0].booking_id, booking);
  assert.equal(payoutRows[1].supplier_name, null);
  assert.equal(payoutRows[1].booking_id, null);
  assert.deepEqual((await supplierPayouts(org, 1)).rows.map(r => r.payment_id), [id(201)]);
  for (let number = 100; number < 160; number += 1) {
    await db.exec('RESET ROLE');
    await receipt(number, { target: null });
  }
  await as(owner);
  assert.equal((await list()).rows.length, 51);
  assert.equal((await list(org, 50)).rows.length, 18);
  await assert.rejects(list(otherOrg), /treasury_receipt_review_denied/);
  await assert.rejects(deposits(otherOrg), /treasury_receipt_review_denied/);
  await assert.rejects(supplierPayouts(otherOrg), /treasury_supplier_cash_review_denied/);
  await as(financeOnly);
  assert.equal((await list()).rows.length, 51);
  await assert.rejects(deposits(), /treasury_receipt_review_denied/);
  assert.equal((await supplierPayouts()).rows.length, 2);
  await as(scoped);
  await assert.rejects(list(), /treasury_receipt_review_denied/);
  await assert.rejects(deposits(), /treasury_receipt_review_denied/);
  await assert.rejects(supplierPayouts(), /treasury_supplier_cash_review_denied/);
  await as(foreign);
  await assert.rejects(list(), /treasury_receipt_review_denied/);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(list(), /permission denied/);
  await assert.rejects(deposits(), /permission denied/);
  await assert.rejects(supplierPayouts(), /permission denied/);
  console.log('Treasury review isolates company data, finds mismatched linked movements, and lists historical supplier cash without a treasury link.');
} finally {
  await db.close();
}
