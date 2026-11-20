import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = new URL('../supabase/migrations/20261119232210_expose_verified_meta_deletion_request_status.sql', import.meta.url);
const reviewMigration = new URL('../supabase/migrations/20261119234820_process_meta_deletion_requests.sql', import.meta.url);
const ownerId = '51e76ea9-392e-47b9-8bda-f3869b462197';
const adminId = '59760da9-84d8-4c07-a2f1-4e8fbe8335cb';
const tenantId = '2fa65241-c3b5-43fa-aceb-02a62282ec19';
const recorded = '6f415b7a-9065-4821-930e-183849f92843';
const absent = '69fa8823-670a-463f-8e37-32ef87892cb7';
const confirmation = async code => (await db.query(
  'SELECT public.verify_meta_deletion_confirmation($1) AS verified', [code],
)).rows[0].verified;
const receive = async (metaUser, code, fingerprint) => (await db.query(
  'SELECT public.receive_meta_deletion_request($1, $2, $3) AS receipt', [metaUser, code, fingerprint],
)).rows[0].receipt;
const status = async code => (await db.query(
  'SELECT public.get_meta_deletion_request_status($1) AS status', [code],
)).rows[0].status;
const setReview = (id, expected, next, reference = null) => db.query(
  'SELECT public.set_meta_deletion_review($1, $2, $3, $4)', [id, expected, next, reference],
);
const reveal = async id => (await db.query('SELECT public.get_meta_deletion_subject($1) AS subject', [id])).rows[0].subject;
const list = () => db.query('SELECT * FROM public.list_meta_deletion_reviews()');
const login = id => db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'platform_owner');
    CREATE TABLE public.platform_roles (user_id uuid PRIMARY KEY, role public.platform_role);
    CREATE FUNCTION public.has_platform_role(actor uuid, expected public.platform_role)
    RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
      SELECT EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = actor AND role = expected)
    $$;
    INSERT INTO public.platform_roles VALUES ('${ownerId}', 'platform_owner'), ('${adminId}', 'platform_admin');
    CREATE TABLE public.whatsapp_connection_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
      organization_id uuid, event_type text, payload jsonb
    );
    CREATE TABLE public.whatsapp_settings (
      meta_user_id text, access_token text, is_active boolean, onboarding_status text, disconnected_at timestamptz,
      CHECK (is_active OR meta_user_id <> 'aborting-user')
    );
    INSERT INTO public.whatsapp_settings VALUES
      ('first-user','fixture-token',true,'connected',NULL),
      ('other-user','other-fixture-token',true,'connected',NULL),
      ('aborting-user','last-fixture-token',true,'connected',NULL);
    GRANT SELECT, UPDATE ON public.whatsapp_settings TO service_role;
    GRANT INSERT, SELECT ON public.whatsapp_connection_events TO service_role;
  `);
  await db.exec(readFileSync(migration, 'utf8'));
  await db.exec('SET ROLE anon');
  assert.equal(await confirmation(absent), false);
  await db.exec('RESET ROLE');
  const legacyWriter = await db.query(`SELECT to_regprocedure('public.record_meta_deletion_request(text,uuid)') AS writer`);
  assert.equal(legacyWriter.rows[0].writer, null);
  // The currently deployed provider callback directly records a legacy receipt.
  await db.exec('SET ROLE service_role');
  await db.query(`INSERT INTO public.whatsapp_connection_events (organization_id, event_type, payload)
    VALUES (NULL, 'meta_data_deletion_request', jsonb_build_object('meta_user_id', 'first-user', 'confirmation_code', $1::text))`, [recorded]);
  await db.exec('RESET ROLE');
  const settings = (await db.query('SELECT meta_user_id, is_active, access_token IS NOT NULL AS has_token FROM public.whatsapp_settings ORDER BY meta_user_id')).rows;
  assert.deepEqual(settings, [
    { meta_user_id: 'aborting-user', is_active: true, has_token: true },
    { meta_user_id: 'first-user', is_active: true, has_token: true },
    { meta_user_id: 'other-user', is_active: true, has_token: true },
  ]);
  await db.exec('SET ROLE anon');
  assert.equal(await confirmation(recorded), true);
  assert.equal(await confirmation(absent), false);
  await assert.rejects(db.query('SELECT payload FROM public.whatsapp_connection_events'), { code: '42501' });
  await db.exec('RESET ROLE');
  await db.exec(readFileSync(reviewMigration, 'utf8'));
  const newCode = '083b67a8-6275-49d0-8b25-0b27595f896c';
  const fingerprint = 'a'.repeat(64);

  await db.exec('SET ROLE service_role');
  // This setting was previously deliberately configured to reject disconnection.
  assert.equal(await receive('aborting-user', newCode, fingerprint), newCode);
  assert.equal(await receive('aborting-user', absent, fingerprint), newCode);
  await assert.rejects(receive('aborting-user', absent, 'invalid'), { code: '22023' });
  await assert.rejects(list(), { code: '42501' });
  await db.exec('RESET ROLE');

  const unaffected = await db.query("SELECT is_active, access_token FROM public.whatsapp_settings WHERE meta_user_id='aborting-user'");
  assert.deepEqual(unaffected.rows, [{ is_active: true, access_token: 'last-fixture-token' }]);
  const matched = await db.query("SELECT id FROM public.whatsapp_connection_events WHERE payload->>'request_fingerprint' = $1", [fingerprint]);
  assert.equal(matched.rows.length, 1);
  const requestId = matched.rows[0].id;

  await db.exec('SET ROLE anon');
  assert.equal(await status(recorded), 'received');
  assert.equal(await status(newCode.replaceAll('-', '')), 'received');
  assert.equal(await status(absent), null);
  await assert.rejects(list(), { code: '42501' });
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await login(adminId);
  await assert.rejects(list(), { code: '42501' });
  await login(tenantId);
  await assert.rejects(list(), { code: '42501' });
  await login(ownerId);
  const queue = await list();
  assert.equal(queue.rows.length, 2);
  assert.deepEqual(Object.keys(queue.rows[0]), ['request_id', 'received_at', 'review_status', 'updated_at']);
  assert.equal(queue.rows.find(row => row.request_id === requestId)?.review_status, 'received');
  const codeSearch = await db.query('SELECT request_id FROM public.list_meta_deletion_reviews(NULL, 0, $1)', [newCode.replaceAll('-', '')]);
  assert.deepEqual(codeSearch.rows, [{ request_id: requestId }]);
  await assert.rejects(db.query('SELECT * FROM meta_deletion_private.reviews'), { code: '42501' });
  await assert.rejects(reveal(requestId), { code: '22023' });
  await assert.rejects(setReview(requestId, 'received', 'completed', 'CASE-42'), { code: '22023' });

  await login(tenantId);
  await assert.rejects(setReview(requestId, 'received', 'in_review'), { code: '42501' });
  await login(ownerId);
  await setReview(requestId, 'received', 'in_review');
  await assert.rejects(setReview(requestId, 'received', 'in_review'), { code: '40001' });
  assert.equal(await reveal(requestId), 'aborting-user');
  await setReview(requestId, 'in_review', 'verification_required');
  assert.equal(await status(newCode), 'verification_required');
  await assert.rejects(reveal(requestId), { code: '22023' });
  await setReview(requestId, 'verification_required', 'in_review');
  await assert.rejects(setReview(requestId, 'in_review', 'completed'), { code: '22023' });
  await setReview(requestId, 'in_review', 'completed', 'CASE-42');
  await assert.rejects(setReview(requestId, 'completed', 'in_review'), { code: '22023' });
  await assert.rejects(reveal(requestId), { code: '22023' });

  const activity = await db.query('SELECT * FROM public.get_meta_deletion_review_activity($1)', [requestId]);
  assert.deepEqual(activity.rows.map(row => row.action), [
    'completed', 'in_review', 'verification_required', 'subject_viewed', 'in_review',
  ]);
  assert.ok(activity.rows.every(row => row.actor_id === ownerId));
  assert.equal(activity.rows[0].case_reference, 'CASE-42');

  await db.exec('RESET ROLE');
  const payload = (await db.query('SELECT payload FROM public.whatsapp_connection_events WHERE id = $1', [requestId])).rows[0].payload;
  assert.deepEqual(payload, { confirmation_code: newCode, request_fingerprint: fingerprint });
  await db.exec('SET ROLE anon');
  assert.equal(await status(newCode), 'completed');
  await db.exec('RESET ROLE; SET ROLE service_role');

  let handler;
  const secret = 'locally-simulated-app-secret';
  const edgeSource = readFileSync(new URL('../supabase/functions/whatsapp-data-deletion/index.ts', import.meta.url), 'utf8');
  const edgeCode = ts.transpileModule(edgeSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  runInNewContext(edgeCode, {
    exports: {}, Response, URL, TextEncoder, TextDecoder, crypto: webcrypto, atob, console,
    Deno: { env: { get: key => ({ META_APP_SECRET: secret, SITE_URL: 'https://test.example' }[key]) } },
    require: name => name.includes('/http/server.ts') ? { serve: fn => { handler = fn; } }
      : { createClient: () => ({ rpc: async (rpc, params) => {
        assert.equal(rpc, 'receive_meta_deletion_request');
        return { data: await receive(params._meta_user_id, params._confirmation_code, params._request_fingerprint) };
      } }) },
  });
  const edgeCall = signed => handler(new Request('https://edge.example/callback', {
    method: 'POST', body: new URLSearchParams({ signed_request: signed }),
  }));
  const sign = value => {
    const data = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', secret).update(data).digest('base64url');
    return `${signature}.${data}`;
  };
  const signed = sign({ algorithm: 'HMAC-SHA256', user_id: '12345678901234567' });
  const callbackResponse = await edgeCall(signed);
  assert.equal(callbackResponse.status, 200);
  const receipt = await callbackResponse.json();
  assert.match(receipt.confirmation_code, /^[0-9a-f]{32}$/);
  assert.equal(receipt.url, `https://test.example/data-deletion?code=${receipt.confirmation_code}`);
  assert.deepEqual(await (await edgeCall(signed)).json(), receipt);
  assert.equal((await edgeCall(sign({ algorithm: 'invalid', user_id: '123' }))).status, 400);
  assert.equal((await edgeCall(signed.slice(1))).status, 400);
  await db.exec('RESET ROLE; SET ROLE anon');
  assert.equal(await status(receipt.confirmation_code), 'received');
  console.log('Verified legacy receipts, private owner workflow, scoped identifier redaction, signed retry and live status contract.');
} finally {
  await db.close();
}
