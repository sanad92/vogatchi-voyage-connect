import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function loadModule(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
    return imports[name];
  }, console, localStorage: { getItem: () => null, setItem: () => {} }, window: {} });
  return exports;
}
const { accountHierarchy } = await loadModule('../src/lib/accountHierarchy.ts');
const account = (id, parent_id = null, extra = {}) => ({ id, parent_id, organization_id: 'a', account_code: id, account_name: id, account_name_ar: null, account_type: 'asset', ...extra });
const accounts = [account('10', '2'), account('2'), account('3'), account('11', '10')];
assert.equal(accountHierarchy(accounts).map(r => `${r.account.id}:${r.depth}`).join(','), '2:0,10:1,11:2,3:0');
assert.equal(accountHierarchy(accounts, '11').map(r => r.account.id).join(','), '2,10,11');
assert.equal(accountHierarchy(accounts, 'missing').length, 0);
assert.equal(accountHierarchy(accounts, '', 'expense').length, 0);
assert.equal(accountHierarchy([account('a', 'missing')])[0].invalidParent, true);
assert.equal(accountHierarchy([account('a', 'a')])[0].invalidParent, true);
const cycle = accountHierarchy([account('a', 'b'), account('b', 'a')]);
assert.equal(cycle.length, 2); assert.ok(cycle.every(row => row.invalidParent));
assert.equal(accountHierarchy([account('a'), account('b', 'a', { organization_id: 'b' })]).find(row => row.account.id === 'b').invalidParent, true);
assert.equal(accountHierarchy([account('a'), account('b', 'a', { account_type: 'expense' })]).find(row => row.account.id === 'b').invalidParent, true);
assert.equal(accountHierarchy([account('a', null, { account_name_ar: 'حساب المورد' })], 'المورد').length, 1);

// Exercise the actual provider with delayed membership replies, without a live account.
const orgA = { id: 'a', name: 'A' }, orgB = { id: 'b', name: 'B' };
let states, refs, cursor, refCursor, authRole, requests;
const React = {
  createContext: () => ({ Provider: 'provider' }), useContext: () => {},
  useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
  useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
  useEffect() {},
};
const client = { from() { const q = { select: () => q, eq: () => q, maybeSingle: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) }; return q; } };
const { OrganizationProvider } = await loadModule('../src/contexts/OrganizationContext.tsx', {
  react: React, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  '@/integrations/supabase/client': { supabase: client },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user: { id: 'u' }, setOrgRole: value => { authRole = value; } }) },
  '@/hooks/useOrgImpersonation': { getImpersonatingOrgId: () => null },
});
function reset() { states = [orgA, [orgA, orgB], 'owner', false, 'u']; refs = []; authRole = 'owner'; requests = []; }
function render() { cursor = 0; refCursor = 0; return OrganizationProvider({ children: null }).props.value; }
reset(); let value = render();
const switchB = value.switchOrganization('b');
value = render(); assert.equal(value.organizationId, null); assert.equal(value.orgRole, null); assert.equal(authRole, null); assert.equal(value.loading, true);
requests[0].resolve({ data: { role: 'viewer' }, error: null }); await switchB;
value = render(); assert.equal(value.organizationId, 'b'); assert.equal(value.orgRole, 'viewer'); assert.equal(value.loading, false);
reset(); value = render();
const older = value.switchOrganization('b'); const newer = render().switchOrganization('a');
requests[1].resolve({ data: { role: 'agent' }, error: null }); await newer;
requests[0].resolve({ data: { role: 'owner' }, error: null }); await older;
value = render(); assert.equal(value.organizationId, 'a'); assert.equal(value.orgRole, 'agent'); assert.equal(authRole, 'agent');
reset(); const denied = render().switchOrganization('b'); requests[0].resolve({ data: null, error: { message: 'denied' } }); await denied;
value = render(); assert.equal(value.organizationId, null); assert.equal(value.orgRole, null); assert.equal(value.loading, false);
reset(); const removed = render().switchOrganization('b'); requests[0].resolve({ data: null, error: null }); await removed;
assert.equal(render().organizationId, null);
console.log('Company core: account hierarchy, search, orphan/cycle handling, cross-company links, role switch, stale replies and denied memberships passed. Live RLS is not covered.');

let permissionState;
const accessControl = await loadModule('../src/lib/accessControl.ts');
const { useSupabasePermissions } = await loadModule('../src/hooks/useSupabasePermissions.tsx', {
  react: { useMemo: fn => fn() },
  '@tanstack/react-query': { useQuery: () => permissionState.query },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user: permissionState.user, userRole: permissionState.role }) },
  '@/hooks/useOrgId': { useOrgId: () => permissionState.org },
  '@/contexts/OrganizationContext': { useOrganization: () => ({ loading: permissionState.loading }) },
  '@/integrations/supabase/client': { supabase: {} },
  '@/lib/accessControl': accessControl,
});
permissionState = { user: { id: 'u' }, role: 'agent', org: 'a', loading: false, query: { data: ['finance'], isLoading: false, isError: false } };
assert.equal(useSupabasePermissions().hasPermission('payments_process'), true);
permissionState.query = { data: [], isLoading: false, isError: true };
assert.equal(useSupabasePermissions().hasPermission('customers_view'), false);
permissionState.query = { data: [], isLoading: true, isError: false };
assert.equal(useSupabasePermissions().hasPermission('customers_view'), false);
permissionState.query = { data: [], isLoading: false, isError: false };
assert.equal(useSupabasePermissions().hasPermission('customers_view'), true);
permissionState.role = 'owner'; permissionState.loading = true;
assert.equal(useSupabasePermissions().hasPermission('payments_process'), false);
permissionState.loading = false; permissionState.org = null;
assert.equal(useSupabasePermissions().hasPermission('payments_process'), false);
permissionState.org = 'a'; permissionState.user = null;
assert.equal(useSupabasePermissions().hasPermission('payments_process'), false);
console.log('Permission hook: successful department permissions, failed/loading lookups, unassigned baseline, company loading, missing company and signed-out cases passed.');
