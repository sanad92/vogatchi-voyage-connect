import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await admin.from("whatsapp_settings").select("access_token,waba_id,api_version").eq("organization_id", orgId).maybeSingle();
  if (!s) return new Response(JSON.stringify({ error: "no settings" }), { status: 404, headers: cors });
  const secret = Deno.env.get("META_APP_SECRET")!;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s.access_token));
  const proof = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  const gv = s.api_version || "v22.0";
  const r = await fetch(`https://graph.facebook.com/${gv}/${s.waba_id}/message_templates?fields=name,language,status,category&limit=100&appsecret_proof=${proof}`, {
    headers: { Authorization: `Bearer ${s.access_token}` },
  });
  const j = await r.json();
  return new Response(JSON.stringify(j), { headers: { ...cors, "Content-Type": "application/json" } });
});
