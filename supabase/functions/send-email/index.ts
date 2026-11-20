import { createClient } from 'npm:@supabase/supabase-js@2';
import { authErrorResponse, requireInternalCaller, requireUser } from '../_shared/auth.ts';
import type { ClaimedEmail } from '../_shared/transactional-email-dispatch.ts';
import { processClaimedEmail, transactionalEmailSettings } from '../_shared/transactional-email-worker.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });
const allowedRoles = new Set(['owner', 'admin', 'manager']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    let user: { id: string } | null = null;
    try { requireInternalCaller(req); } catch { user = await requireUser(req); }

    const body = await req.json().catch(() => null);
    const emailId = body?.email_id;
    if (typeof emailId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(emailId)) {
      return json({ error: 'Invalid email_id' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (user) {
      const { data: row, error: rowError } = await admin.from('email_queue')
        .select('organization_id,dispatch_source').eq('id', emailId).maybeSingle();
      if (rowError) throw new Error('email_lookup_failed');
      if (!row?.dispatch_source || row.dispatch_source === 'organization_onboarding') return json({ error: 'Forbidden' }, 403);
      const { data, error } = await admin.from('organization_members').select('role')
        .eq('organization_id', row.organization_id).eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (error) throw new Error('membership_lookup_failed');
      if (!data || !allowedRoles.has(data.role)) return json({ error: 'Forbidden' }, 403);
    }

    const settings = transactionalEmailSettings();
    if (!settings) return json({ error: 'Email dispatch is not configured' }, 503);
    const { data, error } = await admin.rpc('claim_transactional_emails', { _limit: 1, _email_id: emailId });
    if (error) throw new Error('email_claim_failed');
    const row = (data as ClaimedEmail[] | null)?.[0];
    if (!row) return json({ error: 'No dispatchable email' }, 409);
    const result = await processClaimedEmail(admin, row, settings);
    return json({ success: result === 'sent', status: result }, result === 'sent' ? 200 : 502);
  } catch (error) {
    return authErrorResponse(error, headers) ?? json({ error: 'Email dispatch failed' }, 500);
  }
});
