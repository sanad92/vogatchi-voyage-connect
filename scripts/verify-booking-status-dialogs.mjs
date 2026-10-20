import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
for (const type of ['flight', 'hotel']) {
  for (const action of ['Cancel', 'Refund']) {
    let statusError = null, rpcError = null, response = true;
    const calls = [], successes = [], errors = [];
    let closed = 0, invalidated = 0;
    const source = await readFile(new URL(`../src/components/${type}-bookings/dialogs/${action}BookingDialog.tsx`, import.meta.url), 'utf8');
    const imports = {
      react: { useState: value => [value, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle'].map(x => [x, x])),
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/textarea': { Textarea: 'Textarea' },
      sonner: { toast: { success: x => successes.push(x), error: x => errors.push(x) } },
      '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: () => invalidated++ }) },
      '@/integrations/supabase/client': { supabase: {
        from: () => ({ select: () => ({ or: async () => ({ data: [{ id: 'status-1' }], error: statusError }) }) }),
        rpc: async (name, args) => { calls.push({ name, args }); return { data: response, error: rpcError }; },
      } },
    };
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
      { exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
    const submit = () => nodes(exports.default({ open: true, bookingId: 'booking-1', onClose: () => closed++ }))
      .filter(x => x.type === 'Button').at(-1).props.onClick();
    statusError = new Error('status denied'); await submit();
    assert.equal(calls.length, 0); assert.equal(successes.length, 0);
    statusError = null; rpcError = new Error('permission denied'); await submit();
    assert.equal(successes.length, 0); assert.equal(closed, 0); assert.equal(invalidated, 0);
    rpcError = null; response = false; await submit();
    assert.equal(successes.length, 0); assert.equal(closed, 0);
    response = true; await submit();
    assert.equal(successes.length, 1); assert.equal(closed, 1); assert.equal(invalidated, 1);
    assert.equal(calls.at(-1).args.p_booking_type, type);
    assert.equal(calls.at(-1).args.p_booking_id, 'booking-1');
    assert.equal(errors.length, 3);
  }
}
console.log('All four booking-status dialogs passed: correct table type, denied lookup/RPC and missing acknowledgment cannot show success.');