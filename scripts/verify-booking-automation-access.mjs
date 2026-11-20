import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261119231832_authorize_booking_automation_requests.sql', import.meta.url), 'utf8');
const db = new PGlite();
const id = (suffix) => `00000000-0000-0000-0000-000000000${suffix}`;
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('test.actor', true), '')::uuid;
    $$;
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, status text, workflow_stage text);
    CREATE TABLE public.booking_automation_steps (id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status text);
    CREATE TABLE public.domain_events (booking_id uuid);
    CREATE TABLE public.automation_calls (booking_id uuid);
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$
      SELECT $1 = auth.uid() AND current_setting('test.subscription', true) IS DISTINCT FROM 'paused';
    $$;
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql AS $$
      SELECT $1 = auth.uid() AND $2 = 'bookings_view';
    $$;
    CREATE FUNCTION public._org_permission_state(uuid, uuid, text) RETURNS TABLE (granted boolean, data_scope text)
    LANGUAGE sql AS $$
      SELECT $1 = $2 AND $3 = 'bookings_edit' AND current_setting('test.scope', true) <> 'none',
        current_setting('test.scope', true);
    $$;
    CREATE FUNCTION public.run_booking_automation(p_booking_id uuid) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER AS $$
      INSERT INTO public.automation_calls VALUES (p_booking_id) RETURNING booking_id;
    $$;
    CREATE FUNCTION public.retry_booking_automation_step(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT $1; $$;
    CREATE FUNCTION public.handler_run_booking_automation(public.domain_events) RETURNS void LANGUAGE sql AS $$ SELECT; $$;
    GRANT EXECUTE ON FUNCTION public.run_booking_automation(uuid), public.retry_booking_automation_step(uuid)
      TO authenticated, service_role;
    CREATE FUNCTION public.trigger_automation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
      BEGIN PERFORM public.run_booking_automation(NEW.id); RETURN NEW; END;
    $$;
    INSERT INTO public.bookings VALUES
      ('${id(101)}', '${id(201)}', 'confirmed', 'confirmed'),
      ('${id(102)}', '${id(202)}', 'confirmed', 'confirmed'),
      ('${id(103)}', '${id(201)}', 'confirmed', 'cancelled');
    INSERT INTO public.booking_automation_steps VALUES
      ('${id(301)}', '${id(101)}', '${id(201)}', 'failed'),
      ('${id(302)}', '${id(102)}', '${id(202)}', 'failed'),
      ('${id(303)}', '${id(102)}', '${id(201)}', 'failed'),
      ('${id(304)}', '${id(101)}', '${id(201)}', 'completed');
    CREATE TRIGGER automation_on_booking
      AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.trigger_automation();
    GRANT INSERT ON public.bookings TO authenticated;
  `);
  await db.exec(migration);
  await db.exec(migration);
  const run = (suffix) => db.query('SELECT public.run_authorized_booking_automation($1) AS booking_id', [id(suffix)]);
  const retry = (suffix) => db.query('SELECT public.retry_authorized_booking_automation_step($1) AS booking_id', [id(suffix)]);
  const cachedRun = (suffix) => db.query('SELECT public.run_booking_automation($1) AS booking_id', [id(suffix)]);
  const cachedRetry = (suffix) => db.query('SELECT public.retry_booking_automation_step($1) AS booking_id', [id(suffix)]);

  await db.exec(`SET ROLE authenticated; SET test.actor = '${id(201)}'; SET test.scope = 'organization';`);
  await assert.rejects(db.query('SELECT booking_automation_private.run_booking_automation($1)', [id(101)]), { code: '42501' });
  await assert.rejects(db.query('SELECT public.handler_run_booking_automation(row($1::uuid)::public.domain_events)', [id(102)]), { code: '42501' });
  for (const call of [run, cachedRun]) {
    await assert.rejects(call(102), { code: '42501' });
    await assert.rejects(call(103), { code: '22023' });
  }
  for (const call of [retry, cachedRetry]) {
    await assert.rejects(call(302), { code: '42501' });
    await assert.rejects(call(303), { code: '42501' });
    await assert.rejects(call(304), { code: '42501' });
  }
  await db.exec("SET test.scope = 'own';");
  await assert.rejects(run(101), { code: '42501' });
  await assert.rejects(cachedRun(101), { code: '42501' });
  await db.exec("SET test.scope = 'organization';");
  await db.exec("SET test.subscription = 'paused';");
  await assert.rejects(run(101), { code: '42501' });
  await assert.rejects(retry(301), { code: '42501' });
  await assert.rejects(cachedRun(101), { code: '42501' });
  await assert.rejects(cachedRetry(301), { code: '42501' });
  await db.exec("SET test.subscription = 'active';");
  assert.equal((await run(101)).rows[0].booking_id, id(101));
  assert.equal((await retry(301)).rows[0].booking_id, id(101));
  assert.equal((await cachedRun(101)).rows[0].booking_id, id(101));
  assert.equal((await cachedRetry(301)).rows[0].booking_id, id(101));

  await db.exec(`INSERT INTO public.bookings VALUES ('${id(104)}', '${id(201)}', 'confirmed', 'confirmed');`);
  await db.exec('RESET ROLE; SET ROLE service_role;');
  await db.query('SELECT public.run_booking_automation($1)', [id(102)]);
  assert.equal((await cachedRetry(302)).rows[0].booking_id, id(302));
  await db.exec('RESET ROLE; SET ROLE anon;');
  for (const call of [run, retry, cachedRun, cachedRetry]) await assert.rejects(call(101), { code: '42501' });
  await db.exec('RESET ROLE;');
  const calls = (await db.query('SELECT booking_id FROM public.automation_calls ORDER BY booking_id')).rows.map((row) => row.booking_id);
  assert.deepEqual(calls, [id(101), id(101), id(101), id(101), id(102), id(104)]);
  console.log('Booking automation access, cached RPC compatibility, tenant isolation, cancelled booking guard, and internal trigger checks passed.');
} finally {
  await db.close();
}
