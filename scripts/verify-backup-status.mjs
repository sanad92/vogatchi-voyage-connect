import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/admin/BackupManagementTab.tsx', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exports = {};
let queryState, capturedQuery, user = { id: 'admin-a' }, requests = 0;
const jsx = (type, props) => ({ type, props });
const imports = {
  '@tanstack/react-query': { useQuery: options => { capturedQuery = options; return queryState; } },
  '@/hooks/useOptimizedAuth': { useOptimizedAuth: () => ({ user }) },
  '@/integrations/supabase/client': { supabase: { from: () => {
    requests++;
    const query = { select: columns => { assert.equal(columns, 'id,backup_type,status,started_at'); return query; }, order: () => query, limit: async () => ({ data: [], error: null }) };
    return query;
  } } },
  '@/components/ui/card': Object.fromEntries(['Card','CardContent','CardHeader','CardTitle'].map(name => [name,name])),
  '@/components/ui/button': { Button: 'Button' }, '@/components/ui/badge': { Badge: 'Badge' },
  'lucide-react': {}, 'react/jsx-runtime': { jsx, jsxs: jsx },
};
vm.runInNewContext(output, { exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
const text = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
const nodes = node => node == null || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
queryState = { data: [], isError: false, isLoading: false };
let tree = exports.default();
assert.match(text(tree), /لا توجد سجلات في التطبيق/);
assert.match(text(tree), /الحماية غير متحقق منها/);
assert.equal(nodes(tree).filter(node => node.type === 'Button' && !node.props.asChild).every(node => node.props.disabled), true);
queryState.data = ['completed','in_progress','failed'].map((status, i) => ({ id: String(i), backup_type: 'full', status, started_at: null, file_size: 'FAKE SIZE', notes: 'FAKE SUCCESS', file_url: 'https://untrusted.test/backup' }));
tree = exports.default();
assert.equal(nodes(tree).filter(node => node.type === 'Badge' && text(node) === 'غير متحقق').length, 3);
assert.doesNotMatch(JSON.stringify(tree), /FAKE|untrusted/);
assert.doesNotMatch(text(tree), /جاري التنفيذ|مكتملة/);
queryState.isError = true; queryState.data = [];
tree = exports.default();
assert.ok(nodes(tree).some(node => node.props?.role === 'alert'));
assert.doesNotMatch(text(tree), /لا توجد سجلات في التطبيق/);
await capturedQuery.queryFn(); assert.equal(requests, 1);
user = null; exports.default();
assert.equal(capturedQuery.enabled, false);
await assert.rejects(capturedQuery.queryFn()); assert.equal(requests, 1);
console.log('Backup status: unverified legacy rows, no fake success/actions, read errors and signed-out access passed. Provider backups and restore are not covered.');
