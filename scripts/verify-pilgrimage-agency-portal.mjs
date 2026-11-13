import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, admin, agent, otherAgent, unconfirmed, agency, otherAgency, sale, otherSale, agreement, otherAgreement] = Array.from({ length: 12 }, (_, n) => uid(n + 1));

await db.exec(`
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, banned_until timestamptz);
INSERT INTO auth.users VALUES ('${admin}', 'manager@one.example', now(), null), ('${agent}', 'agent@one.example', now(), null),
  ('${otherAgent}', 'agent@two.example', now(), null), ('${unconfirmed}', 'pending@one.example', null, null);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT current_setting(''qa.actor'', true)::uuid';
CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql
 AS 'SELECT $1 = ''${org}'' AND auth.uid() = ''${admin}''';
CREATE FUNCTION public.user_belongs_to_org(uuid,uuid) RETURNS boolean LANGUAGE sql
 AS 'SELECT $1 = ''${admin}'' AND $2 = ''${org}''';
CREATE FUNCTION public.get_user_org_role(uuid,uuid) RETURNS text LANGUAGE sql
 AS 'SELECT CASE WHEN public.user_belongs_to_org($1,$2) THEN ''owner'' END';
CREATE FUNCTION public.is_free_email(text) RETURNS boolean LANGUAGE sql AS 'SELECT $1 LIKE ''%@gmail.com''';
CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_active boolean);
CREATE TABLE organizations(id uuid PRIMARY KEY, name text, is_active boolean);
CREATE TABLE pilgrimage_agencies(id uuid PRIMARY KEY, organization_id uuid, name text);
CREATE TABLE pilgrimage_sales(id uuid PRIMARY KEY, organization_id uuid, name text, departure_date date,
 return_date date, status text, sale_model text, party_size int);
CREATE TABLE pilgrimage_b2b_agreements(id uuid PRIMARY KEY, organization_id uuid, sale_id uuid, agency_id uuid,
 status text, currency text, total_contract_amount numeric);
CREATE TABLE pilgrimage_seat_allocations(sale_id uuid, organization_id uuid, status text, seat_count int);
CREATE TABLE pilgrimage_b2b_roster_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
 agreement_id uuid, client_key uuid, display_name text, room_type text, status text DEFAULT 'active', created_by uuid,
 created_at timestamptz DEFAULT now());
CREATE TABLE pilgrimage_b2b_roster_events(organization_id uuid, entry_id uuid, action text, actor_id uuid);
CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, pilgrimage_b2b_agreement_id uuid,
 invoice_number text, total_paid_amount numeric, remaining_amount numeric, status text, created_at timestamptz DEFAULT now());
INSERT INTO organizations VALUES ('${org}', 'Operator One', true), ('${otherOrg}', 'Operator Two', true);
INSERT INTO pilgrimage_agencies VALUES ('${agency}', '${org}', 'Agency One'), ('${otherAgency}', '${otherOrg}', 'Agency Two');
INSERT INTO pilgrimage_sales VALUES ('${sale}', '${org}', 'December Umrah', '2026-12-25', '2026-12-30', 'quoted', 'b2b_group', 2),
 ('${otherSale}', '${otherOrg}', 'Other Company', '2026-12-25', '2026-12-30', 'quoted', 'b2b_group', 2);
INSERT INTO pilgrimage_b2b_agreements VALUES ('${agreement}', '${org}', '${sale}', '${agency}', 'approved_internal', 'EGP', 20000),
 ('${otherAgreement}', '${otherOrg}', '${otherSale}', '${otherAgency}', 'approved_internal', 'SAR', 3000);
INSERT INTO pilgrimage_seat_allocations VALUES ('${sale}', '${org}', 'allocated', 2), ('${otherSale}', '${otherOrg}', 'allocated', 2);
INSERT INTO invoices(organization_id, pilgrimage_b2b_agreement_id, invoice_number, total_paid_amount, remaining_amount, status)
 VALUES ('${org}', '${agreement}', 'INV-1', 7000, 13000, 'partial'), ('${otherOrg}', '${otherAgreement}', 'INV-2', 0, 3000, 'unpaid');
`);
const original = readFileSync('scripts/deploy-pilgrimage-b2b-roster.sql', 'utf8');
await db.exec(original.slice(original.indexOf('CREATE OR REPLACE FUNCTION public.add_pilgrimage_b2b_roster_name'), original.indexOf('CREATE OR REPLACE FUNCTION public.remove_pilgrimage_b2b_roster_name')));
await db.exec(readFileSync('supabase/migrations/20261113233607_pilgrimage_agency_portal.sql', 'utf8'));
await db.exec(`INSERT INTO pilgrimage_portal_private.agreement_access(agreement_id,email,granted_by)
 VALUES ('${otherAgreement}', 'agent@two.example', '${admin}')`);

async function actor(user, role = 'authenticated') {
  await db.exec(`RESET ROLE; SET ROLE ${role}; SET qa.actor = '${user}'`);
}
const manage = (agreementId, email) => db.query('SELECT public.manage_pilgrimage_agency_portal($1, true, $2)', [agreementId, email]);
const list = async () => (await db.query('SELECT public.get_pilgrimage_agency_portal() AS data')).rows[0].data;
const add = (agreementId, key, name) => db.query('SELECT public.add_pilgrimage_b2b_roster_name($1,$2,$3,$4) AS id', [agreementId, key, name, 'double']);
await actor(admin);
await assert.rejects(manage(otherAgreement, 'agent@one.example'), { code: '42501' });
await assert.rejects(manage(agreement, 'agent@gmail.com'), { code: '22023' });
await manage(agreement, 'AGENT@ONE.EXAMPLE');
await actor(agent);
let data = await list();
assert.equal(data.length, 1);
assert.equal(data[0].invoice.remaining, 13000);
assert.equal(data[0].capacity, 2);
await assert.rejects(manage(agreement, 'agent@two.example'), { code: '42501' });
await assert.rejects(add(otherAgreement, uid(20), 'Wrong tenant passenger'), { code: '42501' });
const first = await add(agreement, uid(21), 'First passenger');
assert.deepEqual((await add(agreement, uid(21), 'First passenger')).rows, first.rows);
await add(agreement, uid(22), 'Second passenger');
await assert.rejects(add(agreement, uid(23), 'Third passenger'), /exceeds_contract_places/);
assert.equal((await list())[0].roster.length, 2);
await actor(otherAgent);
assert.equal((await list())[0].id, otherAgreement);
await assert.rejects(add(agreement, uid(24), 'Cross agreement'), { code: '42501' });
await actor(admin);
await manage(agreement, 'pending@one.example');
await actor(unconfirmed);
assert.deepEqual(await list(), []);
await assert.rejects(add(agreement, uid(25), 'Unconfirmed user'), { code: '42501' });
await actor(agent);
assert.deepEqual(await list(), []);
await actor(admin);
await manage(agreement, 'agent@one.example');
await manage(agreement, null);
await actor(agent);
assert.deepEqual(await list(), []);
await actor(admin);
await manage(agreement, 'agent@one.example');
await db.exec(`RESET ROLE; INSERT INTO profiles VALUES ('${agent}', false)`);
await actor(agent);
assert.deepEqual(await list(), []);
await assert.rejects(add(agreement, uid(26), 'Disabled user'), { code: '42501' });
await actor(agent, 'anon');
await assert.rejects(list(), { code: '42501' });
await db.close();
console.log('Agency portal passed confirmed-email access, tenant separation, admin revocation, invoice view, seat capacity and retry checks.');
