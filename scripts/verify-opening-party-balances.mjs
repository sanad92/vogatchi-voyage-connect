import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { openingPartyBalanceFields, openingPartyBalanceRows } from '../src/lib/openingPartyBalances.ts';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, otherOrg, admin, agent, customer, supplier, foreignCustomer] = Array.from({ length: 7 }, (_, index) => id(index + 1));
const fileRow = ['Customer', customer, 'egp', 100];
assert.deepEqual(openingPartyBalanceRows([openingPartyBalanceFields, fileRow]), [
  { party_type: 'customer', party_id: customer, currency: 'EGP', legacy_balance: '100' },
]);
assert.throws(() => openingPartyBalanceRows([['party_type', 'party_id', 'currency', 'currency'], fileRow]), /الأعمدة/);
assert.throws(() => openingPartyBalanceRows([openingPartyBalanceFields, ...Array(101).fill(fileRow)]), /100/);

const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated;
CREATE ROLE anon;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT current_setting(''qa.actor'', true)::uuid';
CREATE FUNCTION public.get_user_org_role(uuid,uuid) RETURNS text LANGUAGE sql AS $$
  SELECT CASE WHEN $2 = '${org}' AND $1 = '${admin}' THEN 'admin'
    WHEN $2 = '${org}' AND $1 = '${agent}' THEN 'agent' END
$$;
CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$
  SELECT public.get_user_org_role(auth.uid(), $1) IS NOT NULL
$$;
CREATE FUNCTION public.has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$
  SELECT public.can_org_write($1)
$$;
CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid NOT NULL, name text NOT NULL);
CREATE TABLE public.suppliers (id uuid PRIMARY KEY, organization_id uuid NOT NULL, name text NOT NULL);
GRANT SELECT ON public.customers, public.suppliers TO authenticated;
INSERT INTO public.customers VALUES ('${customer}', '${org}', 'Local customer'), ('${foreignCustomer}', '${otherOrg}', 'Other customer');
INSERT INTO public.suppliers VALUES ('${supplier}', '${org}', 'Local supplier');
CREATE FUNCTION public.get_customer_aging_details_v2(uuid,date,text,uuid)
  RETURNS TABLE(customer_id uuid, outstanding_amount numeric, is_historical_estimate boolean)
  LANGUAGE sql STABLE AS $$
  SELECT '${customer}'::uuid, 50::numeric, false WHERE $3 = 'EGP'
  UNION ALL SELECT '${customer}'::uuid, 25::numeric, true WHERE $3 = 'EGP'
$$;
CREATE FUNCTION public.get_supplier_aging_details_v2(uuid,date,text,uuid)
  RETURNS TABLE(supplier_id uuid, outstanding_amount numeric, is_historical_estimate boolean)
  LANGUAGE sql STABLE AS $$
  SELECT '${supplier}'::uuid, 300::numeric, false WHERE $3 = 'USD'
$$;
CREATE FUNCTION public.get_aging_control_totals_v2(uuid,date,text)
  RETURNS TABLE(entity_type text, aging_total numeric, control_balance numeric,
    difference numeric, historical_estimate_count integer, corrected_date_count integer, currency text)
  LANGUAGE sql STABLE AS $$
  VALUES ('customer', 75::numeric, 80::numeric, -5::numeric, 1, 0, $3)
$$;
`);
await db.exec(readFileSync('supabase/migrations/20261114010857_preview_opening_party_balances.sql', 'utf8'));
const actor = (user, role = 'authenticated') => db.exec(`RESET ROLE; SET ROLE ${role}; SET qa.actor = '${user}'`);
const preview = async (rows, tenant = org, date = '2025-01-01') => (
  await db.query('SELECT public.preview_opening_party_balances($1,$2,$3::jsonb) AS result', [tenant, date, JSON.stringify(rows)])
).rows[0].result;
const row = (party_id, legacy_balance, currency = 'EGP', party_type = 'customer') =>
  ({ party_id, legacy_balance, currency, party_type });
await actor(admin);
const result = await preview([row(customer, 100), row(supplier, 300, 'USD', 'supplier'), row(foreignCustomer, 10)]);
assert.deepEqual(result.rows.map(r => [r.party_name, r.recorded_balance, r.difference, r.open_invoices, r.historical_estimate]), [
  ['Local customer', 75, 25, 2, true], ['Local supplier', 300, 0, 1, false], [null, null, null, 0, false],
]);
assert.equal(result.controls.find(c => c.currency === 'EGP').difference, -5);
await assert.rejects(preview([row(customer, 100), row(customer, 200)]), { code: '22023' });
await assert.rejects(preview([row(customer, -100)]), { code: '22023' });
await assert.rejects(preview([row(customer, 100)], org, '2100-01-01'), { code: '22023' });
await assert.rejects(preview([row(customer, 100)], otherOrg), { code: '42501' });
await actor(agent);
await assert.rejects(preview([row(customer, 100)]), { code: '42501' });
await actor(admin, 'anon');
await assert.rejects(preview([row(customer, 100)]), { code: '42501' });
await db.close();
console.log('Opening balance preview passed reconciliation, tenant isolation, role restrictions, and invalid spreadsheet checks.');
