import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { extractIdentityDraft, isIdentityImage, normalizeIdentityField } from '../src/lib/whatsappIdentityDraft.ts';

const weights = [7, 3, 1];
const digit = (value) => String([...value].reduce((sum, letter, index) => {
  const code = letter === '<' ? 0 : /\d/.test(letter) ? Number(letter) : letter.charCodeAt(0) - 55;
  return sum + code * weights[index % weights.length];
}, 0) % 10);
const first = 'P<UTOEXAMPLE<<ALPHA'.padEnd(44, '<');
const invalidDocument = 'TESTDOC00';
const birth = '900101';
const expiry = '300101';
const personal = '<'.repeat(14);
const second = invalidDocument + digit(invalidDocument) + 'UTO' + birth + digit(birth) + '<' + expiry + digit(expiry) + personal + digit(personal);
const mrz = first + '\n' + second + digit(second.slice(0, 10) + second.slice(13, 20) + second.slice(21));
assert.deepEqual(extractIdentityDraft(mrz), { name: 'ALPHA EXAMPLE', nationality: 'UTO' });
assert.deepEqual(extractIdentityDraft(mrz.slice(0, -1)), { name: '', nationality: '' });
assert.deepEqual(extractIdentityDraft('Full name: Fictional Traveler\nPassport: TESTDOC00\nNationality: Imaginary'), {
  name: 'Fictional Traveler', nationality: 'Imaginary',
});
assert.deepEqual(extractIdentityDraft('الاسم الكامل: عميل تجريبي\nالجنسية: مصرية\nالرقم: 00000000000000'), {
  name: 'عميل تجريبي', nationality: 'مصرية',
});
assert.deepEqual(extractIdentityDraft('TESTDOC00\n00000000000000'), { name: '', nationality: '' });
assert.equal(normalizeIdentityField('Fictional 123456789', 120), null);
assert.equal(isIdentityImage('application/pdf'), false);
assert.equal(isIdentityImage('image/svg+xml'), false);

const db = new PGlite();
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const [org, foreign, actor, coworker, supervisor, worker, coworkerEmployee, customer, otherCustomer, conversation, message, outbound, forged] =
  Array.from({ length: 13 }, (_, index) => id(index + 1));
const path = `${org}/${conversation}/fake-message.jpg`;
const updated = '2025-01-01T00:00:00.000Z';
const migration = readFileSync(new URL(
  '../supabase/migrations/20261120002430_review_whatsapp_identity_attachment.sql', import.meta.url,
), 'utf8');
const query = (sql, params = []) => db.query(sql, params);
const review = async (organization = org, source = message) => (await query(
  'SELECT public.review_whatsapp_identity_attachment($1, $2, $3) AS draft', [organization, conversation, source],
)).rows[0].draft;
const apply = ({ organization = org, target = customer, sourcePath = path, revision = updated, name = 'Fictional Traveler', nationality = null } = {}) =>
  query('SELECT public.apply_whatsapp_identity_review($1, $2, $3, $4, $5, $6, $7, $8) AS id',
    [organization, conversation, message, target, sourcePath, revision, name, nationality]);
