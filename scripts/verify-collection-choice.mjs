import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real dialog and inspect its RPC arguments without connecting to Supabase.
const source = await readFile(new URL('../src/components/bookings/workspace/RecordPaymentDialog.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const states = [];
let cursor;
let mutation;
let receipt;
const ui = new Proxy({}, { get: (_, name) => name });
const jsx = (type, props) => ({ type, props });
const imports = {
  '@/lib/specializedBookingFinance': { invalidateSpecializedBookingLists() {} },
  react: {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return states[index] ??= { current: initial };
    },
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'lucide-react': ui,
  '@tanstack/react-query': {
    useQueryClient: () => ({ invalidateQueries() {} }),
    useMutation(config) { mutation = config; return { isPending: false }; },
  },
  '@/hooks/finance/useFinanceRpcs': {
    useTreasuryAccounts: () => ({ data: [{ id: 'cash-account', currency: 'EGP', treasury_kind: 'cash' }] }),
  },
  '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
  '@/hooks/useOrgId': { useOrgId: () => 'org' },
  '@/lib/supabaseRpc': {
    async callUntypedRpc(name, payload) {
      assert.equal(name, 'record_customer_payment');
      receipt = payload;
      return { data: 'receipt-id' };
    },
  },
};
const exports = {};
vm.runInNewContext(compiled, {
  exports, crypto: { randomUUID }, require: name => {
    if (name.startsWith('@/components/ui/')) return ui;
    if (!(name in imports)) throw new Error('Unexpected import ' + name);
    return imports[name];
  },
});
const props = {
  bookingId: 'booking', currency: 'EGP', outstanding: 826,
  invoices: [{ id: 'invoice', invoice_number: 'INV-1', remaining: 826 }],
};
function render() {
  cursor = 0;
  return exports.RecordPaymentDialog(props);
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || !tree.props) return [];
  return [tree, ...nodes(tree.props.children)];
}
function choose(value) {
  const select = nodes(render()).find(node => node.type === 'Select'
    && nodes(node).some(option => option.type === 'SelectItem' && option.props.value === value));
  assert.ok(select, 'available option ' + value);
  select.props.onValueChange(value);
}
function enterAmount(value) {
  nodes(render()).find(node => node.props.id === 'pay-amount').props.onChange({ target: { value } });
}
async function submit() {
  render();
  return mutation.mutationFn();
}

choose('cash-account');
await assert.rejects(submit(), /اختر فاتورة/);
assert.equal(receipt, undefined);
choose('invoice');
await submit();
assert.equal(receipt._invoice_id, 'invoice');
assert.equal(receipt._amount, 826);
const ref = receipt._client_ref;
await submit();
assert.equal(receipt._client_ref, ref);

mutation.onSuccess();
props.invoices[0].remaining = 526;
choose('cash-account');
choose('invoice');
await submit();
assert.equal(receipt._amount, 526);

choose('advance');
enterAmount('900');
await submit();
assert.equal(receipt._invoice_id, null);
assert.equal(receipt._amount, 900);
assert.notEqual(receipt._client_ref, ref);

props.fixedInvoiceId = 'invoice';
await submit();
assert.equal(receipt._invoice_id, 'invoice');
props.invoices = [];
await assert.rejects(submit(), /اختر فاتورة/);
console.log('Receipt intent, invoice balance refresh, retry, explicit advance and fixed invoice checks passed.');
