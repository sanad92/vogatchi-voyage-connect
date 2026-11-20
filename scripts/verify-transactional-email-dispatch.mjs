import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { sendTransactionalEmail } from '../supabase/functions/_shared/transactional-email-dispatch.ts';
import { processClaimedEmail } from '../supabase/functions/_shared/transactional-email-worker.ts';

const migration = readFileSync(new URL('../supabase/migrations/20261119234806_restore_approved_transactional_email_dispatch.sql', import.meta.url), 'utf8');
const initial = readFileSync(new URL('../supabase/migrations/20260226011154_58dc4db6-9d97-4515-8814-65635f9bbab6.sql', import.meta.url), 'utf8');
const org = '11d11722-a0dc-4d17-9771-02c33b9aa921';
const customer = '11d11722-a0dc-4d17-9771-02c33b9aa922';
const db = new PGlite();

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA cron;
    CREATE TABLE cron.job (jobid bigint GENERATED ALWAYS AS IDENTITY, jobname text, command text, active boolean DEFAULT true);
    CREATE FUNCTION cron.schedule(name text, frequency text, command text) RETURNS bigint LANGUAGE sql
      AS $$ INSERT INTO cron.job(jobname, command) VALUES ($1, $3) RETURNING jobid $$;
    CREATE FUNCTION cron.unschedule(id bigint) RETURNS void LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid=$1 $$;
    CREATE FUNCTION cron.alter_job(id bigint, active boolean) RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET active=$2 WHERE jobid=$1 $$;
    INSERT INTO cron.job(jobname, command) VALUES ('process-email-queue-every-minute', 'previous-worker');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql RETURN NULL::uuid;
    CREATE FUNCTION public.get_user_org_ids(uuid) RETURNS uuid[] LANGUAGE sql RETURN ARRAY[]::uuid[];
    CREATE TABLE public.organizations (id uuid PRIMARY KEY);
    CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid, created_by uuid, is_demo boolean, archived_at timestamptz, email text, name text);
    INSERT INTO public.organizations VALUES ('${org}');
  ` + initial.split('-- Enable pg_cron')[0] + `
    GRANT INSERT ON public.email_queue TO authenticated;
    INSERT INTO public.email_queue (email_type, recipient_email, subject)
      VALUES ('welcome', 'legacy@example.invalid', 'Untyped record');
  `);
  await db.exec(migration);
  const jobs = (await db.query("SELECT active, command FROM cron.job WHERE jobname = 'process-email-queue-every-minute'")).rows;
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].active, false);
  assert.match(jobs[0].command, /email_queue_project_url/);
  assert.doesNotMatch(jobs[0].command, /previous-worker/);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(db.query('SELECT public.claim_transactional_emails()'), { code: '42501' });
  await assert.rejects(db.query('INSERT INTO public.email_queue(email_type,recipient_email,subject) VALUES ($1,$2,$3)', ['welcome', 'denied@example.invalid', 'x']), { code: '42501' });
  await db.exec('RESET ROLE; SET ROLE service_role');

  const enqueue = (key, kind = 'customer_registration', type = 'customer_registered') => db.query(
    'SELECT public.enqueue_approved_transactional_email($1,$2,$3,$4,$5,$6,$7,$8) AS state',
    [org, kind, key, type, 'customer@example.invalid', 'Demo contact', 'Welcome', JSON.stringify({ customer_name: '<Customer>' })],
  );
  await assert.rejects(enqueue('wrong', 'booking_confirmation'), { code: '23514' });
  assert.equal((await enqueue(customer)).rows[0].state, 'pending');
  assert.equal((await enqueue(customer)).rows[0].state, 'pending');

  const claim = async (id = null) => (await db.query(
    'SELECT * FROM public.claim_transactional_emails($1,$2)', [6, id],
  )).rows;
  const finish = async (id, token, state, provider = null) => (await db.query(
    'SELECT public.finish_transactional_email($1,$2,$3,$4) AS updated', [id, token, state, provider],
  )).rows[0].updated;
  const [first] = await claim();
  assert.equal(first.attempts, 1);
  assert.equal(first.status, 'processing');
  assert.equal(first.dispatch_source, 'customer_registration');
  assert.equal((await claim()).length, 0, 'Fresh claims and historical rows must be excluded');
  assert.equal(await finish(first.id, customer, 'sent', 'provider-one'), false);
  assert.equal(await finish(first.id, first.dispatch_claim, 'retry'), true);
  assert.equal((await claim()).length, 0, 'Retry delay must be respected');

  await db.query("UPDATE public.email_queue SET scheduled_for=now() WHERE id=$1", [first.id]);
  const [second] = await claim(first.id);
  assert.equal(second.attempts, 2);
  assert.notEqual(second.dispatch_claim, first.dispatch_claim);
  await db.query("UPDATE public.email_queue SET dispatch_claimed_at=now()-interval '6 minutes' WHERE id=$1", [first.id]);
  const [third] = await claim(first.id);
  assert.equal(third.attempts, 3);
  assert.equal(await finish(first.id, second.dispatch_claim, 'sent', 'provider-one'), false);
  assert.equal(await finish(first.id, third.dispatch_claim, 'sent', 'provider-one'), true);
  assert.equal((await enqueue(customer)).rows[0].state, 'sent');
  assert.equal((await claim()).length, 0);
  const sent = (await db.query('SELECT status, provider_message_id FROM public.email_queue WHERE id=$1', [first.id])).rows[0];
  assert.deepEqual(sent, { status: 'sent', provider_message_id: 'provider-one' });

  const oldKey = customer + ':second';
  await enqueue(oldKey);
  const [ambiguous] = await claim();
  await db.query(
    "UPDATE public.email_queue SET dispatch_claimed_at=now()-interval '6 minutes', dispatch_started_at=now()-interval '2 hours' WHERE id=$1",
    [ambiguous.id],
  );
  assert.equal((await claim()).length, 0);
  assert.equal((await db.query('SELECT status FROM public.email_queue WHERE id=$1', [ambiguous.id])).rows[0].status, 'needs_review');

  const sentKeys = [];
  const provider = async (_url, options) => {
    sentKeys.push(options.headers['Idempotency-Key']);
    const { html, to } = JSON.parse(options.body);
    assert.deepEqual(to, ['customer@example.invalid']);
    assert.match(html, /&lt;Customer&gt;/);
    return Response.json({ id: 'provider-one' });
  };
  assert.deepEqual(await sendTransactionalEmail(first, 'inert', 'Fixture Sender', provider), { outcome: 'sent', providerId: 'provider-one' });
  assert.deepEqual(await sendTransactionalEmail(second, 'inert', 'Fixture Sender', provider), { outcome: 'sent', providerId: 'provider-one' });
  assert.deepEqual(sentKeys, [`safar-transactional-email/${first.id}`, `safar-transactional-email/${first.id}`]);
  assert.equal((await sendTransactionalEmail(first, 'inert', 'Fixture Sender', async () => new Response(null, { status: 429 }))).outcome, 'retry');
  assert.equal((await sendTransactionalEmail(first, 'inert', 'Fixture Sender', async () => new Response(null, { status: 400 }))).outcome, 'rejected');

  const lookup = { select: () => lookup, eq: () => lookup, maybeSingle: async () => ({ error: null, data: {
    status: { name: 'cancelled' }, customer: { email: first.recipient_email, organization_id: org },
  } }) };
  const admin = {
    from(table) { assert.equal(table, 'transport_bookings'); return lookup; },
    async rpc(name, args) {
      assert.equal(name, 'finish_transactional_email');
      assert.equal(args._outcome, 'rejected');
      return { data: true, error: null };
    },
  };
  assert.equal(await processClaimedEmail(admin, {
    ...first, dispatch_source: 'booking_confirmation', dispatch_key: 'transport:' + first.id,
  }, { apiKey: 'inert', sender: 'Fixture Sender' }), 'rejected');
  console.log('Verified trusted email producers, atomic claims, leases, retries, stale/cancelled exclusion, and mocked provider deduplication.');
} finally {
  await db.close();
}
