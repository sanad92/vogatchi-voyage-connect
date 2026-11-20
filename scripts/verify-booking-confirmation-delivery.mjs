import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const edgeSource = readFileSync(new URL('../supabase/functions/send-booking-confirmation/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(edgeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function confirm({ emailError, whatsapp, missingRecipient = false, forbidden = false }) {
  const effects = [];
  const token = 'Bearer synthetic-user-token';
  const booking = {
    organization_id: 'fake-org', customer_id: 'fake-customer', booking_reference: 'QA-only',
    customer: missingRecipient ? null : { name: 'Test Person', email: 'test@example.invalid', phone: '201000000001' },
  };
  const serviceClient = {
    from(table) {
      if (table === 'transport_bookings') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: booking, error: null }) }) }) };
      }
      assert.equal(table, 'email_queue', 'booking confirmation never changes the voucher flag');
      return { insert: async row => {
        effects.push('email queued');
        assert.equal(row.organization_id, booking.organization_id);
        assert.equal(row.status, 'pending');
        return { error: emailError };
      } };
    },
  };
  const viewerClient = {
    auth: { getUser: async value => {
      assert.equal(value, 'synthetic-user-token');
      return { data: { user: { id: 'fake-user' } }, error: null };
    } },
    functions: { invoke: async (functionName, options) => {
      effects.push('whatsapp invoked');
      assert.equal(functionName, 'send-whatsapp-message');
      assert.equal(options.headers.Authorization, token);
      assert.equal(options.body.content.includes(booking.booking_reference), true);
      assert.equal(options.body.messageType, 'text');
      assert.equal(options.body.customerId, booking.customer_id);
      assert.equal(options.body.organizationId, booking.organization_id);
      assert.equal(options.body.idempotencyKey, 'booking-confirmation:transport:fake-booking');
      return whatsapp;
    } },
  };
  const env = { SUPABASE_URL: 'https://no-network.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', SUPABASE_ANON_KEY: 'fixture-anon' };
  let handler;
  vm.runInNewContext(compiled, {
    exports: {}, Response, Deno: { env: { get: name => env[name] } },
    console: { error() {} },
    require(name) {
      if (name === 'npm:@supabase/supabase-js@2') return { createClient: (_, key) => key === 'fixture-service' ? serviceClient : viewerClient };
      if (name === '../_shared/auth.ts') return { requireOrgMembership: async (_, user, org) => {
        assert.equal(user, 'fake-user');
        assert.equal(org, booking.organization_id);
        if (forbidden) throw new Error('Denied');
      } };
      assert.equal(name, 'https://deno.land/std@0.168.0/http/server.ts');
      return { serve: fn => { handler = fn; } };
    },
  });
  const response = await handler(new Request('https://no-network.invalid', {
    method: 'POST', headers: { Authorization: token },
    body: JSON.stringify({ bookingType: 'transport', bookingId: 'fake-booking' }),
  }));
  return { status: response.status, body: await response.json(), effects };
}

const sent = { data: { success: true, providerMessageId: 'fixture-message' }, error: null };
const normal = await confirm({ whatsapp: sent });
assert.equal(normal.status, 200);
assert.deepEqual(normal.body, { success: true, results: { email: 'queued', whatsapp: 'sent' } });
assert.deepEqual(await confirm({ emailError: new Error('Database unavailable'), whatsapp: sent }), {
  status: 502, body: { success: false, results: { email: 'failed', whatsapp: 'sent' } },
  effects: ['email queued', 'whatsapp invoked'],
});
for (const whatsapp of [
  { data: null, error: new Error('Invocation rejected') },
  { data: { success: false, error: 'provider failed' }, error: null },
  { data: { success: true, duplicate: true, message: { status: 'sending', message_id: null } }, error: null },
]) {
  const failure = await confirm({ whatsapp });
  assert.equal(failure.status, 502);
  assert.deepEqual(failure.body, { success: false, results: { email: 'queued', whatsapp: 'failed' } });
}
const delivered = await confirm({ whatsapp: { data: { success: true, duplicate: true,
  message: { status: 'delivered', message_id: 'fixture-message' } }, error: null } });
assert.equal(delivered.status, 200);
assert.deepEqual(await confirm({ missingRecipient: true, whatsapp: sent }), {
  status: 422, body: { success: false, results: {} }, effects: [],
});
assert.deepEqual(await confirm({ forbidden: true, whatsapp: sent }), {
  status: 403, body: { error: 'Forbidden' }, effects: [],
});
console.log('Booking confirmation reports rejected/lacking provider evidence, queue errors and partial results without marking a voucher.');
