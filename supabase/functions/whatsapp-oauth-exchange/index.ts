import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = () => `https://graph.facebook.com/${Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0"}`;

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
    const { code, organization_id, waba_id: hintedWabaId, phone_number_id: hintedPhoneId } = body ?? {};

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: "Server misconfigured: META_APP_ID / META_APP_SECRET missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Exchange code -> access token
    const tokenUrl = `${GRAPH()}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      await logEvent(admin, organization_id, "oauth_exchange_failed", tokenJson);
      return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenJson }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const accessToken: string = tokenJson.access_token;
    const expiresIn: number | undefined = tokenJson.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 2) Determine WABA id (prefer hinted; else via debug_token -> granular_scopes)
    let wabaId: string | undefined = hintedWabaId;
    if (!wabaId) {
      const dbg = await fetch(`${GRAPH()}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
      const dbgJson = await dbg.json();
      const granular = dbgJson?.data?.granular_scopes ?? [];
      const wabaScope = granular.find((s: any) => s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging");
      wabaId = wabaScope?.target_ids?.[0];
    }
    if (!wabaId) {
      await logEvent(admin, organization_id, "oauth_waba_missing", { tokenJson });
      return new Response(JSON.stringify({ error: "Could not determine WABA id — pass waba_id from Embedded Signup callback" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3) Fetch WABA + phone numbers
    const wabaInfoRes = await fetch(`${GRAPH()}/${wabaId}?fields=id,name,currency,timezone_id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const wabaInfo = await wabaInfoRes.json();

    const phonesRes = await fetch(`${GRAPH()}/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const phonesJson = await phonesRes.json();
    const phones = phonesJson?.data ?? [];
    const phone = phones.find((p: any) => p.id === hintedPhoneId) ?? phones[0];

    if (!phone) {
      await logEvent(admin, organization_id, "no_phone_number", { wabaId, phonesJson });
      return new Response(JSON.stringify({ error: "No phone number found on WABA" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4) Subscribe app to WABA webhooks (idempotent)
    try {
      await fetch(`${GRAPH()}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      console.warn("subscribed_apps failed (non-fatal):", e);
    }

    // 5) Upsert whatsapp_settings row for this org
    const payload = {
      organization_id,
      waba_id: wabaId,
      business_name: wabaInfo?.name ?? null,
      phone_number_id: phone.id,
      phone_number: phone.display_phone_number ?? null,
      display_phone_number: phone.display_phone_number ?? null,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      onboarding_status: "connected",
      connection_method: "embedded_signup",
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      api_version: Deno.env.get("META_GRAPH_API_VERSION") ?? "v22.0",
      updated_at: new Date().toISOString(),
    };

    // Multi-inbox: upsert by (organization_id, phone_number_id). Different phones
    // for the same org create separate rows; connecting the same phone again
    // refreshes the existing row.
    const { data: existing } = await admin
      .from("whatsapp_settings")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("phone_number_id", phone.id)
      .maybeSingle();

    // Check if this org already has a default inbox; if not, mark this one default.
    const { data: defaultRow } = await admin
      .from("whatsapp_settings")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("is_default", true)
      .maybeSingle();

    const payloadWithDefault = {
      ...payload,
      is_default: existing?.id ? undefined : !defaultRow?.id,
    };

    if (existing?.id) {
      const { error } = await admin.from("whatsapp_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("whatsapp_settings").insert(payloadWithDefault);
      if (error) throw error;
    }

    await logEvent(admin, organization_id, "connected", { wabaId, phone_number_id: phone.id });

    return new Response(
      JSON.stringify({ success: true, waba_id: wabaId, phone_number_id: phone.id, display_phone_number: phone.display_phone_number, business_name: wabaInfo?.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-oauth-exchange error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
