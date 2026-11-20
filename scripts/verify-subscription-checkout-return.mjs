import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  getSubscriptionCheckoutReferences,
  rememberSubscriptionCheckout,
} from '../src/lib/subscriptionCheckoutReturn.ts';

const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const [org, otherOrg, user, colleague, outsider, viewer, plan, paidCheckout, testCheckout,
  pendingCheckout, failedCheckout, mismatchedCheckout, expiredCheckout] = Array.from({ length: 13 }, (_, i) => id(i + 1));
const store = new Map();
globalThis.sessionStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
};
const parse = (query, actor = user, organization = org) =>
  getSubscriptionCheckoutReferences(new URLSearchParams(query), actor, organization);
assert.equal(parse('success=true&amount_cents=20000'), null, 'provider redirect flags alone never identify a payment');
assert.equal(parse('order=123&order_id=124'), null, 'conflicting identifiers are rejected');
assert.equal(parse('id=not-a-transaction'), null);
assert.equal(parse('id=501&id=502'), null);
assert.equal(parse('checkout_id=invalid'), null);
assert.deepEqual(parse('order=101&id=501&success=false&amount_cents=100'), {
  _checkout_id: undefined, _order_id: '101', _transaction_id: '501',
});
rememberSubscriptionCheckout(user, org, paidCheckout, '101');
assert.deepEqual(parse('success=true'), { _checkout_id: paidCheckout, _order_id: '101' });
assert.equal(parse('success=true', colleague), null, 'same browser is not enough for a different user');
assert.equal(parse('success=true', user, otherOrg), null, 'same browser is not enough for a different organization');
assert.deepEqual(parse('order=103'), { _checkout_id: undefined, _order_id: '103', _transaction_id: undefined });

