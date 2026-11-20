import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = await PGlite.create();
const sql = file => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
const id = n => `42000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, customer, otherCustomer, demo, editor, viewer] = Array.from({ length: 7 }, (_, i) => id(i + 1));
const email = 'traveler@example.invalid';
const phone = '01012345678';
const states = async (company = org, person = customer) => Object.fromEntries(
  (await db.query('SELECT channel, state FROM public.get_customer_marketing_permissions($1, $2)', [company, person]))
    .rows.map(({ channel, state }) => [channel, state]),
);
const record = (channel, allowed = true, evidence = null, reference = 'Consent form #123', company = org, person = customer) => db.query(
  'SELECT public.set_customer_marketing_permission($1, $2, $3, $4, coalesce($5::timestamptz, clock_timestamp()), $6)',
  [company, person, channel, allowed, evidence, reference],
);
const eligibility = (channel, destination, company = org, person = customer) => db.query(
  'SELECT public.customer_marketing_contact_allowed($1, $2, $3, $4) AS allowed', [company, person, channel, destination],
);
const asOwner = () => db.exec('RESET ROLE');
const asUser = async user => {
  await asOwner();
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec('SET ROLE authenticated');
};
const canSend = async (...args) => {
  await asOwner();
  await db.exec('SET ROLE service_role');
  try { return (await eligibility(...args)).rows[0].allowed; }
  finally { await asOwner(); }
};
const sourceTime = async () => (await db.query('SELECT (clock_timestamp() - interval \'1 second\')::text AS result')).rows[0].result;

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA operations_private;
    GRANT USAGE ON SCHEMA auth, operations_private TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT _user IN ('${editor}','${viewer}') AND _org = '${org}' $$;
    CREATE FUNCTION public._org_permission_state(_org uuid, _user uuid, _permission text)
      RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql STABLE AS
      $$ SELECT public.user_belongs_to_org(_user, _org) AND
        (_permission = 'customers_view' OR (_permission = 'customers_edit' AND _user = '${editor}')),
        'organization'::text $$;
    CREATE TABLE public.organizations(id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true);
    CREATE FUNCTION public.org_has_active_subscription(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      $$ SELECT active FROM public.organizations WHERE id = _org $$;
    CREATE FUNCTION public.can_org_write(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      $$ SELECT public.user_belongs_to_org(auth.uid(), _org) AND public.org_has_active_subscription(_org) $$;
    CREATE TABLE public.customers (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, email text, phone text, communication_preferences jsonb,
      whatsapp_opt_out boolean NOT NULL DEFAULT false, is_demo boolean NOT NULL DEFAULT false, archived_at timestamptz
    );
    CREATE TABLE public.suppressed_emails(email text);
    CREATE TABLE public.email_unsubscribe_tokens(email text, used_at timestamptz);
    INSERT INTO public.organizations(id) VALUES ('${org}'), ('${otherOrg}');
    INSERT INTO public.customers(id, organization_id, email, phone, communication_preferences, is_demo) VALUES
      ('${customer}','${org}','${email}','${phone}','{"email":true,"whatsapp":true}', false),
      ('${otherCustomer}','${otherOrg}','other@example.invalid','01010000000', NULL, false),
      ('${demo}','${org}','demo@example.invalid','01010000001', NULL, true);
  `);
  const phoneMigration = sql('20260828085456_crm_core_hardening.sql');
  const emailMigration = sql('20260828233912_customer_lifecycle_hardening.sql');
  const extract = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));
  await db.exec(extract(phoneMigration, 'CREATE OR REPLACE FUNCTION public.normalize_phone_digits', 'CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer_phone'));
  await db.exec(extract(emailMigration, 'CREATE OR REPLACE FUNCTION public.normalize_email_address', 'CREATE OR REPLACE FUNCTION public.canonicalize_and_prevent_duplicate_customer_email'));
  await db.exec(sql('20261120000603_record_customer_marketing_permissions.sql'));
  await db.exec(sql('20261120000603_record_customer_marketing_permissions.sql'));

  await asUser(viewer);
  assert.deepEqual(await states(), { email: 'not_recorded', whatsapp: 'not_recorded' });
  await assert.rejects(record('email'), { code: '42501' });
  await assert.rejects(states(otherOrg, otherCustomer), { code: '42501' });
  await assert.rejects(states(org, demo), { code: '42501' });
  await assert.rejects(eligibility('email', email), { code: '42501' });
  await assert.rejects(db.query('SELECT * FROM operations_private.customer_marketing_consent_events'), { code: '42501' });
  assert.equal(await canSend('email', email), false);
  assert.equal(await canSend('whatsapp', phone), false);

  await asUser(editor);
  await assert.rejects(record('sms'), { code: '22023' });
  await assert.rejects(record('email', true, 'infinity'), { code: '22023' });
  await assert.rejects(record('email', true, null, '   '), { code: '22023' });
  await assert.rejects(record('email', true, null, 'Form', otherOrg, otherCustomer), { code: '42501' });
  const originalProof = await sourceTime();
  await record('email', true, originalProof);
  await record('email', true, originalProof);
  await record('whatsapp');
  assert.deepEqual(await states(), { email: 'recorded', whatsapp: 'recorded' });
  assert.equal(await canSend('email', 'TRAVELER@example.invalid'), true);
  assert.equal(await canSend('email', 'different@example.invalid'), false);
  assert.equal(await canSend('email', email, otherOrg, customer), false);
  assert.equal(await canSend('whatsapp', '+20 1012345678'), true);
  const count = await db.query('SELECT count(*) AS total FROM operations_private.customer_marketing_consent_events');
  assert.equal(count.rows[0].total, 2);

  await db.query('INSERT INTO public.suppressed_emails VALUES ($1)', ['  TRAVELER@EXAMPLE.INVALID  ']);
  assert.equal(await canSend('email', email), false);
  await db.exec('DELETE FROM public.suppressed_emails');
  await db.query('INSERT INTO public.email_unsubscribe_tokens VALUES ($1, now())', [email]);
  assert.equal(await canSend('email', email), false);
  await db.exec('DELETE FROM public.email_unsubscribe_tokens');

  // Equivalent formatting preserves consent; replacing a destination and then restoring it does not.
  await db.query('UPDATE public.customers SET phone=$1 WHERE id=$2', ['+20 1012345678', customer]);
  assert.equal(await canSend('whatsapp', phone), true);
  await db.query('UPDATE public.customers SET email=$1 WHERE id=$2', ['replaced@example.invalid', customer]);
  await db.query('UPDATE public.customers SET email=$1 WHERE id=$2', [email, customer]);
  assert.equal(await canSend('email', email), false);
  await asUser(editor);
  assert.equal((await states()).email, 'contact_changed');
  await assert.rejects(record('email', true, originalProof), { code: '22023', message: 'marketing_consent_evidence_predates_withdrawal' });
  await record('email');
  assert.equal(await canSend('email', email), true);

  await db.query('UPDATE public.customers SET whatsapp_opt_out=true WHERE id=$1', [customer]);
  assert.equal(await canSend('whatsapp', phone), false);
  await db.query('UPDATE public.customers SET whatsapp_opt_out=false WHERE id=$1', [customer]);
  assert.equal(await canSend('whatsapp', phone), false);
  await db.query("UPDATE public.customers SET communication_preferences = '{\"email\":false}' WHERE id=$1", [customer]);
  assert.equal(await canSend('email', email), false);
  await db.query("UPDATE public.customers SET communication_preferences = '{\"email\":true}' WHERE id=$1", [customer]);
  assert.equal(await canSend('email', email), false);

  await db.query('UPDATE public.organizations SET active=false WHERE id=$1', [org]);
  await asUser(editor);
  await assert.rejects(record('email'), { code: '42501' });
  await record('email', false);
  assert.equal((await states()).email, 'withdrawn');
  await record('email', false);
  await asOwner();
  assert.equal(await canSend('email', email), false);
  await db.query('UPDATE public.customers SET archived_at=now() WHERE id=$1', [customer]);
  assert.equal(await canSend('email', email), false);
  console.log('Marketing consent checks passed for affirmative evidence, scoped actors, normalization, revocation, and existing suppression controls.');
} catch (error) {
  console.error(error.message, error.where ?? '', error.query ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
