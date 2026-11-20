import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, chat, normal, accepted, uncertain, beforeSend, duringSend, exhausted, otherTenant, reminder] =
  Array.from({ length: 11 }, (_, i) => id(i + 1));
const migration = new URL('../supabase/migrations/20261120112245_recover_whatsapp_followup_deliveries.sql', import.meta.url);

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.whatsapp_followups (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, conversation_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'pending', mode text NOT NULL DEFAULT 'auto_send',
      remind_at timestamptz NOT NULL DEFAULT now() - interval '1 minute', locked_at timestamptz,
      attempt_count integer NOT NULL DEFAULT 0, sent_message_id uuid, sent_at timestamptz, last_error text
    );
    CREATE TABLE public.whatsapp_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, conversation_id uuid,
      followup_id uuid, idempotency_key text, direction text, status text, message_id text, sent_at timestamptz
    );
  `);
  await db.exec(readFileSync(migration, 'utf8'));

  const add = (key, status = 'pending', attempt = 0, mode = 'auto_send') => db.query(`
    INSERT INTO whatsapp_followups(id, organization_id, conversation_id, status, attempt_count, locked_at, mode)
    VALUES ($1, $2, $3, $4, $5, CASE WHEN $4='sending' THEN now() - interval '11 minutes' END, $6)
  `, [key, org, chat, status, attempt, mode]);
  const insertMessage = (followup, organization = org) => db.query(`
    INSERT INTO whatsapp_messages(organization_id, conversation_id, followup_id, idempotency_key, direction, status, message_id, sent_at)
    VALUES ($1, $2, $3, $4, 'outbound', 'delivered', 'provider-fixture-only', now())
    RETURNING id
  `, [organization, chat, followup, `followup:${followup}`]);
  const read = async key => (await db.query('SELECT * FROM whatsapp_followups WHERE id=$1', [key])).rows[0];
  const begin = async (key, lease) => (await db.query('SELECT begin_whatsapp_followup_dispatch($1,$2) AS ok', [key, lease])).rows[0].ok;
  const trackedClaim = async (limit = 25) =>
    (await db.query('SELECT id, locked_at::text AS lease, attempt_count FROM claim_tracked_whatsapp_followups($1)', [limit])).rows;

  await add(normal);
  await add(reminder, 'pending', 0, 'reminder');
  await add(accepted, 'sending', 1);
  await add(uncertain, 'sending', 1);
  await add(otherTenant, 'sending', 1);
  const message = (await insertMessage(accepted)).rows[0].id;
  await insertMessage(otherTenant, otherOrg);
  await db.exec('SET ROLE anon');
  await assert.rejects(trackedClaim(), /permission denied/);
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await assert.rejects(db.query('SELECT * FROM claim_due_whatsapp_followups(0)'), /permission denied/);
  await assert.rejects(begin(normal, new Date()), /permission denied/);
  await db.exec('RESET ROLE; SET ROLE service_role');
  assert.deepEqual((await db.query('SELECT id, attempt_count FROM claim_due_whatsapp_followups(1)')).rows,
    [{ id: normal, attempt_count: 0 }], 'the deployed worker receives the count before claiming because it adds one itself');
  await db.exec('RESET ROLE');
  assert.equal((await read(normal)).attempt_count, 1, 'legacy claim increments storage exactly once');
  assert.equal((await read(accepted)).status, 'sent');
  assert.equal((await read(accepted)).sent_message_id, message);
  assert.equal((await read(uncertain)).status, 'failed');
  assert.equal((await read(uncertain)).locked_at, null);
  assert.match((await read(uncertain)).last_error, /راجع سجل الرسائل/);
  assert.equal((await read(otherTenant)).status, 'failed', 'another tenant message cannot prove delivery');
  assert.equal((await read(reminder)).status, 'pending');

  await add(beforeSend, 'pending', 1);
  await add(duringSend, 'pending', 0);
  await add(exhausted, 'pending', 2);
  await db.exec('SET ROLE service_role');
  const initial = new Map((await trackedClaim()).map(row => [row.id, row]));
  assert.equal(initial.size, 3);
  assert.equal(initial.get(beforeSend).attempt_count, 2);
  assert.equal(initial.get(exhausted).attempt_count, 3);
  assert.equal(await begin(normal, new Date()), false, 'legacy claim cannot acquire a tracked send');
  assert.equal(await begin(duringSend, initial.get(duringSend).lease), true);
  assert.equal(await begin(duringSend, initial.get(duringSend).lease), false, 'a lease cannot initiate provider I/O twice');
  assert.equal((await trackedClaim()).length, 0, 'active leases are exclusive');
  await db.exec('RESET ROLE');
  const expired = '2000-01-01T00:00:00Z';
  await db.query('UPDATE whatsapp_followups SET locked_at=$1 WHERE id=ANY($2::uuid[])', [expired, [...initial.keys()]]);
  await db.query('UPDATE private.whatsapp_followup_dispatches SET lease_at=$1', [expired]);
  await db.exec('SET ROLE service_role');
  assert.equal(await begin(beforeSend, expired), false, 'an expired worker cannot reach the provider');
  const retry = await trackedClaim();
  assert.equal(retry.length, 1);
  assert.equal(retry[0].id, beforeSend);
  assert.equal(retry[0].attempt_count, 3);
  assert.equal(await begin(beforeSend, initial.get(beforeSend).lease), false, 'an earlier worker cannot use the new lease');
  await db.exec('RESET ROLE');
  assert.equal((await read(duringSend)).status, 'failed');
  assert.equal((await read(duringSend)).attempt_count, 1);
  assert.match((await read(duringSend)).last_error, /راجع سجل الرسائل/);
  assert.equal((await read(exhausted)).status, 'failed');
  assert.equal((await read(exhausted)).attempt_count, 3);
  assert.match((await read(exhausted)).last_error, /حد المحاولات/);
  console.log('WhatsApp follow-up recovery: scoped claims, one attempt per lease, confirmed sends, ambiguous sends and safe retry verified.');
} finally {
  await db.close();
}

const schedulerSource = readFileSync(new URL('../supabase/functions/whatsapp-scheduler/index.ts', import.meta.url), 'utf8');
const scheduler = ts.transpileModule(schedulerSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function runScheduler({ result, attemptCount = 2, canDispatch = true, insertError = null }) {
  const lease = '2026-11-20T11:22:45Z';
  const effects = { graph: 0, updates: [] };
  const db = {
    rpc: async (name, parameters) => {
      if (name === 'claim_tracked_whatsapp_followups') return { data: [{
        id: normal, organization_id: org, conversation_id: chat, status: 'sending',
        message_body: 'Synthetic test', attempt_count: attemptCount, locked_at: lease,
      }] };
      assert.equal(name, 'begin_whatsapp_followup_dispatch');
      assert.equal(parameters._id, normal);
      assert.equal(parameters._lease_at, lease);
      return { data: canDispatch };
    },
    from: table => new Query(table),
  };
  class Query {
    constructor(table) {
      this.table = table;
      this.filters = {};
    }
    select() { return this; }
    lte() { return this; }
    is() { return this; }
    or() { return this; }
    async limit() { return { data: [] }; }
    eq(field, value) {
      this.filters[field] = value;
      return this;
    }
    insert() { return this; }
    update(fields) {
      this.fields = fields;
      return this;
    }
    async single() {
      assert.equal(this.table, 'whatsapp_messages');
      if (insertError) return { error: insertError };
      return { data: { id: accepted } };
    }
    async maybeSingle() {
      if (this.table === 'whatsapp_conversations') {
        assert.equal(this.filters.organization_id, org);
        return { data: { id: chat, organization_id: org, phone_number: '201000000001' } };
      }
      assert.equal(this.table, 'whatsapp_followups');
      assert.equal(this.filters.locked_at, lease);
      assert.equal(this.filters.status, 'sending');
      effects.updates.push(this.fields);
      return { data: { id: normal } };
    }
    then(onFulfilled) { return Promise.resolve({ error: null }).then(onFulfilled); }
  }
  let handler;
  vm.runInNewContext(scheduler, {
    exports: {}, Response, AbortSignal, console: { error() {} },
    Deno: { serve: fn => { handler = fn; }, env: { get: () => 'fixture-only' } },
    require(name) {
      if (name === 'npm:@supabase/supabase-js@2') return { createClient: () => db };
      if (name === '../_shared/auth.ts') return { requireInternalCaller() {} };
      assert.equal(name, '../_shared/whatsapp.ts');
      return {
        WA_CORS: {}, normalizePhone: value => value, isWindowOpen: async () => true,
        resolveSettings: async () => ({ id: 'test-inbox' }),
        graphSend: async (_, __, ___, signal) => {
          effects.graph++;
          assert.ok(signal instanceof AbortSignal);
          return result;
        },
      };
    },
  });
  const response = await handler(new Request('https://no-network.invalid', { method: 'POST' }));
  assert.equal(response.status, 200);
  return { report: await response.json(), ...effects };
}

const definite = { ok: false, httpStatus: 400, errorDetails: { code: 131026 }, errorMessage: 'Rejected' };
const uncertainResponse = { ok: false, httpStatus: 0, errorDetails: null, errorMessage: 'Connection lost' };
const acceptedResponse = { ok: true, providerMessageId: 'test-provider-message' };
assert.equal((await runScheduler({ result: definite })).updates[0].status, 'pending', 'a definite second failure still allows a third attempt');
assert.equal((await runScheduler({ result: definite, attemptCount: 3 })).updates[0].status, 'failed');
const uncertainResult = await runScheduler({ result: uncertainResponse });
assert.equal(uncertainResult.updates[0].status, 'failed');
assert.match(uncertainResult.updates[0].last_error, /راجع سجل الرسائل/);
assert.equal(uncertainResult.report.followupsUnconfirmed, 1);
assert.equal((await runScheduler({ result: acceptedResponse, canDispatch: false })).graph, 0);
const partial = await runScheduler({ result: acceptedResponse, insertError: new Error('Database unavailable') });
assert.equal(partial.updates.length, 0, 'accepted send retains the lease for reconciliation if recording fails');
assert.equal(partial.report.followupsUnconfirmed, 1);
assert.equal((await runScheduler({ result: acceptedResponse })).report.followupsSent, 1);
console.log('WhatsApp scheduler: provider uncertainty, revoked claims and bounded retries passed without network effects.');
