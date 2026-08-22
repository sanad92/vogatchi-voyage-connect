import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const loadTypeScriptModule = async (path) => {
  const source = await readFile(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
};

const access = await loadTypeScriptModule(new URL('../src/lib/accessControl.ts', import.meta.url));
const redirects = await loadTypeScriptModule(new URL('../src/lib/safeRedirect.ts', import.meta.url));

const can = (role, departments, permission) =>
  access.hasPermissionForRole(role, departments, permission);

assert.equal(can('owner', [], 'admin_settings'), true, 'owner has full organization access');
assert.equal(can('admin', [], 'team_manage_roles'), true, 'admin can manage organization roles');

assert.equal(can('manager', [], 'financial_view'), true, 'manager can see management reports');
assert.equal(can('manager', [], 'financial_edit'), false, 'manager cannot post financial changes');
assert.equal(can('manager', [], 'team_invite'), false, 'manager cannot allocate paid seats');
assert.equal(can('manager', [], 'admin_settings'), false, 'manager cannot change organization settings');

assert.equal(can('agent', ['sales'], 'quotes_create'), true, 'sales can create quotes');
assert.equal(can('agent', ['sales'], 'financial_view'), false, 'sales cannot see the general ledger');
assert.equal(can('agent', ['customer_service'], 'whatsapp_view'), true, 'customer service can use the inbox');
assert.equal(can('agent', ['customer_service'], 'payments_refund'), false, 'customer service cannot refund payments');
assert.equal(can('agent', ['reservations'], 'bookings_confirm'), true, 'reservations can confirm bookings');
assert.equal(can('agent', ['operations'], 'banking_view'), false, 'operations cannot see bank accounts');
assert.equal(can('agent', ['finance'], 'financial_edit'), true, 'finance can post financial changes');
assert.equal(can('agent', ['finance'], 'marketing_edit'), false, 'finance cannot edit campaigns');
assert.equal(can('agent', ['marketing'], 'marketing_edit'), true, 'marketing can edit journeys');
assert.equal(can('agent', ['marketing'], 'financial_view'), false, 'marketing cannot see finance');
assert.equal(can('agent', [], 'team_view'), true, 'an unassigned agent can see the team directory');
assert.equal(can('agent', [], 'customers_view'), false, 'an unassigned agent fails closed');
assert.equal(can('viewer', [], 'bookings_view'), true, 'viewer has read-only operational access');
assert.equal(can('viewer', [], 'bookings_edit'), false, 'viewer cannot edit bookings');

assert.equal(
  redirects.getSafeInternalRedirect('/accept-invite?token=abc'),
  '/accept-invite?token=abc',
  'invitation redirect remains internal',
);
assert.equal(redirects.getSafeInternalRedirect('https://evil.example/path'), null, 'absolute redirects are rejected');
assert.equal(redirects.getSafeInternalRedirect('//evil.example/path'), null, 'scheme-relative redirects are rejected');
assert.equal(redirects.getSafeInternalRedirect('/\\evil.example'), null, 'backslash redirects are rejected');

const migration = await readFile(
  new URL('../supabase/migrations/20260822160000_saas_core_hardening.sql', import.meta.url),
  'utf8',
);
assert.match(migration, /AND m\.is_active = true/, 'membership helper must require active membership');
assert.match(migration, /BEFORE INSERT OR UPDATE OF is_active/, 'seat limit must cover reactivation');
assert.match(migration, /create_organization_invitation/, 'invitations use a server RPC');
assert.match(migration, /manage_organization_member/, 'member mutations use an audited server RPC');
assert.match(migration, /ALTER COLUMN plan SET DEFAULT 'trial'/, 'new organizations never default to a free plan');
assert.match(migration, /vault\.decrypted_secrets/, 'email cron reads its service token from Vault');
assert.doesNotMatch(migration, /Authorization[^\n]+Bearer [A-Za-z0-9_-]{20,}/, 'migration must not embed a bearer token');

console.log('SaaS core checks passed: 29/29');

