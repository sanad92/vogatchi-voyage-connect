import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const org = '00000000-0000-0000-0000-000000000001';
const otherOrg = '00000000-0000-0000-0000-000000000002';
const agent = '00000000-0000-0000-0000-000000000003';
const otherAgent = '00000000-0000-0000-0000-000000000004';
const thread = '00000000-0000-0000-0000-000000000005';
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
    SELECT NULLIF(current_setting('test.user',true),'')::uuid
  $$;
  CREATE TABLE organization_members(user_id uuid,organization_id uuid,role text,is_active boolean DEFAULT true);
  CREATE FUNCTION user_belongs_to_org(_user uuid,_org uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS(SELECT 1 FROM organization_members WHERE user_id=_user AND organization_id=_org AND is_active)
  $$;
  CREATE FUNCTION get_user_org_role(_user uuid,_org uuid) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
    SELECT role FROM organization_members WHERE user_id=_user AND organization_id=_org AND is_active LIMIT 1
  $$;
  INSERT INTO organization_members VALUES ('${agent}','${org}','agent',true),('${otherAgent}','${org}','agent',true);
  CREATE TABLE email_threads(id uuid PRIMARY KEY,organization_id uuid,assigned_to uuid,status text DEFAULT 'open',
    last_inbound_at timestamptz DEFAULT '2026-10-20T12:00:00Z',last_read_at timestamptz,marked_unread boolean DEFAULT false);
  INSERT INTO email_threads(id,organization_id) VALUES ('${thread}','${org}');
  GRANT SELECT ON email_threads TO authenticated;
  GRANT UPDATE(last_read_at,marked_unread,status) ON email_threads TO authenticated;
  ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
`);
// Reproduce the deployed visibility and workflow policies verbatim.
const original = await readFile(new URL('../supabase/migrations/20261001102017_e2576607-5ed3-4e1b-8b3a-b15e413166f7.sql', import.meta.url),'utf8');
await db.exec(original.slice(original.indexOf('CREATE OR REPLACE FUNCTION public.can_see_email_thread'), original.indexOf('CREATE TABLE public.email_messages')));
await db.query("SELECT set_config('test.user',$1,false)",[agent]);
await db.exec('SET ROLE authenticated');
assert.equal((await db.query('UPDATE email_threads SET marked_unread=true RETURNING id')).rows.length,0,'original queue write is silently denied');
await db.exec('RESET ROLE');
await db.exec(await readFile(new URL('../drizzle/migrations/0001_secure_email_thread_read_state.sql',import.meta.url),'utf8'));
await db.exec('SET ROLE authenticated');
const call = (o=org,id=thread,unread=false) => db.query('SELECT set_email_thread_read_state($1,$2,$3) AS saved',[o,id,unread]);
assert.equal((await call()).rows[0].saved,true,'queue agent receives acknowledgement');
let row = (await db.query('SELECT * FROM email_threads')).rows[0];
assert.ok(new Date(row.last_read_at)>=new Date(row.last_inbound_at),'opening a queued thread persists its read timestamp');
assert.equal(row.marked_unread,false);
assert.equal(row.assigned_to,null,'reading must never claim a thread');
assert.equal(row.status,'open','reading must never change workflow status');
const readAt = new Date(row.last_read_at).getTime();
assert.equal((await call(org,thread,true)).rows[0].saved,true);
row = (await db.query('SELECT * FROM email_threads')).rows[0];
assert.equal(row.marked_unread,true,'manual unread persists on refetch');
assert.equal(new Date(row.last_read_at).getTime(),readAt,'manual unread preserves last-read history');
assert.equal((await db.query("UPDATE email_threads SET status='closed' RETURNING id")).rows.length,0,'queue status permission is not widened');
await assert.rejects(call(otherOrg),/not found or not accessible/);
await assert.rejects(call(org,otherAgent),/not found or not accessible/);
await assert.rejects(call(org,thread,null),/Read state is required/);
await db.exec('RESET ROLE');
await db.query('UPDATE email_threads SET assigned_to=$1',[otherAgent]);
await db.exec('SET ROLE authenticated');
await assert.rejects(call(),/not found or not accessible/,'another agent assigned thread stays private');
await db.exec('RESET ROLE');
await db.query("UPDATE organization_members SET role='manager' WHERE user_id=$1",[agent]);
await db.exec('SET ROLE authenticated');
assert.equal((await call()).rows[0].saved,true,'supervisor can mark visible assigned thread read');
await db.exec('RESET ROLE');
await db.query("UPDATE organization_members SET is_active=false WHERE user_id=$1",[agent]);
await db.exec('SET ROLE authenticated');
await assert.rejects(call(),/not found or not accessible/,'inactive membership rejected');
await db.query("SELECT set_config('test.user','',false)");
await assert.rejects(call(),/Not authenticated/);
await db.exec('RESET ROLE');
assert.equal((await db.query("SELECT has_function_privilege('anon','set_email_thread_read_state(uuid,uuid,boolean)','execute') AS allowed")).rows[0].allowed,false);
await db.close();
console.log('Email read-state passed: original failure reproduced, queue read/unread persisted, ownership unchanged, workflow/tenant/private-thread access preserved.');