import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const body = await req.json();
    const name = (typeof body?.name === 'string' ? body.name.trim() : '').slice(0, 200);

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Service role client - bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.rpc('create_organization_onboarding', {
      _name: name,
      _slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      _phone: body.phone?.toString().trim() || null,
      _email: body.email?.toString().trim() || null,
      _address: body.address?.toString().slice(0, 500) || null,
    });

    if (error) {
      console.error('RPC Error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Organization created:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        organizationId: data,
        redirectTo: '/dashboard' 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});