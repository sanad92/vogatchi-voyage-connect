import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const uuid = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const [org, otherOrg, manager, employee, colleague, noAccess, inactive, outsider, platformAdmin,
  limitedEmployee, employeeId, colleagueId, limitedEmployeeId, own, colleagueChat, queue, closed,
  otherChat, mismatchedChat] = Array.from({ length: 19 }, (_, index) => uuid(index + 1));

const ordinary = `${org}/${own}/photo.jpg`;
const approved = `${org}/${own}/approved-passport.pdf`;
const legacy = `${org}/legacy.jpg`;
const otherParty = `${org}/${colleagueChat}/inbound.jpg`;
const queued = `${org}/${queue}/pending.ogg`;
const closedObject = `${org}/${closed}/closed.jpg`;
const foreign = `${otherOrg}/${otherChat}/other.jpg`;
const mismatched = `${org}/${mismatchedChat}/mismatched.jpg`;
const orphan = `${org}/${own}/orphan.jpg`;
const outbound = (chat, suffix) => `${org}/${chat}/outbound-${uuid(suffix)}.jpg`;
const latestDraft = outbound(own, 51);
const oldDraft = outbound(own, 52);
const colleagueDraft = outbound(own, 53);
const stagedForSend = outbound(own, 54);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE SCHEMA private;
    GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated, service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
    $$;
    CREATE TABLE public.staff(
      org uuid, user_id uuid, active boolean, scope text, docs boolean, may_send boolean, admin boolean,
      PRIMARY KEY (org,user_id)
    );
    INSERT INTO public.staff VALUES
      ('${org}','${manager}',true,'organization',true,true,true),
      ('${org}','${employee}',true,'own',false,true,false),
      ('${org}','${colleague}',true,'organization',false,true,false),
      ('${org}','${noAccess}',true,'none',false,false,false),
      ('${org}','${inactive}',false,'organization',true,true,true),
      ('${otherOrg}','${outsider}',true,'organization',true,true,true),
      ('${org}','${limitedEmployee}',true,'own',true,false,false);
    CREATE FUNCTION public.user_belongs_to_org(actor uuid, company uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT EXISTS (SELECT 1 FROM public.staff WHERE user_id = actor AND org = company AND active)
      $$;
    CREATE FUNCTION public.is_platform_admin(actor uuid) RETURNS boolean
      LANGUAGE sql STABLE AS $$ SELECT actor = '${platformAdmin}'::uuid $$;
    CREATE FUNCTION public._org_permission_state(company uuid, actor uuid, permission text)
      RETURNS TABLE(granted boolean, data_scope text)
      LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT scope <> 'none', scope FROM public.staff
        WHERE user_id = actor AND org = company AND active AND permission = 'whatsapp_view'
      $$;
    CREATE FUNCTION public.has_org_permission(company uuid, permission text) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT coalesce(public.is_platform_admin(auth.uid()) OR EXISTS (
          SELECT 1 FROM public.staff WHERE org = company AND user_id = auth.uid() AND active
            AND CASE permission WHEN 'whatsapp_view' THEN scope <> 'none'
              WHEN 'customer_service_edit' THEN may_send WHEN 'whatsapp_admin' THEN admin
              WHEN 'documents_view' THEN docs WHEN 'documents_create' THEN docs
              WHEN 'crm_view' THEN may_send WHEN 'crm_create' THEN may_send ELSE false END
        ), false)
      $$;
    CREATE FUNCTION public.can_org_write(company uuid) RETURNS boolean
      LANGUAGE sql STABLE AS $$ SELECT public.user_belongs_to_org(auth.uid(), company) $$;

    CREATE TABLE public.profiles(id uuid PRIMARY KEY, linked_employee_id uuid);
    CREATE TABLE public.employees(id uuid PRIMARY KEY, organization_id uuid, is_active boolean);
    INSERT INTO public.profiles VALUES
      ('${employee}','${employeeId}'), ('${colleague}','${colleagueId}'),
      ('${limitedEmployee}','${limitedEmployeeId}');
    INSERT INTO public.employees VALUES
      ('${employeeId}','${org}',true), ('${colleagueId}','${org}',true),
      ('${limitedEmployeeId}','${org}',true);

    CREATE TABLE public.whatsapp_conversations(id uuid PRIMARY KEY, organization_id uuid, assigned_to uuid, status text, customer_id uuid);
    INSERT INTO public.whatsapp_conversations(id, organization_id, assigned_to, status) VALUES
      ('${own}','${org}','${employeeId}','active'),
      ('${colleagueChat}','${org}','${colleagueId}','active'),
      ('${queue}','${org}',null,'pending'), ('${closed}','${org}',null,'closed'),
      ('${otherChat}','${otherOrg}',null,'pending'), ('${mismatchedChat}','${otherOrg}',null,'pending');
    CREATE TABLE public.whatsapp_messages(id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid,
      media_storage_path text, direction text DEFAULT 'inbound', media_mime_type text DEFAULT 'image/jpeg');
    INSERT INTO public.whatsapp_messages(id, organization_id, conversation_id, media_storage_path) VALUES
      ('${uuid(31)}','${org}','${own}','${ordinary}'),
      ('${uuid(32)}','${org}','${own}','${approved}'),
      ('${uuid(33)}','${org}','${own}','${legacy}'),
      ('${uuid(34)}','${org}','${colleagueChat}','${otherParty}'),
      ('${uuid(35)}','${org}','${queue}','${queued}'),
      ('${uuid(36)}','${org}','${closed}','${closedObject}'),
      ('${uuid(37)}','${otherOrg}','${otherChat}','${foreign}'),
      ('${uuid(38)}','${org}','${mismatchedChat}','${mismatched}');
    CREATE TABLE public.whatsapp_passport_reviews(message_id uuid PRIMARY KEY, organization_id uuid, conversation_id uuid);
    INSERT INTO public.whatsapp_passport_reviews VALUES ('${uuid(32)}','${org}','${own}');
    ALTER TABLE public.whatsapp_passport_reviews ENABLE ROW LEVEL SECURITY;
    CREATE POLICY review_visible ON public.whatsapp_passport_reviews FOR SELECT TO authenticated
      USING (public.has_org_permission(organization_id, 'documents_view'));
    CREATE TABLE public.sop_leads(id uuid, organization_id uuid, conversation_id uuid, customer_id uuid);

    CREATE TABLE storage.objects(bucket_id text, name text PRIMARY KEY, owner_id text, created_at timestamptz DEFAULT now());
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('whatsapp-media','${ordinary}'), ('whatsapp-media','${approved}'), ('whatsapp-media','${legacy}'),
      ('whatsapp-media','${otherParty}'), ('whatsapp-media','${queued}'), ('whatsapp-media','${closedObject}'),
      ('whatsapp-media','${foreign}'), ('whatsapp-media','${mismatched}'), ('whatsapp-media','${orphan}'),
      ('other-bucket','file.jpg');
    INSERT INTO storage.objects VALUES
      ('whatsapp-media','${latestDraft}','${employee}',now()),
      ('whatsapp-media','${oldDraft}','${employee}',now() - interval '11 minutes'),
      ('whatsapp-media','${colleagueDraft}','${colleague}',now());

    GRANT ALL ON public.whatsapp_messages, public.whatsapp_conversations, storage.objects TO anon, authenticated, service_role;
    GRANT SELECT ON public.whatsapp_passport_reviews TO authenticated;
    ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view conversations" ON public.whatsapp_conversations FOR SELECT USING (true);
    CREATE POLICY "Users can view messages" ON public.whatsapp_messages FOR SELECT USING (true);
    CREATE POLICY whatsapp_conversations_select_org ON public.whatsapp_conversations FOR SELECT TO authenticated USING (true);
    CREATE POLICY whatsapp_messages_select_org ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);
    CREATE POLICY wa_media_read_org_members ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'whatsapp-media');
    CREATE POLICY wa_media_insert_org_members ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'whatsapp-media');
    CREATE POLICY wa_media_delete_org_members ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'whatsapp-media');
    CREATE POLICY unrelated_bucket_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'other-bucket');
  `);

  await db.exec(readFileSync(new URL(
    '../supabase/migrations/20261120112131_harden_whatsapp_data_access.sql', import.meta.url,
  ), 'utf8'));

  const login = (id) => db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
  const paths = async () => (await db.query('SELECT name FROM storage.objects ORDER BY name'))
    .rows.map((row) => row.name);
  const chats = async () => (await db.query('SELECT id FROM public.whatsapp_conversations ORDER BY id'))
    .rows.map((row) => row.id);
  const rows = async () => (await db.query('SELECT media_storage_path FROM public.whatsapp_messages ORDER BY media_storage_path'))
    .rows.map((row) => row.media_storage_path);
  const check = (values, expected, label) => assert.deepEqual(values.sort(), expected.sort(), label);

  for (const actor of [noAccess, inactive, limitedEmployee]) {
    await login(actor);
    check(await chats(), [], 'Inactive, unpermitted or unassigned read-only staff cannot view conversations');
    check(await rows(), [], 'Message visibility follows the conversation');
    check(await paths(), ['file.jpg'], 'Storage permissions leave other buckets unchanged');
  }

  await login(limitedEmployee);
  await assert.rejects(
    db.query('SELECT wa_approve_passport_reviews($1, $2, $3)', [org, own, JSON.stringify([{ message_id: uuid(32) }])]),
    /المرفق غير متاح في هذه المحادثة/,
    'Atomic passport approval requires conversation visibility as well as document permissions',
  );

  await login(employee);
  await assert.rejects(
    db.query('SELECT sop_save_whatsapp_lead($1, $2, $3)', [org, colleagueChat, '{}']),
    /المحادثة غير موجودة في المؤسسة/,
    'Atomic lead creation follows the same conversation scope',
  );
  check(await chats(), [own, queue], 'Scoped employee can work their assignment and open queue');
  check(await rows(), [ordinary, approved, legacy, queued], 'Scoped employee receives metadata only for visible conversations');
  check(await paths(), [ordinary, legacy, queued, latestDraft, 'file.jpg'], 'Staged owner access and ordinary legacy preview work without approved documents');
  const { rows: inserted } = await db.query(
    'INSERT INTO storage.objects(bucket_id, name, owner_id) VALUES ($1,$2,$3) RETURNING name',
    ['whatsapp-media', stagedForSend, employee],
  );
  assert.deepEqual(inserted, [{ name: stagedForSend }], 'Owned outbound upload and its response are authorized');

  await login(manager);
  check(await chats(), [own, colleagueChat, queue, closed], 'Organization-wide access still excludes the other tenant');
  check(await paths(), [ordinary, approved, legacy, otherParty, queued, closedObject, 'file.jpg'],
    'Manager with documents permission can preview approved media and never sees other users’ staged files');
  assert.equal((await db.query("DELETE FROM storage.objects WHERE name = $1 RETURNING name", [ordinary])).rows.length, 0,
    'Authenticated clients cannot delete stored messages’ objects');
  assert.equal((await db.query("SELECT has_table_privilege(current_user, 'public.whatsapp_messages', 'INSERT') AS can_insert")).rows[0].can_insert,
    false, 'Client writes cannot create new media references');

  await login(outsider);
  check(await paths(), [foreign, 'file.jpg'], 'Another tenant only sees its own media');
  await login(platformAdmin);
  assert.equal((await chats()).length, 6, 'Explicit platform conversation visibility is preserved');
  check(await paths(), ['file.jpg'], 'Platform staff get no additional private media access without organization membership');

  await db.exec("SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false);");
  check(await chats(), [], 'Unauthenticated users see no conversations');
  check(await rows(), [], 'Unauthenticated users see no messages');
  check(await paths(), [], 'Unauthenticated users see no media');
  await db.exec('SET ROLE service_role;');
  await db.query("INSERT INTO public.whatsapp_messages(id,organization_id,conversation_id) VALUES ($1,$2,$3)", [uuid(59), org, own]);
  assert.equal((await db.query("SELECT count(*)::int AS total FROM public.whatsapp_messages")).rows[0].total, 9,
    'Service-role webhook and send writers still have full access');
  console.log('WhatsApp conversation scopes, approved document visibility, and private media upload/preview checks passed.');
} finally {
  await db.close();
}
