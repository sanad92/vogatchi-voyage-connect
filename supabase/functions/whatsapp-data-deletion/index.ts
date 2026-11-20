// Meta "Data Deletion Request Callback" endpoint.
// Meta docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
// Verifies signed_request with APP_SECRET and queues the app-scoped subject for review,
// and returns a { url, confirmation_code } JSON so Meta shows a status link to the user.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_SITE_URL = 'https://safarerp.com';

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

async function parseSignedRequest(signed: string, appSecret: string): Promise<string | null> {
  if (signed.length > 4096 || !/^[A-Za-z0-9_-]{43}=?\.[A-Za-z0-9_-]+={0,2}$/.test(signed)) return null;
  const [encodedSig, payload] = signed.split(".");
  try {
    const providedSig = b64UrlDecode(encodedSig);
    const expected = await hmacSha256(appSecret, payload);
    if (!timingSafeEqual(providedSig, expected)) return null;
    const data = JSON.parse(new TextDecoder().decode(b64UrlDecode(payload)));
    if (data?.algorithm !== "HMAC-SHA256") return null;
    const userId = typeof data.user_id === "string" || Number.isSafeInteger(data.user_id) ? String(data.user_id) : "";
    return /^[0-9]{1,32}$/.test(userId) ? userId : null;
  } catch {
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

    const subjectId = await parseSignedRequest(signed, appSecret);
    if (!subjectId) {
      return new Response(JSON.stringify({ error: "Invalid signed_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const site = new URL(Deno.env.get('SITE_URL')?.trim() || DEFAULT_SITE_URL);
    if (site.protocol !== 'https:' || site.username || site.password) throw new Error('Invalid SITE_URL');
    const statusUrl = new URL('/data-deletion', site);
    // Equivalent encodings of the signature have the same signed payload.
    const payload = signed.slice(signed.indexOf('.') + 1);
    const hash = await hmacSha256(appSecret, `data-deletion:${payload}`);
    const fingerprint = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: confirmationCode, error } = await admin.rpc('receive_meta_deletion_request', {
      _meta_user_id: subjectId,
      _confirmation_code: crypto.randomUUID(),
      _request_fingerprint: fingerprint,
    });
    if (error || typeof confirmationCode !== 'string') throw new Error('Could not record deletion request');
    const receipt = confirmationCode.replaceAll('-', '');
    statusUrl.searchParams.set('code', receipt);

    return new Response(JSON.stringify({ url: statusUrl.href, confirmation_code: receipt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-data-deletion error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
