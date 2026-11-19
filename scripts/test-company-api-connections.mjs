import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const orgA = '00000000-0000-4000-8000-000000000001';
const orgB = '00000000-0000-4000-8000-000000000002';
const adminA = '00000000-0000-4000-8000-000000000003';
const adminB = '00000000-0000-4000-8000-000000000004';
const viewer = '00000000-0000-4000-8000-000000000005';
const fixture = JSON.stringify({ userId: 'fixture', password: 'fixture-secret' });
const query = async (sql, params) => (await db.query(sql, params)).rows;
const write = async (org, actor, revision, credentials = null) => (await query(
  "select public.company_api_connection_write($1, 'sabre', $2, $3, 'preproduction', $4) as changed",
  [org, actor, revision, credentials],
))[0].changed;

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema vault;
    create table auth.users (id uuid primary key);
    create table public.organizations (id uuid primary key, is_active boolean);
    create table public.organization_members (organization_id uuid, user_id uuid, role text, is_active boolean);
    create table public.admin_audit_log (organization_id uuid, user_id uuid, action text, target_table text, details jsonb);
    create function public._org_permission_state(org uuid, actor uuid, perm text)
    returns table(granted boolean) language sql as $$ select perm = 'admin_settings' and exists (
      select 1 from public.organization_members where organization_id = org and user_id = actor
        and is_active and role in ('owner', 'admin')
    ) $$;

    -- Vault double for SQL access/transaction tests. The hosted extension handles encryption.
    create table vault.secrets (id uuid primary key default gen_random_uuid(), secret text);
    create view vault.decrypted_secrets as select id, secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(value text) returns uuid language sql as $$
      insert into vault.secrets (secret) values (value) returning id
    $$;
    create function vault.update_secret(secret_id uuid, value text) returns void language sql as $$
      update vault.secrets set secret = value where id = secret_id
    $$;
    insert into public.organizations values ('${orgA}', true), ('${orgB}', true);
    insert into auth.users values ('${adminA}'), ('${adminB}'), ('${viewer}');
    insert into public.organization_members values
      ('${orgA}', '${adminA}', 'owner', true),
      ('${orgB}', '${adminB}', 'admin', true),
      ('${orgA}', '${viewer}', 'viewer', true);
  `);
  const migration = readFileSync('supabase/migrations/20261114001838_company_api_integrations.sql', 'utf8');
  await db.exec(migration);

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(query("select public.company_api_connection_read($1, 'sabre')", [orgA]), { code: '42501' });
    await assert.rejects(query('select public.company_api_connections_list($1)', [orgA]), { code: '42501' });
    await assert.rejects(write(orgA, adminA, null, fixture), { code: '42501' });
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await assert.rejects(write(orgA, viewer, null, fixture), { code: '42501' });
  await assert.rejects(write(orgB, adminA, null, fixture), { code: '42501' });
  assert.equal(await write(orgA, adminA, null, fixture), true);
  assert.equal(await write(orgA, adminA, null, fixture), false);
  assert.equal(await write(orgB, adminB, null, fixture), true);
  const [connection] = await query('select * from public.company_api_connections_list($1)', [orgA]);
  assert.equal(connection.provider, 'sabre');
  assert.equal(JSON.stringify(connection).includes('fixture-secret'), false);
  assert.equal(await write(orgA, adminA, connection.revision, fixture.replace('fixture-secret', 'rotated')), true);
  assert.equal(await write(orgA, adminA, connection.revision), false);
  const [readA] = await query("select * from public.company_api_connection_read($1, 'sabre')", [orgA]);
  const [readB] = await query("select * from public.company_api_connection_read($1, 'sabre')", [orgB]);
  assert.equal(readA.credentials.password, 'rotated');
  assert.equal(readB.credentials.password, 'fixture-secret');
  const [latest] = await query('select * from public.company_api_connections_list($1)', [orgA]);
  assert.equal(await write(orgA, adminA, latest.revision), true);
  assert.deepEqual(await query("select * from public.company_api_connection_read($1, 'sabre')", [orgA]), []);
  await db.exec('reset role');
  assert.deepEqual(await query('select count(*)::int as count from vault.secrets'), [{ count: 1 }]);
  await query('delete from public.organizations where id = $1', [orgB]);
  assert.deepEqual(await query('select count(*)::int as count from vault.secrets'), [{ count: 0 }]);
  const audit = JSON.stringify(await query('select * from public.admin_audit_log'));
  assert.equal(audit.includes('fixture-secret') || audit.includes('rotated'), false);
  assert.equal(audit.includes('company_api_disconnected'), true);
  console.log('Company API SQL role isolation, atomic rotation, deletion and audit checks passed.');

  await db.exec(readFileSync('supabase/migrations/20261119234911_add_eta_preprod_sample_receipts.sql', 'utf8'));
  await query('insert into public.organizations values ($1, true)', [orgB]);
  const etaCredentials = JSON.stringify({ clientId: 'eta-test-fixture', clientSecret: 'eta-test-secret-fixture' });
  const connect = (org, actor, revision, environment = 'preproduction') => query(
    "select public.company_api_connection_write($1, 'eta', $2, $3, $4, $5)", [org, actor, revision, environment, etaCredentials]);
  const execute = async (fn, params) => {
    const placeholders = params.map((_, i) => '$' + (i + 1)).join(',');
    return (await query(`select public.${fn}(${placeholders}) as result`, params))[0].result;
  };
  const list = (org = orgA, actor = adminA) => execute('company_eta_samples_list', [org, actor]);
  const hash = 'a'.repeat(64);
  const claim = (revision, { org = orgA, actor = adminA, internal = 'ETA-TEST-1', payloadHash = hash } = {}) =>
    execute('company_eta_sample_claim', [org, actor, revision, internal, payloadHash]);
  const refresh = (id, org = orgA, actor = adminA) => execute('company_eta_sample_for_refresh', [org, actor, id]);
  const record = (id, attempt, expected, status, submissionId = null, documentId = null) =>
    execute('company_eta_sample_record', [orgA, id, attempt, expected, status, submissionId, documentId]);

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(list(), { code: '42501' });
    await assert.rejects(claim(null), { code: '42501' });
    await assert.rejects(refresh(adminA), { code: '42501' });
    await assert.rejects(record(adminA, adminA, 'sending', 'unknown'), { code: '42501' });
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await connect(orgA, adminA, null);
  await connect(orgB, adminB, null, 'production');
  const [etaA] = await query('select * from public.company_api_connections_list($1)', [orgA]);
  const [etaB] = await query('select * from public.company_api_connections_list($1)', [orgB]);
  await assert.rejects(claim(etaA.revision, { actor: viewer }), { code: '42501' });
  await assert.rejects(list(orgA, adminB), { code: '42501' });
  await assert.rejects(claim(etaA.revision, { org: orgB }), { code: '42501' });
  assert.deepEqual(await claim(etaB.revision, { org: orgB, actor: adminB }), { error: 'eta_test_connection_required' });
  assert.deepEqual(await claim(etaB.revision), { error: 'eta_test_connection_required' });
  const first = await claim(etaA.revision);
  assert.equal(first.sample.status, 'sending');
  assert.equal(first.credentials.clientSecret, 'eta-test-secret-fixture');
  assert.deepEqual(await claim(etaA.revision), { sample: first.sample });
  assert.deepEqual(await claim(etaA.revision, { payloadHash: 'b'.repeat(64) }), { error: 'eta_sample_id_conflict' });
  assert.deepEqual(await refresh(first.sample.id, orgB, adminB), { error: 'eta_sample_not_found' });
  const submissionId = 'A'.repeat(26);
  const documentId = 'B'.repeat(26);
  await assert.rejects(record(first.sample.id, first.attempt_id, 'sending', 'valid', submissionId, documentId), { code: '22023' });
  assert.equal((await record(first.sample.id, first.attempt_id, 'sending', 'not_sent')).status, 'not_sent');
  const retry = await claim(etaA.revision);
  assert.equal(retry.sample.id, first.sample.id);
  assert.notEqual(retry.attempt_id, first.attempt_id);
  assert.equal(await record(first.sample.id, first.attempt_id, 'sending', 'unknown'), null);
  assert.equal((await record(retry.sample.id, retry.attempt_id, 'sending', 'submitted', submissionId, documentId)).status, 'submitted');
  const forRefresh = await refresh(retry.sample.id);
  assert.equal(forRefresh.sample.document_id, documentId);
  assert.equal(forRefresh.attempt_id, retry.attempt_id);
  assert.equal((await record(retry.sample.id, retry.attempt_id, 'submitted', 'valid')).status, 'valid');
  assert.equal((await record(retry.sample.id, retry.attempt_id, 'submitted', 'invalid')).status, 'valid');
  assert.equal((await refresh(retry.sample.id)).credentials, undefined);
  assert.equal((await list()).some(sample => sample.status === 'valid'), true);
  assert.equal(JSON.stringify(await list()).includes('eta-test-secret-fixture'), false);
  assert.equal((await list())[0].payload_hash, undefined);
  assert.deepEqual(await list(orgB, adminB), []);
  const pending = await claim(etaA.revision, { internal: 'ETA-PENDING' });
  assert.equal((await record(pending.sample.id, pending.attempt_id, 'sending', 'submitted', submissionId, documentId)).status, 'submitted');
  await connect(orgA, adminA, etaA.revision);
  assert.deepEqual(await refresh(pending.sample.id), { error: 'eta_test_connection_required' });
  const [rotated] = await query('select * from public.company_api_connections_list($1)', [orgA]);
  const interrupted = await claim(rotated.revision, { internal: 'ETA-INTERRUPTED' });
  await db.exec('reset role');
  await query("update company_api_private.eta_preprod_samples set checked_at = now() - interval '61 seconds' where id = $1", [interrupted.sample.id]);
  await db.exec('set role service_role');
  const repeated = await claim(rotated.revision, { internal: 'ETA-INTERRUPTED' });
  assert.equal(repeated.attempt_id, undefined);
  assert.equal(repeated.sample.status, 'unknown');
  console.log('ETA sample SQL tenant access, test-only configuration, one-send claims, replay fencing and metadata history passed.');
} finally {
  await db.close();
}
