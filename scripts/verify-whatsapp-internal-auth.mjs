import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const authSource = compile('../supabase/functions/_shared/auth.ts');
const botSource = compile('../supabase/functions/whatsapp-chatbot-reply/index.ts');
const modernKey = 'sb_secret_test_fixture_only';
const legacyKey = 'legacy-service-role-test-fixture';
const internalSecret = 'internal-test-fixture';

// Exercise the real auth helper and bot handler. All external operations are
// trapped, so even an auth/dry-run regression cannot contact a real provider.
async function check({ label, serviceKey = modernKey, secret = internalSecret, headers = {}, expected }) {
  const effects = { database: 0, ai: 0, provider: 0 };
  const rejectEffect = kind => () => {
    effects[kind]++;
    throw new Error(`Unexpected ${kind} access during authenticated no-op`);
  };
  const db = { from: rejectEffect('database'), rpc: rejectEffect('database') };
  const env = {
    SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    SUPABASE_ANON_KEY: 'public-anon-test-fixture', INTERNAL_FUNCTION_SECRET: secret,
  };
  const getEnv = name => name === 'INTERNAL_FUNCTION_SECRET' && secret === null ? undefined : env[name];
  const auth = {};
  vm.runInNewContext(authSource, {
    exports: auth, Deno: { env: { get: getEnv } }, Response,
    require: name => {
      assert.equal(name, 'npm:@supabase/supabase-js@2');
      return { createClient: () => db };
    },
  });
  const modules = {
    'npm:@supabase/supabase-js@2': { createClient: () => db },
    '../_shared/auth.ts': auth,
    '../_shared/ai-gateway.ts': { corsHeaders: {}, callLovableAI: rejectEffect('ai') },
    '../_shared/whatsapp-bot-policy.ts': { botMayReply: () => { throw new Error('No-op reached conversation policy'); } },
    '../_shared/whatsapp.ts': {
      graphSend: rejectEffect('provider'), isWindowOpen: rejectEffect('database'),
      resolveSettings: rejectEffect('database'), normalizePhone: value => value,
    },
  };
  let handler;
  vm.runInNewContext(botSource, {
    exports: {}, Response, crypto, console,
    Deno: { env: { get: getEnv }, serve: fn => { handler = fn; } },
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import ${name}`);
      return modules[name];
    },
  });
  const response = await handler(new Request('https://test.invalid/bot', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ dry_run: true }),
  }));
  assert.equal(response.status, expected, label);
  assert.deepEqual(await response.json(), expected === 200
    ? { ok: true, dry_run: true } : { error: 'Unauthorized' }, label);
  assert.deepEqual(effects, { database: 0, ai: 0, provider: 0 }, `${label}: no side effects`);
}

const cases = [
  { label: 'modern service key in apikey only', headers: { apikey: modernKey }, expected: 200 },
  { label: 'legacy service key in bearer', serviceKey: legacyKey, headers: { Authorization: `Bearer ${legacyKey}` }, expected: 200 },
  { label: 'configured internal secret', headers: { 'x-internal-secret': internalSecret }, expected: 200 },
  { label: 'missing caller key cannot bypass via dry_run', expected: 401 },
  { label: 'public anon apikey', headers: { apikey: 'public-anon-test-fixture' }, expected: 401 },
  { label: 'public anon bearer', headers: { Authorization: 'Bearer public-anon-test-fixture' }, expected: 401 },
  { label: 'forged modern key', headers: { apikey: 'sb_secret_forged_test_fixture' }, expected: 401 },
  { label: 'wrong bearer', headers: { Authorization: 'Bearer wrong-test-fixture' }, expected: 401 },
  { label: 'wrong internal secret', headers: { 'x-internal-secret': 'wrong-test-fixture' }, expected: 401 },
  { label: 'unconfigured internal secret', secret: null, headers: { 'x-internal-secret': 'wrong-test-fixture' }, expected: 401 },
  { label: 'legacy apikey alone remains rejected', serviceKey: legacyKey, headers: { apikey: legacyKey }, expected: 401 },
];
for (const testCase of cases) await check(testCase);
console.log(`WhatsApp internal auth: ${cases.length} real-handler cases passed; no database, AI or provider effects.`);
