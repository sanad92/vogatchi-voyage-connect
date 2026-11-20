import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = (file) => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
const db = await PGlite.create();
const id = (n) => `90000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, manager, viewer, journey, legacy, unsupported, failing, first, step, exit, failStep] =
  Array.from({ length: 12 }, (_, index) => id(index + 1));
const [existing, added, demo, archived, outsider, undone, retryCustomer] = [20, 21, 22, 23, 24, 25, 26].map(id);
const asUser = async (user = manager) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec('SET ROLE authenticated');
};
const asOwner = () => db.exec('RESET ROLE');
const toggle = (journeyId, enabled = true, organization = org) => db.query(
  'SELECT public.set_marketing_journey_active($1, $2, $3)', [journeyId, organization, enabled],
);
const insertCustomer = (customerId, organization = org, isDemo = false, isArchived = false) => db.query(
  'INSERT INTO public.customers (id, organization_id, is_demo, archived_at) VALUES ($1, $2, $3, CASE WHEN $4 THEN now() END) ON CONFLICT DO NOTHING',
  [customerId, organization, isDemo, isArchived],
);
const advance = () => db.exec("UPDATE public.journey_enrollments SET next_run_at = now() - interval '1 second'");
const process = async () => {
  await db.exec('SET ROLE service_role');
  try {
    return (await db.query('SELECT public.process_journey_enrollments(50) AS processed')).rows[0].processed;
  } finally {
    await asOwner();
  }
};
const rows = async (sql, params) => (await db.query(sql, params)).rows;

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA operations_private;
    GRANT USAGE ON SCHEMA auth, operations_private TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT _user IN ('${manager}', '${viewer}') AND _org = '${org}' $$;
    CREATE FUNCTION public.has_org_permission(_org uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT public.user_belongs_to_org(auth.uid(),_org) AND
        (_permission = 'marketing_view' OR (auth.uid() = '${manager}' AND _permission = 'marketing_edit')) $$;
    CREATE FUNCTION public._org_permission_state(_org uuid, _user uuid, _permission text)
      RETURNS TABLE(granted boolean, data_scope text)
      LANGUAGE sql STABLE AS
      $$ SELECT public.has_org_permission(_org, _permission) AND _user = auth.uid(), 'organization'::text $$;
    CREATE TABLE public.organizations(id uuid PRIMARY KEY, subscribed boolean NOT NULL DEFAULT true);
    INSERT INTO public.organizations (id) VALUES ('${org}'), ('${otherOrg}');
    CREATE FUNCTION public.org_has_active_subscription(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      $$ SELECT subscribed FROM public.organizations WHERE id = _org $$;
    CREATE FUNCTION public.can_org_write(_org uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT public.user_belongs_to_org(auth.uid(), _org) AND public.org_has_active_subscription(_org) $$;
    CREATE TABLE public.customers (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, is_demo boolean NOT NULL DEFAULT false, archived_at timestamptz
    );
    CREATE TABLE public.customer_follow_ups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, customer_id uuid, follow_up_type text,
      scheduled_date date, status text, priority text, notes text,
      CHECK (notes <> 'Injected failure')
    );
    GRANT ALL ON public.organizations, public.customers, public.customer_follow_ups TO service_role;
    CREATE SCHEMA cron;
    CREATE TABLE cron.jobs(name text PRIMARY KEY, schedule text, command text);
    CREATE VIEW cron.job AS SELECT name AS jobname, current_user AS username FROM cron.jobs;
    CREATE FUNCTION cron.schedule(text, text, text) RETURNS void LANGUAGE sql AS
      $$ INSERT INTO cron.jobs VALUES ($1, $2, $3) $$;
  `);
  const original = migration('20260726131313_2f4a549b-153c-4943-8ebb-f2a12f02f6b0.sql');
  await db.exec(original.split('-- Seed 9 global journey templates')[0]);
  await db.exec(migration('20261119231108_save_marketing_journey_draft_atomically.sql'));

  await insertCustomer(existing);
  await db.exec(`
    INSERT INTO public.marketing_journeys (id, organization_id, name, trigger_event, is_active) VALUES
      ('${journey}', '${org}', 'Internal', 'customer.created', false),
      ('${legacy}', '${org}', 'Legacy', 'customer.created', true),
      ('${unsupported}', '${org}', 'External', 'customer.created', false),
      ('${failing}', '${org}', 'Failure fixture', 'customer.created', false);
    INSERT INTO public.journey_steps (id, journey_id, step_order, step_type, delay_minutes) VALUES
      ('${first}', '${journey}', 0, 'wait', 10), ('${exit}', '${journey}', 2, 'exit', 0);
    INSERT INTO public.journey_steps (journey_id, step_order, step_type) VALUES
      ('${legacy}', 0, 'send_whatsapp'), ('${unsupported}', 0, 'send_email');
    INSERT INTO public.journey_enrollments (journey_id, organization_id, customer_id)
      VALUES ('${legacy}', '${org}', '${existing}');
  `);
  await db.exec(migration('20261119234830_activate_internal_marketing_journeys.sql'));
  await db.exec(migration('20261119231108_save_marketing_journey_draft_atomically.sql'));
  await db.exec(migration('20261119234830_activate_internal_marketing_journeys.sql'));
  assert.deepEqual(await rows('SELECT * FROM cron.jobs'), [{
    name: 'dispatch-marketing-journey-steps', schedule: '* * * * *',
    command: 'SELECT public.process_journey_enrollments(50);',
  }]);

  await asUser(viewer);
  await assert.rejects(toggle(journey), { code: '42501' });
  await assert.rejects(db.query('SELECT public.process_journey_enrollments(1)'), { code: '42501' });
  await asOwner();
  await asUser();
  await assert.rejects(toggle(journey, true, otherOrg), { code: '42501' });
  await assert.rejects(toggle(unsupported), { code: '22023' });
  await assert.rejects(db.query('UPDATE public.marketing_journeys SET is_active = true WHERE id = $1', [journey]), { code: '42501' });
  await assert.rejects(db.query('INSERT INTO public.journey_enrollments (journey_id, organization_id) VALUES ($1, $2)', [journey, org]), { code: '42501' });
  // Use the existing draft RPC so the column grants and runtime guard exercise the real save path.
  await db.query("SELECT public.save_marketing_journey_draft($1, 'Internal', '', 'custom', 'customer.created', NULL, $2)", [journey, JSON.stringify([
    { id: first, step_type: 'wait', config: {}, delay_minutes: 10 },
    { step_type: 'create_follow_up', config: { notes: 'Review this lead' }, delay_minutes: 5 },
    { id: exit, step_type: 'exit', config: {}, delay_minutes: 0 },
  ])]);
  await toggle(journey);
  await assert.rejects(db.query("UPDATE public.journey_steps SET config = '{\"notes\":\"bad\"}' WHERE id=$1", [first]), { code: '55000' });
  await asOwner();

  await db.exec('BEGIN');
  await insertCustomer(undone);
  assert.equal((await rows('SELECT id FROM public.journey_enrollments WHERE customer_id = $1', [undone])).length, 1);
  await db.exec('ROLLBACK');
  assert.equal((await rows('SELECT id FROM public.journey_enrollments WHERE customer_id = $1', [undone])).length, 0);

  await insertCustomer(added);
  await insertCustomer(added);
  await insertCustomer(demo, org, true);
  await insertCustomer(archived, org, false, true);
  await insertCustomer(outsider, otherOrg);
  assert.deepEqual(await rows('SELECT customer_id FROM public.journey_enrollments WHERE runtime_managed'), [{ customer_id: added }]);
  assert.equal(await process(), 0);
  await advance();
  assert.equal(await process(), 1);
  assert.equal(await process(), 0);
  await advance();

  await asUser();
  await toggle(journey, false);
  await asOwner();
  assert.equal(await process(), 0);
  await asUser();
  await toggle(journey);
  await asOwner();
  await db.query('UPDATE public.organizations SET subscribed = false WHERE id = $1', [org]);
  assert.equal(await process(), 0);
  await db.query('UPDATE public.organizations SET subscribed = true WHERE id = $1', [org]);
  assert.equal(await process(), 1);
  assert.equal(await process(), 1);
  assert.equal(await process(), 0);
  assert.deepEqual(await rows('SELECT customer_id, organization_id, follow_up_type, notes FROM public.customer_follow_ups'), [{
    customer_id: added, organization_id: org, follow_up_type: 'manual_contact', notes: 'Review this lead',
  }]);
  assert.deepEqual((await rows('SELECT status, runtime_managed FROM public.journey_enrollments ORDER BY runtime_managed')), [
    { status: 'active', runtime_managed: false }, { status: 'completed', runtime_managed: true },
  ]);

  await asUser();
  assert.deepEqual(await rows('SELECT * FROM public.get_marketing_journey_runtime_counts($1, $2)', [journey, org]), [
    { total: 1, active: 0, completed: 1, exited: 0, failed: 0, retrying: 0 },
  ]);
  assert.deepEqual(await rows('SELECT * FROM public.get_marketing_journey_runtime_counts($1, $2)', [journey, otherOrg]), []);
  await toggle(journey, false);
  await db.query("INSERT INTO public.journey_steps (id, journey_id, step_type, config) VALUES ($1, $2, 'create_follow_up', '{\"notes\":\"Injected failure\"}')", [failStep, failing]);
  await toggle(failing);
  await asOwner();
  await insertCustomer(retryCustomer);
  for (const attempt of [1, 2, 3]) {
    assert.equal(await process(), 1);
    assert.equal(await process(), 0);
    const state = await rows('SELECT step_attempts, status FROM public.journey_enrollments WHERE customer_id = $1', [retryCustomer]);
    assert.deepEqual(state, [{ step_attempts: attempt, status: attempt === 3 ? 'failed' : 'active' }]);
    await advance();
  }
  assert.equal((await rows('SELECT id FROM public.customer_follow_ups')).length, 1);
  const failures = await rows("SELECT status, error FROM public.journey_step_runs WHERE step_id = $1", [failStep]);
  assert.deepEqual(failures, Array.from({ length: 3 }, () => ({ status: 'failed', error: '23514' })));
  console.log('Marketing journey fixtures passed: enrollment rollback, tenant and role checks, runtime allowlist, wait, pause/resume, subscription, durable follow-up, and retry cap.');
} catch (error) {
  console.error(error.message, error.where ?? '', error.query ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
