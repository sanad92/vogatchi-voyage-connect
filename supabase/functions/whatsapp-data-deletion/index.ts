// Meta "Data Deletion Request Callback" endpoint.
// Meta docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
// Verifies the signed_request with APP_SECRET, marks user's WhatsApp data for deletion,
// and returns a { url, confirmation_code } JSON so Meta shows a status link to the user.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64UrlDecode(input: string): Uint8Array {
  const pad = 4 - (input.length % 4);
  const b64 = (input + (pad < 4 ? "=".repeat(pad) : "")).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function parseSignedRequest(signed: string, appSecret: string): Promise<any | null> {
  const [encodedSig, payload] = signed.split(".");
  if (!encodedSig || !payload) return null;
  const providedSig = b64UrlDecode(encodedSig);
  const expected = await hmacSha256(appSecret, payload);
  if (!timingSafeEqual(providedSig, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64UrlDecode(payload)));
  } catch (_) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const appSecret = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
    if (!appSecret) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData().catch(() => null);
    const signed = form?.get("signed_request")?.toString();
    if (!signed) {
      return new Response(JSON.stringify({ error: "Missing signed_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await parseSignedRequest(signed, appSecret);
    if (!data?.user_id) {
      return new Response(JSON.stringify({ error: "Invalid signed_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const confirmationCode = crypto.randomUUID();

    // Log the request; actual deletion is processed asynchronously per-org by staff.
    await admin.from("whatsapp_connection_events").insert({
      organization_id: null,
      event_type: "meta_data_deletion_request",
      payload: { meta_user_id: data.user_id, confirmation_code: confirmationCode, received_at: new Date().toISOString() },
    });

    // Best-effort: null out access_token for any settings row linked to this meta user
    await admin
      .from("whatsapp_settings")
      .update({ access_token: null, is_active: false, onboarding_status: "disconnected", disconnected_at: new Date().toISOString() })
      .eq("meta_user_id", data.user_id);

    const origin = new URL(req.url).origin;
    const statusUrl = `${origin.replace("/functions/v1/whatsapp-data-deletion", "")}/data-deletion?code=${confirmationCode}`;

    return new Response(JSON.stringify({ url: statusUrl, confirmation_code: confirmationCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-data-deletion error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
