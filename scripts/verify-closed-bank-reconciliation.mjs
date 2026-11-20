import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(new URL(`../supabase/migrations/${path}`, import.meta.url), 'utf8');
const migration = read('20261119232131_protect_closed_bank_reconciliation_balances.sql');
const engine = read('20260906013615_bank_reconciliation_engine.sql');
const balanceLookups = engine.slice(engine.indexOf('CREATE OR REPLACE FUNCTION public._bank_transaction_is_credit('),
  engine.indexOf('CREATE OR REPLACE FUNCTION public.create_bank_reconciliation_session('));
const financeIsolation = read('20261119155637_enforce_finance_organization_isolation.sql');
const balanceTrigger = financeIsolation.slice(financeIsolation.indexOf('CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()'),
  financeIsolation.indexOf('CREATE OR REPLACE FUNCTION public.trg_commission_payment_bank_balance()'));
const org = '10000000-0000-0000-0000-000000000001';
const account = '20000000-0000-0000-0000-000000000001';
const session = '30000000-0000-0000-0000-000000000001';
const db = new PGlite();

const withdraw = date => db.query(`
  INSERT INTO public.bank_account_transactions (bank_account_id, organization_id, amount, transaction_type, transaction_date, currency)
  VALUES ($1, $2, 40, 'withdrawal', $3, 'EGP') RETURNING id
`, [account, org, date]);

try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public._can_manage_bank_reconciliation(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '${org}'::uuid $$;
    CREATE FUNCTION public._can_read_org_finance(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '${org}'::uuid $$;
    CREATE TABLE public.bank_accounts (id uuid PRIMARY KEY, organization_id uuid, current_balance numeric, updated_at timestamptz);
    CREATE TABLE public.bank_account_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bank_account_id uuid,
      organization_id uuid, amount numeric, transaction_type text, transaction_date date, currency text, created_at timestamptz DEFAULT now());
    CREATE TABLE public.bank_reconciliation_sessions (id uuid PRIMARY KEY, organization_id uuid, bank_account_id uuid,
      statement_start date, statement_end date, book_closing_balance_snapshot numeric, status text,
      closed_at timestamptz, closed_by uuid);
    CREATE TABLE public.admin_audit_log (user_id uuid, action text, target_table text, target_id uuid, organization_id uuid, details jsonb);

    INSERT INTO public.bank_accounts (id, organization_id, current_balance) VALUES ('${account}', '${org}', 125);
    INSERT INTO public.bank_reconciliation_sessions (id, organization_id, bank_account_id, statement_start,
      statement_end, book_closing_balance_snapshot, status)
    VALUES ('${session}', '${org}', '${account}', '2026-11-01', '2026-11-15', 125, 'reconciled');
  `);
  await db.exec(balanceLookups);
  await db.exec(balanceTrigger);
  await db.exec(`CREATE TRIGGER trg_bank_balance_update AFTER INSERT OR UPDATE OR DELETE
    ON public.bank_account_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction()`);
  await db.exec(migration);
  await db.exec(migration);

  const inReviewMovement = (await withdraw('2026-11-10')).rows[0].id;
  const close = () => db.query('SELECT public.close_bank_reconciliation($1) AS result', [session]);
  await assert.rejects(close, /رصيد الدفاتر تغيّر بعد الاعتماد/);
  await db.query('DELETE FROM public.bank_account_transactions WHERE id = $1', [inReviewMovement]);
  assert.deepEqual((await close()).rows, [{ result: { status: 'closed' } }]);
  await assert.rejects(() => withdraw('2026-11-10'), /التسوية البنكية مقفلة/);
  await assert.rejects(() => withdraw('2026-10-31'), /التسوية البنكية مقفلة/);

  const forward = (await withdraw('2026-11-16')).rows[0].id;
  await assert.rejects(() => db.query(`UPDATE public.bank_account_transactions SET transaction_date = '2026-11-15' WHERE id = $1`, [forward]),
    /التسوية البنكية مقفلة/);
  const books = await db.query(`
    SELECT b.current_balance, s.book_closing_balance_snapshot, public._bank_book_balance_at(b.id, s.statement_end) AS as_of
    FROM public.bank_accounts b JOIN public.bank_reconciliation_sessions s ON s.bank_account_id = b.id WHERE s.id = $1
  `, [session]);
  assert.deepEqual(books.rows, [{ current_balance: '85', book_closing_balance_snapshot: '125', as_of: '125' }]);
  console.log('Closed bank reconciliation preserves approved as-of balances, while later movements still post.');
} finally {
  await db.close();
}
