import assert from 'node:assert/strict';
import { buildLeadPipelineStats, getLeadCampaignLabel, isFollowUpOverdue, isLeadOpen } from '../src/lib/leadPipeline.ts';

// Synthetic, in-memory growth funnel fixture; no provider, database or customer traffic.
const now = new Date('2026-11-21T12:00:00.000Z');
const lead = (stage, next_follow_up_at = null, lead_source = 'meta_lead_ads', campaign = 'November campaign') =>
  ({ stage, next_follow_up_at, lead_source, campaign });
const leads = [
  lead('new'),
  lead('assigned', '2026-11-20T12:00:00.000Z'),
  lead('quoted', '2026-11-22T12:00:00.000Z'),
  lead('follow_up', 'not-a-date'),
  lead('accepted_pending_recheck'),
  lead('won', '2026-11-20T12:00:00.000Z'),
  lead('lost'),
  lead('cancelled'),
];
const beforeAggregation = structuredClone(leads);
assert.deepEqual(buildLeadPipelineStats(leads, now), {
  total: 8, newLeads: 1, active: 4, quoted: 3, overdue: 1,
  won: 1, lost: 2, conversionRate: 33.3,
});
assert.deepEqual(leads, beforeAggregation, 'funnel aggregation must not mutate source, campaign, or any lead fields');
assert.equal(isFollowUpOverdue(leads[5], now), false, 'closed won lead must not be overdue');
assert.equal(isFollowUpOverdue(leads[3], now), false, 'invalid timestamp must not be overdue');
assert.equal(isLeadOpen('payment_pending'), true);
assert.equal(isLeadOpen('cancelled'), false);
assert.equal(buildLeadPipelineStats([lead('new')], now).conversionRate, 0);
assert.equal(getLeadCampaignLabel('  November campaign  '), 'November campaign');
assert.equal(getLeadCampaignLabel('pilgrimage:synthetic'), 'طلبات اهتمام العمرة');
assert.equal(getLeadCampaignLabel('  '), null);
console.log('Growth lead pipeline synthetic stage, conversion, overdue and label checks PASS');
