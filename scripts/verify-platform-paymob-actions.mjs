import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../supabase/functions/platform-paymob-operations/index.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const id = '00000000-0000-4000-8000-000000000011';
const paymentId = '00000000-0000-4000-8000-000000000012';
const owner = '00000000-0000-4000-8000-000000000013';
const order = { id: 222 };
const original = {
  id: 111, order, amount_cents: 30000, currency: 'EGP', success: true, pending: false,
  has_parent_transaction: false, is_voided: false, is_live: false, is_settled: false,
  source_data: { type: 'card' }, refunded_amount_cents: 0,
};
const child = {
  id: 333, order, amount_cents: 7500, currency: 'EGP', success: true, pending: false,
  has_parent_transaction: true, parent_transaction: 111, is_refund: true, is_live: false,
};
const env = {
  SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
  PAYMOB_API_KEY: 'fake-provider-key', PAYMOB_OPERATIONS_SECRET_KEY: 'egy_sk_test_fake', PAYMOB_OPERATIONS_MODE: 'test',
};
const calls = [];
let handler;
let access;
let liveOriginal;
let lookupChild;
let providerResult;
let reservation;
const createClient = (_url, key) => key === 'anon' ? {
  auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
  rpc: async () => ({ data: access }),
} : {
  async rpc(name, input) {
    if (name === 'reserve_platform_paymob_action') {
      assert.equal(input.p_actor, owner);
      if (reservation) return { data: { send: false, status: reservation.status } };
      reservation = {
        kind: input.p_kind, status: 'requested', transaction_id: '111', order_id: '222', currency: 'EGP',
        original_amount_cents: 30000, amount_cents: input.p_amount_cents ?? 30000,
      };
      return { data: { ...reservation, send: true } };
    }
    if (name === 'get_platform_paymob_action') return { data: reservation };
    if (name === 'finish_platform_paymob_action') {
      reservation.status = input.p_status;
      reservation.provider_action_id = input.p_provider_action_id;
      return { data: reservation.status };
    }
    throw new Error('Unexpected RPC');
  },
};
vm.runInNewContext(outputText, {
  Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
  fetch: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/tokens')) return Response.json({ token: 'fake-inquiry-token' });
    if (url.endsWith('/transactions/111')) return Response.json(liveOriginal);
    if (url.endsWith('/transactions/333')) return Response.json(lookupChild);
    if (providerResult instanceof Error) throw providerResult;
    return Response.json(providerResult);
  },
  Response, AbortSignal, require: () => ({ createClient }), exports: {},
});
const call = (body) => handler(new Request('https://test.invalid', {
  method: 'POST', headers: { Authorization: 'Bearer mock', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));
const submit = { command: 'submit', request_id: id, payment_id: paymentId, kind: 'refund', amount_cents: 7500, reason: 'Requested by customer' };
const writes = () => calls.filter(({ url }) => url.includes('/void_refund/'));
const reset = () => {
  calls.length = 0;
  reservation = null;
  access = 'owner';
  liveOriginal = { ...original };
  lookupChild = { ...child };
  providerResult = { ...child };
};
reset();
access = null;
assert.equal((await call(submit)).status, 403);
assert.equal(calls.length, 0);

reset();
liveOriginal.is_live = true;
assert.equal((await (await call(submit)).json()).status, 'rejected');
assert.equal(writes().length, 0);

reset();
liveOriginal.is_settled = true;
assert.equal((await (await call({ ...submit, kind: 'void' })).json()).status, 'rejected');
assert.equal(writes().length, 0);

reset();
liveOriginal.refunded_amount_cents = 25000;
assert.equal((await (await call(submit)).json()).status, 'rejected');
assert.equal(writes().length, 0);

reset();
assert.equal((await (await call(submit)).json()).status, 'succeeded');
assert.equal(writes().length, 1);
assert.ok(writes()[0].url.endsWith('/refund'));
assert.deepEqual(JSON.parse(writes()[0].options.body), { transaction_id: '111', amount_cents: 7500 });
assert.equal(reservation.provider_action_id, '333');

reset();
providerResult = new Error('Simulated network timeout');
assert.equal((await (await call(submit)).json()).status, 'unknown');
assert.equal((await (await call(submit)).json()).status, 'unknown');
assert.equal(writes().length, 1);
const lookup = { command: 'check', request_id: id, provider_action_id: '333' };
lookupChild = { ...child, parent_transaction: 999 };
assert.equal((await (await call(lookup)).json()).status, 'unknown');
lookupChild = { ...child };
assert.equal((await (await call(lookup)).json()).status, 'succeeded');
assert.equal(writes().length, 1);
console.log('PASS authenticated access, live/test isolation, settled void rejection, partial refund limits, outcome verification, timeout replay and reconciliation');
