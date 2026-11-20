import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { extractWhatsAppLeadDraft } from '../supabase/functions/_shared/whatsapp-lead-draft.ts';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const migration = (name) => read('../supabase/migrations/' + name);
const fixtureId = (suffix) => '10000000-0000-4000-8000-' + String(suffix).padStart(12, '0');
const [orgA, orgB, agent, viewer, foreign, unsubscribed, chat, foreignChat, hiddenChat, customer] =
  Array.from({ length: 10 }, (_, index) => fixtureId(index + 1));
const explicitRequest = 'عايز فندق في شرم الشيخ من ٢٠٢٦-١٢-٢٥ إلى ٢٠٢٦-١٢-٣٠، ٢ بالغين، ١ طفل، الميزانية: ١٠٠٠ جنيه';
const expectedDraft = {
  intent: 'hotel', destination_city: 'شرم الشيخ', check_in_date: '2026-12-25', check_out_date: '2026-12-30',
  adults: 2, children: 1, budget_amount: 1000, budget_currency: 'EGP',
};
assert.deepEqual(extractWhatsAppLeadDraft([explicitRequest]), expectedDraft);
assert.deepEqual(extractWhatsAppLeadDraft(['الوجهة: القاهرة، الأطفال: ٢، أعمار الأطفال: ٠، ١٣']), {
  destination_city: 'القاهرة', children: 2, children_ages: [0, 13],
});
assert.deepEqual(extractWhatsAppLeadDraft(['بطاقة العميل، تاريخ الميلاد: 1982-02-15، الرقم القومي: 12345678901234']), {});
assert.deepEqual(extractWhatsAppLeadDraft(['تاريخ السفر: 2027-02-30، الميزانية: 2000، الوصول: 05/06/2027']), {});
assert.deepEqual(extractWhatsAppLeadDraft(['تاريخ الوصول: 2027-02-02', 'تاريخ المغادرة: 2027-02-09']), {
  check_in_date: '2027-02-02',
});
assert.deepEqual(extractWhatsAppLeadDraft(['من 2027-02-02 إلى 2027-02-01']), {
  check_in_date: '2027-02-02',
});
assert.deepEqual(extractWhatsAppLeadDraft(['الوجهة: 12345678901234']), {});
assert.deepEqual(extractWhatsAppLeadDraft(['أعمار الأطفال: ٦، ١٠، 1234 بالغين']), {});

