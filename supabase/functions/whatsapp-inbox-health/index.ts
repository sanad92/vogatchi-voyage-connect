import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const organizationId = typeof body?.organization_id === "string" ? body.organization_id : "";
    const settingsId = typeof body?.whatsapp_settings_id === "string" ? body.whatsapp_settings_id : "";
    const repair = body?.repair === true;
    if (!organizationId || !settingsId) return json({ error: "بيانات الرقم غير مكتملة" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: member } = await admin.from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", authData.user.id).maybeSingle();
    if (!member || !["owner", "admin"].includes(member.role)) return json({ error: "هذه العملية متاحة لمدير المؤسسة فقط" }, 403);

    const { data: settings, error: settingsError } = await admin.from("whatsapp_settings")
      .select("id, waba_id, phone_number_id, access_token, api_version")
      .eq("id", settingsId).eq("organization_id", organizationId).maybeSingle();
    if (settingsError || !settings) return json({ error: "رقم واتساب غير موجود" }, 404);
    if (!settings.access_token || !settings.waba_id) return json({ error: "بيانات ربط الرقم غير مكتملة" }, 409);

    const version = settings.api_version || Deno.env.get("META_GRAPH_API_VERSION") || "v22.0";
    const endpoint = `https://graph.facebook.com/${version}/${settings.waba_id}/subscribed_apps`;
    const callMeta = async (method: "GET" | "POST") => {
      const response = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${settings.access_token}` } });
      const text = await response.text();
      let payload: any = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
      return { ok: response.ok, status: response.status, payload };
    };

    if (repair) {
      const repaired = await callMeta("POST");
      await admin.from("whatsapp_connection_events").insert({
        organization_id: organizationId,
        event_type: repaired.ok && repaired.payload?.success === true ? "webhook_subscription_repaired" : "webhook_subscription_repair_failed",
        payload: { whatsapp_settings_id: settingsId, phone_number_id: settings.phone_number_id, status: repaired.status, error: repaired.ok ? null : repaired.payload?.error },
      });
      if (!repaired.ok || repaired.payload?.success !== true) return json({ error: "Meta رفضت تفعيل استقبال الرسائل", details: repaired.payload }, 502);
    }

    const checked = await callMeta("GET");
    if (!checked.ok) return json({ error: "تعذر فحص اشتراك استقبال الرسائل", details: checked.payload }, 502);
    const subscriptions = Array.isArray(checked.payload?.data) ? checked.payload.data : [];
    return json({
      success: true,
      subscribed: subscriptions.length > 0,
      phone_number_id: settings.phone_number_id,
      subscription_count: subscriptions.length,
    });
  } catch (error) {
    console.error("whatsapp-inbox-health error", error);
    return json({ error: "تعذر فحص استقبال الرسائل" }, 500);
  }
});