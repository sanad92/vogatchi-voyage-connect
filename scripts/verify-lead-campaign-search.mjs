import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const c = '10000000-0000-4000-8000-000000000003';
const actor = '10000000-0000-4000-8000-000000000004';
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA operations_private;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION public.has_org_permission(company uuid, permission text)
    RETURNS boolean LANGUAGE SQL AS $$
      SELECT CASE WHEN company = '${b}' THEN false WHEN company = '${c}' THEN NULL
        ELSE company = '${a}' AND permission = 'crm_view' AND auth.uid() = '${actor}' END
    $$;
    CREATE FUNCTION public.normalize_phone_digits(phone text)
    RETURNS text LANGUAGE SQL AS $$ SELECT nullif(regexp_replace(phone, '[^0-9]', '', 'g'), '') $$;
    CREATE TYPE public.sop_lead_stage AS ENUM ('new', 'won');
    CREATE TABLE public.sop_leads (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      organization_id uuid NOT NULL, is_legacy boolean NOT NULL DEFAULT false,
      stage public.sop_lead_stage NOT NULL DEFAULT 'new', current_owner_id uuid,
      lead_source text, contact_name text, contact_email text, destination text, city text,
      lead_number text, campaign text, contact_phone text, next_follow_up_at timestamptz,
      check_in date, updated_at timestamptz NOT NULL DEFAULT now()
    );
    GRANT SELECT, INSERT, UPDATE ON public.sop_leads TO authenticated;
    INSERT INTO public.sop_leads (organization_id, lead_source, campaign, lead_number, updated_at)
    VALUES ('${a}', 'meta_lead_ads', 'Summer Egypt', 'FROM-META', '2026-08-01'),
           ('${a}', 'website', 'Summer Egypt', 'FROM-WEB', '2026-08-02'),
           ('${b}', 'meta_lead_ads', 'Summer Egypt', 'FOREIGN', '2026-08-03'),
           ('${c}', 'meta_lead_ads', 'Summer Egypt', 'NULL-PERMISSION', '2026-08-04');
    INSERT INTO public.sop_leads (organization_id, lead_source, campaign)
    SELECT '${a}', 'meta_lead_ads', 'Another campaign' FROM generate_series(1, 501);
  `);
  const migration = readFileSync(new URL('../supabase/migrations/20261120002247_show_sales_lead_campaign_attribution.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  const search = (org, source, term, limit = 500) => db.query(
    'SELECT lead_number FROM public.sop_search_leads(_org => $1, _source => $2, _search => $3, _limit => $4)',
    [org, source, term, limit],
  );
  await db.exec("SET ROLE anon");
  await assert.rejects(search(a, null, 'Summer'), { code: '42501' });
  await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '${actor}'; SET ROLE authenticated`);
  assert.equal((await search(a, 'meta_lead_ads', null)).rows.length, 500);
  assert.deepEqual((await search(a, null, 'summer egypt')).rows, [{ lead_number: 'FROM-WEB' }, { lead_number: 'FROM-META' }]);
  assert.deepEqual((await search(a, 'meta_lead_ads', 'summer', 1)).rows, [{ lead_number: 'FROM-META' }]);
  await assert.rejects(search(b, null, 'Summer'), /غير مصرح/);
  await assert.rejects(search(c, null, 'Summer'), /غير مصرح/);
  await assert.rejects(db.query("UPDATE sop_leads SET campaign='changed' WHERE lead_number='FROM-META'"), { code: '42501' });
  await assert.rejects(db.query("UPDATE sop_leads SET lead_source='meta_lead_ads' WHERE lead_number='FROM-WEB'"), { code: '42501' });
  await assert.rejects(db.query("INSERT INTO sop_leads (organization_id, lead_source) VALUES ($1,'meta_lead_ads')", [a]), { code: '42501' });
  await db.query("UPDATE sop_leads SET stage='won', lead_source='meta_lead_ads', campaign='Summer Egypt' WHERE lead_number='FROM-META'");
  assert.deepEqual((await db.query("SELECT stage FROM sop_leads WHERE lead_number='FROM-META'")).rows, [{ stage: 'won' }]);
  await db.exec("RESET ROLE; SET request.jwt.claim.sub = ''");
  await db.query("INSERT INTO sop_leads (organization_id, lead_source, campaign) VALUES ($1,'meta_lead_ads','server import')", [a]);
  console.log('Lead campaign search matches before the result cap, enforces company scope, and protects provider attribution.');
} finally {
  await db.close();
}
