import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const existing = '20261113150910_supplier_allotment_usage.sql';
const current = readdirSync(migrations).find(file => file.endsWith('_enforce_supplier_allotment_release_deadline.sql'));
assert.ok(current, 'release deadline migration exists');

const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const org = id(1);
const otherOrg = id(2);
const actor = id(3);
const vendor = id(4);
const allotment = id(5);
const otherAllotment = id(6);
const today = "(now() AT TIME ZONE 'Africa/Cairo')::date";
const db = new PGlite();

try {
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE ROLE anon;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${actor}'::uuid $$;
    CREATE FUNCTION public.user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql
      AS $$ SELECT $1 = '${actor}'::uuid AND $2 = '${org}'::uuid $$;
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql
      AS $$ SELECT $1 = '${org}'::uuid $$;
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql
      AS $$ SELECT $1 = '${org}'::uuid AND $2 IN ('suppliers_edit','suppliers_create','bookings_view') $$;

    CREATE TABLE public.suppliers (id uuid PRIMARY KEY, organization_id uuid);
    CREATE TABLE public.supplier_contracts (id uuid PRIMARY KEY, organization_id uuid, supplier_id uuid);
    CREATE TABLE public.supplier_allotments (
      id uuid PRIMARY KEY, organization_id uuid, supplier_id uuid, contract_id uuid,
      service_type text, status text, start_date date, end_date date,
      release_days integer, total_quantity integer, used_quantity integer
    );
    CREATE TABLE public.bookings (
      id uuid PRIMARY KEY, organization_id uuid, supplier_id uuid, booking_type text, booking_number text,
      status text, start_date date, end_date date
    );
    CREATE TABLE public.allotment_usage (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, allotment_id uuid, booking_id uuid,
      booking_type text, quantity_used integer, usage_date date, created_by uuid
    );
    CREATE FUNCTION public.trg_update_allotment_usage() RETURNS trigger LANGUAGE plpgsql
      AS $$ BEGIN RETURN NEW; END $$;
    CREATE TRIGGER trg_allotment_usage_change AFTER INSERT ON public.allotment_usage
      FOR EACH ROW EXECUTE FUNCTION public.trg_update_allotment_usage();

    INSERT INTO public.supplier_allotments VALUES
      ('${allotment}','${org}','${vendor}',NULL,'hotel','active',${today},${today} + 30,7,10,0),
      ('${otherAllotment}','${otherOrg}','${vendor}',NULL,'hotel','active',${today},${today} + 30,7,10,0);
    INSERT INTO public.bookings VALUES
      ('${id(7)}','${org}','${vendor}','hotel','legacy-active','confirmed',${today} + 3,${today} + 4),
      ('${id(8)}','${org}','${vendor}','hotel','too-late','confirmed',${today} + 6,${today} + 7),
      ('${id(9)}','${org}','${vendor}','hotel','cutoff-day','confirmed',${today} + 7,${today} + 8),
      ('${id(10)}','${org}','${vendor}','hotel','before-cutoff','confirmed',${today} + 8,${today} + 9),
      ('${id(11)}','${org}','${vendor}','hotel','valid-checkout','confirmed',${today} + 29,${today} + 31),
      ('${id(12)}','${org}','${vendor}','hotel','past-allotment','confirmed',${today} + 29,${today} + 32),
      ('${id(13)}','${org}','${vendor}','hotel','reversed-dates','confirmed',${today} + 10,${today} + 9),
      ('${id(14)}','${otherOrg}','${vendor}','hotel','outside-company','confirmed',${today} + 8,${today} + 9);
  `);

  const run = (selectedAllotment, action, reference = null, quantity = null, usage = null) =>
    db.query(
      'SELECT public.manage_supplier_allotment_usage($1,$2,$3,$4,$5) AS id',
      [selectedAllotment, action, reference, quantity, usage],
    ).then(result => result.rows[0].id);
  const reserve = (reference, quantity = 1) => run(allotment, 'reserve', reference, quantity);

  await db.exec(readFileSync(new URL(existing, migrations), 'utf8'));
  await db.exec('SET ROLE authenticated');
  const existingUsage = await reserve('legacy-active', 2);
  await db.exec('RESET ROLE');

  await db.exec(readFileSync(new URL(current, migrations), 'utf8'));
  await db.exec('SET ROLE authenticated');
  assert.equal(await reserve('legacy-active', 2), existingUsage);
  await assert.rejects(reserve('legacy-active', 3), { code: '23505' });
  await assert.rejects(reserve('too-late'), { code: '22023', message: /انتهت مهلة تخصيص الحصة لهذا الحجز في [0-9-]+/ });
  assert.ok(await reserve('cutoff-day'));
  assert.ok(await reserve('before-cutoff'));
  assert.ok(await reserve('valid-checkout'));
  await assert.rejects(reserve('past-allotment'), { code: '22023', message: /فترة الحجز خارج فترة الحصة/ });
  await assert.rejects(reserve('reversed-dates'), { code: '22023', message: /فترة الحجز خارج فترة الحصة/ });
  await assert.rejects(reserve('outside-company'), { code: '22023' });
  await assert.rejects(run(otherAllotment, 'reserve', 'outside-company', 1), { code: '42501' });

  assert.equal(await run(allotment, 'release_usage', null, null, existingUsage), existingUsage);
  await assert.rejects(reserve('legacy-active', 2), { code: '22023', message: /انتهت مهلة/ });
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT used_quantity FROM public.supplier_allotments WHERE id=$1', [allotment])).rows[0].used_quantity, 3);
  await db.exec('SET ROLE anon');
  await assert.rejects(reserve('cutoff-day'), { code: '42501' });
  console.log('Supplier allocation passed for cutoff day, past deadline, date range, retry, release and tenant scope.');
} finally {
  await db.close();
}
