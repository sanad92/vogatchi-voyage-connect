import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const uuid = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const [org, otherOrg, owner, otherOwner, admin, viewer, plan] = [1, 2, 3, 4, 5, 6, 7].map(uuid);

const migration = (name) =>
  readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS 'SELECT nullif(current_setting(''qa.actor'', true), '''')::uuid';
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT current_user::text';
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT $1 = ''${admin}''';
    CREATE TABLE public.organizations(id uuid PRIMARY KEY);
    CREATE TABLE public.organization_members(organization_id uuid, user_id uuid, is_active boolean, role text);
    CREATE TABLE public.subscription_plans(
      id uuid PRIMARY KEY, price_monthly numeric, price_yearly numeric, duration_days integer, is_active boolean
    );
    CREATE TABLE public.subscriptions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, plan_id uuid,
      status text, starts_at timestamptz, expires_at timestamptz, payment_method text,
      payment_reference text, paymob_transaction_id text, grace_period_days integer,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.payment_transactions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
      paymob_order_id text, paymob_transaction_id text, amount_cents bigint, currency text,
      status text, hmac_valid boolean, error_message text, raw_payload jsonb, updated_at timestamptz DEFAULT now()
    );
    INSERT INTO public.organizations VALUES ('${org}'), ('${otherOrg}');
    INSERT INTO public.organization_members VALUES ('${org}', '${owner}', true, 'owner'),
      ('${otherOrg}', '${otherOwner}', true, 'manager'), ('${org}', '${viewer}', true, 'viewer');
    INSERT INTO public.subscription_plans VALUES ('${plan}', 4990, 49900, 30, true);
  `);
  await db.exec(migration('20260822145000_subscription_payment_hardening.sql'));
  await db.exec(migration('20260822150000_paymob_legacy_bridge.sql'));
  await db.exec(migration('20261118182000_subscription_discount_codes.sql'));

  const asUser = (user) => db.exec(`SET ROLE authenticated; SET qa.actor = '${user}'`);
  const reset = () => db.exec('RESET ROLE');
  const price = async (organization, cycle = 'monthly', code = null) => (
    await db.query('SELECT public.quote_subscription_discount($1, $2, $3, $4) AS value',
      [organization, plan, cycle, code])
  ).rows[0].value;
  const prepare = async (organization, cycle = 'monthly', code = null) => (
    await db.query('SELECT public.prepare_subscription_checkout_with_discount($1, $2, $3, $4) AS value',
      [organization, plan, cycle, code])
  ).rows[0].value;

  await asUser(admin);
  await db.query(`
    INSERT INTO public.subscription_discount_codes(code, percent, duration_months, organization_id)
    VALUES ('LAUNCH25', 25, 12, $1), ('ANNUAL25', 25, 12, $2), ('SHORT10', 10, 1, null)
  `, [org, otherOrg]);
  await db.exec(`
    INSERT INTO public.subscription_discount_codes(code, percent, duration_months, expires_at)
    VALUES ('EXPIRED25', 25, 12, now() - interval '1 day');
  `);

  await asUser(viewer);
  await assert.rejects(price(org, 'monthly', 'LAUNCH25'), /صلاحية/);
  assert.deepEqual((await db.query('SELECT code FROM public.subscription_discount_codes')).rows, []);
  await assert.rejects(db.exec(`
    INSERT INTO public.subscription_discount_codes(code, percent, duration_months) VALUES ('NOACCESS', 25, 12)
  `), { code: '42501' });
  await asUser(otherOwner);
  await assert.rejects(price(org, 'monthly', 'LAUNCH25'), /صلاحية/);
  await assert.rejects(price(otherOrg, 'monthly', 'LAUNCH25'), /غير صالح/);
  await assert.rejects(price(otherOrg, 'yearly', 'SHORT10'), /لا تكفي/);
  assert.equal((await price(otherOrg, 'yearly', 'ANNUAL25')).amount_cents, 3742500);

  await asUser(owner);
  await assert.rejects(price(org, 'monthly', 'EXPIRED25'), /غير صالح/);
  const standard = await price(org);
  assert.equal(standard.amount_cents, 499000);
  assert.equal(standard.discount_code, null);
  const first = await prepare(org, 'monthly', ' launch25 ');
  assert.equal(first.original_amount_cents, 499000);
  assert.equal(first.amount_cents, 374250);
  assert.equal((await prepare(org, 'monthly', 'LAUNCH25')).checkout_session_id, first.checkout_session_id);
  await assert.rejects(prepare(org, 'yearly', 'LAUNCH25'), /قيد الانتظار/);
  assert.equal((await price(org)).discount_code, null, 'pending checkout does not start the entitlement');

  await reset();
  await db.query("UPDATE public.payment_checkout_sessions SET status = 'failed' WHERE id = $1", [first.checkout_session_id]);
  await asUser(owner);
  const retry = await prepare(org, 'monthly', 'LAUNCH25');
  assert.notEqual(retry.checkout_session_id, first.checkout_session_id);

  const pay = async (checkout, index, paidAmount = checkout.amount_cents) => {
    const orderId = String(1000 + index);
    await reset();
    await db.query('UPDATE public.payment_checkout_sessions SET paymob_order_id = $1 WHERE id = $2', [orderId, checkout.checkout_session_id]);
    await db.query(`
      INSERT INTO public.payment_transactions(paymob_order_id, paymob_transaction_id, amount_cents, currency, status, hmac_valid, checkout_session_id)
      VALUES ($1, $2, $3, 'EGP', 'success', true, $4)
    `, [orderId, String(2000 + index), paidAmount, checkout.checkout_session_id]);
  };

  await pay(retry, 1, 499000);
  assert.equal((await db.query('SELECT status FROM public.payment_transactions WHERE paymob_transaction_id = $1', ['2001'])).rows[0].status, 'invalid_checkout');
  assert.equal((await db.query('SELECT count(*)::integer AS total FROM private.subscription_discount_entitlements')).rows[0].total, 0);
  await pay(retry, 2);
  assert.equal((await db.query('SELECT status FROM public.payment_checkout_sessions WHERE id = $1', [retry.checkout_session_id])).rows[0].status, 'paid');
  assert.equal((await db.query('SELECT public.activate_subscription_from_paymob($1) AS result', ['2002'])).rows[0].result, false);
  await db.query("UPDATE public.payment_checkout_sessions SET status = 'pending' WHERE id = $1", [retry.checkout_session_id]);
  assert.equal((await db.query('SELECT status FROM public.payment_checkout_sessions WHERE id = $1', [retry.checkout_session_id])).rows[0].status, 'paid');

  await asUser(admin);
  await db.exec("UPDATE public.subscription_discount_codes SET is_active = false, percent = 10 WHERE code = 'LAUNCH25'");
  for (let cycle = 2; cycle <= 12; cycle++) {
    await asUser(owner);
    const renewal = await prepare(org);
    assert.equal(renewal.amount_cents, 374250, 'renewal retains its issued rate automatically');
    await pay(renewal, cycle + 1);
  }
  assert.equal((await db.query('SELECT months_used FROM private.subscription_discount_entitlements WHERE organization_id = $1', [org])).rows[0].months_used, 12);
  await asUser(owner);
  assert.equal((await price(org)).amount_cents, 499000);
  await assert.rejects(price(org, 'monthly', 'LAUNCH25'), /غير صالح/);

  await asUser(otherOwner);
  const yearly = await prepare(otherOrg, 'yearly', 'ANNUAL25');
  await pay(yearly, 20);
  await asUser(otherOwner);
  assert.equal((await price(otherOrg, 'yearly')).amount_cents, 4990000, 'the first annual payment uses all 12 months');
  console.log('Discount checks passed: RLS, company scope, expiration, preview amounts, pending/retry, charge verification, replay and 12-month renewals.');
} finally {
  await db.close();
}

// Exercise the checkout function with Paymob and Supabase replaced at their API boundaries.
const source = readFileSync(new URL('../supabase/functions/create-payment/index.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const prepared = {
  id: uuid(8), amount_cents: 374250, merchant_order_id: 'discounted-order',
  expires_at: new Date(Date.now() + 90_000).toISOString(), paymob_order_id: null,
};
const member = { role: 'owner' };
const records = {
  organization_members: member,
  subscription_plans: { id: plan, name: 'Pro', price_monthly: 4990, price_yearly: 49900 },
  profiles: { full_name: 'Test Owner' },
  payment_checkout_sessions: prepared,
};
const createClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
  from(table) {
    const filter = {};
    let update;
    const query = {
      select: () => query,
      gte: () => query,
      is: () => query,
      eq(column, value) { filter[column] = value; return query; },
      update(value) { update = value; return query; },
      maybeSingle() {
        if (table === 'payment_checkout_sessions') assert.equal(filter.created_by, owner);
        return { data: records[table] };
      },
      single() {
        if (update) Object.assign(records[table], update);
        return { data: records[table], error: null };
      },
    };
    return query;
  },
});
const env = {
  SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'mock-anon', SUPABASE_SERVICE_ROLE_KEY: 'mock-service',
  PAYMOB_API_KEY: 'mock-paymob', PAYMOB_INTEGRATION_ID: '100', PAYMOB_IFRAME_ID: '200',
};
const calls = [];
let handleRequest;
vm.runInNewContext(outputText, {
  Deno: { env: { get: (key) => env[key] }, serve: (handler) => { handleRequest = handler; } },
  require: (module) => module.includes('supabase-js') ? { createClient } : { rateLimit: () => ({ allowed: true }) },
  exports: {},
  fetch: async (url, options) => {
    calls.push({ url, payload: JSON.parse(options.body) });
    const result = url.endsWith('/orders') ? { id: 123 } : { token: 'mock-token' };
    return Response.json(result);
  },
  Response, crypto: globalThis.crypto, console,
});
const startCheckout = () => handleRequest(new Request('https://test.invalid', {
  method: 'POST',
  headers: { Authorization: 'Bearer mock-user', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organization_id: org, plan_id: plan, billing_cycle: 'monthly', checkout_session_id: prepared.id,
    amount_cents: 100,
  }),
}));
assert.equal((await startCheckout()).status, 200);
assert.equal((await startCheckout()).status, 200);
const orders = calls.filter(({ url }) => url.endsWith('/orders'));
const tokens = calls.filter(({ url }) => url.endsWith('/payment_keys'));
assert.equal(orders.length, 1, 'retry reuses the Paymob order for the frozen checkout');
assert.equal(orders[0].payload.amount_cents, 374250);
assert.equal(tokens.length, 2);
assert.ok(tokens.every(({ payload }) => payload.amount_cents === 374250 && payload.expiration <= 90));
console.log('Checkout forwards the frozen server amount to Paymob, ignores browser prices and reuses a pending order.');
