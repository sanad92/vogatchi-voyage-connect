import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { organizationId } = await req.json();
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: s } = await admin
      .from("whatsapp_settings")
      .select("access_token,waba_id,api_version")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!s?.access_token || !s?.waba_id) {
      return new Response(JSON.stringify({ error: "WhatsApp settings not configured" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("META_APP_SECRET");
    let proofParam = "";
    if (secret) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(s.access_token),
      );
      const proof = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      proofParam = `&appsecret_proof=${proof}`;
    }

    const gv = s.api_version || "v22.0";
    const r = await fetch(
      `https://graph.facebook.com/${gv}/${s.waba_id}/message_templates?fields=id,name,language,status,category,rejected_reason,components&limit=200${proofParam}`,
      { headers: { Authorization: `Bearer ${s.access_token}` } },
    );
    const j = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Meta API error", details: j }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const metaTemplates = j.data || [];
    let updated = 0;
    let created = 0;

    for (const mt of metaTemplates) {
      const status = (mt.status || "").toLowerCase();
      const rejectedReason = mt.rejected_reason || null;

      // Try to match existing by (org, name, language)
      const { data: existing } = await admin
        .from("whatsapp_templates")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", mt.name)
        .eq("language", mt.language)
        .maybeSingle();

      // Extract body from components
      const bodyComp = (mt.components || []).find((c: any) => c.type === "BODY");
      const headerComp = (mt.components || []).find((c: any) => c.type === "HEADER");
      const footerComp = (mt.components || []).find((c: any) => c.type === "FOOTER");

      const payload: any = {
        organization_id: organizationId,
        name: mt.name,
        language: mt.language,
        category: mt.category,
        status,
        meta_template_id: mt.id,
        meta_status: status,
        meta_rejection_reason: rejectedReason,
        meta_synced_at: new Date().toISOString(),
        body_text: bodyComp?.text || existing ? undefined : "",
      };
      if (bodyComp?.text) payload.body_text = bodyComp.text;
      if (headerComp?.text) payload.header_text = headerComp.text;
      if (footerComp?.text) payload.footer_text = footerComp.text;

      if (existing) {
        await admin.from("whatsapp_templates").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await admin.from("whatsapp_templates").insert({
          ...payload,
          body_text: payload.body_text || bodyComp?.text || "",
        });
        created++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, total: metaTemplates.length, updated, created }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
