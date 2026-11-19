import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/20261119231253_guard_booking_voucher_confirmation.sql', import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA private;
    CREATE SCHEMA storage;
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, status text, workflow_stage text NOT NULL);
    CREATE TABLE public.booking_vouchers (id int GENERATED ALWAYS AS IDENTITY, booking_id uuid UNIQUE, organization_id uuid);
    CREATE TABLE public.generated_documents (booking_id uuid, organization_id uuid, document_type text NOT NULL, file_path text);
    CREATE TABLE storage.objects (bucket_id text NOT NULL, name text NOT NULL);
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$
      SELECT $1 = '00000000-0000-0000-0000-000000000001'::uuid
        AND current_setting('test.subscription', true) IS DISTINCT FROM 'paused';
    $$;
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql AS $$
      SELECT $1 = '00000000-0000-0000-0000-000000000001'::uuid AND (
        $2 = 'bookings_view' OR current_setting('test.voucher_write', true) = 'on'
      );
    $$;
    GRANT USAGE ON SCHEMA private, storage TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.booking_vouchers, public.generated_documents, storage.objects TO authenticated;
    ALTER TABLE public.booking_vouchers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY vouchers_for_existing_org ON public.booking_vouchers TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY documents_for_existing_org ON public.generated_documents TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY objects_with_visible_metadata ON storage.objects TO authenticated USING (true) WITH CHECK (true);
    INSERT INTO public.bookings VALUES
      ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'confirmed', 'confirmed'),
      ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'pending', 'lead'),
      ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'cancelled', 'cancelled'),
      ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000002', 'confirmed', 'confirmed'),
      ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'confirmed', 'cancelled');
  `);
  await db.exec(migration);
  const organization = '00000000-0000-0000-0000-000000000001';
  const booking = (id) => `00000000-0000-0000-0000-000000000${id}`;
  const path = `${organization}/voucher/VCH-101.pdf`;
  const issue = (id) => db.query('INSERT INTO public.booking_vouchers (booking_id, organization_id) VALUES ($1, $2)', [booking(id), organization]);

  await db.exec("SET ROLE authenticated; SET test.voucher_write = 'on';");
  await assert.rejects(issue(102), { code: '23514' });
  await assert.rejects(issue(103), { code: '23514' });
  await assert.rejects(issue(104), { code: '23514' });
  await assert.rejects(issue(105), { code: '23514' });
  await assert.rejects(db.query("INSERT INTO public.generated_documents VALUES (NULL, $1, 'voucher', $2)", [organization, path]), { code: '23514' });
  await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('documents', $1)", [path]), { code: '42501' });

  await db.exec("SET test.voucher_write = 'off';");
  await assert.rejects(issue(101), { code: '42501' });
  await db.exec("SET test.voucher_write = 'on';");
  await issue(101);
  await db.query("INSERT INTO public.generated_documents VALUES ($1, $2, 'voucher', $3)", [booking(101), organization, path]);
  await db.query("INSERT INTO storage.objects VALUES ('documents', $1)", [path]);
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows[0].name, path);
  await db.exec("SET test.subscription = 'paused';");
  await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('documents', $1)", [path]), { code: '42501' });
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows[0].name, path);
  await db.exec("SET test.subscription = 'active';");

  await db.exec('RESET ROLE;');
  await db.query("UPDATE public.bookings SET status = 'canceled' WHERE id = $1", [booking(101)]);
  await db.exec('SET ROLE authenticated;');
  assert.equal((await db.query('SELECT id FROM public.booking_vouchers')).rows.length, 1);
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows.length, 0);
  await assert.rejects(db.query("UPDATE public.generated_documents SET file_path = 'other' WHERE booking_id = $1", [booking(101)]), { code: '23514' });
  await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('documents', $1)", [path]), { code: '42501' });
  console.log('Voucher issuance, storage eligibility, permissions, and archived metadata checks passed.');
} finally {
  await db.close();
}
