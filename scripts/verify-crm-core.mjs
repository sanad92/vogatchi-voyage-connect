import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const loadTypeScriptModule = async (path) => {
  const source = await readFile(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
};

const metrics = await loadTypeScriptModule(new URL('../src/lib/customerMetrics.ts', import.meta.url));
const campaignMetrics = await loadTypeScriptModule(new URL('../src/lib/campaignMetrics.ts', import.meta.url));
const migration = await readFile(new URL('../supabase/migrations/20260828085456_crm_core_hardening.sql', import.meta.url), 'utf8');
const campaignMigration = await readFile(new URL('../supabase/migrations/20260828140000_campaign_delivery_hardening.sql', import.meta.url), 'utf8');
const customersPage = await readFile(new URL('../src/pages/Customers.tsx', import.meta.url), 'utf8');
const customerHook = await readFile(new URL('../src/hooks/useCustomers.tsx', import.meta.url), 'utf8');
const customerService = await readFile(new URL('../src/hooks/useCustomerService.tsx', import.meta.url), 'utf8');
const campaignCard = await readFile(new URL('../src/components/crm/campaign/CampaignCard.tsx', import.meta.url), 'utf8');
const campaignStats = await readFile(new URL('../src/components/crm/campaign/CampaignStats.tsx', import.meta.url), 'utf8');

assert.deepEqual(metrics.parseCurrencyTotals({ egp: '100.5', USD: 20, bad: 'x' }), { EGP: 100.5, USD: 20 });
assert.deepEqual(metrics.sumCurrencyTotals([{ EGP: 100 }, { EGP: 25, USD: 10 }]), { EGP: 125, USD: 10 });
assert.deepEqual(metrics.divideCurrencyTotals({ EGP: 100, USD: 30 }, { EGP: 4, USD: 3 }), { EGP: 25, USD: 10 });

const now = new Date('2026-08-28T12:00:00Z');
const sample = [
  {
    id: '1', name: 'A', phone: '1', created_at: '2026-08-25T00:00:00Z',
    total_bookings: 2, last_booking_date: '2026-08-20',
    spend_by_currency: { EGP: 1000, USD: 100 }, booking_count_by_currency: { EGP: 1, USD: 1 },
  },
  {
    id: '2', name: 'B', phone: '2', created_at: '2026-07-20T00:00:00Z',
    total_bookings: 1, last_booking_date: '2026-01-01',
    spend_by_currency: { EGP: 500 }, booking_count_by_currency: { EGP: 1 },
  },
];
const analytics = metrics.buildCustomerAnalytics(sample, 30, now);
assert.deepEqual(analytics.revenueByCurrency, { EGP: 1500, USD: 100 });
assert.deepEqual(analytics.averageBookingValueByCurrency, { EGP: 750, USD: 100 });
assert.equal(analytics.repeatCustomers, 1);
assert.equal(analytics.inactiveCustomers, 1);
assert.equal(analytics.retentionRate, 50);
assert.equal(analytics.churnRate, 50);

const deliveryMetrics = campaignMetrics.buildCampaignDeliveryMetrics([
  { status: 'delivered', response: null },
  { status: 'read', response: 'interested' },
  { status: 'failed', response: null },
]);
assert.equal(deliveryMetrics.deliveredCount, 2);
assert.equal(deliveryMetrics.readRate, 50);
assert.equal(deliveryMetrics.responseRate, 50);

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.has_org_permission/);
assert.match(migration, /CREATE POLICY customers_update_by_permission/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.crm_customer_booking_metrics/);
assert.match(migration, /jsonb_object_agg\(by_currency\.currency/);
assert.match(migration, /prevent_duplicate_customer_phone_trigger/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.redeem_loyalty_reward/);
assert.match(migration, /FOR UPDATE;/, 'loyalty redemption locks the customer row');
assert.match(migration, /protect_sop_lead_workflow_fields_trigger/);
assert.doesNotMatch(migration, /Org members can manage/);
assert.match(campaignMigration, /enforce_campaign_send_organization_trigger/);
assert.match(campaignMigration, /CREATE POLICY campaign_sends_select_by_permission/);
assert.match(campaignMigration, /has_org_permission\(organization_id, 'crm_campaigns'\)/);

assert.match(customerHook, /crm_customer_booking_metrics/);
assert.doesNotMatch(customerService, /booking_id:\s*followUpData\.customer_id/);
assert.doesNotMatch(campaignCard, /Math\.floor\(/, 'campaign performance is never fabricated');
assert.doesNotMatch(campaignStats, /45%|12%/, 'campaign rates are never hardcoded');
assert.doesNotMatch(customersPage, /value="complaints"|value="automation"|value="loyalty"/);

console.log('CRM core checks passed: 30/30');
