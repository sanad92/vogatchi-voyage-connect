import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

const jsx = (type, props) => ({ type, props });
let queryState;
let loadReport;
let queryEnabled;
let invoiceScope = 'organization';
let financialScope = 'organization';
let exportScope = 'organization';
const permissions = {
  hasPermission: () => true,
  getPermissionScope: permission => ({ invoices_view: invoiceScope, financial_view: financialScope, reports_export: exportScope })[permission],
};
const rows = {
  bookings: [{ id: 'booking', selling_price: 120, cost_price: 100, profit: 20, currency: 'USD', status: 'draft' }],
  supplier_payments: [{ booking_id: 'booking', amount: 1000, currency: 'EGP', status: 'paid' }],
};
let databaseError = true;
const from = (table) => ({ select: () => ({
  eq() { return this; }, order() { return this; },
  async range() { return databaseError ? { data: null, error: new Error('Missing source') } : { data: rows[table] ?? [] }; },
}) });

const imports = {
  react: { useMemo: fn => fn() },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '@tanstack/react-query': { useQuery(options) { loadReport = options.queryFn; queryEnabled = options.enabled; return queryState; } },
  '@/integrations/supabase/client': { supabase: { from } },
  '@/hooks/useOrgId': { useOrgId: () => 'test-organization' },
  '@/hooks/useSupabasePermissions': { useSupabasePermissions: () => permissions },
  '@/hooks/usePageTitle': { usePageTitle: () => {} },
  '@/components/layout/PageHeader': { default: 'PageHeader' },
  '@/lib/pagedRows': load('../src/lib/pagedRows.ts'),
  'lucide-react': { AlertTriangle: 'AlertTriangle', ShieldCheck: 'ShieldCheck', CheckCircle2: 'CheckCircle2' },
};
for (const [module, names] of Object.entries({
  alert: ['Alert', 'AlertDescription'], badge: ['Badge'], button: ['Button'], card: ['Card', 'CardContent', 'CardHeader', 'CardTitle'],
  table: ['Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow'],
})) imports[`@/components/ui/${module}`] = Object.fromEntries(names.map(name => [name, name]));

function text(node) {
  if (Array.isArray(node)) return node.map(text).join(' ');
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  return text(typeof node.type === 'function' ? node.type(node.props) : node.props?.children);
}

const FinancialValidation = load('../src/pages/FinancialValidation.tsx', imports).default;
queryState = { isLoading: true };
FinancialValidation();
await assert.rejects(loadReport, /Missing source/);
queryState = { isError: true, refetch: () => {} };
assert.match(text(FinancialValidation()), /لم تكتمل فحوصات التقرير/);
assert.doesNotMatch(text(FinancialValidation()), /فحوصات ناجحة|أخطاء حرجة/);

databaseError = false;
queryState = { data: await loadReport() };
assert.match(text(FinancialValidation()), /مطابقة يدوية لدفعات المورد بعملة مختلفة/);
assert.doesNotMatch(text(FinancialValidation()), /مسدَّد للمورد أكثر من التكلفة/);

rows.supplier_payments = [{ booking_id: 'booking', amount: 120, currency: 'USD', status: 'paid' }];
queryState = { data: await loadReport() };
assert.match(text(FinancialValidation()), /مسدَّد للمورد أكثر من التكلفة/);
invoiceScope = 'own';
assert.match(text(FinancialValidation()), /صلاحية المالية والفواتير على مستوى الشركة/);
assert.equal(queryEnabled, false);
await assert.rejects(loadReport, /صلاحية المالية والفواتير/);
assert.doesNotMatch(text(FinancialValidation()), /مسدَّد للمورد أكثر من التكلفة|فواتير مفقودة|دفعات مقدمة/);
invoiceScope = 'organization';
financialScope = 'own';
assert.doesNotMatch(text(FinancialValidation()), /أخطاء حرجة/);
assert.equal(queryEnabled, false);
financialScope = 'organization';

let incomeState = { isFetching: false, data: [{ account_id: 'account', account_code: '4000', account_name: 'Sales',
  amount: 220, currency: 'EGP', section: 'revenue' }] };
const downloads = [];
const IncomeStatement = load('../src/pages/finance/IncomeStatement.tsx', {
  ...imports,
  react: { ...imports.react, useState: value => [value, () => {}] },
  'react-router-dom': { useNavigate: () => () => {} },
  'lucide-react': { Download: 'Download', TrendingUp: 'TrendingUp' },
  '@/contexts/OrganizationContext': { useOrganization: () => ({ currentOrganization: { id: 'test-organization', name: 'Test company' } }) },
  '@/hooks/useFinancialReports': { useIncomeStatementV2: () => incomeState },
  '@/hooks/useCostCenters': { useCostCenters: () => ({ data: [] }) },
  '@/components/export/ReportDownloadButtons': { default: 'ReportDownloadButtons' },
  '@/components/finance/ReportCurrencySelect': { default: 'ReportCurrencySelect' },
  '@/lib/reportCsv': { downloadCsv: (...params) => downloads.push(params) },
  '@/components/ui/input': { Input: 'Input' },
  '@/components/ui/label': { Label: 'Label' },
  '@/components/ui/select': Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(x => [x, x])),
}).default;

const elements = node => Array.isArray(node) ? node.flatMap(elements)
  : node && typeof node === 'object' ? [node, ...elements(node.props?.children)] : [];
const exportControls = () => {
  const controls = elements(IncomeStatement());
  return {
    csv: controls.find(node => node.type === 'Button' && text(node).includes('تصدير CSV')),
    other: controls.find(node => node.type === 'ReportDownloadButtons'),
  };
};
const idle = exportControls();
assert.equal(idle.csv.props.disabled, false);
idle.csv.props.onClick();
assert.equal(downloads[0][2].at(-1)[3], 220);
const exportRows = await idle.other.props.loadRows();
assert.equal(exportRows.at(-1)[3], 220);
assert.equal(idle.other.props.scope[0], 'Test company');
incomeState = { ...incomeState, isFetching: true };
const pending = exportControls();
assert.equal(pending.csv.props.disabled, true);
assert.equal(pending.other.props.disabled, true);
pending.csv.props.onClick();
assert.equal(downloads.length, 1);
incomeState = { ...incomeState, isFetching: false };
exportScope = 'own';
assert.equal(exportControls().csv.props.disabled, true);
assert.equal(exportControls().other, undefined);
console.log('Financial validation distinguishes missing sources, enforces complete B2B scope and compares matching currencies. Income exports respect scope and loading state.');
