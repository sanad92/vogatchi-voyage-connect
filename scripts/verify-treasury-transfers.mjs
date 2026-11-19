import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const sql = file => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
const one = async (query, params) => (await db.query(query, params)).rows[0];
const id = n => `25000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, bank, till, foreignBank, dollarTill, inactiveTill, bankGL, cashGL, owner, financeReader, scoped, outsider] =
  Array.from({ length: 13 }, (_, index) => id(index + 1));
const [foreignGL, center, foreignCenter, draft, foreignDraft] = [14, 15, 16, 17, 18].map(id);

const setup = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE SCHEMA operations_private;
  GRANT USAGE ON SCHEMA auth, operations_private TO authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  CREATE TABLE public.organizations (id uuid PRIMARY KEY, writable boolean NOT NULL);
  CREATE TABLE public.members (
    organization_id uuid, user_id uuid, finance_view boolean, transfer_scope text, active boolean DEFAULT true,
    PRIMARY KEY (organization_id, user_id)
  );
  CREATE FUNCTION public.user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  AS 'SELECT EXISTS (SELECT 1 FROM public.members WHERE organization_id = $2 AND user_id = $1 AND active)';
  CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  AS 'SELECT finance_view AND $2 = ''financial_view'' FROM public.members WHERE organization_id = $1 AND user_id = auth.uid() AND active';
  CREATE FUNCTION public._org_permission_state(uuid, uuid, text) RETURNS TABLE(granted boolean, data_scope text)
  LANGUAGE sql STABLE AS 'SELECT transfer_scope <> ''none'' AND $3 = ''banking_transfer'', transfer_scope
    FROM public.members WHERE organization_id = $1 AND user_id = $2 AND active';
  CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE
  AS 'SELECT writable FROM public.organizations WHERE id = $1';

  CREATE TABLE public.bank_accounts (
    id uuid PRIMARY KEY, organization_id uuid NOT NULL, account_name text NOT NULL, treasury_kind text,
    currency text, current_balance numeric(12,2), is_active boolean DEFAULT true, updated_at timestamptz
  );
  CREATE TABLE public.bank_account_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, bank_account_id uuid,
    transaction_type text, amount numeric(12,2), currency text, transaction_date date, reference_number text,
    description text, source_type text, source_id uuid, created_by uuid
  );
  CREATE UNIQUE INDEX uq_bank_account_transactions_source ON public.bank_account_transactions
    (organization_id, source_type, source_id) WHERE (source_type IS NOT NULL AND source_id IS NOT NULL);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_transactions TO authenticated;

  CREATE TABLE public.chart_of_accounts (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
  CREATE TABLE public.cost_centers (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
  CREATE TABLE public.commission_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, bank_account_id uuid REFERENCES public.bank_accounts,
    total_commission_amount numeric(12,2)
  );
  CREATE TABLE public.organization_account_routing (
    organization_id uuid, kind text, account_id uuid REFERENCES public.chart_of_accounts,
    PRIMARY KEY (organization_id, kind)
  );
  CREATE FUNCTION public.get_org_account_route(uuid, text) RETURNS uuid LANGUAGE sql STABLE
  AS 'SELECT account_id FROM public.organization_account_routing WHERE organization_id = $1 AND kind = $2';
  CREATE FUNCTION public.seed_default_chart_of_accounts(uuid) RETURNS void LANGUAGE sql AS 'SELECT';
  CREATE FUNCTION public.get_account_id_by_code(uuid, text) RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';
  CREATE FUNCTION public._resolve_account(uuid, text) RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';
  CREATE FUNCTION public.trg_commission_payment_bank_balance() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
  CREATE TRIGGER trg_commission_payment_bank AFTER INSERT ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_commission_payment_bank_balance();
  CREATE TABLE public.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, entry_number text, entry_date date,
    reference_type text, reference_id uuid, description text, total_debit numeric(15,2), total_credit numeric(15,2),
    status text, currency text, source_type text, source_id uuid, functional_currency text, fx_rate numeric,
    created_by uuid, posted_at timestamptz, auto_generated boolean, is_locked boolean DEFAULT false,
    UNIQUE (organization_id, entry_number)
  );
  CREATE TABLE public.journal_entry_lines (
    journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id), account_id uuid NOT NULL,
    debit numeric(15,2), credit numeric(15,2), description text, line_order integer,
    cost_center_id uuid REFERENCES public.cost_centers ON DELETE SET NULL
  );
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entry_lines, public.commission_payments,
    public.organization_account_routing TO authenticated;

  INSERT INTO public.organizations VALUES ('${org}', true), ('${otherOrg}', true);
  INSERT INTO public.members (organization_id, user_id, finance_view, transfer_scope) VALUES
    ('${org}', '${owner}', true, 'organization'), ('${org}', '${financeReader}', true, 'none'),
    ('${org}', '${scoped}', true, 'own'), ('${otherOrg}', '${outsider}', true, 'organization');
  INSERT INTO public.bank_accounts (id, organization_id, account_name, treasury_kind, currency, current_balance, is_active) VALUES
    ('${bank}', '${org}', 'Business bank', 'bank', 'EGP', 50000, true),
    ('${till}', '${org}', 'Cash till', 'cash', 'EGP', 5000, true),
    ('${foreignBank}', '${otherOrg}', 'Other company', 'bank', 'EGP', 20000, true),
    ('${dollarTill}', '${org}', 'Dollar till', 'cash', 'USD', 1000, true),
    ('${inactiveTill}', '${org}', 'Inactive till', 'cash', 'EGP', 0, false);
  INSERT INTO public.chart_of_accounts VALUES ('${bankGL}', '${org}'), ('${cashGL}', '${org}'), ('${foreignGL}', '${otherOrg}');
  INSERT INTO public.cost_centers VALUES ('${center}', '${org}'), ('${foreignCenter}', '${otherOrg}');
  INSERT INTO public.organization_account_routing VALUES ('${org}', 'bank', '${bankGL}'), ('${org}', 'cash', '${cashGL}');
`;

