import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const org = '00000000-0000-4000-8000-000000000001';
const otherOrg = '00000000-0000-4000-8000-000000000002';
const staff = '00000000-0000-4000-8000-000000000003';
const uploader = '00000000-0000-4000-8000-000000000004';
const manager = '00000000-0000-4000-8000-000000000005';
const outsider = '00000000-0000-4000-8000-000000000006';
const general = `${org}/uploads/general/file.pdf`;
const confidential = `${org}/uploads/general/confidential.pdf`;
const generated = `${org}/invoice/example.pdf`;
const queueAttachment = `${org}/queue/file.pdf`;
const assignedAttachment = `${org}/assigned/file.pdf`;
const expiredUpload = `${org}/uploads/general/expired.pdf`;

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA auth, storage TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('test.user', true), '')::uuid
    $$;
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'manager', 'agent', 'viewer');
    CREATE TABLE organization_members (organization_id uuid, user_id uuid, role org_role, is_active boolean);
    CREATE FUNCTION public.get_user_org_ids(uuid) RETURNS uuid[] LANGUAGE sql STABLE AS $$
      SELECT coalesce(array_agg(organization_id), '{}') FROM public.organization_members
      WHERE user_id = $1 AND is_active
    $$;
    CREATE FUNCTION public.user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT $2 = ANY(public.get_user_org_ids($1))
    $$;
    CREATE FUNCTION public.get_user_org_role(uuid, uuid) RETURNS org_role LANGUAGE sql STABLE AS $$
      SELECT role FROM public.organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active
    $$;
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
    CREATE TABLE public.documents (organization_id uuid, file_path text, uploaded_by uuid, is_confidential boolean);
    CREATE TABLE public.generated_documents (organization_id uuid, file_path text, document_type text, booking_id uuid);
    CREATE TABLE public.bookings (id uuid, organization_id uuid, status text, workflow_stage text);
    CREATE TABLE public.booking_vouchers (booking_id uuid, organization_id uuid, voucher_number text);
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT public.user_belongs_to_org(auth.uid(), $1)
    $$;
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT public.user_belongs_to_org(auth.uid(), $1)
    $$;
    CREATE TABLE public.email_threads (id integer PRIMARY KEY, organization_id uuid, assigned_to uuid);
    CREATE TABLE public.email_messages (id integer PRIMARY KEY, thread_id integer REFERENCES email_threads(id));
    CREATE TABLE public.email_attachments (organization_id uuid, message_id integer REFERENCES email_messages(id), storage_path text);
    CREATE TABLE storage.objects (bucket_id text, name text, owner_id text, created_at timestamptz DEFAULT now());
    GRANT SELECT ON organization_members, documents, generated_documents, email_threads, email_messages, email_attachments,
      storage.objects TO authenticated;
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE booking_vouchers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT INSERT ON storage.objects, generated_documents TO authenticated;
    GRANT SELECT, INSERT ON booking_vouchers TO authenticated;
    CREATE POLICY "Write confirmed vouchers" ON booking_vouchers TO authenticated
    USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
    CREATE POLICY "Upload to organization" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND split_part(name, '/', 1) = ANY(public.get_user_org_ids(auth.uid())::text[])
    );

    INSERT INTO organization_members VALUES
      ('${org}', '${staff}', 'agent', true), ('${org}', '${uploader}', 'agent', true),
      ('${org}', '${manager}', 'manager', true), ('${otherOrg}', '${outsider}', 'owner', true);
    INSERT INTO documents VALUES
      ('${org}', '${general}', '${uploader}', false), ('${org}', '${confidential}', '${uploader}', true);
    INSERT INTO generated_documents VALUES ('${org}', '${generated}');
    INSERT INTO email_threads VALUES (1, '${org}', null), (2, '${org}', '${uploader}');
    INSERT INTO email_messages VALUES (1, 1), (2, 2);
    INSERT INTO email_attachments VALUES ('${org}', 1, '${queueAttachment}'), ('${org}', 2, '${assignedAttachment}');
    INSERT INTO storage.objects VALUES
      ('documents', '${general}'), ('documents', '${confidential}'), ('documents', '${generated}'),
      ('documents', '${org}/uploads/general/awaiting-metadata.pdf'),
      ('email-attachments', '${queueAttachment}'), ('email-attachments', '${assignedAttachment}'),
      ('email-attachments', '${org}/awaiting-metadata.pdf');
    INSERT INTO storage.objects VALUES ('documents', '${expiredUpload}', '${uploader}', now() - interval '11 minutes');
  `);

  const migration = (file) => readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
  const documents = await migration('20260812124147_2eb4af0b-1aea-427a-a8d4-c1004f0e57f4.sql');
  await db.exec(documents.slice(documents.indexOf('CREATE POLICY "documents org members read"'), documents.indexOf('-- 3)')));
  const generatedDocs = await migration('20260327230315_12853267-4e1b-4a69-a8e1-9e03fd2fe76d.sql');
  await db.exec(generatedDocs.slice(generatedDocs.indexOf('CREATE POLICY "Users can manage documents for their org"'), generatedDocs.indexOf('-- Document templates')));
  const mail = await migration('20261001102017_e2576607-5ed3-4e1b-8b3a-b15e413166f7.sql');
  await db.exec(mail.slice(mail.indexOf('CREATE OR REPLACE FUNCTION public.can_see_email_thread'), mail.indexOf('CREATE TABLE public.email_messages')));
  await db.exec(mail.slice(mail.indexOf('CREATE POLICY "view email messages"'), mail.indexOf('CREATE TABLE public.email_attachments')));
  await db.exec(mail.slice(mail.indexOf('CREATE POLICY "view email attachments"'), mail.indexOf('CREATE OR REPLACE FUNCTION public.claim_email_thread')));
  const hardening = await migration('20261119230802_protect_private_document_and_email_objects.sql');
  const vouchers = await migration('20261119231253_guard_booking_voucher_confirmation.sql');
  await db.exec(hardening);
  await db.exec(vouchers);
  await db.exec(hardening);
  await db.exec(vouchers);

  const visibleObjects = async (member) => {
    await db.query("SELECT set_config('test.user', $1, false)", [member]);
    await db.exec('SET ROLE authenticated');
    try {
      return (await db.query('SELECT name FROM storage.objects ORDER BY name')).rows.map(({ name }) => name);
    } finally {
      await db.exec('RESET ROLE');
    }
  };

  assert.deepEqual(await visibleObjects(staff), [generated, queueAttachment, general].sort());
  assert.deepEqual(await visibleObjects(uploader), [assignedAttachment, generated, queueAttachment, confidential, general].sort());
  assert.deepEqual(await visibleObjects(manager), [assignedAttachment, generated, queueAttachment, confidential, general].sort());
  assert.deepEqual(await visibleObjects(outsider), []);
  assert.deepEqual(await visibleObjects(''), []);

  // A legacy generated record can share the object path of a categorized document.
  await db.query('INSERT INTO public.generated_documents VALUES ($1, $2)', [org, confidential]);
  assert.deepEqual(await visibleObjects(staff), [generated, queueAttachment, general].sort());

  // A finished upload becomes readable only after its metadata is saved.
  const pending = `${org}/uploads/general/awaiting-metadata.pdf`;
  await db.query('INSERT INTO public.documents VALUES ($1, $2, $3, false)', [org, pending, uploader]);
  assert.deepEqual(await visibleObjects(staff), [generated, queueAttachment, general, pending].sort());
  // Storage checks visibility when returning the newly registered upload.
  const fresh = `${org}/invoice/new.pdf`;
  await db.query("SELECT set_config('test.user', $1, false)", [uploader]);
  await db.exec('SET ROLE authenticated');
  await db.query('INSERT INTO public.generated_documents VALUES ($1, $2)', [org, fresh]);
  assert.deepEqual(
    (await db.query("INSERT INTO storage.objects VALUES ('documents', $1) RETURNING name", [fresh])).rows,
    [{ name: fresh }],
  );
  await db.exec('RESET ROLE');

  // Existing browser sessions finish the upload and acknowledgement before
  // creating metadata. Only their own upload is visible until that happens.
  const oldUpload = `${org}/uploads/general/old-browser.pdf`;
  const booked = `${org.slice(0, -1)}9`;
  const oldVoucher = `${org}/voucher/VCH-LEGACY.pdf`;
  await db.query("INSERT INTO public.bookings VALUES ($1, $2, 'confirmed', 'confirmed')", [booked, org]);
  await db.exec('SET ROLE authenticated');
  await db.query("INSERT INTO public.booking_vouchers VALUES ($1, $2, 'VCH-LEGACY')", [booked, org]);
  for (const path of [oldUpload, oldVoucher]) {
    assert.deepEqual(
      (await db.query("INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('documents', $1, $2) RETURNING name", [path, uploader])).rows,
      [{ name: path }],
    );
  }
  await db.exec('RESET ROLE');
  assert.ok(!(await visibleObjects(staff)).includes(oldUpload));
  assert.ok(!(await visibleObjects(staff)).includes(oldVoucher));
  assert.ok(!(await visibleObjects(uploader)).includes(expiredUpload));
  await db.query('INSERT INTO public.documents VALUES ($1, $2, $3, false)', [org, oldUpload, uploader]);
  await db.query("INSERT INTO public.generated_documents VALUES ($1, $2, 'voucher', $3)", [org, oldVoucher, booked]);
  assert.ok((await visibleObjects(staff)).includes(oldUpload));
  assert.ok((await visibleObjects(staff)).includes(oldVoucher));
  await db.query("UPDATE public.bookings SET workflow_stage = 'cancelled' WHERE id = $1", [booked]);
  assert.ok(!(await visibleObjects(uploader)).includes(oldVoucher));
  assert.ok(!(await visibleObjects(staff)).includes(oldVoucher));
  console.log('Private storage visibility checks passed');
} finally {
  await db.close();
}
