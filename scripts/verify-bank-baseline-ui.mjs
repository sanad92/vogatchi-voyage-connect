import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real component and event handlers with controlled hook responses.
// This verifies state/permission behavior, not browser layout or live login.
async function loadModule(path, imports) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, Intl, Date, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
let states, cursor, query, saved, failure, toasts;
const jsx = (type, props) => ({ type, props });
const imports = {
  react: {
    useId: () => 'baseline-test',
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'lucide-react': Object.fromEntries(['History', 'Loader2', 'Lock', 'ShieldAlert'].map(name => [name, name])),
  '@/hooks/use-toast': { useToast: () => ({ toast: value => toasts.push(value) }) },
  '@/hooks/useBankBaseline': { useBankBaseline: () => ({
    baseline: query,
    setBaseline: { isPending: false, mutateAsync: async input => { if (failure) throw failure; saved.push(input); } },
  }) },
};
for (const [file, names] of Object.entries({
  badge: ['Badge'], button: ['Button'], card: ['Card', 'CardContent', 'CardHeader', 'CardTitle'],
  checkbox: ['Checkbox'], dialog: ['Dialog', 'DialogContent', 'DialogFooter', 'DialogHeader', 'DialogTitle'],
  input: ['Input'], label: ['Label'], textarea: ['Textarea'],
})) imports[`@/components/ui/${file}`] = Object.fromEntries(names.map(name => [name, name]));
const { BankBaselineCard } = await loadModule('../src/components/finance/BankBaselineCard.tsx', imports);
function reset(overrides = {}) {
  states = []; saved = []; toasts = []; failure = undefined;
  query = { isPending: false, isError: false, isFetching: false, refetch: () => {}, ...overrides };
}
function render() { cursor = 0; return BankBaselineCard({ accountId: 'account-a', currency: 'USD' }); }
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
}
function button(tree, label) { return nodes(tree).find(n => n.type === 'Button' && text(n) === label); }
function fill(suffix, value) {
  nodes(render()).find(n => n.props?.id === `baseline-test-${suffix}`).props.onChange({ target: { value } });
}
reset({ isPending: true, isFetching: true });
assert.ok(nodes(render()).some(n => n.props?.role === 'status'));
assert.ok(!text(render()).includes('غير مضبوط'));
let retries = 0;
reset({ isError: true, error: { message: 'permission rejected' }, refetch: () => { retries++; } });
assert.ok(text(render()).includes('permission rejected'));
assert.ok(!text(render()).includes('غير مضبوط'));
button(render(), 'إعادة المحاولة').props.onClick();
assert.equal(retries, 1);

const baseline = { is_set: false, locked: true, can_manage: false, can_correct: false, history: [] };
reset({ data: baseline });
assert.ok(!button(render(), 'تصحيح خط الأساس'));
assert.ok(text(render()).includes('مالك الشركة فقط'));
reset({ data: { ...baseline, can_manage: true, can_correct: true } });
button(render(), 'تصحيح خط الأساس').props.onClick();
fill('balance', '100'); fill('date', '2026-01-01'); fill('note', 'statement source');
nodes(render()).find(n => n.type === 'Checkbox').props.onCheckedChange(true);
assert.equal(button(render(), 'حفظ').props.disabled, true, 'unset closed baseline still requires a correction reason');
fill('reason', 'documented correction');
assert.equal(button(render(), 'حفظ').props.disabled, false);
query.isFetching = true;
assert.equal(button(render(), 'حفظ').props.disabled, true, 'refetch must not submit using stale permissions');
query.isFetching = false;
failure = { message: 'server permission changed' };
button(render(), 'حفظ').props.onClick();
await new Promise(resolve => setImmediate(resolve));
assert.equal(toasts.at(-1).description, 'server permission changed');
failure = undefined;
button(render(), 'حفظ').props.onClick();
await new Promise(resolve => setImmediate(resolve));
assert.equal(saved.length, 1);
assert.equal(saved[0].forceCorrection, true);
assert.equal(saved[0].reason, 'documented correction');
query.data = { ...query.data, can_manage: false, can_correct: false };
button(render(), 'حفظ').props.onClick();
await new Promise(resolve => setImmediate(resolve));
assert.equal(saved.length, 1, 'permission revocation must block the submit handler');

// Execute the real close mutation's success handler and inspect cache refreshes.
const invalidations = [];
const { useBankReconciliation } = await loadModule('../src/hooks/useBankReconciliation.ts', {
  '@tanstack/react-query': {
    useQuery: value => value, useMutation: value => value,
    useQueryClient: () => ({ invalidateQueries: async ({ queryKey }) => invalidations.push(queryKey) }),
  },
  '@/integrations/supabase/client': { supabase: {} },
  '@/lib/supabaseRpc': { callUntypedRpc: () => {} },
  '@/hooks/useOrgId': { useOrgId: () => 'org-a' },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user: { id: 'user-a' } }) },
});
await useBankReconciliation('account-a', 'session-a').close.onSuccess();
assert.ok(invalidations.some(key => key[0] === 'bank-account-baseline'));
console.log('Bank baseline UI: loading, API errors, retry, closed/unset correction, permission changes, audit intent and close refresh passed.');
