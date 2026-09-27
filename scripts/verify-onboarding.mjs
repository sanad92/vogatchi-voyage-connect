import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

async function loadModule(path, imports = {}, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, crypto: webcrypto, ...globals, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
    return imports[name];
  } });
  return exports;
}

const api = await loadModule('../src/lib/onboarding.ts');
const identity = { orgId: 'org-a', userId: 'user-a' };
const company = { website: ' https://example.test ', tax_number: ' TAX-TEST ' };
const employee = { full_name: ' Test Employee ', phone: '', email: '', position: '' };
const customer = { name: ' Test Customer ', phone: '', email: '', nationality: '' };
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function database() {
  const db = { calls: [], rows: new Map(), responder: null };
  db.from = table => {
    const call = { table, filters: [] };
    const execute = async () => {
      db.calls.push(call);
      if (db.responder) return db.responder(call);
      if (call.operation === 'upsert') {
        const key = `${table}:${call.payload.id ?? call.payload.organization_id}`;
        const row = { ...db.rows.get(key), ...call.payload };
        db.rows.set(key, row);
        return { data: row, error: null };
      }
      if (call.operation === 'update') return { data: { id: call.filters[0][1], ...call.payload }, error: null };
      return { data: null, error: null };
    };
    const q = {
      select: fields => { call.select = fields; return q; },
      eq: (field, value) => { call.filters.push([field, value]); return q; },
      upsert: (payload, options) => { Object.assign(call, { operation: 'upsert', payload, options }); return q; },
      update: payload => { Object.assign(call, { operation: 'update', payload }); return q; },
      single: execute, maybeSingle: execute,
    };
    return q;
  };
  return db;
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }

await test('identity is mandatory before reads or writes', async () => {
  const db = database();
  for (const badIdentity of [{ orgId: '', userId: 'u' }, { orgId: 'o', userId: '' }]) {
    await assert.rejects(api.loadCompanySetup(db, badIdentity));
    await assert.rejects(api.saveCompanySetup(db, badIdentity, company));
    await assert.rejects(api.saveOnboardingEmployee(db, badIdentity, employee, 'id'));
    await assert.rejects(api.saveOnboardingCustomer(db, badIdentity, customer, 'id'));
    await assert.rejects(api.completeOnboarding(db, badIdentity));
  }
  assert.equal(db.calls.length, 0);
});

await test('company setup reads and saves the existing settings table without clearing logo', async () => {
  const db = database();
  db.responder = () => ({ data: { website: 'https://existing.test', tax_number: 'EXISTING' }, error: null });
  assert.equal((await api.loadCompanySetup(db, identity)).website, 'https://existing.test');
  assert.equal(db.calls[0].table, 'organization_settings');
  assert.equal(JSON.stringify(db.calls[0].filters), JSON.stringify([['organization_id', 'org-a']]));
  db.responder = null;
  db.rows.set('organization_settings:org-a', { logo_url: 'existing-logo', currency: 'EGP' });
  await api.saveCompanySetup(db, identity, company);
  const row = db.rows.get('organization_settings:org-a');
  assert.equal(row.website, 'https://example.test');
  assert.equal(row.tax_number, 'TAX-TEST');
  assert.equal(row.logo_url, 'existing-logo');
  assert.equal(row.currency, 'EGP');
  assert.equal(db.calls[1].options.onConflict, 'organization_id');
});

await test('database errors and unconfirmed writes reject every save path', async () => {
  for (const response of [{ data: null, error: { message: 'RLS denied' } }, { data: null, error: null }, { data: { id: 'wrong', organization_id: 'other', onboarding_completed: true }, error: null }]) {
    const db = database(); db.responder = () => response;
    await assert.rejects(api.saveCompanySetup(db, identity, company));
    await assert.rejects(api.saveOnboardingEmployee(db, identity, employee, 'employee-id'));
    await assert.rejects(api.saveOnboardingCustomer(db, identity, customer, 'customer-id'));
    await assert.rejects(api.completeOnboarding(db, identity));
  }
  const db = database(); db.responder = () => ({ data: null, error: { message: 'Read failed' } });
  await assert.rejects(api.loadCompanySetup(db, identity));
});

