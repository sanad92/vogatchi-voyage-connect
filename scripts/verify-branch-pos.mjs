import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const dir = new URL('../supabase/migrations/', import.meta.url);
const migration = name => readFileSync(new URL(readdirSync(dir).find(file => file.includes(name)), dir), 'utf8');
const uuid = n => `'00000000-0000-4000-8000-${String(n).padStart(12,'0')}'`;
const [org, other, a, b, foreignBranch, owner, cashier, outsider, cash, bank, foreignBank, center, quote, booking, invoice, terminal, cashReceipt, bankReceipt, transfer, revenue, expense, journal, legacy] =
  Array.from({ length: 23 }, (_, i) => uuid(i+1));
const value = async sql => Object.values((await db.query(sql)).rows[0] ?? {})[0];
const asUser = user => db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub',${user},false);`);
const date = "(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date";
const collect = (request, account, amount, method, reference = 'NULL') =>
  `SELECT pos_collect(${org},${request},${terminal},${invoice},${account},${amount},'${method}',1,${reference})`;

try {
  await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE organizations(id uuid PRIMARY KEY);
CREATE TABLE branches(id uuid PRIMARY KEY,organization_id uuid NOT NULL,name text,is_active boolean DEFAULT true);
CREATE TABLE cost_centers(id uuid PRIMARY KEY,organization_id uuid NOT NULL);
CREATE TABLE organization_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,user_id uuid,branch_id uuid,role text,is_active boolean DEFAULT true);
CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text);
CREATE TABLE quotes(id uuid PRIMARY KEY,organization_id uuid,quote_number text,creation_request_id uuid,creation_request_hash text,currency text);
CREATE TABLE bookings(id uuid PRIMARY KEY,organization_id uuid,quote_id uuid,booking_number text,customer_id uuid,
  selling_price numeric,currency text,is_demo boolean DEFAULT false,created_at timestamptz DEFAULT now(),status text DEFAULT 'confirmed');
CREATE TABLE invoices(id uuid PRIMARY KEY,organization_id uuid,quote_id uuid,booking_id uuid,customer_id uuid,invoice_number text,customer_name text,
  final_amount numeric,total_paid_amount numeric DEFAULT 0,remaining_amount numeric GENERATED ALWAYS AS (final_amount-total_paid_amount) STORED,
  currency text,status text DEFAULT 'sent',issued_date date DEFAULT current_date,created_at timestamptz DEFAULT now(),is_demo boolean DEFAULT false,pilgrimage_b2b_agreement_id uuid);
CREATE TABLE bank_accounts(id uuid PRIMARY KEY,organization_id uuid,sales_unused text,account_name text,currency text,
  treasury_kind text,current_balance numeric,is_active boolean DEFAULT true,updated_at timestamptz);
CREATE TABLE customer_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,booking_id uuid,customer_id uuid,invoice_id uuid,
  treasury_account_id uuid,amount numeric,currency text,exchange_rate numeric,amount_base numeric,payment_method text,
  reference_number text,payment_date date,notes text,status text,client_ref text,created_by uuid);
CREATE TABLE customer_payment_allocations(organization_id uuid,payment_id uuid,invoice_id uuid,amount numeric,amount_base numeric);
CREATE TABLE bank_account_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bank_account_id uuid,transaction_type text,amount numeric,
  description text,transaction_date date,reference_number text,related_invoice_id uuid,organization_id uuid,created_by uuid,
  source_type text,source_id uuid,currency text);
CREATE TABLE finance_transactions(organization_id uuid,booking_id uuid,reference_type text,reference_id uuid,account_code text,
  party_type text,party_id uuid,direction text,amount numeric,currency text,exchange_rate numeric,amount_base numeric,memo text,created_by uuid);
CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,entry_number text,entry_date date,reference_type text,
  reference_id uuid,description text,total_debit numeric,total_credit numeric,status text,created_by uuid,currency text,
  source_type text,source_id uuid,posted_at timestamptz,is_locked boolean,auto_generated boolean,booking_id uuid);
