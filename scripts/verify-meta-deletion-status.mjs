import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const code = 'af388210-c1c0-49da-82fe-9d4da9921d38';
const scopedCode = 'cfae6247-5781-43ba-9b33-d75434f9edd1';
const otherEventCode = 'e5315ddf-6987-40c8-bf8e-1f24719d99a4';
const absent = '9df34fe7-37e9-4347-abd6-ff9eb85001cd';
const migration = await readFile(new URL('../supabase/migrations/20261119232210_expose_verified_meta_deletion_request_status.sql', import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE public.whatsapp_connection_events (organization_id uuid, event_type text, payload jsonb);
    ALTER TABLE public.whatsapp_connection_events ENABLE ROW LEVEL SECURITY;
    CREATE TABLE public.whatsapp_settings (meta_user_id text, is_active boolean);
    INSERT INTO public.whatsapp_settings VALUES ('provider-user',true);
    INSERT INTO public.whatsapp_connection_events VALUES
      (NULL,'meta_data_deletion_request', '{"confirmation_code":"${code}","meta_user_id":"provider-user"}'),
      (gen_random_uuid(),'meta_data_deletion_request','{"confirmation_code":"${scopedCode}"}'),
      (NULL,'unrelated','{"confirmation_code":"${otherEventCode}"}');`);
  await db.exec(migration);
  await db.exec(migration);
  const status = async id => (await db.query('SELECT public.verify_meta_deletion_confirmation($1) AS verified', [id])).rows[0].verified;
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    assert.equal(await status(code), true);
    for (const invalid of [scopedCode, otherEventCode, absent, null]) assert.equal(await status(invalid), false);
    await assert.rejects(db.query('SELECT payload FROM public.whatsapp_connection_events'), { code: '42501' });
    await db.exec('RESET ROLE');
  }
  const unchanged = await db.query(`SELECT is_active,
    to_regprocedure('public.record_meta_deletion_request(text,uuid)') AS writer
    FROM public.whatsapp_settings`);
  assert.deepEqual(unchanged.rows, [{ is_active: true, writer: null }]);
  console.log('Meta deletion verifies only matching platform receipts and exposes no payload or inbox mutation.');
} finally {
  await db.close();
}
