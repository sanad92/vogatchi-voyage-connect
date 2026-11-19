import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../supabase/migrations/20261119230951_require_customer_receipt_treasury.sql', import.meta.url), 'utf8');
const accessMigration = readFileSync(new URL('../supabase/migrations/20261119231340_restrict_direct_customer_receipt_writes.sql', import.meta.url), 'utf8');
const passengerTreasuryMigration = readFileSync(new URL('../supabase/migrations/20261119165402_unify_availability_umrah_finance.sql', import.meta.url), 'utf8')
  .split('ALTER TABLE public.umrah_inventory_bookings', 1)[0];
const org = '10000000-0000-0000-0000-000000000001';
const booking = '20000000-0000-0000-0000-000000000001';
const invoice = '30000000-0000-0000-0000-000000000001';
const cashAccount = '40000000-0000-0000-0000-000000000001';
const bankAccount = '40000000-0000-0000-0000-000000000002';
const localAccount = '40000000-0000-0000-0000-000000000003';
const priorReceipt = '50000000-0000-0000-0000-000000000001';
const program = '60000000-0000-0000-0000-000000000001';
const passenger = '70000000-0000-0000-0000-000000000001';
const db = new PGlite();

const collect = ({ account = cashAccount, invoiceId = invoice, ref = 'receipt-1', method = 'cash' } = {}) => db.query(`
  SELECT public.record_customer_payment($1, 2, 'USD', 50.005, $2, $3, '2026-11-01', NULL, NULL, $4, $5) AS id
`, [invoiceId, method, account, ref, booking]);

