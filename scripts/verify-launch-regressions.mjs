import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}

const { calculateFinancialBreakdown, calculateFlightPrices, calculateNights } = await load('../src/utils/calculationHelpers.ts');
const totals = calculateFinancialBreakdown({ subtotal: 1000, discountAmount: 100, vatRate: 14, paidAmount: 200, totalCost: 600 });
assert.equal(totals.totalProfit, 300, 'VAT is not profit: 900 net less 600 supplier cost');
assert.equal(totals.vatAmount, 126);
assert.equal(totals.remainingAmount, 826);
assert.equal(calculateFinancialBreakdown({ subtotal: 0.3, paidAmount: 0.1 }).remainingAmount, 0.2);
assert.equal(calculateFinancialBreakdown({ subtotal: 100, paidAmount: 120 }).remainingAmount, 0);
assert.equal(calculateFlightPrices(1000, 3, 2200, 150).totalProfit, 950, 'supplier cost is the total, not per passenger');
assert.equal(calculateNights('2026-10-20T12:00:00Z', '2026-10-21T13:00:00Z'), 2);

let org = 'org-a';
const finance = await load('../src/hooks/finance/useFinanceRpcs.ts', {
  '@tanstack/react-query': { useQuery: x => x },
  '@/integrations/supabase/client': { supabase: {} },
  '@/hooks/useOrgId': { useOrgId: () => org },
  '@/hooks/use-toast': { toast: () => {} },
});
for (const name of ['useCustomerLedgerRpc', 'useSupplierLedgerRpc']) {
  org = 'org-a'; const first = finance[name]('record-1');
  org = 'org-b'; const second = finance[name]('record-1');
  assert.notDeepEqual(first.queryKey, second.queryKey, `${name} cannot reuse another company's cached ledger`);
  org = null; assert.equal(finance[name]('record-1').enabled, false);
}

let query;
let apiError = null;
const filters = [];
const chain = {
  select: () => chain,
  eq: (key, value) => { filters.push([key, value]); return chain; },
  order: async () => ({ data: [], error: apiError }),
};
const panel = await load('../src/components/quotes/QuoteBookingsPanel.tsx', {
  '@tanstack/react-query': { useQuery: x => { query = x; return { data: [] }; } },
  '@/integrations/supabase/client': { supabase: { from: () => chain } },
  '@/hooks/useOrgId': { useOrgId: () => org },
  'react-router-dom': { useNavigate: () => () => {} },
  '@/components/ui/card': {}, '@/components/ui/button': {}, '@/components/ui/badge': {},
  'lucide-react': {}, 'react/jsx-runtime': {},
});
org = 'org-a'; panel.default({ quoteId: 'quote-1' });
const firstKey = query.queryKey;
await query.queryFn();
assert.deepEqual(filters, [['organization_id', 'org-a'], ['quote_id', 'quote-1']]);
org = 'org-b'; panel.default({ quoteId: 'quote-1' });
assert.notDeepEqual(firstKey, query.queryKey);
apiError = new Error('permission denied'); await assert.rejects(query.queryFn(), /permission denied/);
org = null; panel.default({ quoteId: 'quote-1' });
assert.equal(query.enabled, false);
await assert.rejects(query.queryFn());
console.log('Launch regressions passed: real financial helpers, company-isolated ledger caches and quote-booking reads.');