const db = new PGlite();
async function as(user, role = 'authenticated') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec('SET ROLE ' + role);
}

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE public.fixture_members (organization_id uuid, user_id uuid, permissions text[], active boolean);
    INSERT INTO public.fixture_members VALUES
      ('${orgA}','${agent}',ARRAY['whatsapp_view','crm_view','crm_create'],true),
      ('${orgA}','${viewer}',ARRAY['whatsapp_view','crm_view'],true),
      ('${orgB}','${foreign}',ARRAY['whatsapp_view','crm_view','crm_create'],true),
      ('${orgA}','${unsubscribed}',ARRAY['whatsapp_view','crm_view','crm_create'],false);
    CREATE FUNCTION public.user_belongs_to_org(actor uuid, org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT EXISTS (SELECT 1 FROM public.fixture_members m WHERE m.user_id = actor AND m.organization_id = org)
    $$;
    CREATE FUNCTION public.can_org_write(org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT EXISTS (SELECT 1 FROM public.fixture_members m WHERE m.user_id = auth.uid() AND m.organization_id = org AND m.active)
    $$;
    CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT permission = ANY(m.permissions) FROM public.fixture_members m
      WHERE m.user_id = auth.uid() AND m.organization_id = org
    $$;

    CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid);
    INSERT INTO public.customers VALUES ('${customer}','${orgA}');
    CREATE TABLE public.whatsapp_conversations (id uuid PRIMARY KEY, organization_id uuid NOT NULL, customer_id uuid, visible boolean NOT NULL);
    CREATE TABLE public.whatsapp_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, conversation_id uuid NOT NULL,
      direction text, message_type text, content text, sent_at timestamptz
    );
    ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_conversations ON public.whatsapp_conversations FOR SELECT TO authenticated
      USING (visible AND public.user_belongs_to_org(auth.uid(), organization_id));
    CREATE POLICY fixture_messages ON public.whatsapp_messages FOR SELECT TO authenticated
      USING (public.user_belongs_to_org(auth.uid(), organization_id));
    GRANT SELECT ON public.whatsapp_conversations, public.whatsapp_messages TO authenticated;
    INSERT INTO public.whatsapp_conversations VALUES
      ('${chat}','${orgA}','${customer}',true), ('${foreignChat}','${orgB}',null,true), ('${hiddenChat}','${orgA}',null,false);
    INSERT INTO public.whatsapp_messages (organization_id, conversation_id, direction, message_type, content, sent_at) VALUES
      ('${orgA}','${chat}','inbound','image','destination: Attachment','2026-12-06'),
      ('${orgA}','${chat}','outbound','text','الوجهة: قيمة من الموظف','2026-12-06'),
      ('${orgB}','${chat}','inbound','text','الوجهة: شركة غير مطابقة','2026-12-06'),
      ('${orgB}','${foreignChat}','inbound','text','الوجهة: الخارج','2026-12-06'),
      ('${orgA}','${chat}','inbound','text','   ','2026-12-06'),
      ('${orgA}','${chat}','inbound','text',repeat('x',1100),'2026-12-04'),
      ('${orgA}','${chat}','inbound','text','طلب سابق','2026-10-28');
    INSERT INTO public.whatsapp_messages (organization_id, conversation_id, direction, message_type, content, sent_at)
      SELECT '${orgA}', '${chat}', 'inbound', 'text', 'أقدم', '2026-11-01'::date + n
      FROM generate_series(1,35) AS period(n)
      WHERE '2026-11-01'::date + n < '2026-12-03';
  `);
  await db.query(`INSERT INTO public.whatsapp_messages (organization_id, conversation_id, direction, message_type, content, sent_at)
    VALUES ($1,$2,'inbound','text',$3,'2026-12-05')`, [orgA, chat, explicitRequest]);

  const crm = await migration('20260809193004_9ab647e6-5192-43e2-b346-ad35d2492099.sql');
  await db.exec(crm.slice(crm.indexOf('-- ============ ENUMS'), crm.indexOf('-- ============ DEPARTMENT MEMBERSHIP')));
  await db.exec(crm.slice(crm.indexOf('-- ============ LEADS'), crm.indexOf('-- ============ ASSIGNMENTS')));
  const normalization = await migration('20260828085456_crm_core_hardening.sql');
  await db.exec(normalization.slice(normalization.indexOf('CREATE OR REPLACE FUNCTION public.normalize_phone_digits'),
    normalization.indexOf('CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer_phone')));
  const lifecycle = await migration('20260828233912_customer_lifecycle_hardening.sql');
  await db.exec(lifecycle.slice(lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.normalize_email_address'),
    lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.canonicalize_and_prevent_duplicate_customer_email')));
  await db.exec(await migration('20260811145840_e1f06d3c-eddd-45e8-9f65-12bc87b35aad.sql'));
  await db.exec('ALTER TABLE public.sop_leads ADD COLUMN budget_currency text');
  const saveSql = await migration('20260829044022_lead_sales_pipeline_hardening.sql');
  const saveStart = saveSql.indexOf('CREATE OR REPLACE FUNCTION public.sop_save_lead(');
  const saveEnd = saveSql.indexOf('TO authenticated, service_role;', saveSql.indexOf('GRANT EXECUTE ON FUNCTION public.sop_save_lead', saveStart));
  await db.exec(saveSql.slice(saveStart, saveEnd + 'TO authenticated, service_role;'.length));
  await db.exec(await migration('20261113151445_whatsapp_sop_intake.sql'));
  const draftMigration = await migration('20261120002252_whatsapp_lead_draft_messages.sql');
  await db.exec(draftMigration);
  await db.exec(draftMigration);

  const query = (org, conversation) => db.query('SELECT * FROM public.sop_review_whatsapp_lead_messages($1,$2)', [org, conversation]);
  await as(null, 'anon');
  await assert.rejects(query(orgA, chat), { code: '42501' });
  await as(viewer);
  await assert.rejects(query(orgA, chat), { code: '42501' });
  await as(unsubscribed);
  await assert.rejects(query(orgA, chat), { code: '42501' });
  await as(agent);
  await assert.rejects(query(orgB, foreignChat), { code: '42501' });
  await assert.rejects(query(orgA, foreignChat), { code: '42501' });
  await assert.rejects(query(orgA, hiddenChat), { code: '42501' });
  const { rows } = await query(orgA, chat);
  assert.equal(rows.length, 30);
  assert.equal(rows[0].content, explicitRequest);
  assert.equal(rows[1].content.length, 1000);
  assert.deepEqual(extractWhatsAppLeadDraft(rows.map(({ content }) => content)), expectedDraft);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*) AS count FROM public.sop_leads')).rows[0].count, 0);

  const reviewed = { contact_name: 'Synthetic traveler', contact_phone: '01012345678',
    destination: expectedDraft.destination_city, check_in: expectedDraft.check_in_date,
    check_out: expectedDraft.check_out_date, adults: expectedDraft.adults, service_type: 'hotel',
    rooms: 1, budget_amount: expectedDraft.budget_amount, budget_currency: 'EGP', priorities: 'Near venue',
    lead_source: 'wrong source from browser' };
  const save = async (payload) => (await db.query('SELECT public.sop_save_whatsapp_lead($1,$2,$3) AS result',
    [orgA, chat, JSON.stringify(payload)])).rows[0].result;
  await as(viewer);
  await assert.rejects(save(reviewed), { code: '42501' });
  await as(agent);
  const result = await save(reviewed);
  assert.equal(result.allowed, true);
  assert.equal(result.lead.customer_id, customer);
  assert.equal(result.lead.conversation_id, chat);
  assert.equal(result.lead.lead_source, 'whatsapp');
  assert.equal(result.lead.stage, 'new');
  assert.deepEqual(await save({ ...reviewed, destination: 'Different on repeat' }), result);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*) AS count FROM public.sop_leads')).rows[0].count, 1);

} finally {
  await db.close();
}
console.log('WhatsApp lead pilot passed for tenant isolation, bounded text review, local extraction, explicit review save, and duplicate prevention.');