try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE SCHEMA trip_amendment_private;
    CREATE SCHEMA pilgrimage_inventory_private;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.can_process_org_payments(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '${org}'::uuid $$;
    CREATE FUNCTION public._require_route_code(uuid, text) RETURNS text LANGUAGE sql AS $$ SELECT $2 $$;
    CREATE FUNCTION trip_amendment_private.invoice_credit(uuid) RETURNS numeric LANGUAGE sql AS $$ SELECT 0::numeric $$;

    CREATE TABLE public.bookings (id uuid, organization_id uuid, customer_id uuid, currency text);
    CREATE TABLE public.invoices (id uuid, organization_id uuid, booking_id uuid, customer_id uuid,
      final_amount numeric, total_paid_amount numeric, currency text, status text);
    CREATE TABLE public.bank_accounts (id uuid, organization_id uuid, currency text, treasury_kind text, is_active boolean);
    CREATE TABLE public.customer_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid, customer_id uuid,
      invoice_id uuid, treasury_account_id uuid, amount numeric(14, 2), currency text, exchange_rate numeric(14, 6),
      amount_base numeric(14, 2), payment_method text, reference_number text, payment_date date, notes text,
      status text, client_ref text, created_by uuid, pilgrim_id uuid, UNIQUE (organization_id, client_ref)
    );
    CREATE TABLE public.customer_payment_allocations (
      organization_id uuid, payment_id uuid, invoice_id uuid, amount numeric(14, 2), amount_base numeric(14, 2)
    );
    CREATE TABLE public.bank_account_transactions (
      bank_account_id uuid, transaction_type text, amount numeric(14, 2), description text, transaction_date date,
      reference_number text, related_invoice_id uuid, organization_id uuid, created_by uuid, currency text,
      source_type text, source_id uuid
    );
    CREATE UNIQUE INDEX treasury_movement_source ON public.bank_account_transactions (organization_id, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
    CREATE TABLE public.finance_transactions (
      organization_id uuid, booking_id uuid, reference_type text, reference_id uuid, account_code text,
      party_type text, party_id uuid, direction text, amount numeric(14, 2), currency text, exchange_rate numeric(14, 6),
      amount_base numeric(14, 2), memo text, created_by uuid
    );
    CREATE TABLE public.pilgrimage_programs (id uuid, organization_id uuid, currency text, name text);
    CREATE TABLE public.pilgrims (id uuid, organization_id uuid, program_id uuid, customer_id uuid,
      status text, full_name text, total_price numeric, paid_amount numeric, inventory_booking_id uuid, b2b_roster_entry_id uuid);
    CREATE TABLE public.umrah_inventory_bookings (id uuid, booking_id uuid);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments, public.customer_payment_allocations TO authenticated;

    INSERT INTO public.bookings VALUES ('${booking}', '${org}', NULL, 'USD');
    INSERT INTO public.invoices VALUES ('${invoice}', '${org}', '${booking}', NULL, 1, 0, 'USD', 'sent');
    INSERT INTO public.bank_accounts VALUES
      ('${cashAccount}', '${org}', 'USD', 'cash', true),
      ('${bankAccount}', '${org}', 'USD', 'bank', true),
      ('${localAccount}', '${org}', 'EGP', 'cash', true);
    INSERT INTO public.customer_payments (id, organization_id, booking_id, client_ref, status)
    VALUES ('${priorReceipt}', '${org}', '${booking}', 'older-receipt', 'completed');
    INSERT INTO public.pilgrimage_programs VALUES ('${program}', '${org}', 'USD', 'Program');
    INSERT INTO public.pilgrims VALUES ('${passenger}', '${org}', '${program}', NULL, 'registered', 'Passenger', 2, 0, NULL, NULL);
  `);
  await db.exec(migration);
  await db.exec(passengerTreasuryMigration);
  await db.exec(accessMigration);

  await assert.rejects(() => collect({ account: null }), /A treasury account is required/);
  await assert.rejects(() => collect({ account: bankAccount }), /does not match payment method/);
  await assert.rejects(() => collect({ account: localAccount }), /must match payment currency/);

  const { rows: [{ id }] } = await collect();
  const posted = await db.query(`
    SELECT status, treasury_account_id, amount_base FROM public.customer_payments WHERE id = $1
  `, [id]);
  assert.deepEqual(posted.rows, [{ status: 'completed', treasury_account_id: cashAccount, amount_base: '100.01' }]);

  const allocation = await db.query('SELECT amount, amount_base FROM public.customer_payment_allocations WHERE payment_id = $1', [id]);
  assert.deepEqual(allocation.rows, [{ amount: '1.00', amount_base: '50.01' }]);
  const lines = await db.query(`
    SELECT account_code, direction, amount_base FROM public.finance_transactions WHERE reference_id = $1 ORDER BY account_code
  `, [id]);
  assert.deepEqual(lines.rows, [
    { account_code: 'accounts_receivable', direction: 'credit', amount_base: '50.01' },
    { account_code: 'cash', direction: 'debit', amount_base: '100.01' },
    { account_code: 'refunds_payable', direction: 'credit', amount_base: '50.00' },
  ]);

  await db.exec(`UPDATE public.invoices SET status = 'paid' WHERE id = '${invoice}'`);
  await assert.rejects(() => collect({ ref: 'new-receipt' }), /Select an open invoice/);
  assert.equal((await collect()).rows[0].id, id);
  assert.equal((await collect({ account: null, invoiceId: null, ref: 'older-receipt' })).rows[0].id, priorReceipt);

  const deposits = await db.query('SELECT bank_account_id, amount FROM public.bank_account_transactions WHERE source_id = $1', [id]);
  assert.deepEqual(deposits.rows, [{ bank_account_id: cashAccount, amount: '2.00' }]);

  const advance = await collect({ invoiceId: null, method: 'bank_transfer', account: bankAccount, ref: 'advance' });
  const advanceLines = await db.query(`
    SELECT account_code FROM public.finance_transactions WHERE reference_id = $1 ORDER BY account_code
  `, [advance.rows[0].id]);
  assert.deepEqual(advanceLines.rows, [{ account_code: 'bank' }, { account_code: 'refunds_payable' }]);

  const privileges = await db.query(`
    SELECT has_table_privilege('authenticated', 'public.customer_payments', 'SELECT') AS read_receipts,
      has_table_privilege('authenticated', 'public.customer_payments', 'INSERT, UPDATE, DELETE, TRUNCATE') AS raw_receipt_writes,
      has_table_privilege('authenticated', 'public.customer_payment_allocations', 'INSERT, UPDATE, DELETE, TRUNCATE') AS raw_allocation_writes
  `);
  assert.deepEqual(privileges.rows, [{ read_receipts: true, raw_receipt_writes: false, raw_allocation_writes: false }]);
  const collectPassenger = () => db.query(`
    SELECT public.record_pilgrimage_passenger_receipt($1, 2, 50.005, 'cash', $2, '2026-11-01', NULL, 'passenger-receipt') AS receipt
  `, [passenger, cashAccount]);
  await db.exec('SET ROLE authenticated');
  const passengerReceipt = (await collectPassenger()).rows[0].receipt;
  assert.equal(passengerReceipt.amount_base, 100.01);
  assert.equal(passengerReceipt.status, 'completed');
  assert.equal((await collectPassenger()).rows[0].receipt.id, passengerReceipt.id);
  await db.exec('RESET ROLE');
  const passengerDeposits = await db.query('SELECT bank_account_id, amount FROM public.bank_account_transactions WHERE source_id = $1', [passengerReceipt.id]);
  assert.deepEqual(passengerDeposits.rows, [{ bank_account_id: cashAccount, amount: '2.00' }]);

  console.log('Customer and passenger receipts validate treasury and retries, balance split FX postings, and restrict direct writes.');
} finally {
  await db.close();
}
