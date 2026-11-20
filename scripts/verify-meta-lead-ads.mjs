import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verifyMetaFormRoute } from '../supabase/functions/_shared/meta-lead-ads.ts';

const [orgA, orgB, ownerA, ownerB, otherA] = Array.from({ length: 5 }, () => randomUUID());
const readSql = name => readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
const database = new PGlite();
const token = 'synthetic-page-token-only';
const bodySecret = 'synthetic-app-secret-only';
const verifyToken = 'synthetic-verify-token-only';
const page = '1234567890123456789';
const form = '1234567890123456790';
const leadgen = '1234567890123456791';

const list = (org, actor) => database.query('SELECT * FROM public.meta_lead_ads_routes_list($1,$2)', [org, actor]);
const connect = (org, actor, pageId, formId, revision, pageToken) => database.query(
  'SELECT public.meta_lead_ads_route_write($1,$2,$3,$4,$5,$6) AS saved', [org, actor, pageId, formId, revision, pageToken]);
const resolve = async event => (await database.query(
  'SELECT * FROM public.meta_lead_ads_route_resolve($1,$2,$3)', [event.page, event.form, event.leadgen])).rows[0] ?? null;
const save = async (event, revision, details) => (await database.query(
  'SELECT public.meta_lead_ads_import($1,$2,$3,$4,$5,$6,$7,$8) AS result',
  [event.page, event.form, event.leadgen, revision, details.name, details.email, details.phone, details.campaign])).rows[0].result;

const payload = (pageId, formId, leadId, valuePage = pageId) =>
  // Include IDs above Number.MAX_SAFE_INTEGER as JSON numerics to verify exact matching.
  `{"object":"page","entry":[{"id":${pageId},"changes":[{"field":"leadgen","value":{"page_id":${valuePage},"form_id":${formId},"leadgen_id":${leadId}}}]}]}`;
