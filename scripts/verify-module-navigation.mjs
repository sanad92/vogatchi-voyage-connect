import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navigation = readFileSync(new URL('../src/config/moduleNavigation.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/layout/DashboardSidebar.tsx', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../src/components/common/CommandPalette.tsx', import.meta.url), 'utf8');
const overview = readFileSync(new URL('../src/pages/ModuleOverview.tsx', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../src/pages/PricingPage.tsx', import.meta.url), 'utf8');
const dashboardActions = readFileSync(new URL('../src/components/dashboard/QuickActions.tsx', import.meta.url), 'utf8');

const moduleIds = [...navigation.matchAll(/^\s+id: '(sales|supply|operations|finance|management|growth)',$/gm)]
  .map((match) => match[1]);
assert.deepEqual(
  moduleIds,
  ['sales', 'supply', 'operations', 'finance', 'management', 'growth'],
  'the six ERP modules keep the approved business order',
);

for (const label of [
  'المبيعات وCRM',
  'الموردون والتسعير',
  'الحجوزات والتشغيل',
  'المالية والمحاسبة',
  'الإدارة والرقابة',
  'النمو والأتمتة',
]) {
  assert.match(navigation, new RegExp(`label: '${label}'`), `module label exists: ${label}`);
}

const configuredHrefs = [...navigation.matchAll(/href: '([^']+)'/g)].map((match) => match[1]);
const activeRoutes = new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]));
const hrefCounts = configuredHrefs.reduce((counts, href) => counts.set(href, (counts.get(href) ?? 0) + 1), new Map());
const duplicateHrefs = [...hrefCounts.entries()].filter(([, count]) => count > 1).map(([href]) => href);

assert.deepEqual(duplicateHrefs, [], 'every configured screen has one navigation owner');

for (const href of new Set(configuredHrefs)) {
  if (href.startsWith('/modules/')) continue;
  assert.ok(activeRoutes.has(href), `configured screen has an active App route: ${href}`);
}

assert.doesNotMatch(navigation, /payment-orders/, 'deferred payment orders are not exposed');
assert.match(app, /path="\/modules\/:moduleId" element={<ModuleOverview \/>}/, 'module overview route is registered');
assert.match(sidebar, /NAVIGATION_GROUPS/, 'sidebar reads the shared module registry');
assert.match(sidebar, /canAccessScreen/, 'sidebar filters screens by permissions and plan');
assert.doesNotMatch(sidebar, /const navGroups/, 'sidebar no longer owns a conflicting navigation list');
assert.match(palette, /ERP_MODULES/, 'command palette reads the shared module registry');
assert.doesNotMatch(palette, /const ITEMS/, 'command palette no longer owns a duplicate screen list');
assert.match(dashboardActions, /QUICK_ACTIONS/, 'dashboard actions read the shared navigation registry');
assert.match(dashboardActions, /canAccessScreen/, 'dashboard actions respect permissions and plan access');
assert.match(overview, /module\.receives/, 'module overview shows what it receives');
assert.match(overview, /module\.delivers/, 'module overview shows what it delivers');
assert.match(pricing, /const FEATURE_GROUPS: FeatureGroup\[\]/, 'pricing comparison groups features by module');
assert.match(pricing, /FEATURE_GROUPS\.map/, 'pricing renders the shared six-module sales structure');
assert.match(pricing, /const PLAN_LIMITS: PlanLimitDefinition\[\]/, 'pricing comparison exposes real plan limits');
assert.match(pricing, /keys: \['commissions'\]/, 'pricing comparison includes employee commissions');
assert.match(pricing, /keys: \['priority_support'\]/, 'pricing comparison includes priority support');

for (const label of [
  'المبيعات وCRM',
  'الموردون والتسعير',
  'الحجوزات والتشغيل',
  'المالية والمحاسبة',
  'الإدارة والرقابة',
  'النمو والأتمتة',
]) {
  assert.match(pricing, new RegExp(`label: '${label}'`), `pricing module group exists: ${label}`);
}

console.log('Module navigation checks passed: 6 modules, shared registry, routes, access filters, handoffs, and pricing groups.');
