import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const accountant = '00000000-0000-4000-8000-000000000003';
const auditor = '00000000-0000-4000-8000-000000000004';
const member = '00000000-0000-4000-8000-000000000005';
const org = '00000000-0000-4000-8000-000000000006';
const plan = '00000000-0000-4000-8000-000000000007';
const transfer = '00000000-0000-4000-8000-000000000008';
const invalid = '00000000-0000-4000-8000-000000000009';
const tx = '00000000-0000-4000-8000-000000000010';
const session = '00000000-0000-4000-8000-000000000011';
const request = '00000000-0000-4000-8000-000000000012';
const lines = JSON.stringify([
  {account_code: '5010', debit: 120.25, credit: 0},
  {account_code: '1020', debit: 0, credit: 120.25},
]);
const date = "(now() at time zone 'Africa/Cairo')::date";
const role = "select public.get_platform_finance_role() as role";
const sql = (q) => db.exec(q);
const query = async (q, params) => (await db.query(q, params)).rows;
const runAs = async (id, dbRole = 'authenticated') => {
  await sql(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${dbRole};`);
};
try {
  await sql(`
    create role authenticated; create role anon; create schema auth;
    grant usage on schema auth to authenticated, anon;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create type platform_role as enum ('platform_admin','platform_owner');
    create table public.platform_roles (user_id uuid not null, role platform_role not null);
    create function public.has_platform_role(_user_id uuid, _role platform_role) returns boolean
      language sql security definer set search_path='' as $$
      select exists(select 1 from public.platform_roles where user_id=_user_id and role=_role) $$;
    create function public.is_platform_admin(_user_id uuid) returns boolean
      language sql security definer set search_path='' as $$
      select exists(select 1 from public.platform_roles where user_id=_user_id) $$;
    create table public.subscription_plans (id uuid primary key, duration_days integer);
    create table public.subscriptions (
      id uuid primary key default gen_random_uuid(), organization_id uuid, plan_id uuid,
      status text, starts_at timestamptz, expires_at timestamptz, payment_method text,
      payment_reference text, activated_by uuid, paymob_transaction_id text,
      updated_at timestamptz default now(), created_at timestamptz default now()
    );
    create table public.bank_transfer_requests (
      id uuid primary key, organization_id uuid, plan_id uuid, amount numeric, currency text,
      billing_cycle text, status text default 'pending', reviewed_by uuid, reviewed_at timestamptz,
      updated_at timestamptz default now()
    );
    alter table public.bank_transfer_requests enable row level security;
    grant select,insert,update on public.bank_transfer_requests to authenticated;
    create policy platform_admin_update_transfers on public.bank_transfer_requests for update to authenticated
      using (public.is_platform_admin(auth.uid()));
    create policy fixture_transfer_read on public.bank_transfer_requests for select to authenticated using (true);
    create policy fixture_transfer_insert on public.bank_transfer_requests for insert to authenticated with check (true);
    create table public.payment_checkout_sessions (
      id uuid primary key, status text, provider_transaction_id text, paymob_order_id text,
      amount_cents bigint, currency text, organization_id uuid
    );
    create table public.payment_transactions (
      id uuid primary key default gen_random_uuid(), organization_id uuid, amount_cents integer, currency text,
      status text, payment_method text, processed_at timestamptz, hmac_valid boolean,
      checkout_session_id uuid, paymob_transaction_id text, paymob_order_id text, subscription_activated_at timestamptz
    );
    alter table public.payment_transactions enable row level security;
    grant insert on public.payment_transactions to authenticated;
    create policy fixture_payment_insert on public.payment_transactions for insert to authenticated with check (true);
    insert into auth.users values
      ('${owner}','owner@example.test',now()),('${admin}','admin@example.test',now()),
      ('${accountant}','accountant@example.test',now()),('${auditor}','auditor@example.test',now()),('${member}','member@example.test',now());
    insert into public.platform_roles values ('${owner}','platform_owner'), ('${admin}','platform_admin');
    insert into public.subscription_plans values ('${plan}',30);
    insert into public.bank_transfer_requests (id,organization_id,plan_id,amount,currency,billing_cycle)
      values ('${transfer}','${org}','${plan}',600,'EGP','monthly'),('${invalid}','${org}','${plan}',-1,'EGP','monthly');
    insert into public.payment_checkout_sessions values ('${session}','paid','PT1','PO1',30000,'EGP','${org}');
    insert into public.payment_transactions (id,organization_id,amount_cents,currency,status,hmac_valid,checkout_session_id,paymob_transaction_id,paymob_order_id,subscription_activated_at)
      values ('${tx}','${org}',30000,'EGP','success',true,'${session}','PT1','PO1',now());
  `);
  await sql(readFileSync('supabase/migrations/20261113114237_platform_finance.sql','utf8'));
  await runAs(admin);
  await sql(`begin;
    update public.bank_transfer_requests set status='approved',reviewed_by='${admin}',reviewed_at=now() where id='${transfer}';`);
  assert.equal((await query(`select status from public.bank_transfer_requests where id='${transfer}'`))[0].status,'approved');
  await sql('rollback; reset role');
  await sql(readFileSync('supabase/migrations/20261113132655_platform_finance_transfer_cutover.sql','utf8'));
  await runAs('', 'anon');
  await assert.rejects(query(role), {code:'42501'});
  await runAs(member);
  assert.deepEqual(await query(role), [{role:null}]);
  assert.deepEqual(await query('select * from public.platform_finance_accounts'), []);
  await assert.rejects(query("select public.set_platform_finance_staff('member@example.test','accountant')"), {code:'42501'});
  await assert.rejects(query("insert into public.payment_transactions (status,hmac_valid) values ('success',true)"), {code:'42501'});
  await assert.rejects(query("insert into public.bank_transfer_requests(id,status) values (gen_random_uuid(),'approved')"), {code:'42501'});
  await runAs(owner);
  assert.deepEqual(await query(role), [{role:'owner'}]);
  await query("select public.set_platform_finance_staff('accountant@example.test','accountant')");
  await query("select public.set_platform_finance_staff('auditor@example.test','auditor')");
  assert.equal((await query('select * from public.list_platform_finance_staff()')).length,2);
  await runAs(accountant);
  assert.deepEqual(await query(role), [{role:'accountant'}]);
  const post = `select public.post_platform_finance_entry(${date},'EGP','Hosting',$1::jsonb,'${request}') as id`;
  await assert.rejects(query(post,[lines.replace('credit":120.25','credit":10')]), {code:'22023'});
  await assert.rejects(query(post,[lines.replace('5010','INVALID')]), {code:'23503'});
  assert.deepEqual(await query('select id from public.platform_finance_entries'), []);
  const [{id}] = await query(post,[lines]);
  assert.deepEqual(await query(post,[lines]), [{id}]);
  const changedLines = lines.replaceAll('120.25','130.25');
  await assert.rejects(query(post,[changedLines]), {code:'23505'});
  await assert.rejects(query("select public.add_platform_finance_account('5021','تسويق رقمي','Digital marketing','expense')"), {code:'42501'});
  await assert.rejects(query('delete from public.platform_finance_lines'), {code:'42501'});
  const imported = `select public.import_platform_paymob_receipts(${date},${date}) as count`;
  assert.deepEqual(await query(imported),[{count:1}]);
  assert.deepEqual(await query(imported),[{count:0}]);
  await assert.rejects(query(`select public.approve_platform_bank_transfer('${transfer}')`), {code:'42501'});
  await runAs(auditor);
  assert.equal((await query('select * from public.platform_finance_entries')).length,2);
  await assert.rejects(query(post,[lines]), {code:'42501'});
  await assert.rejects(query(`select public.reverse_platform_finance_entry('${id}','correction')`), {code:'42501'});
  await runAs(admin);
  assert.deepEqual(await query(role), [{role:null}]);
  await assert.rejects(query(`update public.bank_transfer_requests set status='approved',reviewed_by='${admin}',reviewed_at=now() where id='${transfer}'`), {code:'42501'});
  await assert.rejects(query(`select public.approve_platform_bank_transfer('${invalid}')`), {code:'22023'});
  assert.equal((await query(`select status from public.bank_transfer_requests where id='${invalid}'`))[0].status,'pending');
  const approve = `select public.approve_platform_bank_transfer('${transfer}') as id`;
  const [approved] = await query(approve);
  assert.deepEqual(await query(approve),[approved]);
  await sql('reset role');
  assert.equal((await query("select * from public.subscriptions where status='active'")).length,1);
  assert.equal((await query("select * from public.payment_transactions where payment_method='bank_transfer'")).length,1);
  await runAs(owner);
  const reverse = `select public.reverse_platform_finance_entry('${id}','correction') as id`;
  const [reversal] = await query(reverse);
  assert.deepEqual(await query(reverse),[reversal]);
  const balances = await query(`select * from public.platform_finance_trial_balance(${date},${date},'EGP')`);
  assert.equal(balances.reduce((sum,row)=>sum+Number(row.debit)-Number(row.credit),0),0);
  const opening = await query(`select * from public.platform_finance_trial_balance(${date} + 1,${date} + 1,'EGP')`);
  assert.equal(Number(opening.find(row=>row.account_code==='4010').opening),-900);
  assert.equal(opening.reduce((sum,row)=>sum+Number(row.opening),0),0);
  await query("select public.add_platform_finance_account('5021','تسويق رقمي','Digital marketing','expense')");
  assert.equal((await query("select code from public.platform_finance_accounts where code='5021'")).length,1);
  await query("select public.set_platform_finance_staff('auditor@example.test',null)");
  await runAs(auditor);
  assert.deepEqual(await query('select * from public.platform_finance_entries'),[]);
  await sql('reset role');
  assert.equal((await query('select * from platform_finance_private.access_log')).length,3);
  console.log('PASS ledger permissions, access revocation, balance validation, immutable entries, duplicate prevention, Paymob import, and atomic bank transfer approval');
} catch (error) {
  console.error(error.message, error.code ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
