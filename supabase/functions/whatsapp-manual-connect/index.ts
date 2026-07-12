import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = () => `https://graph.facebook.com/${Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0"}`;

async function appsecretProof(accessToken: string): Promise<string | null> {
  const secret = Deno.env.get("META_APP_SECRET");
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(accessToken));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function appendProof(url: string, proof: string | null): string {
  if (!proof) return url;
  return url + (url.includes("?") ? "&" : "?") + "appsecret_proof=" + proof;
}

async function logEvent(supabase: any, orgId: string, type: string, payload: unknown) {
  try {
    await supabase.from("whatsapp_connection_events").insert({
      organization_id: orgId,
      event_type: type,
      payload,
    });
  } catch (_) { /* non-fatal */ }
}

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

    const body = await req.json().catch(() => ({}));
    const { access_token, phone_number_id, waba_id, organization_id } = body ?? {};

    if (!access_token || typeof access_token !== "string") {
      return new Response(JSON.stringify({ error: "Missing access_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!phone_number_id || typeof phone_number_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing phone_number_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!waba_id || typeof waba_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing waba_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!organization_id || typeof organization_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing organization_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify caller is owner/admin of the org
    const { data: roleRow } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || !["owner", "admin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: owner/admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const proof = await appsecretProof(access_token);

    // 1) Validate phone number id with the provided token
    const phoneRes = await fetch(appendProof(`${GRAPH()}/${phone_number_id}?fields=id,display_phone_number,verified_name`, proof), {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const phoneJson = await phoneRes.json();
    if (!phoneRes.ok || !phoneJson?.id) {
      await logEvent(admin, organization_id, "manual_connect_failed", { step: "phone", phoneJson });
      return new Response(JSON.stringify({ error: "Phone Number ID غير صالح أو التوكن لا يملك صلاحية الوصول له", details: phoneJson }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Validate WABA id
    const wabaRes = await fetch(appendProof(`${GRAPH()}/${waba_id}?fields=id,name,currency,timezone_id`, proof), {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const wabaJson = await wabaRes.json();
    if (!wabaRes.ok || !wabaJson?.id) {
      await logEvent(admin, organization_id, "manual_connect_failed", { step: "waba", wabaJson });
      return new Response(JSON.stringify({ error: "WABA ID غير صالح أو التوكن لا يملك صلاحية الوصول له", details: wabaJson }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3) Subscribe app to WABA webhooks (idempotent, non-fatal)
    try {
      await fetch(appendProof(`${GRAPH()}/${waba_id}/subscribed_apps`, proof), {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
      });
    } catch (e) {
      console.warn("subscribed_apps failed (non-fatal):", e);
    }

    // 4) Upsert whatsapp_settings row
    const payload = {
      organization_id,
      waba_id,
      business_name: wabaJson?.name ?? null,
      phone_number_id: phoneJson.id,
      display_phone_number: phoneJson.display_phone_number ?? null,
      access_token,
      token_expires_at: null,
      is_active: true,
      onboarding_status: "connected",
      connection_method: "manual_token",
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      api_version: Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0",
      updated_at: new Date().toISOString(),
    };

    // Multi-inbox: upsert by (organization_id, phone_number_id)
    const { data: existing } = await admin
      .from("whatsapp_settings")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("phone_number_id", phoneJson.id)
      .maybeSingle();

    const { data: defaultRow } = await admin
      .from("whatsapp_settings")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("is_default", true)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin.from("whatsapp_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("whatsapp_settings")
        .insert({ ...payload, is_default: !defaultRow?.id });
      if (error) throw error;
    }

    await logEvent(admin, organization_id, "connected", { method: "manual_token", waba_id, phone_number_id: phoneJson.id });

    return new Response(
      JSON.stringify({
        success: true,
        waba_id,
        phone_number_id: phoneJson.id,
        display_phone_number: phoneJson.display_phone_number,
        verified_name: phoneJson.verified_name,
        business_name: wabaJson?.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-manual-connect error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
