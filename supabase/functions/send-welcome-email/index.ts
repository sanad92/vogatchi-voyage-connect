import { createClient } from 'npm:@supabase/supabase-js@2';
import { bearerToken } from '../_shared/auth.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = bearerToken(req);
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user?.email || !user.email_confirmed_at) return json({ error: 'Verified email required' }, 401);
    const body = await req.json().catch(() => null);
    const orgId = body?.organizationId;
    if (typeof orgId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(orgId)) {
      return json({ error: 'Invalid organizationId' }, 400);
    }
    const { data: membership, error: memberError } = await admin.from('organization_members')
      .select('id').eq('organization_id', orgId).eq('user_id', user.id)
      .eq('role', 'owner').eq('is_active', true).maybeSingle();
    if (memberError) throw new Error('welcome_membership_lookup_failed');
    if (!membership) return json({ error: 'Forbidden' }, 403);

    const { data: org, error: orgError } = await admin.from('organizations').select('name')
      .eq('id', orgId).eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()).maybeSingle();
    if (orgError) throw new Error('welcome_org_lookup_failed');
    if (!org) return json({ error: 'Onboarding email is no longer available' }, 409);
    const site = new URL(Deno.env.get('SITE_URL')?.trim() || 'https://safarerp.com');
    if (site.protocol !== 'https:' || site.username || site.password) throw new Error('welcome_origin_invalid');

    const { data: status, error: queueError } = await admin.rpc('enqueue_approved_transactional_email', {
      _org: orgId, _source: 'organization_onboarding', _key: user.id, _type: 'welcome',
      _recipient: user.email, _name: null, _subject: 'مرحبًا بك في Safar ERP',
      _data: { name: org.name, login_url: new URL('/login', site).href },
    });
    if (queueError || !['pending', 'processing', 'sent'].includes(status)) throw new Error('welcome_not_queued');
    return json({ success: true, status: status === 'sent' ? 'sent' : 'queued' });
  } catch {
    return json({ error: 'Welcome email could not be queued' }, 500);
  }
});
