import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const { organization_id, whatsapp_settings_id } = await req.json().catch(() => ({}));
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "Missing organization_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: roleRow } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || !["owner", "admin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Target a specific inbox (multi-inbox), or fall back to the default inbox.
    let query = admin
      .from("whatsapp_settings")
      .select("id, waba_id, access_token, is_default")
      .eq("organization_id", organization_id);
    query = whatsapp_settings_id
      ? query.eq("id", whatsapp_settings_id)
      : query.eq("is_default", true);
    const { data: existing } = await query.maybeSingle();

    if (existing?.waba_id && existing?.access_token) {
      const gv = Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0";
      try {
        await fetch(`https://graph.facebook.com/${gv}/${existing.waba_id}/subscribed_apps`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${existing.access_token}` },
        });
      } catch (e) {
        console.warn("unsubscribe failed:", e);
      }
    }

    if (existing?.id) {
      await admin.from("whatsapp_settings").update({
        access_token: null,
        token_expires_at: null,
        is_active: false,
        is_default: false,
        onboarding_status: "disconnected",
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);

      // If we disconnected the default, promote another active inbox to default.
      if (existing.is_default) {
        const { data: next } = await admin
          .from("whatsapp_settings")
          .select("id")
          .eq("organization_id", organization_id)
          .eq("is_active", true)
          .neq("id", existing.id)
          .order("connected_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (next?.id) {
          await admin.from("whatsapp_settings").update({ is_default: true }).eq("id", next.id);
        }
      }
    }

    await admin.from("whatsapp_connection_events").insert({
      organization_id,
      event_type: "disconnected",
      payload: { by: userId },
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("whatsapp-disconnect error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