CREATE TABLE journal_entry_lines(journal_entry_id uuid,account_id uuid,debit numeric,credit numeric,description text,line_order int,cost_center_id uuid);
CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY,organization_id uuid,account_type text);
CREATE TABLE expense_transactions(id uuid PRIMARY KEY,organization_id uuid,bank_account_id uuid);
CREATE TABLE whatsapp_conversations(id uuid PRIMARY KEY,organization_id uuid,whatsapp_settings_id uuid);
CREATE TABLE whatsapp_settings(id uuid PRIMARY KEY,organization_id uuid);
CREATE TABLE refund_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,booking_id uuid,customer_id uuid,
  invoice_id uuid,source_payment_id uuid,amount numeric,currency text,exchange_rate numeric,amount_base numeric,
  advance_component numeric,sales_return_component numeric,reason text,requested_by uuid,status text);
CREATE TABLE booking_timeline_events(organization_id uuid,booking_id uuid,kind text,actor_id uuid,summary text,payload jsonb);
CREATE FUNCTION get_user_org_role(uuid,uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM public.organization_members WHERE user_id=$1 AND organization_id=$2 AND is_active $$;
CREATE FUNCTION can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT public.get_user_org_role(auth.uid(),$1) IS NOT NULL $$;
CREATE FUNCTION can_process_org_payments(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT public.can_org_write($1) $$;
CREATE FUNCTION has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT public.can_org_write($1) $$;
CREATE FUNCTION _require_route_code(uuid,text) RETURNS text LANGUAGE sql AS $$ SELECT $2 $$;
CREATE FUNCTION get_org_account_route(uuid,text) RETURNS uuid LANGUAGE sql AS $$ SELECT CASE WHEN $2='cash' THEN ${expense}::uuid ELSE ${revenue}::uuid END $$;
CREATE FUNCTION _next_entry_number(uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'QA'::text $$;
CREATE FUNCTION create_quote_atomic(_org uuid,_request_id uuid,_payload jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE q public.quotes;
BEGIN
  INSERT INTO public.quotes(id,organization_id,quote_number,currency,creation_request_id,creation_request_hash)
  VALUES (_request_id,_org,'Q','EGP',_request_id,md5(_payload::text)) RETURNING * INTO q;
  RETURN to_jsonb(q);
END; $$;
INSERT INTO organizations VALUES (${org}),(${other});
INSERT INTO branches VALUES (${a},${org},'القاهرة',true),(${b},${org},'الجيزة',true),(${foreignBranch},${other},'خارجي',true);
INSERT INTO cost_centers VALUES (${center},${org});
INSERT INTO organization_members(organization_id,user_id,branch_id,role) VALUES
  (${org},${owner},NULL,'owner'),(${org},${cashier},${a},'manager'),(${other},${outsider},${foreignBranch},'owner');
INSERT INTO profiles VALUES (${cashier},'موظف القاهرة');
INSERT INTO bank_accounts(id,organization_id,account_name,currency,treasury_kind,current_balance) VALUES
  (${cash},${org},'خزينة القاهرة','EGP','cash',100),(${bank},${org},'البنك المركزي','EGP','bank',0),
  (${foreignBank},${other},'بنك آخر','EGP','bank',0);
INSERT INTO invoices(id,organization_id,invoice_number,final_amount,currency) VALUES (${legacy},${org},'قديم',200,'EGP');
INSERT INTO chart_of_accounts VALUES (${revenue},${org},'revenue'),(${expense},${org},'expense');
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
`);
  await db.exec(migration('aeb40c1c').split('CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()')[1]
    .split('EXECUTE FUNCTION public.update_bank_balance_on_transaction();')[0]
    .replace(/^/, 'CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()') + 'EXECUTE FUNCTION public.update_bank_balance_on_transaction();');
  await db.exec(migration('3951a969').split('CREATE OR REPLACE FUNCTION public.record_supplier_payment')[0]);
  const refundMigration = migration('_refund_workflow_hardening');
  await db.exec(refundMigration.slice(refundMigration.indexOf('CREATE OR REPLACE FUNCTION public.create_refund_request('),
    refundMigration.indexOf('CREATE OR REPLACE FUNCTION public.approve_refund_request(')));
  await db.exec(migration('_branch_sales_pos.sql'));

  await asUser(owner);
  await db.exec(`UPDATE branches SET pos_cost_center_id=${center} WHERE id=${a};
    UPDATE bank_accounts SET sales_branch_id=${a} WHERE id=${cash};
    SELECT pos_save_terminal(${org},NULL,${a},${cash},'الاستقبال',true);`);
  const terminalId = await value('SELECT id FROM pos_terminals');
  const actualTerminal = `'${terminalId}'`;
  await assert.rejects(db.exec(`UPDATE bank_accounts SET sales_branch_id=${foreignBranch} WHERE id=${bank}`), /نفس المؤسسة/);

  await asUser(cashier);
  await db.exec(`SELECT create_quote_atomic(${org},${quote},'{}');
    INSERT INTO bookings(id,organization_id,quote_id,booking_number,selling_price,currency)
    VALUES (${booking},${org},${quote},'BK-1',10000,'EGP');
    INSERT INTO invoices(id,organization_id,booking_id,invoice_number,customer_name,final_amount,currency)
    VALUES (${invoice},${org},${booking},'INV-1','عميل',10000,'EGP');`);
  assert.equal(await value(`SELECT sales_branch_id FROM invoices WHERE id=${invoice}`), a.slice(1,-1));
  const charge = (...args) => collect(...args).replace(terminal, actualTerminal);
  await assert.rejects(db.exec(charge(cashReceipt,cash,3000,'cash')), /وردية مفتوحة/);
  const shift = `'${await value(`SELECT pos_open_shift(${org},${actualTerminal},100)`)}'`;
  await assert.rejects(db.exec(`SELECT pos_open_shift(${org},${actualTerminal},100)`), { code:'23505' });
  await assert.rejects(db.exec(charge(bankReceipt,foreignBank,1,'bank_transfer',"'REF'")), /الخزينة غير مناسبة/);
  await assert.rejects(db.exec(charge(bankReceipt,bank,10001,'bank_transfer',"'REF'")), /المبلغ أكبر/);

  assert.equal(await value(charge(cashReceipt,cash,3000,'cash')), cashReceipt.slice(1,-1));
  assert.equal(await value(charge(cashReceipt,cash,3000,'cash')), cashReceipt.slice(1,-1));
  await assert.rejects(db.exec(charge(cashReceipt,cash,2000,'cash')), /عملية مختلفة/);
  assert.equal(await value(charge(bankReceipt,bank,7000,'bank_transfer',"'BANK-1'")), bankReceipt.slice(1,-1));
  assert.equal(Number(await value(`SELECT total_paid_amount FROM invoices WHERE id=${invoice}`)), 10000);
  assert.equal(Number(await value(`SELECT current_balance FROM bank_accounts WHERE id=${cash}`)), 3100);
  assert.equal(Number(await value(`SELECT current_balance FROM bank_accounts WHERE id=${bank}`)), 7000);
  assert.equal(Number(await value('SELECT count(*) FROM customer_payments')), 2);
  assert.equal(Number(await value('SELECT count(*) FROM bank_account_transactions')), 2);
  assert.equal(Number(await value("SELECT count(*) FROM bank_account_transactions WHERE source_type='customer_payment' AND source_id IS NOT NULL")), 2);
  await assert.rejects(db.exec(`UPDATE bank_account_transactions SET amount=2999 WHERE bank_account_id=${cash}`), /لا تتغير/);
  assert.equal(await value(`SELECT account_code FROM finance_transactions WHERE party_id=${cash} AND direction='debit'`), 'cash');
  await assert.rejects(db.exec(`SELECT pos_close_shift(${org},${shift},3095,NULL)`), /ملاحظة/);
  await db.exec(`SELECT pos_close_shift(${org},${shift},3095,'فرق في العد');`);
  assert.equal(Number(await value(`SELECT expected_cash FROM pos_shifts WHERE id=${shift}`)), 3100);
  assert.equal(Number(await value(`SELECT counted_cash FROM pos_shifts WHERE id=${shift}`)), 3095);
  await db.exec(`INSERT INTO invoices(id,organization_id,booking_id,invoice_number,customer_name,final_amount,currency,issued_date)
    VALUES (${uuid(25)},${org},${booking},'INV-LATER','عميل',100,'EGP',current_date+1);`);
  await db.exec(`SELECT pos_request_refund(${org},${cashReceipt},500,'استرداد جزئي')`);
  assert.equal(await value('SELECT source_payment_id FROM refund_requests'), await value(`SELECT payment_id FROM pos_receipts WHERE id=${cashReceipt}`));
  assert.equal(await value('SELECT invoice_id FROM refund_requests'), invoice.slice(1,-1));
  await assert.rejects(db.exec(`UPDATE customer_payments SET amount=2999 WHERE id=(SELECT payment_id FROM pos_receipts WHERE id=${cashReceipt})`), /استخدم الاسترداد/);

  await asUser(owner);
  await db.exec(`SELECT pos_review_shift(${org},${shift},'تمت المراجعة');
    SELECT pos_transfer_cash(${org},${transfer},${cash},${bank},1000,'TR-1');
    SELECT pos_transfer_cash(${org},${transfer},${cash},${bank},1000,'TR-1');`);
  assert.equal(Number(await value(`SELECT current_balance FROM bank_accounts WHERE id=${cash}`)), 2100);
  assert.equal(Number(await value(`SELECT current_balance FROM bank_accounts WHERE id=${bank}`)), 8000);
  assert.equal(Number(await value(`SELECT sum(debit-credit) FROM journal_entry_lines`)), 0);
  await assert.rejects(db.exec(`DELETE FROM bank_account_transactions WHERE source_id=${transfer}`), /لا تُحذف/);
  await db.exec(`INSERT INTO journal_entries(id,organization_id,entry_date,status,currency,source_type,source_id)
    VALUES (${journal},${org},${date},'posted','EGP','invoice',${invoice});
    INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit,credit) VALUES
    (${journal},${revenue},0,10000),(${journal},${expense},3000,0);`);
  assert.equal(Number(await value(`SELECT profit FROM pos_profit_report(${org},${date},${date})`)), 7000);
  assert.equal(Number(await value(`SELECT sales FROM pos_sales_report(${org},${date},${date}) WHERE branch_id=${a}`)), 10000);
  assert.equal(Number(await value(`SELECT sum(collected) FROM pos_collection_report(${org},${date},${date})`)), 10000);
  await db.exec(`SELECT pos_set_document_branch(${org},${legacy},${a})`);
  const memberId = await value(`SELECT id FROM organization_members WHERE user_id=${cashier}`);
  await db.exec(`SELECT pos_set_member_branch(${org},'${memberId}',${b})`);
  assert.equal(await value(`SELECT sales_branch_id FROM invoices WHERE id=${invoice}`), a.slice(1,-1));
  await asUser(cashier);
  assert.equal(Number(await value(`SELECT count(*) FROM pos_find_invoices(${org},'INV-1')`)), 0);
  assert.equal(Number(await value('SELECT count(*) FROM pos_receipts')), 0);
  await asUser(outsider);
  assert.equal(Number(await value(`SELECT count(*) FROM pos_collection_report(${org},${date},${date})`)), 0);
  await assert.rejects(db.exec(charge(cashReceipt,cash,3000,'cash')), { code:'42501' });
  console.log('Branch POS: attribution, tenant scope, split collections, retry, closing, refund link, transfer and reports passed.');
} catch (error) {
  console.error(error.message, error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