const db = new PGlite();
const migration = await readFile(new URL('../supabase/migrations/20261120112207_confirm_subscription_checkout_return.sql', import.meta.url), 'utf8');

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.organization_members (
      organization_id uuid, user_id uuid, role text, is_active boolean
    );
    CREATE TABLE public.payment_checkout_sessions (
      id uuid PRIMARY KEY, organization_id uuid, created_by uuid, plan_id uuid,
      paymob_order_id text UNIQUE, provider_transaction_id text, billing_cycle text,
      currency text, amount_cents bigint, status text, expires_at timestamptz
    );
    CREATE TABLE public.payment_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), checkout_session_id uuid,
      organization_id uuid, plan_id uuid, paymob_order_id text, paymob_transaction_id text UNIQUE,
      billing_cycle text, currency text, amount_cents bigint, expected_amount_cents bigint,
      hmac_valid boolean, status text, subscription_activated_at timestamptz,
      created_at timestamptz DEFAULT now(), raw_payload jsonb
    );
    CREATE TABLE public.subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, plan_id uuid,
      paymob_transaction_id text, status text, expires_at timestamptz, created_at timestamptz DEFAULT now()
    );
    INSERT INTO public.organization_members VALUES
      ('${org}','${user}','owner',true),
      ('${otherOrg}','${user}','manager',true),
      ('${org}','${colleague}','manager',true),
      ('${otherOrg}','${outsider}','owner',true),
      ('${org}','${viewer}','viewer',true);
    INSERT INTO public.payment_checkout_sessions VALUES
      ('${paidCheckout}','${org}','${user}','${plan}','101','501','monthly','EGP',20000,'paid',now()+interval '10 min'),
      ('${testCheckout}','${org}','${user}','${plan}','102','502','monthly','EGP',20000,'paid',now()+interval '10 min'),
      ('${pendingCheckout}','${org}','${user}','${plan}','103','503','monthly','EGP',20000,'pending',now()+interval '10 min'),
      ('${failedCheckout}','${org}','${user}','${plan}','104','504','monthly','EGP',20000,'failed',now()+interval '10 min'),
      ('${mismatchedCheckout}','${org}','${user}','${plan}','105','505','monthly','EGP',20000,'paid',now()+interval '10 min'),
      ('${expiredCheckout}','${org}','${user}','${plan}','106',NULL,'monthly','EGP',20000,'pending',now()-interval '10 min');
    INSERT INTO public.payment_transactions
      (checkout_session_id,organization_id,plan_id,paymob_order_id,paymob_transaction_id,billing_cycle,currency,
        amount_cents,expected_amount_cents,hmac_valid,status,subscription_activated_at,raw_payload)
    VALUES
      ('${paidCheckout}','${org}','${plan}','101','501','monthly','EGP',20000,20000,true,'success',now(),'{"obj":{"is_live":true}}'),
      ('${testCheckout}','${org}','${plan}','102','502','monthly','EGP',20000,20000,true,'success',now(),'{"obj":{"is_live":false}}'),
      ('${pendingCheckout}','${org}','${plan}','103','503','monthly','EGP',20000,20000,true,'success',NULL,'{"obj":{"is_live":true}}'),
      ('${failedCheckout}','${org}','${plan}','104','504','monthly','EGP',20000,20000,true,'failed',NULL,'{}'),
      ('${mismatchedCheckout}','${org}','${plan}','105','505','monthly','EGP',20001,20000,true,'success',now(),'{}'),
      ('${paidCheckout}','${org}','${plan}','101','506','monthly','EGP',20000,20000,false,'success',now(),'{}');
    INSERT INTO public.subscriptions (organization_id,plan_id,paymob_transaction_id,status,expires_at)
    VALUES ('${org}','${plan}','501','active',now()+interval '30 days');
  `);
  await db.exec(migration);
  const result = async ({ actor = user, organization = org, checkout = null, order = null, transaction = null } = {}) => {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [actor]);
    const { rows: [row] } = await db.query('SELECT public.get_subscription_checkout_return($1, $2, $3, $4) AS result', [
      organization, checkout, order, transaction,
    ]);
    return row.result;
  };
  await db.exec('SET ROLE anon');
  await assert.rejects(() => result({ checkout: paidCheckout }), /permission denied/);
  await db.exec('SET ROLE authenticated');

  const verified = { state: 'activated', amount_cents: 20000, transaction_id: '501', is_test: false };
  assert.equal(await result(), null);
  assert.equal(await result({ actor: '', checkout: paidCheckout }), null);
  assert.equal(await result({ actor: colleague, checkout: paidCheckout }), null, 'same organization different checkout owner');
  assert.equal(await result({ actor: outsider, checkout: paidCheckout }), null);
  assert.equal(await result({ actor: viewer, checkout: paidCheckout }), null);
  assert.equal(await result({ organization: otherOrg, checkout: paidCheckout }), null, 'member of both organizations');
  assert.equal(await result({ checkout: paidCheckout, order: '102' }), null, 'checkout and order must agree');
  assert.equal(await result({ order: 'x' }), null);
  assert.equal(await result({ transaction: '506' }), null, 'unsigned transaction');
  assert.deepEqual(await result({ checkout: paidCheckout, transaction: '502' }), { state: 'pending' }, 'another transaction cannot prove this checkout');
  assert.deepEqual(await result({ checkout: paidCheckout, order: '101' }), verified, 'new browser checkout');
  assert.deepEqual(await result({ order: '101', transaction: '501' }), verified, 'legacy provider order and transaction');
  assert.deepEqual(await result({ transaction: '501' }), verified, 'legacy transaction only');
  assert.deepEqual(await result({ order: '102' }), { state: 'paid', amount_cents: 20000, transaction_id: '502', is_test: true },
    'prior test activation cannot imply currently active subscription');
  assert.deepEqual(await result({ order: '103', transaction: '503' }), { state: 'pending' }, 'verified provider payment awaiting activation');
  assert.deepEqual(await result({ order: '104' }), { state: 'failed' });
  assert.deepEqual(await result({ order: '105' }), { state: 'pending' }, 'wrong amount even when session claims paid');
  assert.deepEqual(await result({ order: '106' }), { state: 'expired' });
  console.log('Checkout return verified spoofed flags, authorized scopes, old identifiers, signed pending and terminal states, and live/test activation markers.');
} finally {
  await db.close();
}
