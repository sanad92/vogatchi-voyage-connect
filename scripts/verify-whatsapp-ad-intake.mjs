import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const mrzSource = readFileSync(new URL('../src/lib/passportMrz.ts', import.meta.url), 'utf8');
const mrzModule = ts.transpileModule(mrzSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { readPassportMrz } = await import(`data:text/javascript;base64,${Buffer.from(mrzModule).toString('base64')}`);
const nameLine = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
const identityLine = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
assert.equal(readPassportMrz(`${nameLine}\n${identityLine}`).passport_number, 'L898902C3');
const noisyLine = 'L898902C36UT07408122F12041597ZE184226B<<<<<10';
assert.equal(readPassportMrz(`${nameLine}\n${noisyLine}`).nationality, 'UTO');
assert.equal(readPassportMrz(`${nameLine}\n${identityLine.replace('L898', 'L998')}`), null);

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, other, inbox, otherInbox, chat, otherChat, message, otherMessage, actor, restricted, guideMessage] =
  Array.from({ length: 11 }, (_, i) => id(i + 1));
const readSql = path => readFileSync(new URL(`../supabase/migrations/${path}`, import.meta.url), 'utf8');

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
    CREATE TABLE organizations (id uuid PRIMARY KEY);
    CREATE TABLE whatsapp_settings (id uuid PRIMARY KEY, organization_id uuid, is_active boolean);
    CREATE TABLE customers (id uuid PRIMARY KEY, organization_id uuid, name text);
    CREATE TABLE whatsapp_conversations (
      id uuid PRIMARY KEY, organization_id uuid, whatsapp_settings_id uuid, customer_id uuid, phone_number text,
      assigned_to uuid, status text, assignment_reason text
    );
    CREATE TABLE whatsapp_messages (
      id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid, whatsapp_settings_id uuid,
      direction text, media_storage_path text, media_mime_type text, content text
    );
    CREATE TABLE sop_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, conversation_id uuid, customer_id uuid,
      lead_number text, contact_name text, contact_phone text, lead_source text, campaign text, destination text,
      approx_dates text, special_requests text, stage text DEFAULT 'new', intake_completed_at timestamptz, updated_at timestamptz
    );
    CREATE UNIQUE INDEX ON sop_leads (organization_id, conversation_id) WHERE conversation_id IS NOT NULL;
    CREATE FUNCTION user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql AS $$
      SELECT $1 IN ('${actor}', '${restricted}') AND $2 = '${org}' $$;
    CREATE FUNCTION can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT public.user_belongs_to_org(auth.uid(), $1) $$;
    CREATE FUNCTION has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$
      SELECT public.user_belongs_to_org(auth.uid(), $1) AND (auth.uid() = '${actor}' OR $2 = 'whatsapp_view') $$;
    GRANT SELECT ON whatsapp_conversations TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    INSERT INTO organizations VALUES ('${org}'), ('${other}');
    INSERT INTO whatsapp_settings VALUES ('${inbox}', '${org}', true), ('${otherInbox}', '${other}', true);
    INSERT INTO whatsapp_conversations (id, organization_id, whatsapp_settings_id, phone_number, status) VALUES
      ('${chat}', '${org}', '${inbox}', '201000000001', 'open'),
      ('${otherChat}', '${other}', '${otherInbox}', '201000000002', 'open');
    INSERT INTO whatsapp_messages VALUES
      ('${message}', '${org}', '${chat}', '${inbox}', 'inbound', 'fixture/a.png', 'image/png', 'أريد رحلة'),
      ('${otherMessage}', '${other}', '${otherChat}', '${otherInbox}', 'inbound', 'fixture/b.png', 'image/png', 'طلب آخر'),
      ('${id(50)}', '${org}', '${chat}', '${inbox}', 'inbound', 'fixture/c.png', 'image/png', 'صورة ثانية');
  `);
  const guided = readSql('20260910224026_whatsapp_queue_routing.sql');
  await db.exec(guided.slice(guided.indexOf('CREATE TABLE public.wa_bot_intake')));
  await db.exec(readSql('20261120002115_whatsapp_ad_intake_and_passport_review.sql'));

  const createAdLead = async (targetOrg = org, ad = '987654321') =>
    (await db.query('SELECT wa_open_ad_lead($1,$2,$3,$4) AS lead', [targetOrg, message, ad, 'Test Sender'])).rows[0].lead;
  await db.exec('SET ROLE service_role');
  assert.equal(await createAdLead(), null, 'opted-out inbox');
  await db.exec(`UPDATE whatsapp_settings SET auto_ad_leads=true WHERE id='${inbox}'`);
  assert.equal(await createAdLead(other), null, 'cross-organization event');
  assert.equal(await createAdLead(org, 'not-an-ad'), null, 'invalid ad ID');
  assert.ok(await createAdLead(), 'opted-in inbox creates a draft');
  assert.equal(await createAdLead(), null, 'duplicate webhook preserves draft');
  assert.deepEqual((await db.query('SELECT campaign, contact_name FROM sop_leads')).rows[0],
    { campaign: 'إعلان واتساب #987654321', contact_name: 'Test Sender' });

  const answers = ['طلب عمرة', 'مكة', 'من ٢٠ إلى ٢٥ ديسمبر', '٤ مسافرين', '١٠٠٠٠ جنيه', 'فندق قريب'];
  for (let i = 0; i < answers.length; i++) {
    const inbound = i === 0 ? guideMessage : id(20 + i);
    await db.query('INSERT INTO whatsapp_messages (id, organization_id, conversation_id, whatsapp_settings_id, direction, content) VALUES ($1,$2,$3,$4,\'inbound\',$5)',
      [inbound, org, chat, inbox, answers[i]]);
    const reply = await db.query('SELECT wa_intake_step($1,$2,$3) AS step', [org, chat, inbound]);
    assert.equal(reply.rows[0].step.completed, i === answers.length - 1);
  }
  const lead = (await db.query('SELECT destination, approx_dates, special_requests, intake_completed_at FROM sop_leads')).rows[0];
  assert.equal(lead.destination, 'مكة');
  assert.equal(lead.approx_dates, answers[2]);
  assert.match(lead.special_requests, /٤ مسافرين/);
  assert.equal(lead.intake_completed_at, null, 'draft remains open for review');

  const person = { message_id: message, full_name: 'SYNTHETIC TRAVELER', passport_number: 'TEST0001',
    nationality: 'UTO', birth_date: '1990-01-01', expiry_date: '2030-12-31' };
  const approve = items => db.query('SELECT wa_approve_passport_reviews($1,$2,$3::jsonb) AS count', [org, chat, JSON.stringify(items)]);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${actor}',false);`);
  await assert.rejects(createAdLead(), /permission denied/);
  await assert.rejects(approve([person, { ...person, message_id: otherMessage }]), /غير متاح/);
  assert.equal((await db.query('SELECT * FROM whatsapp_passport_reviews')).rows.length, 0, 'batch rolls back on unauthorized attachment');
  const secondPerson = { ...person, message_id: id(50), passport_number: 'TEST0002' };
  assert.equal((await approve([person, secondPerson])).rows[0].count, 2);
  assert.equal((await approve([person])).rows[0].count, 1);
  assert.equal((await db.query('SELECT * FROM whatsapp_passport_reviews')).rows.length, 2, 'same attachment does not duplicate');
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${restricted}',false)`);
  assert.equal((await db.query('SELECT * FROM whatsapp_passport_reviews')).rows.length, 0, 'without document rights');
  await assert.rejects(approve([person]), /صلاحياتك/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${id(99)}',false)`);
  assert.equal((await db.query('SELECT * FROM whatsapp_passport_reviews')).rows.length, 0, 'other tenant');
  console.log('WhatsApp ad intake, guided handoff and passport batch authorization passed.');
} finally {
  await db.close();
}
