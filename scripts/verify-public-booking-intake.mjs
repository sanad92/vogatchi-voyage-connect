import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const readSql = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
const [orgA, orgB, ownerA, ownerB, agentA, pageA, pageB] = Array.from({ length: 7 }, () => randomUUID());
const db = new PGlite();

async function as(name, user = '') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  if (name === 'anon') await db.exec('SET ROLE anon');
  if (name === 'authenticated') await db.exec('SET ROLE authenticated');
}

async function settings(org, slug, enabled = true, acceptsBooking = true) {
  return (await db.query('SELECT public.set_company_public_site_settings($1,$2,$3,$4) AS settings',
    [org, slug, enabled, acceptsBooking])).rows[0].settings;
}

async function site(slug) {
  return (await db.query('SELECT public.get_public_booking_site($1) AS site', [slug])).rows[0].site;
}

const payload = {
  customerName: 'Synthetic Traveler',
  customerPhone: '01012345678',
  customerEmail: 'traveler@example.test',
  serviceType: 'package',
  destination: 'Cairo',
  departureDate: '2027-01-02',
  returnDate: '2027-01-05',
  adults: 2,
  budget: '1000 EGP',
  specialRequests: 'Synthetic note',
};
async function submit(slug, key = randomUUID(), request = payload) {
  return (await db.query('SELECT public.submit_public_booking_request($1,$2,$3) AS receipt',
    [slug, key, JSON.stringify(request)])).rows[0].receipt;
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
    CREATE TABLE public.organizations (id uuid PRIMARY KEY, name text NOT NULL, subscribed boolean NOT NULL);
    CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, role text, is_active boolean DEFAULT true);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, email text);
    CREATE TABLE public.pages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, title text NOT NULL,
      slug text NOT NULL UNIQUE, description text, is_published boolean DEFAULT false
    );
    CREATE UNIQUE INDEX idx_pages_slug ON public.pages (slug);
    CREATE TABLE public.blocks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, page_id uuid REFERENCES public.pages(id),
      type text, title text, content jsonb, is_active boolean DEFAULT true, order_index integer DEFAULT 0
    );
    ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public can view active pages" ON public.pages FOR SELECT USING (is_published);
    CREATE POLICY "Public can view active blocks of active pages" ON public.blocks FOR SELECT USING (is_active);
    CREATE POLICY legacy_pages ON public.pages AS PERMISSIVE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY legacy_blocks ON public.blocks AS PERMISSIVE TO authenticated USING (true) WITH CHECK (true);
    GRANT SELECT ON public.pages, public.blocks TO anon;
    CREATE FUNCTION public.is_platform_admin(_user uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
    CREATE FUNCTION public.get_user_org_role(_user uuid, _org uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT role FROM public.organization_members WHERE user_id = _user AND organization_id = _org AND is_active
    $$;
    CREATE FUNCTION public.has_org_permission(_org uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT public.get_user_org_role(auth.uid(), _org) IN ('owner', 'admin')
    $$;
    CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT public.get_user_org_role(_user, _org) IS NOT NULL
    $$;
    CREATE FUNCTION public.org_has_active_subscription(_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT subscribed FROM public.organizations WHERE id = _org
    $$;
    CREATE FUNCTION public.can_org_write(_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT public.user_belongs_to_org(auth.uid(), _org) AND public.org_has_active_subscription(_org)
    $$;
  `);
  await db.query("INSERT INTO public.organizations VALUES ($1,'Company A',true), ($2,'Company B',true)", [orgA, orgB]);
  await db.query("INSERT INTO public.organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner'), ($3,$4,'admin'), ($1,$5,'agent')",
    [orgA, ownerA, orgB, ownerB, agentA]);
  const crm = await readSql('20260809193004_9ab647e6-5192-43e2-b346-ad35d2492099.sql');
  await db.exec(crm.slice(crm.indexOf('-- ============ ENUMS'), crm.indexOf('-- ============ DEPARTMENT MEMBERSHIP')));
  await db.exec(crm.slice(crm.indexOf('-- ============ LEADS'), crm.indexOf('-- ============ ASSIGNMENTS')));
  const crmCore = await readSql('20260828085456_crm_core_hardening.sql');
  await db.exec(crmCore.slice(crmCore.indexOf('CREATE OR REPLACE FUNCTION public.normalize_phone_digits'),
    crmCore.indexOf('CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer_phone')));
  const crmHistory = await readSql('20260812122240_911dab31-ed74-4a14-ad9d-7c478a6af254.sql');
  await db.exec(crmHistory.slice(0, crmHistory.indexOf('-- 2) event-bus trigger')));
  await db.exec(await readSql('20261119234751_add_company_public_booking_intake.sql'));
  await db.exec(await readSql('20261119235342_publish_company_cms_snapshots.sql'));

  await as('anon');
  assert.equal(await site('agency-a'), null);
  await assert.rejects(settings(orgA, 'agency-a'), { code: '42501' });
  await assert.rejects(submit('agency-a'), { code: 'PT404' });
  await assert.rejects(db.query('SELECT * FROM public_intake_private.booking_receipts'), { code: '42501' });
  await assert.rejects(db.query('SELECT * FROM public.sop_leads'), { code: '42501' });

  await as('authenticated', agentA);
  await assert.rejects(settings(orgA, 'agency-a'), { code: '42501' });
  await as('authenticated', ownerA);
  await assert.rejects(settings(orgB, 'agency-b'), { code: '42501' });
  assert.deepEqual(await settings(orgA, 'agency-a', true, false), {
    slug: 'agency-a', enabled: true, acceptsBooking: false,
  });
  await assert.rejects(settings(orgA, 'new-slug'), { code: '22023' });
  await assert.rejects(submit('agency-a'), { code: '42501' });
  await as('authenticated', ownerB);
  await assert.rejects(settings(orgB, 'agency-a'), { code: '23505' });
  await settings(orgB, 'agency-b', false);

  await as('anon');
  assert.equal(await site('agency-a'), null);
  assert.equal(await site('agency-b'), null);
  await assert.rejects(submit('agency-a'), { code: 'PT404' });
  await assert.rejects(submit('agency-b'), { code: 'PT404' });
  await as('authenticated', ownerA);
  await settings(orgA, 'agency-a');
  await as('authenticated', ownerB);
  await settings(orgB, 'agency-b');

  await as('anon');
  assert.deepEqual(await site('agency-a'), { name: 'Company A' });
  assert.deepEqual(await site('agency-b'), { name: 'Company B' });
  await assert.rejects(submit('agency-a', randomUUID(), { ...payload, organization_id: orgB }), { code: '22023' });
  await assert.rejects(submit('agency-a', randomUUID(), { ...payload, customerPhone: 'Other 01234567890' }), { code: '22023' });
  await assert.rejects(submit('agency-a', randomUUID(), { ...payload, adults: 21 }), { code: '22023' });
  await assert.rejects(submit('agency-a', randomUUID(), { ...payload, returnDate: '2027-01-01' }), { code: '22023' });
  await assert.rejects(submit('agency-a', randomUUID(), []), { code: '22023' });
  const ownKey = randomUUID();
  const first = await submit('agency-a', ownKey);
  assert.match(first.reference, /^LD-[0-9]{8}-[A-F0-9]{12}$/);
  assert.deepEqual(await submit('agency-a', ownKey, { ...payload, customerPhone: '+٢٠ ١٠ ١٢٣٤٥٦٧٨' }), first);
  await assert.rejects(submit('agency-a', ownKey, { ...payload, specialRequests: 'Different request' }), { code: 'PT409' });
  const other = await submit('agency-b', ownKey);
  assert.notEqual(other.reference, first.reference);
  await submit('agency-a');
  await submit('agency-a');
  await assert.rejects(submit('agency-a'), { code: 'PT429' });
  assert.deepEqual(await submit('agency-a', ownKey), first);

  for (let i = 0; i < 57; i += 1) {
    await submit('agency-a', randomUUID(), { ...payload, customerPhone: `1555${String(i).padStart(7, '0')}` });
  }
  await assert.rejects(submit('agency-a', randomUUID(), { ...payload, customerPhone: '15550000999' }), { code: 'PT429' });

  await as('system');
  await db.query('UPDATE public.organizations SET subscribed = false WHERE id = $1', [orgB]);
  const leads = (await db.query(`SELECT organization_id, lead_number, contact_phone, lead_source, stage, owner_department, created_by
    FROM public.sop_leads WHERE lead_number IN ($1, $2) ORDER BY lead_number`, [first.reference, other.reference])).rows;
  for (const [receipt, organization] of [[first, orgA], [other, orgB]]) {
    assert.deepEqual(leads.find(row => row.lead_number === receipt.reference), {
      organization_id: organization, lead_number: receipt.reference, contact_phone: '201012345678',
      lead_source: 'website', stage: 'new', owner_department: 'customer_service', created_by: null,
    });
  }
  const history = (await db.query("SELECT count(*)::int AS count FROM public.sop_lead_stage_history WHERE action = 'lead_created'")).rows[0].count;
  assert.equal(history, 61);
  await as('authenticated', ownerA);
  await settings(orgA, 'agency-a', false);
  await as('anon');
  assert.equal(await site('agency-a'), null);
  assert.equal(await site('agency-b'), null);
  await assert.rejects(submit('agency-a', ownKey), { code: 'PT404' });
  await assert.rejects(submit('agency-b'), { code: 'PT404' });
  console.log('Public booking intake passed for opt-in isolation, CRM persistence, retries, limits and disablement.');

  const resolvePage = async (company, slug = 'about') => (await db.query(
    'SELECT public.get_public_cms_page($1,$2) AS page', [company, slug],
  )).rows[0].page;
  const publish = async (org, page, enabled = true) => (await db.query(
    'SELECT public.set_company_page_publication($1,$2,$3) AS published', [org, page, enabled],
  )).rows[0].published;

  await as('system');
  await db.query('UPDATE public.organizations SET subscribed = true');
  await db.query(`INSERT INTO public.pages (id,organization_id,title,slug,description,is_published) VALUES
    ($1,$2,'About A','about','Initial A description',true), ($3,$4,'About B','about','Description B',false)`,
    [pageA, orgA, pageB, orgB]);
  await db.query(`INSERT INTO public.blocks (organization_id,page_id,type,title,content,is_active,order_index) VALUES
    ($1,$2,'custom_text','A second','{"content":"Other text","internal":"omit"}',true,2),
    ($1,$2,'custom_text','A first','{"content":"<strong>Literal text</strong>"}',true,1),
    ($1,$2,'custom_text','Disabled','{"content":"Keep in draft"}',false,1),
    ($1,$2,'auth_form','Internal block','{"content":"Unsupported block"}',true,0),
    ($3,$2,'custom_text','Foreign block','{"content":"Other tenant"}',true,0),
    ($3,$4,'custom_text',NULL,'{"content":"First text B"}',true,1)`, [orgA, pageA, orgB, pageB]);

  await as('anon');
  assert.equal(await resolvePage('agency-a'), null, 'legacy published flag exposes no draft');
  await assert.rejects(db.query('SELECT * FROM public.pages'), { code: '42501' });
  await assert.rejects(db.query('SELECT * FROM public.blocks'), { code: '42501' });
  await assert.rejects(publish(orgA, pageA), { code: '42501' });
  await as('authenticated', ownerA);
  assert.equal((await db.query('SELECT * FROM public.pages WHERE organization_id=$1', [orgB])).rowCount, 0);
  assert.equal((await db.query('SELECT * FROM public.blocks WHERE organization_id=$1', [orgB])).rowCount, 0);
  await assert.rejects(db.query(`INSERT INTO public.blocks(organization_id,page_id,type)
    VALUES ($1,$2,'custom_text')`, [orgA, pageB]), { code: '42501' });
  await assert.rejects(publish(orgA, pageA), { code: 'PT409' });
  await assert.rejects(publish(orgB, pageB), { code: '42501' });
  await settings(orgA, 'agency-a', true, false);
  await assert.rejects(publish(orgA, pageB), { code: 'PT404' });
  assert.equal(await publish(orgA, pageA), true);
  await as('authenticated', ownerB);
  assert.equal(await publish(orgB, pageB), true);

  const publishedA = {
    company: 'Company A', title: 'About A', description: 'Initial A description', acceptsBooking: false,
    sections: [{ title: 'A first', text: '<strong>Literal text</strong>' }, { title: 'A second', text: 'Other text' }],
  };
  await as('anon');
  assert.deepEqual(await resolvePage('agency-a'), publishedA);
  assert.deepEqual(await resolvePage('agency-b'), {
    company: 'Company B', title: 'About B', description: 'Description B', acceptsBooking: true,
    sections: [{ title: null, text: 'First text B' }],
  });
  await as('authenticated', ownerA);
  await db.query('UPDATE public.pages SET description = $2 WHERE id = $1', [pageA, 'Unpublished edit']);
  await as('anon');
  assert.deepEqual(await resolvePage('agency-a'), publishedA, 'draft edits never reach a public snapshot');
  await as('authenticated', ownerA);
  assert.equal(await publish(orgA, pageA), true);
  await as('anon');
  assert.equal((await resolvePage('agency-a')).description, 'Unpublished edit');
  await as('system');
  await db.query('UPDATE public.organizations SET subscribed=false WHERE id=$1', [orgA]);
  await as('authenticated', ownerA);
  assert.equal(await publish(orgA, pageA, false), false, 'a lapsed company can still withdraw an existing publication');
  await as('anon');
  assert.equal(await resolvePage('agency-a'), null);
  assert.notEqual(await resolvePage('agency-b'), null);
  console.log('Company CMS publication passed for draft isolation, exact company scope, text projection, refresh and withdrawal.');
} finally {
  await db.close();
}
