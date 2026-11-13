import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const [admin, member, waiting, quoted, booked, inactive, old, plan] = Array.from({ length: 8 }, (_, i) => id(i + 1));
const useRole = (user) => db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${user}',false); SET ROLE authenticated;`);
const fetch = async (company = null, page = 0) => (await db.query(
  'SELECT public.platform_company_activation($1::uuid,$2::integer) AS result', [company, page],
)).rows[0].result;
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_platform_admin(user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT user_id = '${admin}'::uuid $$;
    CREATE TABLE public.organizations (id uuid PRIMARY KEY, name text, email text, is_active boolean, created_at timestamptz);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, email text);
    CREATE TABLE public.subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, status text,
      starts_at timestamptz, expires_at timestamptz, plan_id uuid, created_at timestamptz);
    CREATE TABLE public.subscription_plans (id uuid PRIMARY KEY, name text, name_ar text);
    CREATE TABLE public.quotes (organization_id uuid, created_at timestamptz, is_demo boolean);
    CREATE TABLE public.hotel_bookings (organization_id uuid, created_at timestamptz);
    CREATE TABLE public.flight_bookings (LIKE public.hotel_bookings);
    CREATE TABLE public.car_rentals (LIKE public.hotel_bookings);
    CREATE TABLE public.transport_bookings (LIKE public.hotel_bookings);
    CREATE TABLE public.organization_members (organization_id uuid, is_active boolean);
    CREATE TABLE public.support_tickets (organization_id uuid, status text);
    CREATE TABLE public.bank_transfer_requests (id uuid PRIMARY KEY, organization_id uuid, status text, reviewed_at timestamptz);
    CREATE TABLE public.platform_finance_entries (source text, source_id uuid);
    CREATE TABLE public.payment_transactions (organization_id uuid, checkout_session_id uuid, paymob_transaction_id text,
      status text, hmac_valid boolean, subscription_activated_at timestamptz);
    CREATE TABLE public.payment_checkout_sessions (id uuid PRIMARY KEY, organization_id uuid, status text, provider_transaction_id text);

    INSERT INTO auth.users VALUES ('${admin}'),('${member}');
    INSERT INTO public.profiles VALUES ('${admin}','Account operator','operator@example.test');
    INSERT INTO public.subscription_plans VALUES ('${plan}','Basic','الانطلاق');
    INSERT INTO public.organizations
      SELECT company_id, company_id::text, null, company_id <> '${inactive}', now() - interval '10 days'
      FROM unnest(ARRAY['${waiting}','${quoted}','${booked}','${inactive}','${old}']::uuid[]) AS company_id;
    INSERT INTO public.subscriptions (organization_id,status,starts_at,expires_at,plan_id,created_at)
      SELECT id,'trialing',now()-interval '10 days',now()+interval '3 days','${plan}',now()-interval '10 days'
      FROM public.organizations;
    UPDATE public.subscriptions SET expires_at = now()-interval '1 day' WHERE organization_id = '${old}';
    INSERT INTO public.quotes VALUES ('${waiting}',now(),true),('${quoted}',now(),false);
    INSERT INTO public.flight_bookings VALUES ('${booked}',now());
    INSERT INTO public.organization_members VALUES ('${waiting}',true),('${waiting}',false);
    INSERT INTO public.support_tickets VALUES ('${waiting}','open'),('${waiting}','resolved');
    INSERT INTO public.bank_transfer_requests VALUES
      ('${id(20)}','${waiting}','approved',now()),('${id(21)}','${waiting}','pending',null);
  `);
  await db.exec(readFileSync('supabase/migrations/20261113140304_platform_company_followup.sql', 'utf8'));
  await useRole(member);
  await assert.rejects(fetch(), { code: '42501' });
  await assert.rejects(db.query('INSERT INTO public.platform_company_followups (organization_id,updated_by) VALUES ($1,$2)', [waiting, member]), { code: '42501' });
  await useRole(admin);
  const queue = await fetch();
  assert.equal(queue.total, 1);
  assert.equal(queue.rows[0].id, waiting);
  assert.equal(queue.rows[0].first_quote_at, null);
  assert.equal(queue.rows[0].pending_transfers, 1);
  assert.equal(queue.rows[0].open_tickets, 1);
  assert.equal(queue.rows[0].active_members, 1);
  assert.equal(queue.rows[0].last_confirmed_payment_at, null);
  assert.equal((await fetch(null, 1)).rows.length, 0);
  assert((await fetch(booked)).rows[0].first_booking_at);
  assert((await fetch(quoted)).rows[0].first_quote_at);
  await assert.rejects(db.query('INSERT INTO public.platform_company_followups (organization_id,assigned_to,updated_by) VALUES ($1,$2,$3)', [waiting, member, admin]), { code: '42501' });
  await db.query('INSERT INTO public.platform_company_followups (organization_id,assigned_to,updated_by,note) VALUES ($1,$2,$2,$3)', [waiting, admin, 'Call back']);
  assert.equal((await fetch(waiting)).rows[0].note, 'Call back');
  assert.equal((await fetch(waiting)).rows[0].assigned_name, 'Account operator');
  await assert.rejects(db.query('UPDATE public.platform_company_followups SET organization_id=$1 WHERE organization_id=$2', [quoted, waiting]), { code: '42501' });
  await useRole(member);
  assert.equal((await db.query('SELECT * FROM public.platform_company_followups')).rows.length, 0);
  console.log('PASS trial window, demo filtering, booking detection, summary counts and platform-only follow-up access');
} catch (error) {
  console.error(error.message, error.code ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