async function as(user) {
  await db.exec('RESET ROLE');
  await query("SELECT set_config('fixture.actor', $1, false)", [user]);
  await db.exec('SET ROLE authenticated');
}

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('fixture.actor', true), '')::uuid $$;
    CREATE TABLE organization_members (organization_id uuid, user_id uuid, is_active boolean);
    CREATE TABLE profiles (id uuid PRIMARY KEY, linked_employee_id uuid);
    CREATE TABLE employees (id uuid PRIMARY KEY, organization_id uuid, is_active boolean);
    CREATE TABLE customers (id uuid PRIMARY KEY, organization_id uuid, name text, nationality text,
      archived_at timestamptz, is_demo boolean NOT NULL DEFAULT false, updated_at timestamptz, passport_number text);
    CREATE TABLE whatsapp_conversations (id uuid PRIMARY KEY, organization_id uuid, customer_id uuid, assigned_to uuid);
    CREATE TABLE whatsapp_messages (id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid,
      message_id text, direction text, message_type text, media_download_status text, media_mime_type text, media_storage_path text);
    CREATE FUNCTION public.has_org_permission(_org uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.is_active)
        AND (_permission IN ('whatsapp_view', 'customers_edit') OR (_permission = 'whatsapp_admin' AND auth.uid() = '${supervisor}'))
    $$;
    CREATE FUNCTION public.can_org_write(_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT coalesce(current_setting('fixture.writes', true), '') <> 'off'
        AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.is_active)
    $$;
    GRANT SELECT ON organization_members, profiles, employees, customers, whatsapp_conversations, whatsapp_messages TO authenticated;
    GRANT UPDATE ON customers TO authenticated;
    INSERT INTO organization_members VALUES ('${org}', '${actor}', true), ('${org}', '${coworker}', true), ('${org}', '${supervisor}', true);
    INSERT INTO profiles VALUES ('${actor}', '${worker}'), ('${coworker}', '${coworkerEmployee}');
    INSERT INTO employees VALUES ('${worker}', '${org}', true), ('${coworkerEmployee}', '${org}', true);
    INSERT INTO customers (id, organization_id, name, nationality, updated_at, passport_number) VALUES
      ('${customer}', '${org}', 'Original Record', NULL, '${updated}', 'FIXTURE-UNCHANGED'),
      ('${otherCustomer}', '${foreign}', 'Other Company', NULL, '${updated}', 'FIXTURE-FOREIGN');
    INSERT INTO whatsapp_conversations VALUES ('${conversation}', '${org}', '${customer}', '${worker}');
    INSERT INTO whatsapp_messages VALUES
      ('${message}', '${org}', '${conversation}', 'fake-message', 'inbound', 'image', 'success', 'image/jpeg', '${path}'),
      ('${outbound}', '${org}', '${conversation}', 'fake-out', 'outbound', 'image', 'success', 'image/jpeg', '${org}/${conversation}/fake-out.jpg'),
      ('${forged}', '${org}', '${conversation}', 'fake-foreign', 'inbound', 'image', 'success', 'image/jpeg', '${foreign}/${conversation}/fake-foreign.jpg');
  `);
  await db.exec(migration);
  await as(actor);
  const snapshot = await review();
  assert.equal(snapshot.customer.id, customer);
  assert.equal(snapshot.storage_path, path);
  assert.deepEqual(Object.keys(snapshot.customer).sort(), ['id', 'name', 'nationality', 'updated_at']);
  assert.equal(await review(foreign), null);
  assert.equal(await review(org, outbound), null);
  assert.equal(await review(org, forged), null);
  await assert.rejects(apply({ target: otherCustomer }), { code: '40001' });
  await assert.rejects(apply({ sourcePath: 'different-path' }), { code: '40001' });
  await assert.rejects(apply({ name: invalidDocument }), { code: '22023' });
  await as(coworker);
  assert.equal(await review(), null);
  await assert.rejects(apply(), { code: '40001' });
  await as(supervisor);
  assert.equal((await review()).customer.id, customer);
  await as(actor);
  await query("SELECT set_config('fixture.writes', 'off', false)");
  await assert.rejects(apply(), { code: '42501' });
  await query("SELECT set_config('fixture.writes', 'on', false)");
  assert.equal((await apply({ nationality: 'مصرية' })).rows[0].id, customer);
  await assert.rejects(apply(), { code: '40001' });
  await db.exec('RESET ROLE');
  assert.deepEqual((await query('SELECT name, nationality, passport_number FROM customers WHERE id=$1', [customer])).rows[0], {
    name: 'Fictional Traveler', nationality: 'مصرية', passport_number: 'FIXTURE-UNCHANGED',
  });
  await db.exec('SET ROLE anon');
  await assert.rejects(review(), { code: '42501' });
  console.log('Identity review passed synthetic OCR-text/MRZ parsing, tenant and assignee isolation, eligibility, optimistic update, and field minimization.');
} finally {
  await db.close();
}
