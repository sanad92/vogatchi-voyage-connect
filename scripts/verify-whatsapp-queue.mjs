process.on('uncaughtException', e => { console.error(e.message, e.where || ''); process.exit(1); });
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadTS(path) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; vm.runInNewContext(code, { exports }); return exports;
}
const { botMayReply } = loadTS('../supabase/functions/_shared/whatsapp-bot-policy.ts');
for (const c of [{ status: 'pending' }, { status: 'closed' }, { status: 'resolved' }, { status: 'archived' },
  { status: 'active', assigned_to: 'employee' }, { status: 'active', assignment_reason: 'chatbot_handoff' },
  { status: 'active', assignment_reason: 'human_queue' }]) assert.equal(botMayReply(c), false);
assert.equal(botMayReply({ status: 'active' }), true);
const { orderQueue, isQueuedConversation } = loadTS('../src/lib/whatsappQueue.ts');
assert.equal(isQueuedConversation({ id: 'closed', status: 'closed' }), false);
assert.equal(isQueuedConversation({ id: 'assigned', assigned_to: 'e' }), false);
assert.equal(isQueuedConversation({ id: 'waiting', status: 'pending' }), true);
assert.deepEqual(Array.from(orderQueue([
  { id: 'normal', priority: 'normal', created_at: '2026-01-01' },
  { id: 'urgent-new', priority: 'urgent', created_at: '2026-02-01' },
  { id: 'urgent-old', priority: 'urgent', created_at: '2026-01-01' },
])).map(c => c.id), ['urgent-old', 'urgent-new', 'normal']);
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const org = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const user = '00000000-0000-4000-8000-000000000011';
const employee = '00000000-0000-4000-8000-000000000021';
const user2 = '00000000-0000-4000-8000-000000000012';
const employee2 = '00000000-0000-4000-8000-000000000022';
const c1 = '00000000-0000-4000-8000-000000000031';
const c2 = '00000000-0000-4000-8000-000000000032';
const c3 = '00000000-0000-4000-8000-000000000033';
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
CREATE TABLE organizations(id uuid PRIMARY KEY);
CREATE TABLE employees(id uuid PRIMARY KEY,organization_id uuid,is_active boolean);
CREATE TABLE profiles(id uuid PRIMARY KEY,linked_employee_id uuid, employee_id text);
CREATE TABLE organization_members(organization_id uuid,user_id uuid,is_active boolean);
CREATE FUNCTION org_has_active_subscription(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE TABLE test_grants(organization_id uuid,user_id uuid,permission text);
CREATE FUNCTION has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
 SELECT EXISTS(SELECT 1 FROM public.test_grants WHERE organization_id=$1 AND user_id=auth.uid() AND permission=$2) $$;
CREATE FUNCTION _org_permission_state(uuid,uuid,text) RETURNS TABLE(granted boolean,data_scope text) LANGUAGE sql SECURITY DEFINER AS $$
 SELECT EXISTS(SELECT 1 FROM public.test_grants WHERE organization_id=$1 AND user_id=$2 AND permission=$3),'all'::text $$;
CREATE TABLE whatsapp_conversations(id uuid PRIMARY KEY,organization_id uuid,assigned_to uuid,status text,priority text,created_at timestamptz DEFAULT now(),auto_assigned boolean,assignment_reason text);
CREATE TABLE whatsapp_chatbot_settings(organization_id uuid PRIMARY KEY);
CREATE TABLE whatsapp_messages(id uuid PRIMARY KEY,organization_id uuid,conversation_id uuid,direction text,content text);
CREATE TABLE conversation_assignments_history(conversation_id uuid,organization_id uuid,action text,to_user_id uuid,performed_by uuid,reason text,metadata jsonb);
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_tenant ON whatsapp_conversations TO authenticated USING (has_org_permission(organization_id,'whatsapp_view')) WITH CHECK(has_org_permission(organization_id,'whatsapp_view'));
INSERT INTO organizations VALUES('${org}'),('${other}');
INSERT INTO employees VALUES('${employee}','${org}',true),('${employee2}','${org}',true);
INSERT INTO profiles(id,linked_employee_id) VALUES('${user}','${employee}'),('${user2}','${employee2}');
INSERT INTO organization_members VALUES('${org}','${user}',true),('${org}','${user2}',true);
INSERT INTO test_grants SELECT '${org}',u,p FROM unnest(ARRAY['${user}'::uuid,'${user2}'::uuid]) u CROSS JOIN unnest(ARRAY['whatsapp_view','customer_service_edit']) p;
INSERT INTO whatsapp_conversations(id,organization_id,status,priority) VALUES('${c1}','${org}','pending','normal'),('${c2}','${org}','pending','urgent'),('${c3}','${other}','pending','urgent');
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20260910224026_whatsapp_queue_routing.sql',import.meta.url),'utf8'));
await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
assert.equal((await db.query(`SELECT wa_claim_conversation('${org}',NULL) AS id`)).rows[0].id,c2);
await assert.rejects(db.query(`SELECT wa_claim_conversation('${other}','${c3}')`), /غير مصرح/);
await db.exec(`SELECT set_config('request.jwt.claim.sub','${user2}',false)`);
await assert.rejects(db.query(`SELECT wa_claim_conversation('${org}','${c2}')`), /لم تعد متاحة/);
await assert.rejects(db.query(`UPDATE whatsapp_conversations SET assigned_to='${employee2}' WHERE id='${c2}'`), /التحويل/);
await assert.rejects(db.query(`SELECT wa_dispatch_queue('${org}')`), /permission denied/);
await assert.rejects(db.query(`INSERT INTO wa_queue_agents(organization_id,user_id,employee_id,available) VALUES('${org}','${user2}','${employee}',true)`), /row-level security/);
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO wa_routing_settings VALUES('${org}','automatic',1);
INSERT INTO wa_queue_agents(organization_id,user_id,employee_id,available) VALUES('${org}','${user}','${employee}',true),('${org}','${user2}','${employee2}',true);
SET ROLE service_role;`);
assert.equal((await db.query(`SELECT wa_dispatch_queue('${org}') AS n`)).rows[0].n,1);
assert.equal((await db.query(`SELECT assigned_to FROM whatsapp_conversations WHERE id='${c1}'`)).rows[0].assigned_to,employee2);
assert.equal((await db.query(`SELECT wa_dispatch_queue('${org}') AS n`)).rows[0].n,0);
await db.exec(`RESET ROLE; UPDATE whatsapp_conversations SET assigned_to=NULL,status='pending' WHERE id='${c1}';
UPDATE wa_queue_agents SET heartbeat_at=now()-interval '5 minutes' WHERE user_id='${user2}'; SET ROLE service_role;`);
assert.equal((await db.query(`SELECT wa_dispatch_queue('${org}') AS n`)).rows[0].n,0);
await db.exec(`RESET ROLE; UPDATE wa_queue_agents SET heartbeat_at=now() WHERE user_id='${user2}';
DELETE FROM public.test_grants WHERE user_id='${user2}' AND permission='customer_service_edit'; SET ROLE service_role;`);
assert.equal((await db.query(`SELECT wa_dispatch_queue('${org}') AS n`)).rows[0].n,0);
assert.equal((await db.query(`SELECT count(*)::integer n FROM conversation_assignments_history`)).rows[0].n,2);
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
await assert.rejects(db.query(`SELECT wa_claim_conversation('${org}',NULL)`), /التوزيع تلقائي/);
await db.exec(`RESET ROLE; UPDATE wa_routing_settings SET mode='manual'; SET ROLE authenticated;`);
await assert.rejects(db.query(`SELECT wa_claim_conversation('${org}',NULL)`), /الأقصى/);
// Guided intake persists answers in the tenant and only advances once per inbound message.
const intakeConversation = '00000000-0000-4000-8000-000000000034';
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO whatsapp_conversations(id,organization_id,status) VALUES('${intakeConversation}','${org}','active');`);
for (let i=0;i<6;i++) {
  const id = `00000000-0000-4000-8000-00000000004${i}`;
  await db.exec(`RESET ROLE; INSERT INTO whatsapp_messages VALUES('${id}','${org}','${intakeConversation}','inbound','answer ${i}'); SET ROLE service_role;`);
  const result=(await db.query(`SELECT wa_intake_step('${org}','${intakeConversation}','${id}') AS result`)).rows[0].result;
  assert.equal(result.completed,i===5);
  const duplicate=(await db.query(`SELECT wa_intake_step('${org}','${intakeConversation}','${id}') AS result`)).rows[0].result;
  assert.equal(duplicate.skipped,true);
}
assert.equal((await db.query(`SELECT status FROM whatsapp_conversations WHERE id='${intakeConversation}'`)).rows[0].status,'pending');
assert.equal((await db.query(`SELECT answers->>'destination' AS value FROM wa_bot_intake WHERE conversation_id='${intakeConversation}'`)).rows[0].value,'answer 1');
await assert.rejects(db.query(`SELECT wa_intake_step('${other}','${intakeConversation}','00000000-0000-4000-8000-000000000041')`), /Invalid inbound/);
await db.close();
console.log('WhatsApp queue: policy, priority, SQL claim, duplicate claim, tenant isolation, routing capacity, stale presence and revoked permission and guided intake checks passed.');
