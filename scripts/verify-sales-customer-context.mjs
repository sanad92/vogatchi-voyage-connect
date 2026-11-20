import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { matchRoutes } from 'react-router-dom';
import ts from 'typescript';

const readSource = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = path => ts.transpileModule(readSource(path), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const ownOrg = '00000000-0000-4000-8000-000000000001';
const otherOrg = '00000000-0000-4000-8000-000000000002';
const active = '00000000-0000-4000-8000-000000000003';
const archived = '00000000-0000-4000-8000-000000000004';
const fixtures = [
  { id: active, organization_id: ownOrg, archived_at: null, name: 'Active customer', phone: '01234567890' },
  { id: archived, organization_id: ownOrg, archived_at: '2026-11-01', name: 'Archived customer', phone: '01234567891' },
];
const lookups = [];
const queryOptions = [];
const supabase = {
  from(table) {
    assert.equal(table, 'customers');
    const filters = {};
    lookups.push(filters);
    return {
      select() { return this; },
      eq(column, value) { filters[column] = value; return this; },
      is(column, value) { filters[column] = value; return this; },
      async maybeSingle() {
        const row = fixtures.find(item => Object.entries(filters).every(([field, value]) => item[field] === value));
        return { data: row ?? null, error: null };
      },
    };
  },
};
const exportsObject = {};
runInNewContext(compile('src/hooks/useCustomerContext.ts'), {
  exports: exportsObject,
  require(module) {
    if (module === '@tanstack/react-query') return { useQuery: options => { queryOptions.push(options); return options; } };
    assert.equal(module, '@/integrations/supabase/client');
    return { supabase };
  },
});
const { readActiveCustomer, useCustomerContext } = exportsObject;
assert.equal((await readActiveCustomer(ownOrg, active)).name, 'Active customer');
assert.equal(await readActiveCustomer(otherOrg, active), null);
assert.equal(await readActiveCustomer(ownOrg, archived), null);
assert.equal(await readActiveCustomer(ownOrg, 'invalid customer'), null);
assert.equal(lookups.length, 3, 'invalid IDs skip the data API');
assert.deepEqual(lookups[1], { organization_id: otherOrg, id: active, archived_at: null });

useCustomerContext(ownOrg, active);
useCustomerContext(otherOrg, active);
useCustomerContext(null, active);
assert.notEqual(queryOptions[0].queryKey[1], queryOptions[1].queryKey[1], 'organization switches use separate query keys');
assert.equal(queryOptions[2].enabled, false, 'lookups wait for an active organization');

const rows = [
  { id: 'own-customer', organization_id: ownOrg, customer_id: active },
  { id: 'other-customer', organization_id: ownOrg, customer_id: archived },
  { id: 'other-company', organization_id: otherOrg, customer_id: active },
];
let listReads = 0;
let selectedOrganization = ownOrg;
const listSupabase = {
  from(table) {
    assert.ok(table === 'bookings' || table === 'invoices');
    listReads++;
    const matching = {};
    return {
      select() { return this; },
      order() { return this; },
      limit() { return this; },
      range() { return this; },
      eq(column, value) { matching[column] = value; return this; },
      then(resolve) {
        const data = rows.filter(row => Object.entries(matching).every(([field, value]) => row[field] === value));
        resolve({ data, count: data.length, error: null });
      },
    };
  },
};

for (const [path, exportName] of [
  ['src/hooks/useUnifiedBookings.ts', 'useUnifiedBookings'],
  ['src/hooks/invoices/useInvoicesData.tsx', 'useInvoicesData'],
]) {
  const listExports = {};
  let queryOptions;
  runInNewContext(compile(path), {
    exports: listExports,
    require(module) {
      if (module === '@tanstack/react-query') return {
        useQuery: options => { queryOptions = options; return options; },
        useMutation: () => ({}),
        useQueryClient: () => ({}),
      };
      if (module === '@/integrations/supabase/client') return { supabase: listSupabase };
      if (module === './useOrgId') return { useOrgId: () => selectedOrganization };
      if (module === '@/hooks/useOptimizedAuth') return { useOptimizedAuth: () => ({ user: null }) };
      if (module === '@/lib/postgrest-safe') return { sanitizeSearchTerm: term => term };
      if (module === 'react') return { useRef: value => ({ current: value }) };
      return {};
    },
  });

  const useList = listExports[exportName];
  const returnedIds = result => Array.from(result.data ?? result, row => row.id);
  const initialReads = listReads;
  useList({ organizationId: ownOrg, customerId: null });
  assert.equal(queryOptions.enabled, false);
  assert.deepEqual(returnedIds(await queryOptions.queryFn()), []);
  assert.equal(listReads, initialReads, 'a manual refetch cannot broaden an unresolved filter');

  useList({ organizationId: ownOrg, customerId: active });
  assert.equal(queryOptions.enabled, true);
  assert.deepEqual(returnedIds(await queryOptions.queryFn()), ['own-customer']);

  useList({ organizationId: ownOrg });
  assert.equal(queryOptions.enabled, true);
  assert.deepEqual(returnedIds(await queryOptions.queryFn()), ['own-customer', 'other-customer']);

  selectedOrganization = null;
  useList({ organizationId: null, customerId: active });
  assert.equal(queryOptions.enabled, false);
  selectedOrganization = ownOrg;
}

const routes = [...readSource('src/App.tsx').matchAll(/<Route path="([^"]+)" element=/g)].map(match => ({ path: match[1] }));
for (const [url, expected] of [
  [`/hotel-bookings/${active}`, '/hotel-bookings/:id'],
  [`/flight-bookings/${active}`, '/flight-bookings/:id'],
  [`/bookings/new?customer_id=${active}`, '/bookings/new'],
  [`/bookings?customer_id=${active}`, '/bookings'],
  [`/invoices/new?customer_id=${active}`, '/invoices/new'],
  [`/invoices?customer_id=${active}`, '/invoices'],
  [`/quotes/new?customer_id=${active}`, '/quotes/new'],
  [`/new-quote?customer=${active}`, '/new-quote'],
  ['/customers/new', '/customers/new'],
  ['/contact', '/contact'],
  ['/privacy', '/privacy'],
  ['/expenses', '/expenses'],
  ['/expense-management?tab=expenses', '/expense-management'],
]) {
  assert.equal(matchRoutes(routes, url)?.at(-1)?.route.path, expected);
}
assert.equal(routes.some(route => route.path === '/p/:slug'), false, 'generic CMS data has no anonymous route');
assert.doesNotMatch(readSource('src/pages/Invoices.tsx'), /useInitialInvoices/, 'viewing an empty invoice list must not create demo data');
console.log('Sales customer context passed for active and archived customers, tenant and customer list filters, invalid IDs and quick-action routes.');
