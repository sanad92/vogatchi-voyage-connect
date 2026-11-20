import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

async function load(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, URLSearchParams, require: name => {
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
  '@/lib/supabaseRpc': {}, react: React,
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
const { useInvoiceStats } = await load('../src/hooks/invoices/useInvoiceStats.tsx', { react: { useMemo: fn => fn() } });
const stats = useInvoiceStats([{ payment_status: 'paid' }, { payment_status: 'partial' }, { payment_status: 'unpaid' }]);
assert.equal(stats.paidInvoices, 1, "database 'paid' status counts as fully paid");
assert.equal(stats.partiallyPaidInvoices, 1, "database 'partial' status counts as partly paid");

const redirects = await load('../src/lib/safeRedirect.ts');
const plan = '10000000-0000-4000-8000-000000000001';
const checkout = `/payment?plan=${plan}&billing=yearly`;
assert.equal(redirects.getSubscriptionCheckoutContinuation(`${checkout}&amount=1&booking_id=ignored#fragment`), checkout);
assert.equal(redirects.getSubscriptionCheckoutContinuation(`/payment?plan=${plan}`), `/payment?plan=${plan}&billing=monthly`);
for (const path of ['/payment?plan=bad', '/bookings/one?plan=' + plan, 'https://other.example' + checkout, '//other.example' + checkout]) {
  assert.equal(redirects.getSubscriptionCheckoutContinuation(path), null);
}

let actor = null;
let company = null;
let role = null;
let capabilitiesError = false;
const planData = { id: plan, name: 'Basic', name_ar: 'أساسية', price_monthly: 100, price_yearly: 1000 };
class FunctionsHttpError extends Error {}
const Container = ({ children }) => React.createElement('div', null, children);
const Button = ({ children, asChild, disabled, type }) => asChild ? children : React.createElement('button', { disabled, type }, children);
const Link = ({ to, children }) => React.createElement('a', { href: to }, children);
const icon = () => null;
const paymentView = await load('../src/pages/PaymentPage.tsx', {
  react: React, 'react/jsx-runtime': jsxRuntime,
  'react-router-dom': { Link, useNavigate: () => () => {}, useSearchParams: () => [new URL(checkout, 'https://safarerp.com').searchParams] },
  '@supabase/supabase-js': { FunctionsHttpError },
  '@tanstack/react-query': { useQuery: ({ queryKey }) => ({
    data: queryKey[0] === 'payment-plan' ? planData : null,
    isError: capabilitiesError && queryKey[0] === 'subscription-checkout-capabilities',
  }) },
  '@/integrations/supabase/client': { supabase: {} },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user: actor, isLoggedIn: () => Boolean(actor) }) },
  '@/contexts/OrganizationContext': { useOrganization: () => ({ organizationId: company, orgRole: role }) },
  '@/lib/safeRedirect': redirects,
  '@/components/ui/card': { Card: Container, CardContent: Container, CardHeader: Container, CardTitle: Container },
  '@/components/ui/button': { Button }, '@/components/ui/input': { Input: icon }, '@/components/ui/label': { Label: Container },
  '@/components/ui/badge': { Badge: Container }, '@/components/ui/separator': { Separator: icon }, sonner: {},
  'lucide-react': { CreditCard: icon, ArrowRight: icon, Shield: icon, Clock: icon, CheckCircle2: icon, Loader2: icon, AlertTriangle: icon, Sparkles: icon },
});
const renderPayment = () => renderToStaticMarkup(React.createElement(paymentView.default));
const continuation = new URLSearchParams({ redirect: checkout }).toString();
assert.ok(renderPayment().includes(`/login?${continuation}`));
assert.ok(renderPayment().includes(`/signup?${continuation}`));
actor = { id: 'buyer' };
assert.ok(renderPayment().includes(`/register-organization?${continuation}`));
company = 'org-a'; role = 'viewer';
assert.match(renderPayment(), /شراء الاشتراك متاح لمالك المؤسسة أو مديرها/);
assert.match(renderPayment(), /<button disabled=""[^>]*>ادفع/);
role = 'owner'; capabilitiesError = true;
assert.match(renderPayment(), /تعذّر التحقق من بيانات الاشتراك/);
assert.match(renderPayment(), /إعادة المحاولة/);
assert.match(renderPayment(), /<button disabled=""[^>]*>ادفع/);

const organizationView = await load('../src/pages/RegisterOrganization.tsx', {
  react: React, 'react/jsx-runtime': jsxRuntime,
  'react-router-dom': {
    Navigate: ({ to }) => React.createElement('div', { 'data-target': to }),
    useNavigate: () => () => {}, useSearchParams: () => [new URLSearchParams({ redirect: checkout })],
  },
  '@/integrations/supabase/client': { supabase: {} },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user: actor }) },
  '@/contexts/OrganizationContext': { useOrganization: () => ({ hasOrganization: true }) },
  '@/contexts/LanguageContext': { useLanguage: () => ({ dir: 'rtl' }) },
  '@/components/ui/button': { Button }, '@/components/ui/input': { Input: icon }, '@/components/ui/label': { Label: Container },
  '@/lib/organizationContacts': {}, '@/lib/safeRedirect': redirects,
  sonner: {}, 'lucide-react': { Building2: icon, ArrowLeft: icon },
});
assert.ok(renderToStaticMarkup(React.createElement(organizationView.default)).includes(checkout.replaceAll('&', '&amp;')));

console.log('Launch regressions passed: financial helpers, tenant-scoped ledgers, quote-booking reads and subscription checkout handoffs.');