async function as(user) {
  await db.exec('RESET ROLE');
  await one("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec('SET ROLE authenticated');
}

const transfer = (request, source = bank, target = till, amount = '10000', organization = org) =>
  one("SELECT * FROM public.post_company_treasury_transfer($1, $2, $3, $4, $5, '2026-11-19', ' BANK-12 ')", [
    organization, id(request), source, target, amount,
  ]);
const balances = async () => {
  const { rows } = await db.query('SELECT current_balance FROM public.bank_accounts WHERE id IN ($1, $2) ORDER BY id', [bank, till]);
  return rows.map(row => row.current_balance);
};
const counts = () => one(`SELECT
  (SELECT count(*)::int FROM public.journal_entries) AS journals,
  (SELECT count(*)::int FROM public.bank_account_transactions) AS movements,
  (SELECT count(*)::int FROM public.treasury_transfers) AS transfers`);

try {
  await db.exec(setup);
  const bankRules = sql('20260226014315_aeb40c1c-c21e-4486-ba89-f43cc81bb517.sql');
  await db.exec(bankRules.match(/CREATE OR REPLACE FUNCTION public\.update_bank_balance_on_transaction\(\)[\s\S]*?EXECUTE FUNCTION public\.update_bank_balance_on_transaction\(\);/)[0]);
  const journalNumbers = sql('20260822140000_financial_launch_hardening.sql');
  await db.exec(journalNumbers.match(/CREATE OR REPLACE FUNCTION public\._next_entry_number\(_org uuid\)[\s\S]*?\$\$;/)[0]);
  const journalRules = sql('20260904143000_double_entry_core_hardening.sql');
  await db.exec(journalRules.slice(
    journalRules.indexOf('CREATE OR REPLACE FUNCTION public.guard_locked_journal_entry()'),
    journalRules.indexOf('-- 3) Supplier invoice accrual.'),
  ));
  await db.exec(sql('20261119151736_company_treasury_transfers.sql'));
  await db.exec(sql('20261119155637_enforce_finance_organization_isolation.sql'));

  await as(owner);
  const result = await transfer(100);
  assert.equal(result.receipt_reference, 'BANK-12');
  assert.equal(result.from_account_name, 'Business bank');
  assert.equal(result.to_account_name, 'Cash till');
  assert.equal((await transfer(100)).id, result.id);
  await assert.rejects(transfer(100, bank, till, '9000'), /treasury_transfer_request_conflict/);
  assert.equal((await one('SELECT count(*)::int AS count FROM public.list_company_treasury_transfers($1)', [org])).count, 1);
  await assert.rejects(db.query("UPDATE public.bank_account_transactions SET amount = 1 WHERE source_id = $1", [result.id]), /treasury_transfer_linked_movement/);
  await assert.rejects(db.query("DELETE FROM public.bank_account_transactions WHERE source_id = $1", [result.id]), /treasury_transfer_linked_movement/);
  await assert.rejects(db.query("INSERT INTO public.bank_account_transactions (source_type) VALUES ('treasury_transfer_in')"), /treasury_transfer_linked_movement/);
  await assert.rejects(db.query("DELETE FROM public.treasury_transfers"), /permission denied/);

  await db.exec('RESET ROLE');
  assert.deepEqual(await balances(), ['40000.00', '15000.00']);
  assert.deepEqual(await counts(), { journals: 1, movements: 2, transfers: 1 });
  const { rows: movements } = await db.query(`SELECT bank_account_id, transaction_type, amount, reference_number
    FROM public.bank_account_transactions WHERE source_id = $1 ORDER BY bank_account_id`, [result.id]);
  assert.deepEqual(movements, [
    { bank_account_id: bank, transaction_type: 'withdrawal', amount: '10000.00', reference_number: result.reference_number },
    { bank_account_id: till, transaction_type: 'deposit', amount: '10000.00', reference_number: result.reference_number },
  ]);
  const header = await one('SELECT * FROM public.journal_entries WHERE id = $1', [result.journal_entry_id]);
  assert.equal(header.entry_number, result.reference_number);
  assert.equal(header.source_id, result.id);
  assert.equal(header.status, 'posted');
  assert.equal(header.is_locked, true);
  const { rows: lines } = await db.query(`SELECT account_id, debit, credit FROM public.journal_entry_lines
    WHERE journal_entry_id = $1 ORDER BY line_order`, [result.journal_entry_id]);
  assert.deepEqual(lines, [
    { account_id: cashGL, debit: '10000.00', credit: '0.00' },
    { account_id: bankGL, debit: '0.00', credit: '10000.00' },
  ]);

  await as(financeReader);
  assert.equal((await one('SELECT count(*)::int AS count FROM public.list_company_treasury_transfers($1)', [org])).count, 1);
  await assert.rejects(transfer(101), /treasury_transfer_permission/);
  await as(scoped);
  await assert.rejects(transfer(101), /treasury_transfer_permission/);
  await as(outsider);
  assert.equal((await one('SELECT count(*)::int AS count FROM public.list_company_treasury_transfers($1)', [org])).count, 0);
  await assert.rejects(transfer(101), /treasury_transfer_permission/);

  await as(owner);
  await assert.rejects(transfer(101, bank, foreignBank), /treasury_transfer_invalid_accounts/);
  await assert.rejects(transfer(101, bank, inactiveTill), /treasury_transfer_invalid_accounts/);
  await assert.rejects(transfer(101, bank, dollarTill), /treasury_transfer_currency/);
  await assert.rejects(transfer(101, bank, bank), /treasury_transfer_invalid_details/);
  await assert.rejects(transfer(101, bank, till, '0.001'), /treasury_transfer_invalid_details/);
  await assert.rejects(transfer(101, bank, till, 'NaN'), /treasury_transfer_invalid_details/);
  await assert.rejects(transfer(101, bank, till, '45000'), /treasury_transfer_funds/);

  await db.exec('RESET ROLE');
  await db.query('UPDATE public.organizations SET writable = false WHERE id = $1', [org]);
  await as(owner);
  assert.equal((await transfer(100)).id, result.id);
  await assert.rejects(transfer(101), /treasury_transfer_read_only/);

  // Force the destination balance update to fail after the journal and withdrawal.
  await db.exec('RESET ROLE');
  await db.query('UPDATE public.organizations SET writable = true WHERE id = $1', [org]);
  await db.query('UPDATE public.bank_accounts SET current_balance = 9999999999.99 WHERE id = $1', [till]);
  await as(owner);
  await assert.rejects(transfer(101, bank, till, '1'), /numeric field overflow/);
  await db.exec('RESET ROLE');
  assert.deepEqual(await balances(), ['40000.00', '9999999999.99']);
  assert.deepEqual(await counts(), { journals: 1, movements: 2, transfers: 1 });

  await db.query('UPDATE public.bank_accounts SET current_balance = 15000 WHERE id = $1', [till]);
  await as(owner);
  await transfer(102, till, bank, '500');
  await db.exec('RESET ROLE');
  assert.deepEqual(await balances(), ['40500.00', '14500.00']);
  assert.deepEqual(await counts(), { journals: 2, movements: 4, transfers: 2 });
  const createManualMovement = (account, organization = org) => one(
    "INSERT INTO public.bank_account_transactions (organization_id, bank_account_id, transaction_type, amount) VALUES ($1, $2, 'credit', 50) RETURNING id",
    [organization, account],
  );
  const createCommission = account => db.query(
    'INSERT INTO public.commission_payments (organization_id, bank_account_id, total_commission_amount) VALUES ($1, $2, 25)',
    [org, account],
  );
  const createLine = (account, costCenter) => db.query(
    'INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit, cost_center_id) VALUES ($1, $2, 10, 0, $3)',
    [draft, account, costCenter],
  );

  await db.query(
    "INSERT INTO public.journal_entries (id, organization_id, status) VALUES ($1, $2, 'draft'), ($3, $4, 'draft')",
    [draft, org, foreignDraft, otherOrg],
  );
  await as(owner);
  await assert.rejects(createManualMovement(foreignBank), /treasury_account_organization_mismatch/);
  await assert.rejects(createManualMovement(bank, null), /treasury_account_organization_mismatch/);
  const manual = await createManualMovement(bank);
  await assert.rejects(
    db.query('UPDATE public.bank_account_transactions SET bank_account_id = $1 WHERE id = $2', [foreignBank, manual.id]),
    /treasury_account_organization_mismatch/,
  );
  await assert.rejects(
    db.query('UPDATE public.bank_account_transactions SET organization_id = $1, bank_account_id = $2 WHERE id = $3', [otherOrg, foreignBank, manual.id]),
    /financial_record_organization_immutable/,
  );
  await db.query('UPDATE public.bank_account_transactions SET bank_account_id = $1 WHERE id = $2', [till, manual.id]);

  await assert.rejects(createCommission(foreignBank), /treasury_account_organization_mismatch/);
  await createCommission(bank);

  await assert.rejects(createLine(foreignGL, null), /journal_line_organization_mismatch/);
  await assert.rejects(createLine(bankGL, foreignCenter), /journal_cost_center_organization_mismatch/);
  await createLine(bankGL, center);
  await assert.rejects(
    db.query('UPDATE public.journal_entry_lines SET account_id = $1 WHERE journal_entry_id = $2', [foreignGL, draft]),
    /journal_line_organization_mismatch/,
  );
  await assert.rejects(
    db.query('UPDATE public.journal_entry_lines SET journal_entry_id = $1, account_id = $2, cost_center_id = NULL WHERE journal_entry_id = $3', [foreignDraft, foreignGL, draft]),
    /journal_line_organization_mismatch/,
  );
  await assert.rejects(
    db.query("UPDATE public.organization_account_routing SET account_id = $1 WHERE organization_id = $2 AND kind = 'bank'", [foreignGL, org]),
    /account_routing_organization_mismatch/,
  );
  for (const name of ['get_org_account_route', 'get_account_id_by_code', '_resolve_account']) {
    await assert.rejects(db.query(`SELECT public.${name}($1, 'bank')`, [org]), /permission denied/);
  }
  await assert.rejects(db.query('SELECT public.seed_default_chart_of_accounts($1)', [org]), /permission denied/);

  await db.exec('RESET ROLE');
  await assert.rejects(
    db.query('UPDATE public.bank_accounts SET organization_id = $1 WHERE id = $2', [otherOrg, bank]),
    /financial_record_organization_immutable/,
  );
  assert.deepEqual(await balances(), ['40475.00', '14550.00']);
  assert.equal((await one('SELECT current_balance FROM public.bank_accounts WHERE id = $1', [foreignBank])).current_balance, '20000.00');
  await db.query('DELETE FROM public.bank_account_transactions WHERE id = $1', [manual.id]);
  assert.deepEqual(await balances(), ['40475.00', '14500.00']);
  console.log('Treasury transfers and finance organization isolation passed for valid posting, balances, journal links, and permissions.');
} finally {
  await db.close();
}
