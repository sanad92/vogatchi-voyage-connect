import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = new URL('../supabase/migrations/20261119232210_expose_verified_meta_deletion_request_status.sql', import.meta.url);
const recorded = '6f415b7a-9065-4821-930e-183849f92843';
const absent = '69fa8823-670a-463f-8e37-32ef87892cb7';
const confirmation = async code => (await db.query(
  'SELECT public.verify_meta_deletion_confirmation($1) AS verified', [code],
)).rows[0].verified;
const fileRequest = (metaUser, code) => db.query('SELECT public.record_meta_deletion_request($1, $2)', [metaUser, code]);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE TABLE public.whatsapp_connection_events (organization_id uuid, event_type text, payload jsonb);
    CREATE TABLE public.whatsapp_settings (
      meta_user_id text, access_token text, is_active boolean, onboarding_status text, disconnected_at timestamptz,
      CHECK (is_active OR meta_user_id <> 'aborting-user')
    );
    INSERT INTO public.whatsapp_settings VALUES
      ('first-user','fixture-token',true,'connected',NULL),
      ('other-user','other-fixture-token',true,'connected',NULL),
      ('aborting-user','last-fixture-token',true,'connected',NULL);
    GRANT SELECT, UPDATE ON public.whatsapp_settings TO service_role;
    GRANT INSERT ON public.whatsapp_connection_events TO service_role;
  `);
  await db.exec(readFileSync(migration, 'utf8'));
  await db.exec('SET ROLE anon');
  assert.equal(await confirmation(absent), false);
  await assert.rejects(fileRequest('first-user', recorded), { code: '42501' });
  await db.exec('RESET ROLE; SET ROLE service_role');
  await assert.rejects(fileRequest('aborting-user', absent), { code: '23514' });
  await fileRequest('first-user', recorded);
  await db.exec('RESET ROLE');
  const settings = (await db.query('SELECT meta_user_id, is_active, access_token IS NOT NULL AS has_token FROM public.whatsapp_settings ORDER BY meta_user_id')).rows;
  assert.deepEqual(settings, [
    { meta_user_id: 'aborting-user', is_active: true, has_token: true },
    { meta_user_id: 'first-user', is_active: false, has_token: false },
    { meta_user_id: 'other-user', is_active: true, has_token: true },
  ]);
  await db.exec('SET ROLE anon');
  assert.equal(await confirmation(recorded), true);
  assert.equal(await confirmation(absent), false);
  await assert.rejects(db.query('SELECT payload FROM public.whatsapp_connection_events'), { code: '42501' });
  console.log('Verified deletion receipt, atomic disconnect, service-role write, and private request metadata.');
} finally {
  await db.close();
}
