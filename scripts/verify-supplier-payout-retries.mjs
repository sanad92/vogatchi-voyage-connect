import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../supabase/migrations/20261119231740_make_supplier_payout_retries_idempotent.sql', import.meta.url), 'utf8');
const db = new PGlite();
const org = '10000000-0000-0000-0000-000000000001';
const order = '20000000-0000-0000-0000-000000000001';
const otherOrg = '10000000-0000-0000-0000-000000000002';
const otherOrder = '20000000-0000-0000-0000-000000000002';
const firstRequest = '30000000-0000-0000-0000-000000000001';
const secondRequest = '30000000-0000-0000-0000-000000000002';
const account = '40000000-0000-0000-0000-000000000001';

const payout = (amount, request, paymentOrder = order) => db.query(`
  SELECT public.record_supplier_payout($1, $2, $3, 'EGP', 1, 'bank_transfer', $4, '2026-11-01', NULL, NULL) AS payment
`, [paymentOrder, request, amount, account]);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE TABLE public.supplier_payment_orders (id uuid PRIMARY KEY, organization_id uuid, outstanding numeric);
    CREATE TABLE public.supplier_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, amount numeric);
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
    INSERT INTO public.supplier_payment_orders VALUES ('${order}', '${org}', 100), ('${otherOrder}', '${otherOrg}', 100);
  `);
  await db.exec(migration);
  await db.exec(migration);
  await db.exec('SET ROLE anon');
  await assert.rejects(() => payout(60, firstRequest), { code: '42501' });
  await db.exec('SET ROLE authenticated');
  await assert.rejects(() => payout(60, firstRequest, otherOrder), { code: '42501' });

  const first = (await payout(60, firstRequest)).rows[0].payment;
  assert.equal((await payout(60, firstRequest)).rows[0].payment, first);
  await assert.rejects(() => payout(61, firstRequest), /request ID is already in use/);

  const second = (await payout(40, secondRequest)).rows[0].payment;
  assert.notEqual(first, second);
  assert.equal((await payout(40, secondRequest)).rows[0].payment, second);

  await db.exec('RESET ROLE');
  const result = await db.query(`
    SELECT count(*) AS payments, sum(amount) AS paid FROM public.supplier_payments
  `);
  assert.deepEqual(result.rows, [{ payments: 2, paid: '100' }]);
  console.log('Supplier payout retries keep one posting per request and reject changes to the original payload.');
} finally {
  await db.close();
}
