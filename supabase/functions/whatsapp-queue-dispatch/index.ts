import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, requireOrgMembership, authErrorResponse } from '../_shared/auth.ts';
import { WA_CORS } from '../_shared/whatsapp.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: WA_CORS });
  const headers = { ...WA_CORS, 'Content-Type': 'application/json' };
  try {
    const user = await requireUser(req);
    const { organization_id } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await requireOrgMembership(admin, user.id, organization_id);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: allowed, error: permissionError } = await client.rpc('has_org_permission', { _org_id: organization_id, _permission: 'whatsapp_view' });
    if (permissionError || !allowed) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
    const { data, error } = await admin.rpc('wa_dispatch_queue', { _org_id: organization_id });
    if (error) throw error;
    return new Response(JSON.stringify({ assigned: data }), { headers });
  } catch (e: any) {
    return authErrorResponse(e, WA_CORS) || new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
});
