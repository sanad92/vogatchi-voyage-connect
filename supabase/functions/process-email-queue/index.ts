import { createClient } from 'npm:@supabase/supabase-js@2';
import { authErrorResponse, requireInternalCaller } from '../_shared/auth.ts';
import type { ClaimedEmail } from '../_shared/transactional-email-dispatch.ts';
import { processClaimedEmail, transactionalEmailSettings } from '../_shared/transactional-email-worker.ts';

const headers = { 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    requireInternalCaller(req);
    const settings = transactionalEmailSettings();
    if (!settings) return json({ error: 'Email dispatch is not configured' }, 503);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.rpc('claim_transactional_emails');
    if (error) throw new Error('email_claim_failed');
    const report = { claimed: 0, sent: 0, rejected: 0, retry: 0, needs_review: 0, unconfirmed: 0 };

    for (const item of (data ?? []) as ClaimedEmail[]) {
      report.claimed++;
      try {
        const outcome = await processClaimedEmail(admin, item, settings);
        report[outcome]++;
      } catch {
        // The claim is recovered by a later run with the original provider key.
        report.unconfirmed++;
      }
    }

    return json(report, report.unconfirmed ? 500 : 200);
  } catch (error) {
    return authErrorResponse(error, headers) ?? json({ error: 'Email dispatch failed' }, 500);
  }
});
