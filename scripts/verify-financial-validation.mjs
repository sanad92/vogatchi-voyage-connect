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
  '@tanstack/react-query': { useQuery(options) { loadReport = options.queryFn; return queryState; } },
  '@/integrations/supabase/client': { supabase: { from } },
  '@/hooks/useOrgId': { useOrgId: () => 'test-organization' },
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
console.log('Financial validation shows source failures separately and only compares supplier payments in matching currencies.');
