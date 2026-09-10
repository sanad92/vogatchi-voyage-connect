import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navigation = readFileSync(new URL('../src/config/moduleNavigation.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/layout/DashboardSidebar.tsx', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../src/components/common/CommandPalette.tsx', import.meta.url), 'utf8');
const overview = readFileSync(new URL('../src/pages/ModuleOverview.tsx', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../src/pages/PricingPage.tsx', import.meta.url), 'utf8');
const dashboardActions = readFileSync(new URL('../src/components/dashboard/QuickActions.tsx', import.meta.url), 'utf8');

const moduleIds = [...navigation.matchAll(/^\s+id: '(sales|supply|operations|finance|employees|growth)',$/gm)]
  .map((match) => match[1]);
assert.deepEqual(
  moduleIds,
  ['sales', 'supply', 'operations', 'finance', 'employees', 'growth'],
  'the six ERP modules keep the approved business order',
);

for (const label of [
  'العملاء والمبيعات',
  'الموردون والمشتريات',
  'الحجوزات والتشغيل',
  'المالية والمحاسبة',
  'الموظفون والعمولات',
  'التسويق والتواصل',
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

assert.match(navigation, /href: '\/payment-orders'/, 'supplier payment orders are exposed after implementation');
assert.match(navigation, /href: '\/financial-exceptions'/, 'financial exception reporting is exposed');
assert.match(app, /path="\/modules\/:moduleId" element={<ModuleOverview \/>}/, 'module overview route is registered');
assert.match(sidebar, /NAVIGATION_GROUPS/, 'sidebar reads the shared module registry');
assert.match(sidebar, /canAccessScreen/, 'sidebar filters screens by permissions and plan');
assert.doesNotMatch(sidebar, /const navGroups/, 'sidebar no longer owns a conflicting navigation list');
assert.match(palette, /ALL_WORKSPACES/, 'command palette reads the shared module registry');
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
  'العملاء والمبيعات',
  'الموردون والمشتريات',
  'الحجوزات والتشغيل',
  'المالية والمحاسبة',
  'الموظفون والعمولات',
  'التسويق والتواصل',
]) {
  assert.match(pricing, new RegExp(`label: '${label}'`), `pricing module group exists: ${label}`);
}

console.log('Module navigation checks passed: 6 modules, shared registry, routes, access filters, handoffs, and pricing groups.');

// Execute the registry to catch ownership and deep-link regressions after regrouping.
const { default: ts } = await import('typescript');
const { runInNewContext } = await import('node:vm');
function loadConfig(source, imports = {}) {
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(js, { exports, require: name => {
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  }});
  return exports;
}
const features = loadConfig(readFileSync(new URL('../src/lib/planFeatures.ts', import.meta.url), 'utf8'));
const registry = loadConfig(navigation, { '@/lib/planFeatures': features });
assert.equal(registry.ERP_MODULES.length, 6);
assert.equal(registry.SHARED_WORKSPACES.length, 3);
for (const [path, owner] of [
  ['/customers', 'sales'], ['/suppliers/123/workspace', 'supply'],
  ['/bookings/123/workspace', 'operations'], ['/invoices', 'finance'],
  ['/employee-records', 'employees'], ['/employee-commissions', 'employees'],
  ['/whatsapp-inbox/123', 'growth'], ['/team', 'settings'],
  ['/reports/business-health', 'management'], ['/automation', 'automation'],
]) assert.equal(registry.findModuleByPath(path)?.id, owner, `canonical owner: ${path}`);
for (const id of ['management', 'growth']) assert.ok(registry.findModuleById(id), `legacy overview stays valid: ${id}`);
for (const path of ['/employee-records', '/employee-commissions']) {
  assert.equal(features.getRequiredPlanFeature(path)?.feature, 'finance', 'employee entry points retain the existing finance plan gate');
  assert.equal(registry.getAllModuleScreens().find(s => s.href === path)?.requiredPermission, 'expenses_view');
}
assert.equal(registry.getAllModuleScreens().filter(s => s.href === '/whatsapp-inbox').length, 1);
console.log('Workspace ownership, legacy overviews and employee access-envelope checks passed.');
