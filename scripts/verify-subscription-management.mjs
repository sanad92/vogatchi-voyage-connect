import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const database = new PGlite();
const id = n => `6c83fdf2-515f-4e54-966c-${String(n).padStart(12, '0')}`;
const [owner, manager, viewer, admin, foreignOwner, inactiveOwner, company, foreignCompany, paidPlan, trialPlan, currentTerm, oldTerm, trialTerm] =
  Array.from({ length: 13 }, (_, index) => id(index + 1));
const row = async (sql, args = []) => (await database.query(sql, args)).rows[0];
const cancellationSql = 'SELECT public.schedule_subscription_cancellation($1, $2) AS expiry';
const extendSql = 'SELECT public.platform_extend_subscription($1, $2) AS expiry';
const become = async (role, actor = '') => {
  await database.exec(`RESET ROLE; SET ROLE ${role}`);
  await database.query('SELECT set_config($1, $2, false)', ['request.jwt.claim.sub', actor]);
};

try {
  await database.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION public.is_platform_admin(user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT user_id = '${admin}' $$;
    CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, role text, is_active boolean);
    CREATE TABLE public.subscription_plans (id uuid PRIMARY KEY, price_monthly numeric, price_yearly numeric);
    CREATE TABLE public.subscriptions (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, plan_id uuid NOT NULL,
      status text NOT NULL, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz, grace_period_days int, payment_method text, payment_reference text
    );
    INSERT INTO public.organization_members VALUES
      ('${company}','${owner}','owner',true), ('${company}','${manager}','manager',true),
      ('${company}','${viewer}','viewer',true), ('${company}','${inactiveOwner}','owner',false),
      ('${foreignCompany}','${foreignOwner}','owner',true);
    INSERT INTO public.subscription_plans VALUES ('${paidPlan}',0,1200), ('${trialPlan}',0,0);
    INSERT INTO public.subscriptions
      (id, organization_id, plan_id, status, expires_at, created_at, grace_period_days, payment_method, payment_reference)
    VALUES ('${currentTerm}','${company}','${paidPlan}','active',now()+interval '10 days',now(),2,'paymob','existing-reference'),
      ('${oldTerm}','${company}','${paidPlan}','expired',now()-interval '4 days',now()-interval '20 days',2,NULL,NULL),
      ('${trialTerm}','${foreignCompany}','${trialPlan}','active',now()+interval '10 days',now(),2,NULL,NULL);
  `);
  const migration = await readFile(new URL('../supabase/migrations/20261120020358_manage_subscription_terms.sql', import.meta.url), 'utf8');
  await database.exec(migration);
  await database.exec(migration);
  const original = await row('SELECT expires_at AS expiry FROM public.subscriptions WHERE id=$1', [currentTerm]);

  await become('anon');
  await assert.rejects(() => row(cancellationSql, [company, currentTerm]), { code: '42501' });
  await assert.rejects(() => row(extendSql, [currentTerm, 30]), { code: '42501' });

  for (const actor of [viewer, foreignOwner, inactiveOwner]) {
    await become('authenticated', actor);
    await assert.rejects(() => row(cancellationSql, [company, currentTerm]), { code: '42501' });
  }
  await assert.rejects(async () => {
    await become('authenticated', foreignOwner);
    await row(cancellationSql, [foreignCompany, trialTerm]);
  }, { code: '22023' });

  await become('authenticated', manager);
  await assert.rejects(() => row(cancellationSql, [company, oldTerm]), { code: '22023' });
  assert.deepEqual(await row(cancellationSql, [company, currentTerm]), original);
  await become('authenticated', owner);
  assert.deepEqual(await row(cancellationSql, [company, currentTerm]), original);
  await assert.rejects(() => row(extendSql, [currentTerm, 30]), { code: '42501' });

  await database.exec('RESET ROLE');
  assert.deepEqual(await row(`SELECT status, expires_at AS expiry, grace_period_days,
    cancellation_scheduled_at IS NOT NULL AS scheduled FROM public.subscriptions WHERE id=$1`, [currentTerm]), {
    status: 'active', expiry: original.expiry, grace_period_days: 0, scheduled: true,
  });

  await become('authenticated', admin);
  await assert.rejects(() => row(extendSql, [oldTerm, 30]), { code: '22023' });
  await assert.rejects(() => row(extendSql, [currentTerm, 0]), { code: '22023' });
  const extended = await row(extendSql, [currentTerm, 30]);
  assert.equal(extended.expiry.getTime() - original.expiry.getTime(), 30 * 24 * 60 * 60 * 1000);

  await database.exec('RESET ROLE');
  assert.equal((await row('SELECT cancellation_scheduled_at IS NOT NULL AS scheduled FROM public.subscriptions WHERE id=$1', [currentTerm])).scheduled, true);
  await database.query('UPDATE public.subscriptions SET payment_reference = $2 WHERE id=$1', [currentTerm, 'existing-reference']);
  assert.equal((await row('SELECT cancellation_scheduled_at IS NOT NULL AS scheduled FROM public.subscriptions WHERE id=$1', [currentTerm])).scheduled, true);
  await database.query('UPDATE public.subscriptions SET payment_reference = $2 WHERE id=$1', [currentTerm, 'verified-renewal']);
  assert.deepEqual(await row('SELECT cancellation_scheduled_at, grace_period_days FROM public.subscriptions WHERE id=$1', [currentTerm]), {
    cancellation_scheduled_at: null, grace_period_days: 2,
  });
  console.log('Subscription terms passed role isolation, paid expiry, current-term extension and renewal compatibility without checkout tables.');
} finally {
  await database.close();
}
