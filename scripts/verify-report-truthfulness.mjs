import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const checkedMath = Object.create(Math);
  checkedMath.random = () => { throw new Error('Reports must not invent measurements'); };
  vm.runInNewContext(output, {
    exports, Math: checkedMath,
    setTimeout: () => { throw new Error('No simulated report refresh'); },
    setInterval: () => { throw new Error('No simulated monitoring'); },
    require: name => { assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name]; },
  });
  return exports;
}

const ledger = await load('../src/lib/expenseLedgerAnalytics.ts');
const row = (id, section, amount, currency = 'EGP') => ({ account_id: id, account_code: id, account_name: `Account ${id}`, account_name_ar: null, account_type: section === 'revenue' ? 'revenue' : 'expense', section, amount, currency, entry_count: 1 });
const fixture = [row('400', 'revenue', 9000), row('600', 'operating_expense', 120), row('601', 'operating_expense', -20), row('500', 'cost_of_sales', 150)];
const summary = ledger.summarizeExpenseLedger(fixture, 'EGP');
assert.equal(summary.operatingTotal, 100);
assert.equal(summary.costOfSalesTotal, 150);
assert.equal(summary.total, 250);
assert.equal(summary.accounts.length, 3, 'Revenue must not inflate expense totals');
assert.equal(summary.accounts[1].amount, -20, 'Credits must retain their sign');
assert.equal(ledger.summarizeExpenseLedger(Array.from({ length: 55 }, (_, i) => row(String(i), 'operating_expense', 1)), 'EGP').total, 55, 'Do not limit analytics to the first operational page');
assert.equal(ledger.summarizeExpenseLedger([row('600', 'operating_expense', '12.50')], 'EGP').total, 12.5);
for (const amount of [null, undefined, '', 'bad', Infinity]) assert.throws(() => ledger.summarizeExpenseLedger([row('600', 'operating_expense', amount)], 'EGP'));
assert.throws(() => ledger.summarizeExpenseLedger([row('600', 'operating_expense', 10, 'USD')], 'EGP'));

let orgId = 'org-a', capturedQuery, rpcResult = { data: fixture, error: null };
const rpcCalls = [];
const hooks = await load('../src/hooks/useFinancialReports.ts', {
  '@tanstack/react-query': { useQuery: options => { capturedQuery = options; return options; } },
  '@/integrations/supabase/client': { supabase: { rpc: async (name, args) => { rpcCalls.push({ name, args }); return rpcResult; } } },
  './useOrgId': { useOrgId: () => orgId }, '@/lib/supabaseRpc': {},
});
hooks.useIncomeStatementV2('2026-09-01', '2026-09-17', 'USD');
assert.equal(capturedQuery.enabled, true);
await capturedQuery.queryFn();
assert.equal(rpcCalls[0].name, 'get_income_statement_v2');
assert.equal(rpcCalls[0].args._org_id, 'org-a');
assert.equal(rpcCalls[0].args._start_date, '2026-09-01');
assert.equal(rpcCalls[0].args._end_date, '2026-09-17');
assert.equal(rpcCalls[0].args._currency, 'USD');
const previousKey = JSON.stringify(capturedQuery.queryKey);
orgId = 'org-b'; hooks.useIncomeStatementV2('2026-09-01', '2026-09-17', 'USD');
assert.notEqual(JSON.stringify(capturedQuery.queryKey), previousKey, 'Company changes must use a separate cached result');
rpcResult = { data: null, error: { message: 'Not authorized' } };
await assert.rejects(capturedQuery.queryFn());
orgId = null; hooks.useIncomeStatementV2('2026-09-01', '2026-09-17');
assert.equal(capturedQuery.enabled, false);
const requestCount = rpcCalls.length;
await capturedQuery.queryFn(); assert.equal(rpcCalls.length, requestCount);
orgId = 'org-a'; hooks.useIncomeStatementV2('2026-10-01', '2026-09-17'); assert.equal(capturedQuery.enabled, false);

