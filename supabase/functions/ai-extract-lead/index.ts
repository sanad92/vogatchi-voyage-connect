import { createClient } from "npm:@supabase/supabase-js@2";
import { authErrorResponse, bearerToken, requireUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/ai-gateway.ts";
import { extractWhatsAppLeadDraft } from "../_shared/whatsapp-lead-draft.ts";

const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const headers = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ success: false, error: "طريقة الطلب غير مدعومة" }, { status: 405, headers });
  }

  try {
    await requireUser(req);
    const body = await req.json().catch(() => null);
    if (typeof body?.conversation_id !== "string" || !uuidPattern.test(body.conversation_id)
        || typeof body?.organization_id !== "string" || !uuidPattern.test(body.organization_id)) {
      return Response.json({ success: false, error: "بيانات المؤسسة أو المحادثة غير صالحة" }, { status: 400, headers });
    }

    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${bearerToken(req)}` } },
    });
    const { data, error } = await client.rpc("sop_review_whatsapp_lead_messages", {
      _org: body.organization_id,
      _conversation: body.conversation_id,
    });
    if (error?.code === "42501") {
      return Response.json({ success: false, error: "صلاحياتك لا تسمح باستخراج طلب من هذه المحادثة" }, { status: 403, headers });
    }
    if (error) throw error;
    const messages = (data as { content: string }[]).map(({ content }) => content);
    return Response.json({ success: true, data: extractWhatsAppLeadDraft(messages) }, { headers });
  } catch (error) {
    const response = authErrorResponse(error, corsHeaders);
    if (response) return response;
    return Response.json({ success: false, error: "تعذّر استخراج مسودة الطلب" }, { status: 500, headers });
  }
});
