import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const read = name => readFileSync(new URL(name, migrations), 'utf8');
const database = new PGlite();
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const [buyer, other, unconfirmed, platformAdmin, standard, monthlyOnly, custom, inactive] =
  Array.from({ length: 8 }, (_, i) => id(i + 1));

try {
  await database.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    INSERT INTO auth.users VALUES
      ('${buyer}', 'buyer@example.test', now()), ('${other}', 'other@example.test', now()),
      ('${unconfirmed}', 'unconfirmed@example.test', null);
    CREATE TYPE public.org_role AS ENUM ('owner');
    CREATE TABLE public.organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text UNIQUE, phone text,
      email text, address text, plan text, is_active boolean DEFAULT true
    );
    CREATE TABLE public.organization_members (
      organization_id uuid, user_id uuid, role org_role, is_active boolean
    );
    CREATE TABLE public.organization_settings (organization_id uuid PRIMARY KEY, phone text, email text);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, phone text, email text, updated_at timestamptz);
    CREATE TABLE public.admin_audit_log (
      organization_id uuid, user_id uuid, action text, target_table text,
      target_id uuid, new_values jsonb, details jsonb
    );
    CREATE TABLE public.subscription_plans (
      id uuid PRIMARY KEY, name text, name_ar text, is_active boolean, price_monthly numeric, price_yearly numeric
    );
    INSERT INTO public.subscription_plans VALUES
      ('${standard}', 'Pro', 'النمو', true, 100, 1000),
      ('${monthlyOnly}', 'Basic', 'الانطلاق', true, 100, 0),
      ('${custom}', 'Customised', 'باقة مخصصة', true, 100, 1000),
      ('${inactive}', 'Inactive', 'غير متاحة', false, 100, 1000);
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '${platformAdmin}'::uuid $$;
    CREATE FUNCTION public.has_platform_role(uuid, text) RETURNS boolean LANGUAGE sql AS $$
      SELECT public.is_platform_admin($1) AND $2 = 'platform_admin'
    $$;
  `);
  const core = read('20260822160000_saas_core_hardening.sql');
  const start = core.indexOf('CREATE OR REPLACE FUNCTION public.create_organization_onboarding(');
  const end = core.indexOf('CREATE OR REPLACE FUNCTION public.auto_assign_trial_subscription()', start);
  await database.exec(core.slice(start, end));
  await database.exec(read('20261113143111_required_organization_contacts.sql'));
  await database.exec(read('20261120133022_retain_subscription_selection_during_onboarding.sql'));
  const choose = (plan, billing) => database.query(
    "SELECT create_organization_for_subscription('Demo Company','Fixture Owner','01000000001','01000000001','company@example.test',$1,$2) AS id",
    [plan, billing],
  );
  const list = ids => database.query('SELECT * FROM list_organization_subscription_selections($1::uuid[])', [ids]);
  const actAs = async user => {
    await database.exec('RESET ROLE; SET ROLE authenticated');
    await database.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  };
  await database.exec('SET ROLE anon');
  await assert.rejects(choose(standard, 'yearly'), /permission denied/);
  await assert.rejects(list([]), /permission denied/);
  await actAs(unconfirmed);
  await assert.rejects(choose(standard, 'yearly'), /تأكيد بريد العمل/);
  await actAs(buyer);
  await assert.rejects(choose(standard, 'daily'), /دورة فوترة صالحة/);
  for (const plan of [monthlyOnly, custom, inactive]) {
    await assert.rejects(choose(plan, 'yearly'), /غير متاحة/);
  }
  await database.exec('RESET ROLE');
  assert.equal((await database.query('SELECT * FROM organizations')).rows.length, 0);
  await actAs(buyer);
  const organization = (await choose(standard, 'yearly')).rows[0].id;
  await assert.rejects(choose(standard, 'yearly'), /مؤسسة نشطة/);
  await assert.rejects(list([organization]), /إدارة المنصة/);
  await assert.rejects(database.query('SELECT * FROM private.organization_subscription_selections'), /permission denied/);
  await actAs(other);
  await assert.rejects(list([organization]), /إدارة المنصة/);
  const secondOrg = (await choose(monthlyOnly, 'monthly')).rows[0].id;
  await actAs(platformAdmin);
  assert.deepEqual((await list([organization])).rows, [{ organization_id: organization, plan_name: 'النمو', billing_cycle: 'yearly' }]);
  assert.deepEqual((await list([secondOrg])).rows, [{ organization_id: secondOrg, plan_name: 'الانطلاق', billing_cycle: 'monthly' }]);
  await database.exec('RESET ROLE');
  assert.deepEqual((await database.query('SELECT DISTINCT plan FROM organizations')).rows, [{ plan: 'trial' }]);
  console.log('Organization onboarding saved the chosen plan and term, retained trial status, and isolated visibility to platform admins.');
} finally {
  await database.close();
}