const sign = body => 'sha256=' + createHmac('sha256', bodySecret).update(body).digest('hex');
const requests = [];
let responseForm = form;
let rejectAttribution = false;
const fetchGraph = async (url, options) => {
  const target = new URL(url);
  requests.push(target);
  assert.equal(target.origin, 'https://graph.facebook.com');
  assert.equal(options.headers.authorization, 'Bearer ' + token);
  assert.equal(options.redirect, 'error');
  if (target.pathname.endsWith('/me')) return Response.json({ id: page });
  if (target.pathname.endsWith('/leadgen_forms')) return Response.json({ data: [{ id: form }] });
  if (rejectAttribution && target.searchParams.get('fields').includes('campaign_id')) return Response.json({}, { status: 403 });
  const id = target.pathname.split('/').at(-1);
  return Response.json({
    id, form_id: responseForm, campaign_id: rejectAttribution ? null : '4455',
    field_data: [
      { name: 'full_name', values: ['Demo   Traveler'] },
      { name: 'email', values: ['Traveler@Example.test'] },
      { name: 'phone_number', values: ['+20 (101) 234-5678'] },
      { name: 'passport', values: ['synthetic-excluded-passport'] },
    ],
  });
};
// Run the deployed entrypoints and JS client locally. The fixture owns every
// network response, and only the HTTP transport and Deno registration are mocked.
const supabaseUrl = 'https://supabase-safar-test.example';
const apiKeys = { anon: 'synthetic-anon-key', service: 'synthetic-service-key' };
const accounts = new Map([[ownerA, ownerA], [ownerB, ownerB], [otherA, otherA]]);
const settings = {
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: apiKeys.anon,
  SUPABASE_SERVICE_ROLE_KEY: apiKeys.service,
  META_LEAD_ADS_APP_SECRET: bodySecret,
  META_LEAD_ADS_VERIFY_TOKEN: verifyToken,
};
let registered;
globalThis.Deno = { env: { get: key => settings[key] }, serve(handler) { registered = handler; } };

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('npm:@supabase/supabase-js@')) {
      return nextResolve('@supabase/supabase-js', context);
    }
    return nextResolve(specifier, context);
  },
});
const rpc = {
  meta_lead_ads_routes_list: ['_org_id', '_actor_id'],
  meta_lead_ads_route_write: ['_org_id', '_actor_id', '_page_id', '_form_id', '_expected_revision', '_page_token'],
  meta_lead_ads_route_resolve: ['_page_id', '_form_id', '_leadgen_id'],
  meta_lead_ads_import: ['_page_id', '_form_id', '_leadgen_id', '_revision', '_name', '_email', '_phone', '_campaign_id'],
};
globalThis.fetch = async (url, options) => {
  const target = new URL(url);
  if (target.origin === 'https://graph.facebook.com') return fetchGraph(url, options);
  assert.equal(target.origin, supabaseUrl, 'the fixture only permits its synthetic Supabase and Graph responses');
  const headers = new Headers(options.headers);
  if (target.pathname === '/auth/v1/user') {
    assert.equal(headers.get('apikey'), apiKeys.anon);
    const id = accounts.get(headers.get('authorization')?.slice('Bearer '.length));
    return id ? Response.json({ id, is_anonymous: false }) : Response.json({ msg: 'Unknown fixture user' }, { status: 401 });
  }
  assert.equal(headers.get('apikey'), apiKeys.service);
  const name = target.pathname.split('/').at(-1);
  assert.ok(target.pathname.startsWith('/rest/v1/rpc/') && Object.hasOwn(rpc, name));
  const input = JSON.parse(options.body);
  assert.deepEqual(Object.keys(input).sort(), rpc[name].toSorted(), 'PostgREST RPC argument names must match');
  const names = rpc[name];
  const bindings = names.map((name, index) => name + ' => $' + (index + 1)).join(',');
  const values = names.map(name => input[name]);
  try {
    const returnsRows = name.endsWith('_list') || name.endsWith('_resolve');
    const query = returnsRows ? 'SELECT * FROM public.' + name + '(' + bindings + ')'
      : 'SELECT public.' + name + '(' + bindings + ') AS value';
    const response = await database.query(query, values);
    if (!returnsRows) return Response.json(response.rows[0].value);
    // A POST RPC's maybeSingle asks PostgREST for singular content negotiation.
    if (headers.get('accept') === 'application/vnd.pgrst.object+json') {
      if (response.rows.length === 1) return Response.json(response.rows[0]);
      return Response.json({ code: 'PGRST116', details: 'The result contains ' + response.rows.length + ' rows' }, { status: 406 });
    }
    return Response.json(response.rows);
  } catch (error) {
    return Response.json({ code: error.code, message: error.message },
      { status: error.code === '42501' ? 403 : 400 });
  }
};
await import('../supabase/functions/meta-lead-ads-config/index.ts');
const configure = registered;
await import('../supabase/functions/meta-lead-ads-webhook/index.ts');
const webhook = registered;
assert.notEqual(configure, webhook);
const configPost = (actor, organizationId, action, fields = {}) => configure(new Request('https://example.test/config', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + actor },
  body: JSON.stringify({ organizationId, action, ...fields }),
}));
const post = (body, signature = sign(body)) => webhook(new Request('https://example.test/webhook', {
  method: 'POST', headers: { 'X-Hub-Signature-256': signature }, body,
}));
const get = (key, challenge = 'sample-challenge') => webhook(new Request('https://example.test/webhook?' +
  new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': key, 'hub.challenge': challenge })));

try {
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE SCHEMA vault;
    CREATE TABLE vault.secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), secret text NOT NULL);
    CREATE VIEW vault.decrypted_secrets AS SELECT id, secret AS decrypted_secret FROM vault.secrets;
    CREATE FUNCTION vault.create_secret(_secret text) RETURNS uuid LANGUAGE sql AS $$
      INSERT INTO vault.secrets(secret) VALUES (_secret) RETURNING id
    $$;
    CREATE FUNCTION vault.update_secret(_id uuid, _secret text) RETURNS void LANGUAGE sql AS $$
      UPDATE vault.secrets SET secret = _secret WHERE id = _id
    $$;
    CREATE TABLE public.organizations (id uuid PRIMARY KEY, is_active boolean DEFAULT true, subscribed boolean DEFAULT true);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, email text);
    CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, role text, is_active boolean DEFAULT true);
    CREATE TABLE public.admin_audit_log (organization_id uuid, user_id uuid, action text, target_table text, details jsonb);
    CREATE FUNCTION public._org_permission_state(_org uuid, _actor uuid, _permission text)
      RETURNS TABLE(granted boolean) LANGUAGE sql STABLE AS $$
        SELECT _permission = 'admin_settings' AND m.role IN ('owner', 'admin') AND m.is_active
        FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = _actor
      $$;
    CREATE FUNCTION public.has_org_permission(_org uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT _permission = 'crm_view' AND EXISTS (SELECT 1 FROM public.organization_members
        WHERE organization_id = _org AND user_id = auth.uid() AND is_active)
    $$;
    CREATE FUNCTION public.user_belongs_to_org(_user uuid, _org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = _user AND m.organization_id = _org AND m.is_active)
    $$;
    CREATE FUNCTION public.org_has_active_subscription(_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT subscribed FROM public.organizations WHERE id = _org
    $$;
  `);
  await database.query('INSERT INTO public.organizations(id) VALUES ($1),($2)', [orgA, orgB]);
  await database.query(`INSERT INTO public.organization_members(organization_id,user_id,role)
    VALUES ($1,$2,'owner'),($3,$4,'admin'),($1,$5,'manager')`, [orgA, ownerA, orgB, ownerB, otherA]);
  const crm = await readSql('20260809193004_9ab647e6-5192-43e2-b346-ad35d2492099.sql');
  await database.exec(crm.slice(crm.indexOf('-- ============ ENUMS'), crm.indexOf('-- ============ DEPARTMENT MEMBERSHIP')));
  await database.exec(crm.slice(crm.indexOf('-- ============ LEADS'), crm.indexOf('-- ============ ASSIGNMENTS')));
  const history = await readSql('20260812122240_911dab31-ed74-4a14-ad9d-7c478a6af254.sql');
  await database.exec(history.slice(0, history.indexOf('-- 2) event-bus trigger')));
  const attribution = await readSql('20261120002247_show_sales_lead_campaign_attribution.sql');
  await database.exec('CREATE SCHEMA operations_private; ALTER TABLE public.sop_leads ADD COLUMN next_follow_up_at timestamptz');
  const hardening = await readSql('20260828085456_crm_core_hardening.sql');
  await database.exec(hardening.slice(hardening.indexOf('CREATE OR REPLACE FUNCTION public.normalize_phone_digits'),
    hardening.indexOf('CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer_phone')));
  await database.exec(attribution);
  await database.exec(await readSql('20261120002308_connect_meta_instant_forms_to_crm.sql'));

  await database.exec('SET ROLE authenticated');
  await assert.rejects(list(orgA, ownerA), { code: '42501' });
  await assert.rejects(database.query('SELECT * FROM meta_lead_ads_private.routes'), { code: '42501' });
  await database.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(resolve({ page, form, leadgen }), { code: '42501' });
  await database.exec('RESET ROLE; SET ROLE service_role');
  await assert.rejects(list(orgA, ownerB), { code: '42501' });
  await assert.rejects(connect(orgA, otherA, page, form, null, token), { code: '42501' });

  await verifyMetaFormRoute(page, form, token, fetchGraph);
  await assert.rejects(verifyMetaFormRoute(page, '9000', token, fetchGraph), { message: 'route_not_verified' });
  assert.equal((await configPost('unknown', orgA, 'list')).status, 401);
  const connectInput = { page, form, revision: null, pageToken: token };
  const beforeDeniedConnect = requests.length;
  assert.equal((await configPost(otherA, orgA, 'connect', connectInput)).status, 403);
  assert.equal(requests.length, beforeDeniedConnect);
  const firstConnection = await configPost(ownerA, orgA, 'connect', connectInput);
  assert.equal(firstConnection.status, 200, await firstConnection.text());
  assert.equal((await configPost(ownerB, orgB, 'connect', connectInput)).status, 409);
  assert.deepEqual(await (await configPost(ownerB, orgB, 'list')).json(), { routes: [], webhookConfigured: true });
  const listed = await (await configPost(ownerA, orgA, 'list')).json();
  assert.equal(listed.webhookConfigured, true);
  const [route] = listed.routes;
  assert.equal(route.active, true);
  assert.ok(!JSON.stringify(route).includes(token));

  assert.equal(await (await get(verifyToken)).text(), 'sample-challenge');
  assert.equal((await get('incorrect-token')).status, 403);
  const body = payload(page, form, leadgen);
  const preWebhook = requests.length;
  assert.equal((await post(body + ' ', sign(body))).status, 403);
  assert.equal((await post(payload(page, form, leadgen, '555'))).status, 200);
  assert.equal((await post(payload(page, '555', leadgen))).status, 200);
  assert.equal(requests.length, preWebhook, 'unverified/unknown events must never call Meta');

  responseForm = '555';
  assert.equal((await post(body)).status, 503);
  responseForm = form;
  const beforeImport = requests.length;
  assert.equal((await post(body)).status, 200);
  assert.equal((await post(body)).status, 200);
  assert.equal(requests.length, beforeImport + 1, 'processed retries must skip Graph');
  assert.equal(requests.at(-1).pathname.split('/').at(-1), leadgen);
  assert.ok((await list(orgA, ownerA)).rows[0].last_imported_at);

  const newLead = '1234567890123456792';
  rejectAttribution = true;
  assert.equal((await post(payload(page, form, newLead))).status, 200);
  assert.equal(requests.at(-1).searchParams.get('fields'), 'id,form_id,field_data');
  rejectAttribution = false;

  assert.equal((await connect(orgA, ownerA, page, form, route.revision, token + '-rotated')).rows[0].saved, true);
  assert.equal(await save({ page, form, leadgen: '1055' }, route.revision, {
    name: 'Stale', email: 'stale@example.test', phone: null, campaign: null,
  }), 'route_changed');
  const current = (await list(orgA, ownerA)).rows[0];
  assert.equal((await connect(orgA, ownerA, page, form, current.revision, null)).rows[0].saved, true);
  assert.equal(await resolve({ page, form, leadgen: '1055' }), null);
  assert.equal((await connect(orgB, ownerB, page, form, null, token)).rows[0].saved, false);

  await database.exec('RESET ROLE');
  const { rows } = await database.query(`SELECT organization_id, stage, owner_department, contact_name, contact_phone,
    contact_email, lead_source, campaign FROM public.sop_leads ORDER BY campaign NULLS LAST`);
  const lead = { organization_id: orgA, stage: 'new', owner_department: 'customer_service', contact_name: 'Demo Traveler',
    contact_phone: '+201012345678', contact_email: 'traveler@example.test', lead_source: 'meta_lead_ads', campaign: '4455' };
  assert.deepEqual(rows, [lead, { ...lead, campaign: null }]);
  assert.equal((await database.query('SELECT count(*)::int AS count FROM vault.secrets')).rows[0].count, 0);
  assert.ok(!(await database.query('SELECT details FROM public.admin_audit_log')).rows.some(row => JSON.stringify(row).includes(token)));
  assert.equal((await database.query('SELECT count(*)::int as count FROM public.sop_lead_stage_history')).rows[0].count, 2);
  const visibleFor = (org, campaign) => database.query(
    "SELECT organization_id, stage, contact_name, lead_source, campaign FROM public.sop_search_leads(_org=>$1,_source=>'meta_lead_ads',_search=>$2)",
    [org, campaign],
  );
  await database.exec("SET ROLE authenticated");
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ownerA]);
  assert.deepEqual((await visibleFor(orgA, '4455')).rows, [{
    organization_id: orgA, stage: 'new', contact_name: 'Demo Traveler', lead_source: 'meta_lead_ads', campaign: '4455',
  }]);
  await assert.rejects(visibleFor(orgB, '4455'), /غير مصرح/);
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ownerB]);
  assert.deepEqual((await visibleFor(orgB, '4455')).rows, []);
  await assert.rejects(visibleFor(orgA, '4455'), /غير مصرح/);
  console.log('Actual config and webhook adapters via Supabase JS, SQL import, and authenticated CRM search passed on synthetic HTTP and PGlite.');
} finally {
  await database.close();
}
