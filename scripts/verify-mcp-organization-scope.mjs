import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const source = await readFile(new URL('../supabase/functions/mcp/index.ts', import.meta.url), 'utf8');
const imports = {
  '@lovable.dev/mcp-js': {
    auth: { oauth: { issuer: () => ({}) } },
    defineMcp: definition => definition,
    defineTool: tool => tool,
  },
  '@lovable.dev/mcp-js/stacks/supabase': { createSupabaseHandler: definition => definition },
  '@supabase/supabase-js': { createClient },
  zod: { z },
};
const firstOrg = '00000000-0000-4000-8000-000000000001';
const secondOrg = '00000000-0000-4000-8000-000000000002';
const inactiveOrg = '00000000-0000-4000-8000-000000000003';
const user = '00000000-0000-4000-8000-000000000004';
const otherUser = '00000000-0000-4000-8000-000000000005';
const outsideOrg = '00000000-0000-4000-8000-000000000006';
const jwtHeader = 'Bearer mock-oauth-token';

const startMemberships = [
  { organization_id: firstOrg, user_id: user, is_active: true, organizations: { name: 'First agency', is_active: true } },
  { organization_id: secondOrg, user_id: user, is_active: true, organizations: { name: 'Second agency', is_active: true } },
  { organization_id: inactiveOrg, user_id: user, is_active: true, organizations: { name: 'Inactive agency', is_active: false } },
  { organization_id: outsideOrg, user_id: otherUser, is_active: true, organizations: { name: 'Different account', is_active: true } },
];
let memberships = startMemberships;
const bookings = [firstOrg, secondOrg].map((organization_id, index) => ({
  organization_id, id: String(index), booking_number: 'BK-100', booking_type: 'hotel', customer_name: 'Test customer',
  notes: 'private notes', cost_price: 321, profit: 123,
}));
const customers = [firstOrg, secondOrg].map((organization_id, index) => ({
  organization_id, id: String(index), name: 'Test customer', email: 'private@example.invalid', phone: '01000000000',
  total_spent: 1500, last_booking_date: '2026-11-20',
}));
const tableRows = {
  bookings, customers,
  sop_leads: [firstOrg, secondOrg].map(organization_id => ({ organization_id, lead_number: 'LEAD-100' })),
  quotes: [firstOrg, secondOrg].map(organization_id => ({ organization_id, quote_number: 'QUOTE-100' })),
};

const requests = [];
const fetchBefore = globalThis.fetch;
const envBefore = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
process.env.SUPABASE_URL = 'https://mcp-fixture.invalid';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mock_key';
globalThis.mcpFixtureImports = imports;
let definition;
globalThis.Deno = { serve: config => { definition = config; } };
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.origin, 'https://mcp-fixture.invalid');
  assert.equal(new Headers(options.headers).get('authorization'), jwtHeader);
  const table = url.pathname.split('/').at(-1);
  requests.push({ table, query: url.searchParams });
  const rows = table === 'organization_members' ? memberships : tableRows[table];
  assert.ok(rows, `unexpected table: ${table}`);
  const filters = [...url.searchParams.entries()].filter(([, value]) => value.startsWith('eq.'));
  const columns = url.searchParams.get('select').split(',');
  const offset = Number(url.searchParams.get('offset') || 0);
  const limit = Number(url.searchParams.get('limit') || rows.length);
  const data = rows.filter(row => filters.every(([pk, cmp]) => {
    const val = pk.split('.').reduce((obj, key) => obj?.[key], row);
    return String(val) === cmp.slice(3);
  })).slice(offset, offset + limit).map(row => Object.fromEntries(columns.map(column =>
    column === 'organizations!inner(name)'
      ? ['organizations', { name: row.organizations.name }]
      : [column, row[column]],
  )));
  return Response.json(data);
};

try {
  const testModule = source.replace(/^import \{ (.+) \} from "npm:(.+)";$/gm, (_, imports, module) => {
    const moduleName = module.replace(/@[~^]?\d[^/]*(?=\/|$)/g, '');
    return `const { ${imports.replaceAll(' as ', ': ')} } = globalThis.mcpFixtureImports[${JSON.stringify(moduleName)}];`;
  });
  const testModuleUrl = 'data:text/javascript;base64,' + Buffer.from(testModule).toString('base64');
  await import(testModuleUrl);
  const tools = new Map(definition.tools.map(tool => [tool.name, tool]));
  const context = { isAuthenticated: () => true, getUserId: () => user, getToken: () => jwtHeader.slice(7) };
  const call = (name, args = {}, ctx = context) => tools.get(name).handler(args, ctx);
  const contents = result => result.structuredContent?.data;

  assert.deepEqual(contents(await call('list_organizations')), [
    { organization_id: firstOrg, name: 'First agency' },
    { organization_id: secondOrg, name: 'Second agency' },
  ]);

  let recentRequests = requests.length;
  assert.match((await call('list_bookings')).content[0].text, /Choose an organization/);
  assert.deepEqual(requests.slice(recentRequests).map(r => r.table), ['organization_members']);

  recentRequests = requests.length;
  assert.equal((await call('get_booking', { organization_id: inactiveOrg, booking_number: 'BK-100' })).isError, true);
  assert.deepEqual(requests.slice(recentRequests).map(r => r.table), ['organization_members']);
  assert.equal((await call('list_bookings', { organization_id: outsideOrg })).isError, true);
  assert.equal((await call('list_bookings', { organization_id: firstOrg }, {
    ...context, isAuthenticated: () => false,
  })).isError, true);

  const toolsWithScope = [
    ['list_bookings', 'bookings', {}],
    ['get_booking', 'bookings', { booking_number: 'BK-100' }],
    ['search_customers', 'customers', { query: 'private@example.invalid' }],
    ['list_leads', 'sop_leads', {}],
    ['list_quotes', 'quotes', {}],
  ];
  for (const [name, table, args] of toolsWithScope) {
    const result = await call(name, { ...args, organization_id: secondOrg });
    assert.ok(!result.isError, name);
    assert.equal(requests.at(-1).table, table);
    const { query } = requests.at(-1);
    assert.equal(query.get('organization_id'), 'eq.' + secondOrg);
    assert.doesNotMatch(query.get('select'), /cost_price|profit|notes|email|phone|total_spent/);
    assert.equal(Array.isArray(contents(result)) ? contents(result).length : contents(result).id, name === 'get_booking' ? '1' : 1);
  }

  memberships = [{ ...startMemberships[0] }, { ...startMemberships[1], is_active: false }];
  assert.equal(contents(await call('list_bookings')).length, 1);
  assert.equal(requests.at(-1).query.get('organization_id'), 'eq.' + firstOrg);
  assert.equal((await call('list_bookings', { organization_id: secondOrg })).isError, true);
  console.log('MCP organization checks passed for all five data tools and organization discovery.');
} finally {
  globalThis.fetch = fetchBefore;
  delete globalThis.mcpFixtureImports;
  delete globalThis.Deno;
  for (const [key, value] of [['SUPABASE_URL', envBefore.url], ['SUPABASE_PUBLISHABLE_KEY', envBefore.key]]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
