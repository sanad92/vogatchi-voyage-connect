import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import vm from 'node:vm';

const fixture = JSON.parse(await readFile(new URL('./fixtures/schema-compatibility-baseline.json', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../supabase/migrations/20260916193651_restore_cms_editor_columns.sql', import.meta.url), 'utf8');
const db = new PGlite();
const snapshots = new Map();
for (const table of fixture.tables) {
  const definitions = table.columns.map(column => `"${column.name}" ${column.type}${column.nullable === 'NO' ? ' NOT NULL' : ''}${column.default ? ` DEFAULT ${column.default}` : ''}`);
  await db.exec(`CREATE TABLE public."${table.table_name}" (${definitions.join(',')})`);
  const fields = table.columns.filter(column => column.nullable === 'NO' && !column.default);
  const values = fields.map(column => ['numeric','int4'].includes(column.type) ? 1 : column.type === 'jsonb' ? '{}' : column.type === 'uuid' ? '00000000-0000-4000-8000-000000000001' : `fixture-${column.name}`);
  if (fields.length) await db.query(`INSERT INTO public."${table.table_name}" (${fields.map(c => `"${c.name}"`).join(',')}) VALUES (${values.map((_, i) => `$${i+1}`).join(',')})`, values);
  else await db.exec(`INSERT INTO public."${table.table_name}" DEFAULT VALUES`);
  snapshots.set(table.table_name, (await db.query(`SELECT ${table.columns.map(c => `"${c.name}"`).join(',')} FROM public."${table.table_name}"`)).rows);
  await db.exec(`ALTER TABLE public."${table.table_name}" ENABLE ROW LEVEL SECURITY; CREATE POLICY preserve_policy ON public."${table.table_name}" FOR SELECT USING (false);`);
}
const policiesBefore = (await db.query('SELECT tablename,policyname,qual FROM pg_policies ORDER BY tablename')).rows;
await db.exec(migration);
await db.exec(migration);
for (const table of fixture.tables) {
  const after = (await db.query(`SELECT ${table.columns.map(c => `"${c.name}"`).join(',')} FROM public."${table.table_name}"`)).rows;
  assert.deepEqual(after, snapshots.get(table.table_name), `${table.table_name}: existing data must be preserved`);
}
assert.deepEqual((await db.query('SELECT tablename,policyname,qual FROM pg_policies ORDER BY tablename')).rows, policiesBefore);
const columns = (await db.query("SELECT table_name,column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name")).rows;
const originalCount = fixture.tables.reduce((sum, table) => sum + table.columns.length, 0);
assert.equal(columns.length - originalCount, 32);
assert.equal((await db.query('SELECT rating FROM hotels')).rows[0].rating, null, 'Existing hotels must not gain an invented review rating');
await db.query('UPDATE hotels SET name_ar=$1,features=$2,contact_info=$3', ['فندق تجريبي', JSON.stringify(['Wi-Fi']), JSON.stringify({ phone: 'TEST' })]);
assert.deepEqual((await db.query('SELECT features FROM hotels')).rows[0].features, ['Wi-Fi']);
await db.query('UPDATE blocks SET content=$1,layout_settings=$2,style_settings=$3,section=$4', [JSON.stringify({ title: 'Content' }), JSON.stringify({ columns: 2 }), JSON.stringify({ text_color: '#000000' }), 'main']);
assert.equal((await db.query('SELECT layout_settings FROM blocks')).rows[0].layout_settings.columns, 2);
await db.query('UPDATE supplier_currencies SET notes=$1', ['Test note']);
assert.equal((await db.query('SELECT notes FROM supplier_currencies')).rows[0].notes, 'Test note');
const generated = await readFile(new URL('../src/integrations/supabase/types.ts', import.meta.url), 'utf8');
for (const table of fixture.tables) {
  const section = generated.split(`      ${table.table_name}: {\n`)[1].split(/^      \w+: \{/m)[0];
  for (const kind of ['Row','Insert','Update']) {
    const block = section.match(new RegExp(`        ${kind}: \\{\\n([\\s\\S]*?)\\n        \\}`))[1];
    const names = [...block.matchAll(/^          (\w+)\??:/gm)].map(match => match[1]).sort();
    assert.deepEqual(names, columns.filter(row => row.table_name === table.table_name).map(row => row.column_name).sort(), `${table.table_name}.${kind}: types match migrated schema`);
  }
}
const source = await readFile(new URL('../src/lib/cmsRecords.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const native = { type: 'hero', content: { title: 'Test' }, layout_settings: { columns: 2 }, style_settings: {}, title: null, section: null };
const legacy = { ...native, content: JSON.stringify(native.content), layout_settings: JSON.stringify(native.layout_settings) };
assert.equal(JSON.stringify(exports.normalizePageBlock(native)), JSON.stringify(exports.normalizePageBlock(legacy)), 'Native and legacy JSON content must render identically');
assert.equal(exports.normalizePage({ title: 'Page', is_published: false, description: 'Description' }).name, 'Page');
await db.close();
console.log('Schema compatibility: 32 additive columns across 6 tables; repeat application, preserved data/policies, JSON round-trip, matching TypeScript fields and legacy CMS content passed. Remote migration and live RLS acceptance remain pending.');