await test('retry IDs survive reload and are separated by organization, user and record kind', async () => {
  const draft = storage();
  const first = api.onboardingRecordId(draft, identity, 'employee');
  assert.equal(api.onboardingRecordId(draft, identity, 'employee'), first);
  assert.notEqual(api.onboardingRecordId(draft, identity, 'customer'), first);
  assert.notEqual(api.onboardingRecordId(draft, { ...identity, orgId: 'org-b' }, 'employee'), first);
  assert.notEqual(api.onboardingRecordId(draft, { ...identity, userId: 'user-b' }, 'employee'), first);
  assert.ok([...draft.values.values()].every(value => /^[0-9a-f-]{36}$/.test(value)));
  api.clearOnboardingRecordIds(draft, identity);
  assert.equal(draft.values.size, 2);
  assert.throws(() => api.onboardingRecordId({ getItem: () => null, setItem: () => { throw Error('Storage unavailable'); } }, identity, 'customer'));
});

// Drive the actual component handlers with deferred server replies. This tests
// UI progression and races; it is not a browser or live RLS acceptance test.
const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
function content(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(content).join('');
  if (typeof node !== 'object') return String(node);
  return content(node.props?.children);
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean) ?? null;
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
async function harness(options = {}) {
  const db = database(), draft = storage(), states = [], refs = [], effects = [];
  const navigations = [], cacheWrites = [], notices = [];
  let stateCursor, refCursor, effectCursor, queued, dirty, tree;
  let orgId = identity.orgId, user = { id: identity.userId };
  let companyResult = options.companyResult ?? { data: { website: 'https://existing.test', tax_number: 'EXISTING' }, isSuccess: true, isFetching: false, isError: false, refetch: async () => {} };
  const allowed = new Set(['employees_create', 'customers_create', 'bookings_create']);
  const React = {
    useState(initial) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => {
        const next = typeof value === 'function' ? value(states[index]) : value;
        if (!Object.is(next, states[index])) { states[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useEffect(callback, deps) {
      const index = effectCursor++, old = effects[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        queued.push(() => { old?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; });
      }
    },
  };
  React.useLayoutEffect = React.useEffect;
  const { default: Wrapper } = await loadModule('../src/pages/OnboardingWizard.tsx', {
    react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { useNavigate: () => (...args) => navigations.push(args) },
    '@tanstack/react-query': { useQuery: () => companyResult, useQueryClient: () => ({ setQueryData: (...args) => cacheWrites.push(args), invalidateQueries: async () => {} }) },
    '@/integrations/supabase/client': { supabase: db },
    '@/hooks/useOrgId': { useOrgId: () => orgId },
    '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user }) },
    '@/hooks/useSupabasePermissions': { useSupabasePermissions: () => ({ hasPermission: key => allowed.has(key) }) },
    '@/lib/onboarding': api,
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' }, '@/components/ui/label': { Label: 'Label' },
    sonner: { toast: { success: message => notices.push(message), error: message => notices.push(message) } },
    'lucide-react': new Proxy({}, { get: (_, key) => key }), '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
  }, { sessionStorage: draft });
  const first = Wrapper(), Component = first.type;
  const h = {
    db, draft, navigations, cacheWrites, notices, allowed,
    render() {
      let count = 0;
      do {
        assert.ok(count++ < 8, 'Render effects must settle');
        stateCursor = refCursor = effectCursor = 0; queued = []; dirty = false;
        tree = Component(first.props); queued.forEach(run => run());
      } while (dirty);
      return tree;
    },
    node: predicate => find(h.render(), predicate),
    button: label => h.node(node => node.type === 'Button' && content(node).trim() === label),
    step: () => content(h.node(node => node.type === 'h2')).trim(),
    input(placeholder, value) { h.node(node => node.type === 'Input' && node.props.placeholder === placeholder).props.onChange({ target: { value } }); },
    setCompanyResult: value => { companyResult = value; },
    unmount: () => effects.forEach(effect => effect.cleanup?.()),
    wrapper: (nextOrg, nextUser) => { orgId = nextOrg; user = nextUser; return Wrapper(); },
  };
  h.render(); return h;
}

await test('company prefill never replaces edited input', async () => {
  const h = await harness();
  assert.equal(h.node(n => n.type === 'Input' && n.props.placeholder === 'https://example.com').props.value, 'https://existing.test');
  h.input('https://example.com', 'https://edited.test');
  h.setCompanyResult({ data: { website: 'https://refreshed.test', tax_number: '' }, isSuccess: true, isFetching: false });
  assert.equal(h.node(n => n.type === 'Input' && n.props.placeholder === 'https://example.com').props.value, 'https://edited.test');
  await h.button('التالي').props.onClick();
  assert.equal(h.db.calls[0].payload.website, 'https://edited.test');
  assert.equal(h.step(), 'أول موظف');
});

await test('stale or failed initial settings reads block save until retry succeeds', async () => {
  const h = await harness({ companyResult: { data: { website: 'https://stale.test', tax_number: '' }, isSuccess: true, isFetching: true } });
  assert.equal(h.button('التالي').props.disabled, true);
  await h.button('التالي').props.onClick(); assert.equal(h.db.calls.length, 0);
  let retries = 0;
  h.setCompanyResult({ isSuccess: false, isError: true, isFetching: false, refetch: async () => { retries++; } });
  assert.ok(h.node(n => n.props.role === 'alert'));
  assert.equal(h.button('التالي').props.disabled, true);
  await h.button('إعادة المحاولة').props.onClick(); assert.equal(retries, 1);
  h.setCompanyResult({ data: { website: 'https://fresh.test', tax_number: '' }, isSuccess: true, isFetching: false });
  assert.equal(h.button('التالي').props.disabled, false);
  assert.equal(h.node(n => n.type === 'Input' && n.props.placeholder === 'https://example.com').props.value, 'https://fresh.test');
});

await test('failed save keeps the user on the same step with an error and entered data', async () => {
  const h = await harness();
  h.db.responder = () => ({ data: null, error: { message: 'Network failed' } });
  h.input('https://example.com', 'https://unsaved.test');
  await h.button('التالي').props.onClick();
  assert.equal(h.step(), 'بيانات الشركة');
  assert.ok(h.node(n => n.props.role === 'alert'));
  assert.equal(h.node(n => n.type === 'Input' && n.props.placeholder === 'https://example.com').props.value, 'https://unsaved.test');
  assert.equal(h.navigations.length, 0);
});

await test('double click sends one write and pending inputs/navigation are disabled', async () => {
  const h = await harness(); let resolve;
  h.db.responder = () => new Promise(done => { resolve = done; });
  const next = h.button('التالي').props.onClick;
  const first = next(); await next();
  assert.equal(h.db.calls.length, 1);
  assert.equal(h.node(n => n.type === 'fieldset').props.disabled, true);
  assert.equal(h.button('تخطي').props.disabled, true);
  resolve({ data: { organization_id: identity.orgId }, error: null }); await first;
  assert.equal(h.step(), 'أول موظف');
});

await test('lost employee response, retry and back-edit keep one employee', async () => {
  const h = await harness(); await h.button('تخطي').props.onClick();
  h.input('الاسم الكامل', 'Employee One');
  h.db.responder = call => {
    h.db.rows.set(`employees:${call.payload.id}`, call.payload);
    throw Error('Response lost after commit');
  };
  await h.button('التالي').props.onClick();
  assert.equal(h.step(), 'أول موظف');
  const firstId = h.db.calls[0].payload.id;
  h.db.responder = null; await h.button('التالي').props.onClick();
  assert.equal(h.db.calls[1].payload.id, firstId);
  await h.button('السابق').props.onClick(); h.input('الاسم الكامل', 'Employee Updated');
  await h.button('التالي').props.onClick();
  assert.equal(h.db.rows.size, 1);
  assert.equal(h.db.rows.get(`employees:${firstId}`).full_name, 'Employee Updated');
});

await test('customer retry is scoped and duplicate-free with creator attribution', async () => {
  const db = database(), draft = storage(), id = api.onboardingRecordId(draft, identity, 'customer');
  await api.saveOnboardingCustomer(db, identity, customer, id);
  await api.saveOnboardingCustomer(db, identity, { ...customer, name: 'Updated' }, api.onboardingRecordId(draft, identity, 'customer'));
  assert.equal(db.rows.size, 1);
  assert.equal(db.rows.get(`customers:${id}`).name, 'Updated');
  assert.equal(db.rows.get(`customers:${id}`).created_by, identity.userId);
  assert.equal(db.rows.get(`customers:${id}`).organization_id, identity.orgId);
});

await test('empty names and missing creation permissions do not silently advance or write', async () => {
  const h = await harness(); await h.button('تخطي').props.onClick();
  await h.button('التالي').props.onClick(); assert.equal(h.step(), 'أول موظف');
  h.input('الاسم الكامل', 'Employee'); h.allowed.delete('employees_create');
  assert.equal(h.button('التالي').props.disabled, true);
  await h.button('التالي').props.onClick(); assert.equal(h.db.calls.length, 0);
  await h.button('تخطي').props.onClick(); assert.equal(h.step(), 'أول عميل');
});

await test('all completion paths require a confirmed update before cache change or navigation', async () => {
  const h = await harness();
  h.db.responder = () => ({ data: null, error: null });
  await h.button('تخطي الكل').props.onClick();
  assert.equal(h.navigations.length, 0); assert.equal(h.cacheWrites.length, 0);
  assert.equal(h.step(), 'بيانات الشركة');
  h.db.responder = null; await h.button('تخطي الكل').props.onClick();
  assert.equal(h.navigations[0][0], '/dashboard');
  assert.equal(h.cacheWrites[0][1], false);
});

await test('booking entry completes setup then opens the canonical form without inserting a booking', async () => {
  const h = await harness();
  for (let i = 0; i < 3; i++) await h.button('تخطي').props.onClick();
  await h.button('فتح نموذج الحجز').props.onClick();
  assert.equal(h.navigations[0][0], '/bookings/new');
  assert.equal(h.db.calls.length, 1); assert.equal(h.db.calls[0].table, 'organizations');
  const limited = await harness(); limited.allowed.delete('bookings_create');
  for (let i = 0; i < 3; i++) await limited.button('تخطي').props.onClick();
  await limited.button('إنهاء الإعداد').props.onClick();
  assert.equal(limited.navigations[0][0], '/dashboard');
});

await test('company/user changes remount the form and late completion cannot navigate', async () => {
  const h = await harness(); let resolve;
  h.db.responder = () => new Promise(done => { resolve = done; });
  const saving = h.button('تخطي الكل').props.onClick();
  const a = h.wrapper('org-a', { id: 'user-a' });
  assert.notEqual(h.wrapper('org-b', { id: 'user-a' }).key, a.key);
  assert.notEqual(h.wrapper('org-a', { id: 'user-b' }).key, a.key);
  assert.equal(h.wrapper(null, null).props.role, 'status');
  h.unmount(); resolve({ data: { id: identity.orgId, onboarding_completed: true }, error: null }); await saving;
  assert.equal(h.navigations.length, 0); assert.equal(h.cacheWrites.length, 0);
});

console.log(`Onboarding: ${passed} checks passed. Browser acceptance, live permissions and production deployment remain separate gates.`);
