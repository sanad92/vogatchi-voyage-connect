import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.3/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is platform_owner
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerRoles } = await admin
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id);
    const isOwner = (callerRoles ?? []).some((r: any) => r.role === 'platform_owner');
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Only platform owners can create platform admins' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { email, password, full_name, role } = body ?? {};
    if (!email || !password || !full_name || !['platform_admin', 'platform_owner'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (String(password).length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try create user; if exists, fetch
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr) {
      // If user exists, lookup
      const msg = String(createErr.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist')) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
        if (!existing) {
          return new Response(JSON.stringify({ error: 'User exists but cannot be looked up' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        userId = existing.id;
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      userId = created.user.id;
    }

    // Ensure profile
    await admin.from('profiles').upsert({
      id: userId!, email, full_name, is_active: true,
    }, { onConflict: 'id' });

    // Assign platform role (idempotent on (user_id, role))
    const { error: roleErr } = await admin
      .from('platform_roles')
      .insert({ user_id: userId, role, assigned_by: user.id });
    if (roleErr && !String(roleErr.message).includes('duplicate')) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
