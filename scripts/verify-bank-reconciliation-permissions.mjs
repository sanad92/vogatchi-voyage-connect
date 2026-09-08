import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Renders the real BankReconciliation page with controlled hook responses to
// verify that every mutating action follows the server permission decision.
async function loadModule(path, imports) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, Intl, Date, URL, Number, Math, console, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

let states, cursor, permission, workspace;
const jsx = (type, props) => ({ type, props });
const noop = () => {};
const mutation = () => ({ isPending: false, mutateAsync: async () => ({}) });

const session = {
  id: 'session-1', statement_start: '2026-09-01', statement_end: '2026-09-30',
  statement_closing_balance: 100, currency: 'EGP', status: 'in_review',
};
const workspaceData = {
  session,
  summary: { current_book_closing_balance: 100, difference: 0, line_count: 1, matched_count: 1, ignored_count: 0, unresolved_count: 0 },
  lines: [{ id: 'line-1', transaction_date: '2026-09-02', direction: 'credit', amount: 50, currency: 'EGP', reference: null, description: 'إيداع', status: 'unmatched', ignored_reason: null, import_row: 1, matched_amount: 0, match_count: 0 }],
  matches: [], book_transactions: [], adjustment_accounts: [{ id: 'acc-1', code: '1000', name: 'حساب', type: 'asset' }],
};

const imports = {
  react: {
    useEffect: noop,
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
  },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  papaparse: { default: { parse: () => ({ data: [], errors: [] }), unparse: () => '' } },
  xlsx: { read: () => ({}), utils: { sheet_to_json: () => [] }, SSF: { parse_date_code: () => null } },
  'lucide-react': Object.fromEntries(['AlertTriangle', 'CheckCircle2', 'Download', 'FileSpreadsheet', 'Landmark', 'Link2', 'Loader2', 'Plus', 'Sparkles', 'Unlink'].map(n => [n, n])),
  '@/hooks/use-toast': { useToast: () => ({ toast: noop }) },
  '@/components/finance/BankBaselineCard': { default: 'BankBaselineCard' },
  '@/hooks/useBankReconciliation': {
    useBankReconciliation: () => ({
      orgId: 'org-1', permission,
      accounts: { data: [{ id: 'account-1', account_name: 'البنك الأهلي', currency: 'EGP' }] },
      sessions: { data: [session] },
      workspace: { data: workspace, isLoading: false },
      createSession: mutation(), importLines: mutation(), autoMatch: mutation(), manualMatch: mutation(),
      unmatch: mutation(), setIgnored: mutation(), createAdjustment: mutation(), approve: mutation(), close: mutation(),
    }),
  },
};
for (const [file, names] of Object.entries({
  badge: ['Badge'], button: ['Button'], card: ['Card', 'CardContent', 'CardHeader', 'CardTitle'],
  dialog: ['Dialog', 'DialogContent', 'DialogFooter', 'DialogHeader', 'DialogTitle'],
  input: ['Input'], label: ['Label'], progress: ['Progress'],
  select: ['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'],
  tabs: ['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'],
  table: ['Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow'],
  textarea: ['Textarea'],
})) imports[`@/components/ui/${file}`] = Object.fromEntries(names.map(n => [n, n]));

const mod = await loadModule('../src/pages/BankReconciliation.tsx', imports);
const BankReconciliation = mod.default;

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  const nested = typeof node.type === 'function' ? nodes(node.type(node.props || {})) : [];
  return [node, ...nested, ...nodes(node.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  const nested = typeof node.type === 'function' ? text(node.type(node.props || {})) : '';
  return nested + text(node.props?.children);
}
function render(perm, ws = workspaceData) {
  permission = { allowed: false, isLoading: false, isError: false, refetch: noop, ...perm };
  workspace = ws;
  states = ['account-1', 'session-1', false, false, null, {}]; cursor = 0;
  return BankReconciliation();
}
function button(tree, label) {
  const found = nodes(tree).find(n => n.type === 'Button' && text(n).includes(label));
  assert.ok(found, `Button not found: ${label}`);
  return found;
}
const GATED = ['دورة جديدة', 'استيراد كشف', 'مطابقة آلية', 'اعتماد', 'إنشاء', 'استيراد'];
const editableFlag = tree => nodes(tree).filter(n => typeof n.type === 'function' && 'editable' in (n.props || {})).map(n => n.props.editable);

// 1. Allowed: every gated action is enabled and no read-only notice is shown.
let tree = render({ allowed: true });
for (const label of GATED) assert.equal(button(tree, label).props.disabled, false, `${label} should be enabled when allowed`);
assert.deepEqual(editableFlag(tree), [true, true], 'row-level match/ignore/adjust/unmatch actions enabled when allowed');
assert.ok(!text(tree).includes('وضع القراءة فقط'), 'read-only notice should be hidden when allowed');

// 2. Denied: gated actions disabled, row actions hidden, read-only notice in Arabic.
tree = render({ allowed: false });
for (const label of GATED) assert.equal(button(tree, label).props.disabled, true, `${label} must be disabled when denied`);
assert.deepEqual(editableFlag(tree), [false, false], 'row-level match/ignore/adjust/unmatch actions blocked when denied');
assert.ok(text(tree).includes('وضع القراءة فقط'), 'read-only notice must be shown when denied');
// Read-only data stays accessible.
assert.ok(text(tree).includes('تصدير'), 'export stays available');
assert.equal(button(tree, 'تصدير').props.disabled, false, 'export must stay enabled in read-only mode');
assert.ok(nodes(tree).some(n => n.type === 'Table'), 'statement table remains visible in read-only mode');

// 3. Loading: no cached allow, actions disabled, loading message shown.
tree = render({ allowed: false, isLoading: true });
for (const label of GATED) assert.equal(button(tree, label).props.disabled, true, `${label} must be disabled while loading`);
assert.ok(text(tree).includes('جارٍ التحقق من صلاحيات'), 'loading message must be shown');

// 4. Error: actions disabled, Arabic error state with retry.
tree = render({ allowed: false, isError: true });
for (const label of GATED) assert.equal(button(tree, label).props.disabled, true, `${label} must be disabled on error`);
assert.ok(text(tree).includes('تعذر التحقق من الصلاحيات'), 'error message must be shown');
assert.ok(button(tree, 'إعادة المحاولة'), 'retry action must be available on error');

// 5. Close action follows the same decision.
const closed = { ...workspaceData, session: { ...session, status: 'reconciled' } };
assert.equal(button(render({ allowed: true }, closed), 'إغلاق').props.disabled, false, 'close enabled when allowed');
assert.equal(button(render({ allowed: false }, closed), 'إغلاق').props.disabled, true, 'close disabled when denied');

console.log('bank reconciliation permission UI checks passed');
