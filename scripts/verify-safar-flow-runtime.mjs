// Source contract checks; SQL runtime QA must run separately against test Postgres.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const dispatch = read('scripts/deploy-safar-flow-followup-dispatch.sql');
const activate = read('scripts/activate-safar-flow-followup-cron.sql');
const disable = read('scripts/disable-safar-flow-followup-cron.sql');
const query = read('src/hooks/useSafarFlowFollowups.ts');
const panel = read('src/components/safar-flow/SafarFlowLiveFollowups.tsx');
const studio = read('src/pages/SafarFlowStudio.tsx');

// Only internal notifications; never outbound WhatsApp or payments.
assert.match(dispatch, /INSERT INTO public.notifications\(/);
assert.doesNotMatch(dispatch, /net\.http_post|functions\.invoke|send-whatsapp|INSERT INTO public.customer_payments/);
assert.match(dispatch, /q\.status = 'sent'/);
assert.match(dispatch, /q\.organization_id = f\.organization_id/);
assert.match(dispatch, /m\.organization_id = f\.organization_id AND m\.user_id = f\.owner_user_id/);
assert.match(dispatch, /FOR UPDATE OF f SKIP LOCKED/);
assert.match(dispatch, /ON CONFLICT \(quote_id, step\) DO NOTHING/);
assert.match(dispatch, /TG_OP = 'INSERT'/);
assert.match(dispatch, /AFTER INSERT OR UPDATE OF status/);
assert.match(dispatch, /REVOKE ALL ON FUNCTION public\.dispatch_quote_followups\(\) FROM PUBLIC, anon, authenticated/);
assert.match(activate, /cron\.schedule\(/);
assert.match(activate, /safar-flow-quote-followups-v1/);
assert.match(disable, /cron\.unschedule\(/);

// Monitoring is restricted to selected tenant and is read-only.
assert.match(query, /\.eq\('organization_id', orgId\)/);
assert.match(query, /enabled: !!orgId/);
assert.doesNotMatch(query, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
assert.match(panel, /useSafarFlowFollowups/);
assert.match(studio, /<SafarFlowLiveFollowups\s*\/>/);
console.log('Safar Flow V1 runtime source contracts pass. Database dispatch QA is still required.');
