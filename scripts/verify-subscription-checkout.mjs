import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const database = new PGlite();
const migration = (name) => readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const row = async (sql, parameters = []) => (await database.query(sql, parameters)).rows[0];

try {
  await database.exec(`
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION public.is_platform_admin(user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT user_id = '00000000-0000-4000-8000-000000000003' $$;
    CREATE TABLE public.organization_members (
      organization_id uuid, user_id uuid, role text, is_active boolean
    );
    CREATE TABLE public.subscription_plans (id uuid PRIMARY KEY, price_monthly int, price_yearly int);
    CREATE TABLE public.subscriptions (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL,
      status text NOT NULL, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz, grace_period_days int, payment_method text, payment_reference text
    );
    CREATE TABLE public.payment_checkout_sessions (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL, billing_cycle text NOT NULL,
      status text NOT NULL DEFAULT 'pending', expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
      merchant_order_id text NOT NULL UNIQUE, paymob_order_id text UNIQUE, provider_transaction_id text,
      amount_cents bigint NOT NULL, currency text NOT NULL, updated_at timestamptz
    );
    CREATE TABLE public.payment_transactions (
      checkout_session_id uuid, organization_id uuid, plan_id uuid, billing_cycle text, paymob_order_id text,
      paymob_transaction_id text, amount_cents bigint, expected_amount_cents bigint, currency text,
      status text, hmac_valid boolean, subscription_activated_at timestamptz, error_message text,
      raw_payload jsonb, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await database.exec(await migration('20261119230811_subscription_terms_and_checkout_status'));
  await database.exec(await migration('20261119231213_preserve_paymob_intention_retries'));
  await database.exec(`
    CREATE TRIGGER trg_enrich_paymob_transaction BEFORE INSERT ON public.payment_transactions
      FOR EACH ROW EXECUTE FUNCTION public._enrich_paymob_transaction();
  `);

  const owner = '00000000-0000-4000-8000-000000000001';
  const viewer = '00000000-0000-4000-8000-000000000002';
  const admin = '00000000-0000-4000-8000-000000000003';
  const otherOwner = '00000000-0000-4000-8000-000000000004';
  const org = '00000000-0000-4000-8000-000000000005';
  const otherOrg = '00000000-0000-4000-8000-000000000006';
  const plan = '00000000-0000-4000-8000-000000000007';
  const subscription = '00000000-0000-4000-8000-000000000008';
  const oldSubscription = '00000000-0000-4000-8000-000000000009';
  const checkout = '00000000-0000-4000-8000-000000000010';
  const staleCheckout = '00000000-0000-4000-8000-000000000011';
  const role = async (databaseRole, userId) => {
    await database.exec(`RESET ROLE; SET ROLE ${databaseRole};`);
    await database.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
  };
  const status = async (checkoutId = checkout) => (await row(
    'SELECT * FROM public.get_subscription_checkout_status($1)', [checkoutId],
  ))?.status;

  await database.query(`INSERT INTO public.organization_members VALUES
    ($1, $2, 'owner', TRUE), ($1, $3, 'viewer', TRUE), ($4, $5, 'owner', TRUE)`,
  [org, owner, viewer, otherOrg, otherOwner]);
  await database.query('INSERT INTO public.subscription_plans VALUES ($1, 100, 1000)', [plan]);
  await database.query(`
    INSERT INTO public.subscriptions
      (id, organization_id, plan_id, status, expires_at, created_at, grace_period_days)
    VALUES ($1, $2, $3, 'active', now() + interval '10 days', now(), 2),
      ($4, $2, $3, 'expired', now() - interval '30 days', now() - interval '60 days', 2)
  `, [subscription, org, plan, oldSubscription]);
  const oldTerm = await row('SELECT expires_at FROM public.subscriptions WHERE id = $1', [subscription]);

  await role('authenticated', viewer);
  await assert.rejects(database.query('SELECT public.schedule_subscription_cancellation($1, $2)', [org, subscription]),
    { code: '42501' });
  await role('authenticated', owner);
  await assert.rejects(database.query('SELECT public.schedule_subscription_cancellation($1, $2)', [org, oldSubscription]),
    { code: '22023' });
  await assert.rejects(database.query('SELECT public.platform_extend_subscription($1, 30)', [subscription]),
    { code: '42501' });
  assert.deepEqual(await row('SELECT public.schedule_subscription_cancellation($1, $2) AS expires_at', [org, subscription]), oldTerm);
  assert.deepEqual(await row('SELECT public.schedule_subscription_cancellation($1, $2) AS expires_at', [org, subscription]), oldTerm);
  await database.exec('RESET ROLE');
  assert.deepEqual(await row(`SELECT status, expires_at, grace_period_days, cancellation_scheduled_at IS NOT NULL AS scheduled
    FROM public.subscriptions WHERE id = $1`, [subscription]),
  { status: 'active', expires_at: oldTerm.expires_at, grace_period_days: 0, scheduled: true });

  await role('authenticated', admin);
  await assert.rejects(database.query('SELECT public.platform_extend_subscription($1, 30)', [oldSubscription]),
    { code: '22023' });
  await assert.rejects(database.query('SELECT public.platform_extend_subscription($1, 0)', [subscription]),
    { code: '22023' });
  assert.equal((await row(`SELECT public.platform_extend_subscription($1, 30)
    = $2::timestamptz + interval '30 days' AS extended`, [subscription, oldTerm.expires_at])).extended, true);
  await database.exec('RESET ROLE');
  await database.query(`UPDATE public.subscriptions
    SET status = 'expired', expires_at = now() - interval '50 days' WHERE id = $1`, [subscription]);
  await role('authenticated', admin);
  assert.equal((await row(`SELECT public.platform_extend_subscription($1, 30)
    = now() + interval '30 days' AS extended`, [subscription])).extended, true);
  await database.exec('RESET ROLE');
  await database.query(`UPDATE public.subscriptions SET expires_at = now() + interval '30 days',
    payment_method = 'bank_transfer', payment_reference = 'verified-transfer' WHERE id = $1`, [subscription]);
  assert.deepEqual(await row(`SELECT cancellation_scheduled_at, grace_period_days
    FROM public.subscriptions WHERE id = $1`, [subscription]), { cancellation_scheduled_at: null, grace_period_days: 2 });

  await database.query(`INSERT INTO public.payment_checkout_sessions
    (id, organization_id, plan_id, billing_cycle, merchant_order_id, amount_cents, currency, expires_at)
    VALUES ($1, $2, $3, 'monthly', 'gateway-order', 10000, 'EGP', now() + interval '1 hour'),
    ($4, $2, $3, 'monthly', 'expired-order', 10000, 'EGP', now() - interval '1 hour')`,
  [checkout, org, plan, staleCheckout]);
  await role('anon', '');
  await assert.rejects(status(), { code: '42501' });
  await role('authenticated', otherOwner);
  assert.equal(await status(), undefined);
  await role('authenticated', viewer);
  assert.equal(await status(), undefined);
  await role('authenticated', owner);
  assert.equal(await status(), 'pending');
  assert.equal(await status(staleCheckout), 'expired');
  await assert.rejects(database.query('SELECT public.claim_paymob_checkout_intention($1)', [checkout]), { code: '42501' });

  await role('service_role', '');
  const claim = async () => (await row('SELECT public.claim_paymob_checkout_intention($1) AS claim', [checkout])).claim;
  assert.deepEqual(await claim(), { state: 'claimed' });
  assert.deepEqual(await claim(), { state: 'in_progress' });
  const saveIntention = (order, secret) =>
    database.query('SELECT public.complete_paymob_checkout_intention($1, $2, $3)', [checkout, order, secret]);
  await saveIntention('923466', 'fake-provider-client-secret');
  await saveIntention('923466', 'fake-provider-client-secret');
  assert.deepEqual(await claim(), { state: 'ready', order_id: '923466', client_secret: 'fake-provider-client-secret' });
  await assert.rejects(saveIntention('923467', 'other-secret'), { code: '22023' });
  await database.exec('RESET ROLE');
  await assert.rejects(database.query(`UPDATE public.payment_checkout_sessions SET merchant_order_id = 'replacement'
    WHERE id = $1`, [checkout]), { code: '22023' });
  await database.query(`UPDATE public.payment_checkout_sessions SET status = 'failed' WHERE id = $1`, [checkout]);
  await role('authenticated', owner);
  assert.equal(await status(), 'failed');
  await database.exec('RESET ROLE');
  const receipt = (order, transaction, currency, amount, validHmac) => database.query(`
    INSERT INTO public.payment_transactions
      (checkout_session_id, paymob_order_id, paymob_transaction_id, amount_cents, currency, status, hmac_valid)
    VALUES ($1, $2, $3, $4, $5, 'success', $6)`, [checkout, order, transaction, amount, currency, validHmac]);
  await receipt('923466', 'tampered', 'EGP', 10000, false);
  await receipt('923466', 'wrong-currency', 'USD', 10000, true);
  await receipt('923466', 'wrong-amount', 'EGP', 100, true);
  await receipt('923467', 'wrong-order', 'EGP', 10000, true);
  await role('authenticated', owner);
  assert.equal(await status(), 'failed');
  await database.exec('RESET ROLE');
  await receipt('923466', 'verified', 'EGP', 10000, true);
  await role('authenticated', owner);
  assert.equal(await status(), 'activating');
  await database.exec('RESET ROLE');
  await database.query(`UPDATE public.payment_transactions SET subscription_activated_at = now() WHERE paymob_transaction_id = 'verified'`);
  await database.query(`UPDATE public.payment_checkout_sessions SET status = 'paid', provider_transaction_id = 'verified' WHERE id = $1`, [checkout]);
  await role('authenticated', owner);
  assert.equal(await status(), 'confirmed');
  assert.equal((await row('SELECT transaction_id FROM public.get_subscription_checkout_status($1)', [checkout])).transaction_id, 'verified');
  await database.exec('RESET ROLE');
  await database.query(`UPDATE public.payment_checkout_sessions SET status = 'refunded' WHERE id = $1`, [checkout]);
  await role('authenticated', owner);
  assert.equal(await status(), 'refunded');
  console.log('Subscription extension, cancellation, provider retry, and checkout status checks passed.');
} finally {
  await database.close();
}
