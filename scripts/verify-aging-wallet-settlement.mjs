import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = file => readFileSync(file, 'utf8');
const migration = file => read(`supabase/migrations/${file}.sql`);
const sqlFunction = (source, name) => {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  const end = source.indexOf('$$;', start);
  if (start < 0 || end < 0) throw new Error(`Fixture SQL function missing: ${name}`);
  return source.slice(start, end + 3);
};
const candidate = process.argv[2] ?? 'supabase/migrations/20261120171656_account_for_wallet_settlements_in_aging.sql';
const baseline = candidate === '--baseline';

await import('./prepare-refund-balances-fixture.mjs');
const setup = read('scripts/test-refund-balances.sql')
  .split('INSERT INTO public.bookings VALUES')[0]
  .replace(/^\\set.*$/m, '')
  .replace(/^\\i (.*)$/gm, (_, file) => read(file));

const db = new PGlite();
const rows = async (sql, ...params) => (await db.query(sql, params)).rows;
const asUser = async user => {
  await db.exec('SET ROLE authenticated');
  await rows("SELECT set_config('test.user_id', fixture_id($1)::text, false)", user);
};

try {
  await db.exec(setup);
  await db.exec(sqlFunction(migration('20260904143000_double_entry_core_hardening'), 'post_supplier_payment'));
  await db.exec(sqlFunction(migration('20260822140000_financial_launch_hardening'), '_trg_post_supplier_payment'));
  await db.exec(`
    CREATE TRIGGER trg_post_supplier_payment
      AFTER INSERT OR UPDATE OF status,amount,currency,payment_date,paid_date,payment_method,treasury_account_id
      ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public._trg_post_supplier_payment();
    ALTER TABLE public.customers ADD COLUMN name text;
    ALTER TABLE public.suppliers ADD COLUMN name text;
    ALTER TABLE public.invoices ADD COLUMN due_date date;
    ALTER TABLE public.customer_payment_allocations ADD COLUMN created_at timestamptz DEFAULT now();
    ALTER TABLE public.supplier_payment_allocations ADD COLUMN created_at timestamptz DEFAULT now();
    INSERT INTO public.customers (id,organization_id,name) VALUES (fixture_id(103),fixture_id(2),'Foreign customer');
    INSERT INTO public.suppliers (id,organization_id,name) VALUES (fixture_id(203),fixture_id(2),'Foreign supplier');
    INSERT INTO public.chart_of_accounts (organization_id,account_code,account_type)
    SELECT o.id, code, kind FROM public.organizations o CROSS JOIN (VALUES
      ('1000','asset'), ('1010','asset'), ('1100','asset'), ('1210','asset'), ('2000','liability'),
      ('2050','liability'), ('2100','liability'), ('4000','revenue'), ('4050','revenue'), ('5000','expense')
    ) AS routes(code,kind);
    INSERT INTO public.bank_accounts (id,organization_id,treasury_kind,currency,current_balance) VALUES
      (fixture_id(401),fixture_id(1),'cash','EGP',5000), (fixture_id(402),fixture_id(1),'bank','SAR',5000);
    INSERT INTO public.bookings VALUES
      (fixture_id(301),fixture_id(1),fixture_id(101),'EGP','hotel','AR-SOURCE'),
      (fixture_id(302),fixture_id(1),fixture_id(101),'EGP','hotel','AR-TARGET'),
      (fixture_id(303),fixture_id(1),fixture_id(101),'SAR','hotel','AP-SOURCE'),
      (fixture_id(304),fixture_id(1),fixture_id(101),'SAR','hotel','AP-TARGET'),
      (fixture_id(305),fixture_id(1),fixture_id(101),'EGP','hotel','AR-WALLET-ONLY'),
      (fixture_id(306),fixture_id(1),fixture_id(101),'SAR','hotel','AP-WALLET-ONLY'),
      (fixture_id(307),fixture_id(2),fixture_id(103),'EGP','hotel','FOREIGN'),
      (fixture_id(308),fixture_id(1),fixture_id(101),'USD','hotel','OTHER-CURRENCY');
    INSERT INTO public.invoices (id,organization_id,booking_id,customer_id,invoice_number,currency,subtotal,
      issued_date,due_date,booking_type) VALUES
      (fixture_id(501),fixture_id(1),fixture_id(301),fixture_id(101),'AR-SOURCE','EGP',500,current_date-30,current_date-15,'hotel'),
      (fixture_id(502),fixture_id(1),fixture_id(302),fixture_id(101),'AR-TARGET','EGP',1000,current_date-30,current_date-15,'hotel'),
      (fixture_id(507),fixture_id(2),fixture_id(307),fixture_id(103),'FOREIGN','EGP',999,current_date-30,current_date-15,'hotel'),
      (fixture_id(508),fixture_id(1),fixture_id(308),fixture_id(101),'OTHER-CURRENCY','USD',777,current_date-30,current_date-15,'hotel');
    INSERT INTO public.supplier_payment_orders (id,organization_id,supplier_id,booking_id,reference_number,amount,currency,
      approval_status,status,created_at,due_date) VALUES
      (fixture_id(601),fixture_id(1),fixture_id(201),fixture_id(303),'AP-SOURCE',500,'SAR','approved','approved',current_date-30,current_date-15),
      (fixture_id(602),fixture_id(1),fixture_id(201),fixture_id(304),'AP-TARGET',1000,'SAR','approved','approved',current_date-30,current_date-15);
    UPDATE public.supplier_invoices SET invoice_date=current_date-30,due_date=current_date-15;
    GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid),
      public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) TO authenticated;
    GRANT SELECT ON public.supplier_invoices TO authenticated;
    CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid) RETURNS boolean LANGUAGE sql STABLE AS $body$
      SELECT EXISTS (SELECT FROM public.organization_members WHERE organization_id=_org AND user_id=_user AND is_active)
    $body$;
  `);

  await db.exec(migration('20260905090544_wave3_receivables_payables_aging'));
  if (!baseline) await db.exec(read(candidate));

  await asUser(10);
  await db.exec(`
    SELECT public.record_customer_payment(fixture_id(501),500,'EGP',1,'cash',fixture_id(401),current_date-5);
    SELECT public.record_customer_payment(fixture_id(502),500,'EGP',1,'cash',fixture_id(401),current_date-5);
    SELECT public.record_supplier_payment(fixture_id(601),500,'SAR',1,'bank_transfer',fixture_id(402),current_date-5);
    SELECT public.record_supplier_payment(fixture_id(602),300,'SAR',1,'bank_transfer',fixture_id(402),current_date-5);
    DO $seed$ DECLARE refund_id uuid; supplier_invoice uuid; BEGIN
      refund_id := public.create_refund_request(fixture_id(301),220,'EGP',1,NULL,'QA customer credit');
      PERFORM public.approve_refund_request(refund_id,true);
      SELECT id INTO STRICT supplier_invoice FROM public.supplier_invoices WHERE payment_order_id=fixture_id(601);
      PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'create',supplier_invoice,220,'QA-SAR-CREDIT');
      PERFORM public.manage_supplier_refund_claim(fixture_id(1),fixture_id(801),'confirm');
    END $seed$;
  `);
  await db.exec('RESET ROLE');
  const [{ id: refundId }] = await rows("SELECT id FROM refund_requests WHERE booking_id=fixture_id(301)");
  const treasury = () => rows('SELECT count(*)::int AS movements, sum(amount)::int AS total FROM bank_account_transactions');
  const cash = await treasury();
  await asUser(10);
  for (let attempt = 0; attempt < 2; attempt++) {
    await rows('SELECT public.settle_refund_balance(fixture_id(1),fixture_id(701),100,_refund=>$1,_invoice=>fixture_id(502),_reference=>$2)', refundId, 'QA-AR-OFFSET');
    await rows('SELECT public.settle_refund_balance(fixture_id(1),fixture_id(702),150,_claim=>fixture_id(801),_order=>fixture_id(602),_reference=>$1)', 'QA-AP-OFFSET');
  }
  const aging = (kind, currency, cut) => rows(`SELECT invoice_number, paid_as_of::int AS paid,
    outstanding_amount::int AS remaining, is_historical_estimate AS estimate
    FROM public.get_${kind}_aging_details_v2(fixture_id(1),current_date-$1::integer,$2)
    ORDER BY invoice_number`, cut, currency);
  const control = (kind, currency, cut) => rows(`SELECT aging_total::int AS aging, control_balance::int AS control,
    difference::int AS difference FROM public.get_aging_control_totals_v2(fixture_id(1),current_date-$1::integer,$2)
    WHERE entity_type=$3`, cut, currency, kind);

  assert.deepEqual(await aging('customer', 'EGP', 1), [{ invoice_number: 'AR-TARGET', paid: 500, remaining: 500, estimate: false }]);
  const [supplierBefore] = await aging('supplier', 'SAR', 1);
  assert.equal(supplierBefore?.remaining, 700);
  assert.deepEqual(await control('customer', 'EGP', 1), [{ aging: 500, control: 500, difference: 0 }]);
  assert.deepEqual(await control('supplier', 'SAR', 1), [{ aging: 700, control: 700, difference: 0 }]);
  const [customerAfter] = await aging('customer', 'EGP', 0);
  const [supplierAfter] = await aging('supplier', 'SAR', 0);
  const [customerControl] = await control('customer', 'EGP', 0);
  const [supplierControl] = await control('supplier', 'SAR', 0);
  console.log(JSON.stringify({ baseline, customerBefore: 500, supplierBefore: 700, customerAfter, supplierAfter, customerControl, supplierControl }));

  assert.equal(customerAfter?.remaining, baseline ? 500 : 400);
  assert.equal(supplierAfter?.remaining, baseline ? 700 : 550);
  assert.deepEqual(customerControl, { aging: baseline ? 500 : 400, control: 400, difference: baseline ? 100 : 0 });
  assert.deepEqual(supplierControl, { aging: baseline ? 700 : 550, control: 550, difference: baseline ? 150 : 0 });
  assert.deepEqual(await aging('supplier', 'EGP', 0), []);
  assert.deepEqual(await aging('customer', 'USD', 0), [{ invoice_number: 'OTHER-CURRENCY', paid: 0, remaining: 777, estimate: false }]);
  await asUser(20);
  for (const tryForeignRead of [
    () => aging('customer', 'EGP', 0), () => aging('supplier', 'SAR', 0), () => control('customer', 'EGP', 0),
  ]) {
    await assert.rejects(tryForeignRead(), /Not authorized/i);
  }
  const [foreign] = await rows(`SELECT outstanding_amount::int AS remaining
    FROM public.get_customer_aging_details_v2(fixture_id(2),current_date,'EGP')`);
  assert.equal(foreign?.remaining, 999);

  await db.exec("RESET ROLE; SET test.user_id = '';");
  assert.deepEqual(await treasury(), cash);
  assert.deepEqual(await rows(`SELECT (SELECT remaining_amount::int FROM invoices WHERE id=fixture_id(502)) AS ar,
    (SELECT (amount-amount_paid)::int FROM supplier_invoices WHERE payment_order_id=fixture_id(602)) AS ap`), [{ ar: 400, ap: 550 }]);
  assert.deepEqual(await rows(`SELECT count(*)::int AS settlements, count(DISTINCT s.journal_id)::int AS journals,
    count(s.bank_transaction_id)::int AS bank_movements
    FROM refund_balance_settlements s JOIN journal_entries j ON j.id=s.journal_id
    WHERE j.status='posted' AND s.id IN (fixture_id(701),fixture_id(702))`), [{ settlements: 2, journals: 2, bank_movements: 0 }]);

  await db.exec(`
    INSERT INTO public.invoices (id,organization_id,booking_id,customer_id,invoice_number,currency,subtotal,
      issued_date,due_date,booking_type,status) VALUES
      (fixture_id(505),fixture_id(1),fixture_id(305),fixture_id(101),'AR-WALLET-ONLY','EGP',400,current_date-30,current_date-15,'hotel','sent'),
      (fixture_id(509),fixture_id(1),NULL,fixture_id(101),'AR-CANCELLED','EGP',400,current_date-30,current_date-15,'hotel','cancelled');
    INSERT INTO public.supplier_payment_orders (id,organization_id,supplier_id,booking_id,reference_number,amount,currency,
      approval_status,status,created_at,due_date) VALUES
      (fixture_id(606),fixture_id(1),fixture_id(201),fixture_id(306),'AP-WALLET-ONLY',450,'SAR','approved','approved',current_date-30,current_date-15);
    UPDATE public.supplier_invoices SET invoice_date=current_date-30,due_date=current_date-15
    WHERE payment_order_id=fixture_id(606);
    INSERT INTO public.supplier_invoices (id,organization_id,supplier_id,invoice_number,invoice_date,amount,currency,status)
    VALUES (fixture_id(609),fixture_id(1),fixture_id(201),'AP-CANCELLED',current_date-30,450,'SAR','cancelled');
  `);
  await asUser(10);
  await rows('SELECT public.settle_refund_balance(fixture_id(1),fixture_id(705),60,_refund=>$1,_invoice=>fixture_id(505),_reference=>$2)', refundId, 'QA-AR-WALLET-ONLY');
  await rows('SELECT public.settle_refund_balance(fixture_id(1),fixture_id(706),50,_claim=>fixture_id(801),_order=>fixture_id(606),_reference=>$1)', 'QA-AP-WALLET-ONLY');
  await db.exec('RESET ROLE');
  assert.deepEqual(await treasury(), cash);

  // Keep the real wallet rows' creation timestamps as today. Set the ledger's
  // dates to yesterday as a synthetic backdated import, using an isolated DB.
  await db.exec(`
    ALTER TABLE public.journal_entries DISABLE TRIGGER USER;
    UPDATE public.journal_entries SET entry_date=current_date-1
    WHERE source_type='refund_balance_settlement' AND source_id IN (fixture_id(705),fixture_id(706));
    ALTER TABLE public.journal_entries ENABLE TRIGGER USER;
  `);
  const walletOnly = async (kind, currency, cut) =>
    (await aging(kind, currency, cut)).find(row => row.invoice_number.endsWith('WALLET-ONLY'));
  await asUser(10);
  assert.equal((await walletOnly('customer', 'EGP', 2))?.remaining, 400);
  assert.equal((await walletOnly('supplier', 'SAR', 2))?.remaining, 450);
  assert.equal((await walletOnly('customer', 'EGP', 1))?.remaining, baseline ? 400 : 340);
  assert.equal((await walletOnly('supplier', 'SAR', 1))?.remaining, baseline ? 450 : 400);
  assert.equal((await walletOnly('customer', 'EGP', 1))?.estimate, baseline);
  assert.equal((await walletOnly('supplier', 'SAR', 1))?.estimate, baseline);
  assert.equal((await walletOnly('customer', 'EGP', 0))?.remaining, 340);
  assert.equal((await walletOnly('supplier', 'SAR', 0))?.remaining, 400);
  assert.ok((await aging('customer', 'EGP', 0)).every(row => !row.invoice_number.includes('CANCELLED')));
  assert.ok((await aging('supplier', 'SAR', 0)).every(row => !row.invoice_number.includes('CANCELLED')));

  await db.exec('RESET ROLE');
  await db.exec(`
    INSERT INTO public.journal_entries (id,organization_id,source_type,source_id,entry_date,status,currency,total_debit,total_credit)
    VALUES (fixture_id(711),fixture_id(1),'refund_balance_settlement',fixture_id(711),current_date,'draft','EGP',20,20),
      (fixture_id(712),fixture_id(1),'refund_balance_settlement',fixture_id(712),current_date,'void','SAR',20,20);
  `);
  await rows(`INSERT INTO public.refund_balance_settlements (id,organization_id,customer_refund_id,invoice_id,
    journal_id,amount,currency,created_by) VALUES (fixture_id(711),fixture_id(1),$1,fixture_id(502),
    fixture_id(711),20,'EGP',fixture_id(10))`, refundId);
  await db.exec(`
    INSERT INTO public.refund_balance_settlements (id,organization_id,supplier_claim_id,supplier_invoice_id,supplier_order_id,
      journal_id,amount,currency,created_by)
    SELECT fixture_id(712),fixture_id(1),fixture_id(801),id,payment_order_id,fixture_id(712),20,'SAR',fixture_id(10)
      FROM public.supplier_invoices WHERE payment_order_id=fixture_id(602);

    -- Synthetic historical imports can retain a cash allocation alias for a
    -- wallet event; there is only one actual GL movement. Do not let synthetic
    -- rows post real-style journals or refresh cached invoice totals.
    ALTER TABLE public.customer_payments DISABLE TRIGGER USER;
    ALTER TABLE public.customer_payment_allocations DISABLE TRIGGER USER;
    ALTER TABLE public.supplier_payments DISABLE TRIGGER USER;
    ALTER TABLE public.supplier_payment_allocations DISABLE TRIGGER USER;
    INSERT INTO public.customer_payments (id,organization_id,customer_id,amount,currency,exchange_rate,payment_date,status)
    VALUES (fixture_id(701),fixture_id(1),fixture_id(101),100,'EGP',1,current_date-5,'completed'),
      (fixture_id(721),fixture_id(1),fixture_id(101),30,'EGP',1,current_date-5,'pending');
    INSERT INTO public.customer_payment_allocations (organization_id,payment_id,invoice_id,amount,amount_base)
    VALUES (fixture_id(1),fixture_id(701),fixture_id(502),100,100),
      (fixture_id(1),fixture_id(721),fixture_id(502),30,30);
    INSERT INTO public.supplier_payments (id,organization_id,supplier_id,amount,currency,exchange_rate,payment_date,status)
    VALUES (fixture_id(702),fixture_id(1),fixture_id(201),150,'SAR',1,current_date-5,'paid'),
      (fixture_id(722),fixture_id(1),fixture_id(201),30,'SAR',1,current_date-5,'pending');
    INSERT INTO public.supplier_payment_allocations (organization_id,supplier_payment_id,supplier_invoice_id,
      payment_order_id,amount,amount_base)
    SELECT fixture_id(1),p.id,i.id,i.payment_order_id,p.amount,p.amount
    FROM public.supplier_invoices i CROSS JOIN public.supplier_payments p
    WHERE i.payment_order_id=fixture_id(602) AND p.id IN (fixture_id(702),fixture_id(722));
    ALTER TABLE public.customer_payments ENABLE TRIGGER USER;
    ALTER TABLE public.customer_payment_allocations ENABLE TRIGGER USER;
    ALTER TABLE public.supplier_payments ENABLE TRIGGER USER;
    ALTER TABLE public.supplier_payment_allocations ENABLE TRIGGER USER;
  `);
  await asUser(10);
  const target = async (kind, currency, cut) =>
    (await aging(kind, currency, cut)).find(row => row.invoice_number.endsWith('TARGET'))?.remaining;
  assert.equal(await target('customer', 'EGP', 1), baseline ? 370 : 500);
  assert.equal(await target('supplier', 'SAR', 1), baseline ? 520 : 700);
  assert.equal(await target('customer', 'EGP', 0), baseline ? 370 : 400);
  assert.equal(await target('supplier', 'SAR', 0), baseline ? 520 : 550);
  if (!baseline) {
    assert.deepEqual(await control('customer', 'EGP', 0), [{ aging: 740, control: 740, difference: 0 }]);
    assert.deepEqual(await control('supplier', 'SAR', 0), [{ aging: 950, control: 950, difference: 0 }]);
  }
  console.log(baseline
    ? 'Baseline reproduces missing historical wallet-only offsets and premature inclusion of pending payments and imported aliases.'
    : 'Wallet-only cutoff, cancelled invoices, draft/void journals, pending payments and imported event deduplication passed.');
} catch (error) {
  console.error(error.message, error.where || '');
  if (error.actual !== undefined) console.error({ actual: error.actual, expected: error.expected });
  process.exitCode = 1;
} finally {
  await db.close();
}