const jsx = (type, props) => ({ type, props });
const text = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
const nodes = node => node == null || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const names = (...values) => Object.fromEntries(values.map(value => [value, value]));
let state = [], cursor = 0, queryState = { data: fixture, isPending: false, isFetching: false, error: null }, reportArgs;
const imports = {
  react: { useId: () => 'filters', useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; } },
  'react/jsx-runtime': { jsx, jsxs: jsx }, 'date-fns': { format: () => '2026-09-17' },
  '@/hooks/useOrgId': { useOrgId: () => orgId },
  '@/hooks/useFinancialReports': { useIncomeStatementV2: (...args) => { reportArgs = args; return queryState; } },
  '@/lib/expenseLedgerAnalytics': ledger,
  '@/components/finance/ReportCurrencySelect': { default: 'ReportCurrencySelect' },
  '@/components/ui/card': names('Card', 'CardContent', 'CardHeader', 'CardTitle'),
  '@/components/ui/input': names('Input'), '@/components/ui/label': names('Label'), '@/components/ui/button': names('Button'), '@/components/ui/badge': names('Badge'),
  '@/components/ui/table': names('Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow'),
  recharts: names('Bar', 'BarChart', 'CartesianGrid', 'ReferenceLine', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'),
  'lucide-react': names('Activity'),
};
const component = await load('../src/components/finance/LedgerExpenseAnalytics.tsx', imports);
const render = () => { cursor = 0; return component.default(); };
const hasChart = tree => nodes(tree).some(node => node.type === 'BarChart');
let tree = render();
assert.deepEqual(reportArgs, ['2026-09-01', '2026-09-17', 'EGP']);
assert.equal(nodes(tree).find(node => node.type === 'BarChart').props.data.length, 3);
assert.match(text(tree), /القيم السالبة/);
nodes(tree).find(node => node.type === 'ReportCurrencySelect').props.onValueChange('USD');
queryState = { ...queryState, data: [row('600', 'operating_expense', 45, 'USD')] };
tree = render(); assert.equal(reportArgs[2], 'USD'); assert.equal(hasChart(tree), true);
nodes(tree).find(node => node.type === 'Input' && node.props.id === 'filters-start').props.onChange({ target: { value: '2026-09-10' } });
render(); assert.equal(reportArgs[0], '2026-09-10');
for (const invalidStart of ['', '2026-10-01']) {
  state[0] = invalidStart; tree = render(); assert.match(text(tree), /حدد تاريخ البداية/); assert.equal(hasChart(tree), false);
}
state[0] = '2026-09-01';
queryState = { ...queryState, isPending: true };
tree = render(); assert.match(text(tree), /جارٍ تحميل/); assert.equal(hasChart(tree), false, 'A paused first request is not an empty report');
queryState.isPending = false;
queryState = { ...queryState, isFetching: true };
tree = render(); assert.match(text(tree), /جارٍ تحميل/); assert.equal(hasChart(tree), false, 'Do not display a stale result as current');
queryState = { ...queryState, isFetching: false, error: new Error('Denied') };
tree = render(); assert.match(text(tree), /تعذر تحميل/); assert.equal(hasChart(tree), false); assert.doesNotMatch(text(tree), /لا توجد أرصدة/);
queryState = { ...queryState, data: [], error: null };
tree = render(); assert.match(text(tree), /لا توجد أرصدة/); assert.equal(hasChart(tree), false);
queryState.data = [row('600', 'operating_expense', 25, 'EGP')];
tree = render(); assert.match(text(tree), /عدم تطابق/); assert.equal(hasChart(tree), false);
orgId = null; tree = render(); assert.match(text(tree), /اختر شركة/); assert.equal(hasChart(tree), false);

for (const path of ['../src/components/reports/AdvancedAnalytics.tsx', '../src/components/expenses/reports/ExpenseAnalyticsChart.tsx']) {
  const wrapper = await load(path, { 'react/jsx-runtime': imports['react/jsx-runtime'], '@/components/finance/LedgerExpenseAnalytics': { default: component.default } });
  assert.equal(wrapper.default().type, component.default);
}
const monitor = await load('../src/components/admin/PerformanceMonitorTab.tsx', imports);
tree = monitor.default();
assert.match(text(tree), /قياسات الخادم غير متاحة/);
assert.equal(nodes(tree).filter(node => node.type === 'p' && text(node) === 'غير متاح').length, 8);
assert.doesNotMatch(text(tree), /[0-9٠-٩]+\s*(%|GB|ms)/);
let permissions = [];
const exportLinks = await load('../src/components/finance/ReportExportLinks.tsx', {
  ...imports,
  'react-router-dom': names('Link'),
  '@/hooks/usePermissionCheck': { usePermissionCheck: () => ({ hasPermission: permission => permissions.includes(permission) }) },
});
for (const allowed of [[], ['financial_view'], ['reports_export']]) {
  permissions = allowed; tree = exportLinks.default();
  assert.equal(nodes(tree).some(node => node.type === 'Link'), false);
}
permissions = ['financial_view', 'reports_export']; tree = exportLinks.default();
assert.equal(nodes(tree).filter(node => node.type === 'Link').length, 3);
assert.doesNotMatch(text(tree), /تم التصدير بنجاح/);
for (const path of ['../src/components/reports/ReportExporter.tsx', '../src/components/expenses/reports/ExpenseReportExporter.tsx', '../src/components/admin/EnhancedReportExporter.tsx']) {
  const wrapper = await load(path, { 'react/jsx-runtime': imports['react/jsx-runtime'], '@/components/finance/ReportExportLinks': { default: exportLinks.default } });
  assert.equal(wrapper.default().type, exportLinks.default);
}
console.log('Report truthfulness: posted-ledger hook scope, signed amounts, >50 accounts, currency/date controls, missing/failed/loading data, both report entry points, unavailable server telemetry and permission-gated export links passed. Live accounting reconciliation, exported-file acceptance and monitoring delivery remain pending.');
