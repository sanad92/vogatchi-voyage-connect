import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [orgA, orgB, ownerA, ownerB, inactive, accountA, accountB] = [1, 2, 11, 12, 13, 21, 22].map(id);
const readSql = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function prepareDatabase(db) {
  await db.exec(await readSql('scripts/fixtures/tenant-isolation.sql'));
  await db.exec(await readSql('drizzle/migrations/0016_tenant_authorization_and_business_email_hardening.sql'));
  await db.exec(`
    CREATE TABLE public.bank_accounts (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES public.organizations(id),
      current_balance numeric(14, 2) NOT NULL, updated_at timestamptz,
      UNIQUE (id, organization_id)
    );
    CREATE TABLE public.bank_account_transactions (
      id uuid PRIMARY KEY, bank_account_id uuid NOT NULL, organization_id uuid NOT NULL,
      amount numeric(14, 2) NOT NULL CHECK (amount > 0), transaction_type text NOT NULL,
      FOREIGN KEY (bank_account_id, organization_id) REFERENCES public.bank_accounts(id, organization_id)
    );
    ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.bank_account_transactions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.bank_accounts, public.bank_account_transactions TO authenticated;
    CREATE POLICY read_company_bank_accounts ON public.bank_accounts FOR SELECT TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));
    CREATE POLICY read_company_bank_movements ON public.bank_account_transactions FOR SELECT TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));

    INSERT INTO public.organizations (id, name) VALUES ('${orgA}', 'Synthetic A'), ('${orgB}', 'Synthetic B');
    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
      ('${ownerA}', 'a@first.example', now()), ('${ownerB}', 'b@second.example', now()),
      ('${inactive}', 'inactive@first.example', now());
    INSERT INTO public.organization_members (organization_id, user_id, role, is_active) VALUES
      ('${orgA}', '${ownerA}', 'owner', true), ('${orgB}', '${ownerB}', 'owner', true),
      ('${orgA}', '${inactive}', 'agent', false);
    INSERT INTO public.bank_accounts (id, organization_id, current_balance) VALUES
      ('${accountA}', '${orgA}', 700), ('${accountB}', '${orgB}', 1100);
  `);

  const finance = await readSql('supabase/migrations/20261119155637_enforce_finance_organization_isolation.sql');
  const start = finance.indexOf('CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()');
  const end = finance.indexOf('CREATE OR REPLACE FUNCTION public.trg_commission_payment_bank_balance()', start);
  assert.ok(start >= 0 && end > start, 'Expected the release bank balance trigger definition');
  await db.exec(finance.slice(start, end));
  await db.exec(`
    CREATE TRIGGER restored_balance_transition AFTER INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction();
    INSERT INTO public.bank_account_transactions VALUES
      ('${id(31)}', '${accountA}', '${orgA}', 120.50, 'deposit'),
      ('${id(32)}', '${accountA}', '${orgA}', 20.50, 'withdrawal'),
      ('${id(33)}', '${accountB}', '${orgB}', 65.25, 'deposit');
  `);
}

async function assertRecoveredState(db) {
  const accounts = () => db.query('SELECT id, current_balance FROM public.bank_accounts ORDER BY id');
  const movements = () => db.query('SELECT id, amount FROM public.bank_account_transactions ORDER BY id');
  const firstAccount = { id: accountA, current_balance: '800.00' };
  const secondAccount = { id: accountB, current_balance: '1165.25' };
  const firstMovements = [{ id: id(31), amount: '120.50' }, { id: id(32), amount: '20.50' }];
  const secondMovements = [{ id: id(33), amount: '65.25' }];

  assert.deepEqual((await accounts()).rows, [firstAccount, secondAccount]);
  assert.deepEqual((await movements()).rows, [...firstMovements, ...secondMovements]);

  await db.exec('SET ROLE authenticated');
  try {
    for (const [user, expectedAccounts, expectedMovements] of [
      [ownerA, [firstAccount], firstMovements],
      [ownerB, [secondAccount], secondMovements],
      [inactive, [], []],
    ]) {
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
      assert.deepEqual((await accounts()).rows, expectedAccounts);
      assert.deepEqual((await movements()).rows, expectedMovements);
    }
  } finally {
    await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE anon');
  try {
    await assert.rejects(accounts, { code: '42501' });
    await assert.rejects(movements, { code: '42501' });
  } finally {
    await db.exec('RESET ROLE');
  }
}

const backupDirectory = await mkdtemp(join(tmpdir(), 'safar-recovery-'));
const backupPath = join(backupDirectory, 'synthetic.pgdata.tar.gz');
try {
  const source = await PGlite.create();
  try {
    await prepareDatabase(source);
    await assertRecoveredState(source);
    const backup = await source.dumpDataDir('gzip');
    await writeFile(backupPath, Buffer.from(await backup.arrayBuffer()), { mode: 0o600 });
    // Deliberately move the source past the saved checkpoint.
    await source.query(`INSERT INTO public.bank_account_transactions VALUES ($1, $2, $3, 10, 'withdrawal')`,
      [id(34), accountA, orgA]);
    const live = await source.query('SELECT current_balance FROM public.bank_accounts WHERE id = $1', [accountA]);
    assert.equal(live.rows[0].current_balance, '790.00');
  } finally {
    await source.close();
  }

  const restored = await PGlite.create({ loadDataDir: new Blob([await readFile(backupPath)]) });
  try {
    await assertRecoveredState(restored);
    await restored.query(`INSERT INTO public.bank_account_transactions VALUES ($1, $2, $3, 5.25, 'deposit')`,
      [id(35), accountA, orgA]);
    const balances = await restored.query('SELECT current_balance FROM public.bank_accounts ORDER BY id');
    assert.deepEqual(balances.rows, [{ current_balance: '805.25' }, { current_balance: '1165.25' }]);
  } finally {
    await restored.close();
  }
  console.log('Synthetic backup restored two organizations, three movements, exact balances, role boundaries and working ledger triggers.');
} finally {
  await rm(backupDirectory, { recursive: true, force: true });
}
