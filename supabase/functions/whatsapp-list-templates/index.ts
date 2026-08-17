import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireOrgMember, authErrorResponse } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org") ?? "";
    if (!orgId) return json({ error: "org required" }, 400);

    // AuthZ: caller must be signed in and a member of the organization
    await requireOrgMember(req, admin, orgId);

    const { data: s } = await admin
      .from("whatsapp_settings")
      .select("access_token,waba_id,api_version")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!s) return json({ error: "no settings" }, 404);

    const secret = Deno.env.get("META_APP_SECRET")!;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s.access_token));
    const proof = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const gv = s.api_version || "v22.0";
    const r = await fetch(`https://graph.facebook.com/${gv}/${s.waba_id}/message_templates?fields=name,language,status,category&limit=100&appsecret_proof=${proof}`, {
      headers: { Authorization: `Bearer ${s.access_token}` },
    });
    const j = await r.json();
    return json(j, r.ok ? 200 : 502);
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    console.error("[whatsapp-list-templates] error", err);
    return json({ error: "Internal error" }, 500);
  }
});
