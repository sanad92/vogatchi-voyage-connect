import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migrationDir = new URL('../supabase/migrations/', import.meta.url);
const migration = suffix => readFileSync(new URL(
  readdirSync(migrationDir).find(file => file.endsWith(suffix)), migrationDir,
), 'utf8');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, branchA, branchB, branchC, otherBranch, region, agent, otherAgent, manager, admin, inactive,
  foreign, employeeA, employeeB, inboxA, inboxB, inboxC, shared, otherInbox, chatA, chatB, chatC, chatShared, chatForeign] =
  Array.from({ length: 25 }, (_, i) => uuid(i + 1));
const tables = [
  'conversation_internal_notes', 'conversation_tag_assignments', 'whatsapp_followups', 'ai_sales_briefs',
  'whatsapp_chatbot_interactions', 'whatsapp_automation_executions',
];
const value = async sql => Object.values((await db.query(sql)).rows[0] ?? {})[0];
const ids = async (table, column = 'id') => (await db.query(`SELECT ${column} FROM ${table} ORDER BY ${column}`)).rows.map(row => row[column]);
const asUser = user => db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
const asService = () => db.exec("RESET ROLE; SET ROLE service_role; SELECT set_config('request.jwt.claim.sub','',false);");

try {
  await db.exec(`
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA auth, storage TO authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name,'/')
$$;
CREATE TABLE organizations(id uuid PRIMARY KEY);
CREATE TABLE branches(id uuid PRIMARY KEY, organization_id uuid NOT NULL, name text, is_active boolean DEFAULT true);
CREATE TABLE organization_members(
  organization_id uuid, user_id uuid, is_active boolean, role text, branch_id uuid REFERENCES branches(id),
  UNIQUE (organization_id, user_id)
);
CREATE TABLE profiles(id uuid PRIMARY KEY, linked_employee_id uuid);
CREATE TABLE employees(id uuid PRIMARY KEY,organization_id uuid,is_active boolean);
CREATE TABLE customers(id uuid PRIMARY KEY, organization_id uuid);
CREATE TABLE whatsapp_settings(
  id uuid PRIMARY KEY, organization_id uuid, label text, business_name text, display_phone_number text,
  phone_number_id text, is_active boolean, is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(), access_token text
);
CREATE TABLE whatsapp_conversations(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,whatsapp_settings_id uuid,phone_number text,
  assigned_to uuid,status text,priority text,created_at timestamptz DEFAULT now(),auto_assigned boolean,
  assignment_reason text,customer_id uuid,last_read_at timestamptz
);
CREATE UNIQUE INDEX chat_number ON whatsapp_conversations(organization_id,whatsapp_settings_id,phone_number);
CREATE TABLE whatsapp_chatbot_settings(organization_id uuid PRIMARY KEY);
CREATE TABLE whatsapp_messages(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,conversation_id uuid,
  direction text,content text,sent_at timestamptz DEFAULT now(),message_type text,template_name text
);
CREATE TABLE conversation_assignments_history(conversation_id uuid,organization_id uuid,action text,to_user_id uuid,performed_by uuid,reason text,metadata jsonb);
CREATE TABLE sop_leads(id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid, customer_id uuid);
CREATE FUNCTION sop_save_lead(uuid,uuid,jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"allowed":false}'::jsonb $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
INSERT INTO storage.buckets VALUES ('whatsapp-media','whatsapp-media',true);
CREATE TABLE storage.objects(bucket_id text, name text);
CREATE FUNCTION org_has_active_subscription(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE FUNCTION user_belongs_to_org(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT FROM public.organization_members WHERE user_id=$1 AND organization_id=$2 AND is_active)
$$;
CREATE FUNCTION can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.user_belongs_to_org(auth.uid(),$1)
$$;
CREATE FUNCTION get_user_org_role(uuid,uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM public.organization_members WHERE user_id=$1 AND organization_id=$2 AND is_active
$$;
CREATE FUNCTION _org_permission_state(uuid,uuid,text) RETURNS TABLE(granted boolean,data_scope text) LANGUAGE sql STABLE AS $$
  SELECT public.user_belongs_to_org($2,$1) AND ($3<>'whatsapp_admin' OR public.get_user_org_role($2,$1) IN ('owner','admin')),
    'organization'::text
$$;
CREATE FUNCTION has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT granted FROM public._org_permission_state($1,auth.uid(),$2)
$$;
${tables.map(table => `CREATE TABLE ${table}(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,conversation_id uuid);`).join('\n')}
GRANT ALL ON ALL TABLES IN SCHEMA public, storage TO authenticated, service_role;
${['whatsapp_conversations', 'whatsapp_messages', 'conversation_assignments_history', ...tables].map(table => `
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_tenant ON ${table} TO authenticated
USING (user_belongs_to_org(auth.uid(),organization_id));
`).join('\n')}
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_settings_admin ON whatsapp_settings TO authenticated
  USING (get_user_org_role(auth.uid(),organization_id) IN ('owner','admin'));
CREATE POLICY fixture_settings_select ON whatsapp_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY fixture_storage ON storage.objects TO authenticated USING (true);
INSERT INTO organizations VALUES ('${org}'),('${otherOrg}');
INSERT INTO branches VALUES ('${branchA}','${org}','فرع أ'),('${branchB}','${org}','فرع ب'),
  ('${branchC}','${org}','فرع ج'),('${otherBranch}','${otherOrg}','فرع خارجي');
INSERT INTO organization_members VALUES
  ('${org}','${agent}',true,'agent','${branchA}'),('${org}','${otherAgent}',true,'agent','${branchB}'),
  ('${org}','${manager}',true,'manager','${branchC}'),('${org}','${admin}',true,'admin',NULL),
  ('${org}','${inactive}',false,'agent','${branchA}'),('${otherOrg}','${foreign}',true,'admin',NULL);
INSERT INTO employees VALUES ('${employeeA}','${org}',true),('${employeeB}','${org}',true);
INSERT INTO profiles VALUES ('${agent}','${employeeA}'),('${otherAgent}','${employeeB}');
INSERT INTO whatsapp_settings(id,organization_id,phone_number_id,is_active,access_token) VALUES
  ('${inboxA}','${org}','101',true,'fixture-secret'),('${inboxB}','${org}','102',true,'fixture-secret'),
  ('${inboxC}','${org}','103',true,'fixture-secret'),('${shared}','${org}','104',true,'fixture-secret'),
  ('${otherInbox}','${otherOrg}','105',true,'fixture-secret');
INSERT INTO whatsapp_conversations(id,organization_id,whatsapp_settings_id,phone_number,status,priority) VALUES
  ('${chatA}','${org}','${inboxA}','201000000000','pending','normal'),
  ('${chatB}','${org}','${inboxB}','201000000000','pending','urgent'),
  ('${chatC}','${org}','${inboxC}','201000000000','pending','urgent'),
  ('${chatShared}','${org}','${shared}','201000000000','closed','normal'),
  ('${chatForeign}','${otherOrg}','${otherInbox}','201000000000','pending','urgent');
INSERT INTO whatsapp_messages(organization_id,conversation_id,direction,content)
  SELECT organization_id,id,'inbound','fixture' FROM whatsapp_conversations;
INSERT INTO conversation_internal_notes(organization_id,conversation_id)
  SELECT organization_id,id FROM whatsapp_conversations;
INSERT INTO storage.objects
  SELECT 'whatsapp-media',organization_id || '/' || id || '/fixture.txt' FROM whatsapp_conversations;
`);
  await db.exec(migration('_whatsapp_queue_routing.sql'));
  await db.exec(migration('0dcb521e-f7a7-4a8e-98a3-1116c24aaa2b.sql'));
  await db.exec(migration('_whatsapp_sop_intake.sql'));
  await db.exec(migration('_whatsapp_branch_inbox.sql'));

  assert.equal(await value("SELECT public FROM storage.buckets WHERE id='whatsapp-media'"), false);
  await asUser(agent);
  assert.deepEqual(await ids('whatsapp_conversations'), [chatA, chatB, chatC, chatShared]);

  await asUser(admin);
  await db.exec(`
INSERT INTO whatsapp_regions (id,organization_id,name,manager_user_id) VALUES ('${region}','${org}','الدلتا','${manager}');
UPDATE branches SET whatsapp_region_id='${region}' WHERE id IN ('${branchA}','${branchB}');
UPDATE whatsapp_settings SET branch_id='${branchA}' WHERE id='${inboxA}';
UPDATE whatsapp_settings SET branch_id='${branchB}' WHERE id='${inboxB}';
UPDATE whatsapp_settings SET branch_id='${branchC}' WHERE id='${inboxC}';
`);
  await assert.rejects(db.exec(`UPDATE whatsapp_settings SET branch_id='${otherBranch}' WHERE id='${inboxA}'`), { code: '23503' });
  await assert.rejects(db.exec(`INSERT INTO whatsapp_regions(organization_id,name,manager_user_id) VALUES ('${org}','خارجي','${foreign}')`), { code: '23503' });
  assert.deepEqual(await ids('whatsapp_conversations'), [chatA, chatB, chatC, chatShared]);

  await asUser(manager);
  assert.deepEqual(await ids('whatsapp_conversations'), [chatA, chatB, chatShared]);
  assert.deepEqual(await ids(`wa_inbox_channels('${org}')`), [inboxA, inboxB, shared]);
  assert.equal(await value(`UPDATE whatsapp_settings SET branch_id=NULL WHERE id='${inboxA}' RETURNING id`), undefined);

  await asUser(agent);
  assert.deepEqual(await ids('whatsapp_conversations'), [chatA, chatShared]);
  assert.deepEqual(await ids('whatsapp_messages', 'conversation_id'), [chatA, chatShared]);
  assert.deepEqual(await ids('conversation_internal_notes', 'conversation_id'), [chatA, chatShared]);
  assert.deepEqual(await ids(`wa_conversation_summaries('${org}')`, 'conversation_id'), [chatA, chatShared]);
  assert.equal(await value(`SELECT whatsapp_window_open('${chatB}')`), false);
  assert.equal(await value('SELECT count(*) FROM storage.objects'), 2);
  await assert.rejects(db.exec(`INSERT INTO storage.objects VALUES ('whatsapp-media','${org}/${chatB}/upload.txt')`), { code: '42501' });
  await assert.rejects(db.exec(`INSERT INTO whatsapp_conversations(organization_id,whatsapp_settings_id,phone_number) VALUES ('${org}','${inboxB}','202222222222')`), { code: '42501' });
  await assert.rejects(db.exec(`UPDATE whatsapp_conversations SET whatsapp_settings_id='${shared}' WHERE id='${chatA}'`), { code: '42501' });
  await assert.rejects(db.exec(`SELECT sop_save_whatsapp_lead('${org}','${chatB}','{}')`), { code: '22023' });
  await assert.rejects(db.exec(`SELECT wa_claim_conversation('${org}','${chatB}')`), /الطابور فارغ/);
  assert.equal(await value(`SELECT wa_claim_conversation('${org}',NULL)`), chatA);

  await asUser(inactive);
  assert.deepEqual(await ids('whatsapp_conversations'), []);
  await asUser(foreign);
  assert.deepEqual(await ids('whatsapp_conversations'), [chatForeign]);
  await asUser(admin);
  await db.exec(`UPDATE organization_members SET branch_id='${branchB}' WHERE user_id='${agent}'`);
  assert.equal(await value(`SELECT assigned_to FROM whatsapp_conversations WHERE id='${chatA}'`), null);
  assert.equal(await value(`SELECT status FROM whatsapp_conversations WHERE id='${chatA}'`), 'pending');
  await db.exec(`UPDATE organization_members SET branch_id='${branchA}' WHERE user_id='${agent}'`);

  await asService();
  await assert.rejects(db.exec(`UPDATE whatsapp_conversations SET assigned_to='${employeeA}' WHERE id='${chatB}'`), { code: '42501' });
  await db.exec(`
INSERT INTO whatsapp_conversations(organization_id,whatsapp_settings_id,phone_number,status,priority)
SELECT '${org}','${inboxC}','2033333' || n,'pending','urgent' FROM generate_series(1,51) n;
INSERT INTO wa_routing_settings(organization_id,mode) VALUES ('${org}','automatic');
INSERT INTO wa_queue_agents(organization_id,user_id,employee_id,available,heartbeat_at)
VALUES ('${org}','${agent}','${employeeA}',true,now()),('${org}','${otherAgent}','${employeeB}',true,now());
`);
  assert.equal(await value(`SELECT wa_dispatch_queue('${org}')`), 2);
  assert.equal(await value(`SELECT assigned_to FROM whatsapp_conversations WHERE id='${chatA}'`), employeeA);
  assert.equal(await value(`SELECT assigned_to FROM whatsapp_conversations WHERE id='${chatB}'`), employeeB);
  assert.equal(await value(`SELECT assigned_to FROM whatsapp_conversations WHERE id='${chatC}'`), null);
  console.log('WhatsApp branch Inbox: branch, regional, admin, inactive and tenant scopes, messages, notes, storage, manual claim and automatic routing passed.');
} catch (error) {
  console.error(error.message, error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
