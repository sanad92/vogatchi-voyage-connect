import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const readSql = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const doBlock = (sql, tag) => {
  const marker = '$' + tag + '$';
  const start = sql.indexOf('DO ' + marker);
  const end = sql.indexOf(marker + ';', start + marker.length + 3);
  assert.ok(start >= 0 && end > start, `Expected historical ${tag} block`);
  return sql.slice(start, end + marker.length + 1);
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE public.organizations (id uuid PRIMARY KEY);
    CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, is_active boolean);
    CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid, name text);
    CREATE TABLE public.suppliers (id uuid PRIMARY KEY, organization_id uuid, is_active boolean);
    CREATE TABLE public.customer_payments (id uuid PRIMARY KEY);
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (bucket_id text, name text);
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$
      SELECT string_to_array($1, '/')
    $$;
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.get_user_org_role(uuid, uuid) RETURNS text LANGUAGE sql AS $$ SELECT NULL::text $$;
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  `);

  const attachments = await readSql('supabase/migrations/20261113145246_private_operational_attachments.sql');
  await assert.rejects(db.exec(attachments), {
    code: '42P01',
    message: 'relation "public.pilgrims" does not exist',
  });
  await db.exec(await readSql('drizzle/migrations/0006_support_tickets_and_pilgrimage.sql'));
  await db.exec(await readSql('drizzle/migrations/0010_pilgrimage_operations.sql'));
  await db.exec(attachments);
  assert.equal((await db.query('SELECT count(*)::int AS total FROM storage.buckets')).rows[0].total, 2);

  const fit = await readSql('supabase/migrations/20261113145843_pilgrimage_fit_supplier_confirmation.sql');
  await assert.rejects(db.exec(fit), {
    code: '42P01',
    message: 'relation "public.pilgrimage_sale_items" does not exist',
  });
  await db.exec(await readSql('scripts/deploy-pilgrimage-sales-models.sql'));
  await db.exec(fit);
  assert.equal((await db.query("SELECT to_regclass('public.pilgrimage_fit_supplier_confirmations') IS NOT NULL AS installed")).rows[0].installed, true);

  await db.exec(`
    CREATE TABLE public.quotes (id uuid PRIMARY KEY, organization_id uuid, created_by uuid);
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, status text, is_demo boolean,
      cost_price numeric, supplier_id uuid);
    CREATE TABLE public.invoices (id uuid PRIMARY KEY);
    CREATE TABLE public.quote_items (id uuid PRIMARY KEY, quote_id uuid, total_cost numeric, supplier_id uuid);
    CREATE TABLE public.supplier_payment_orders (booking_id uuid, source_type text, source_id uuid,
      id uuid, organization_id uuid, supplier_id uuid, amount numeric, status text, approval_status text);
    CREATE TABLE public.hotel_bookings (id uuid);
    CREATE TABLE public.flight_bookings (id uuid);
    CREATE TABLE public.transport_bookings (id uuid);
    CREATE TABLE public.car_rentals (id uuid);
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public._org_permission_state(uuid, uuid, text)
    RETURNS TABLE(data_scope text) LANGUAGE sql AS $$ SELECT NULL::text $$;
  `);

  const supplierCancellation = await readSql('supabase/migrations/20261113234804_full_booking_supplier_cancellation.sql');
  const quoteGuardPatch = doBlock(supplierCancellation, 'quote_links');
  const terms = await readSql('supabase/migrations/20261113235821_booking_cancellation_terms_and_payment_schedule.sql');
  const bookingCreationPatch = doBlock(terms, 'creation');
  const functionDefinition = async (signature) => {
    const { rows } = await db.query('SELECT pg_get_functiondef(to_regprocedure($1)) AS body', [signature]);
    return rows[0].body;
  };

  // Without the out-of-band functions, the supplier guard patch no-ops and
  // the cancellation terms migration cannot begin its function updates.
  await db.exec(quoteGuardPatch);
  assert.equal(await functionDefinition('public.guard_quote_conversion_links()'), null);
  await assert.rejects(db.exec(bookingCreationPatch), {
    code: '42883',
    message: 'function "public.create_booking_atomic(uuid,uuid,jsonb)" does not exist',
  });

  await db.exec(await readSql('scripts/deploy-atomic-quote.sql'));
  await db.exec(await readSql('scripts/deploy-atomic-booking.sql'));
  await assert.rejects(db.exec(bookingCreationPatch), {
    code: '42883',
    message: 'function "public.convert_quote_atomic(uuid,uuid)" does not exist',
  });
  assert.doesNotMatch(await functionDefinition('public.create_booking_atomic(uuid,uuid,jsonb)'), /cancellation_terms/);

  await db.exec(await readSql('scripts/deploy-quote-conversion.sql'));
  assert.doesNotMatch(await functionDefinition('public.guard_quote_conversion_links()'), /booking_supplier_cancellations/);
  await db.exec(quoteGuardPatch);
  await db.exec(bookingCreationPatch);
  assert.match(await functionDefinition('public.guard_quote_conversion_links()'), /booking_supplier_cancellations/);
  assert.match(await functionDefinition('public.create_booking_atomic(uuid,uuid,jsonb)'), /cancellation_terms/);
  assert.match(await functionDefinition('public.convert_quote_atomic(uuid,uuid)'), /cancellation_terms/);
  console.log('Verified isolated attachment, FIT sales and booking/quote cancellation migration prerequisites.');
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
