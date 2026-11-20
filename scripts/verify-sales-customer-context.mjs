import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { matchRoutes } from 'react-router-dom';
import ts from 'typescript';

const readSource = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compiled = ts.transpileModule(readSource('src/hooks/useCustomerContext.ts'), {
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
runInNewContext(compiled, {
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

const routes = [...readSource('src/App.tsx').matchAll(/<Route path="([^"]+)" element=/g)].map(match => ({ path: match[1] }));
for (const [url, expected] of [
  [`/hotel-bookings/${active}`, '/hotel-bookings/:id'],
  [`/flight-bookings/${active}`, '/flight-bookings/:id'],
  [`/bookings/new?customer_id=${active}`, '/bookings/new'],
  [`/invoices/new?customer_id=${active}`, '/invoices/new'],
  [`/quotes/new?customer_id=${active}`, '/quotes/new'],
  [`/new-quote?customer=${active}`, '/new-quote'],
  ['/customers/new', '/customers/new'],
  ['/about', '/about'],
  ['/contact', '/contact'],
  ['/p/booking-request', '/p/booking-request'],
  ['/p/agency-a/booking-request', '/p/:companySlug/booking-request'],
  ['/p/agency-a/pages/about', '/p/:companySlug/pages/:pageSlug'],
  ['/privacy', '/privacy'],
  ['/expenses', '/expenses'],
  ['/expense-management?tab=expenses', '/expense-management'],
]) {
  assert.equal(matchRoutes(routes, url)?.at(-1)?.route.path, expected);
}
assert.equal(routes.some(route => route.path === '/p/:slug'), false, 'generic CMS data has no anonymous route');
const cms = readSource('src/pages/admin/CMSPages.tsx');
assert.match(cms, /organization_id: orgId/);
assert.match(cms, /\.eq\("organization_id", orgId\)/);
assert.doesNotMatch(cms, /\.update\(\{ is_published/);
assert.match(readSource('src/pages/admin/PageBlocks.tsx'), /\.eq\("organization_id", orgId\)\s+\.eq\("page_id", id\)/);
console.log('Sales customer context passed for active and archived customers, tenant switches, invalid IDs and quick-action routes.');
