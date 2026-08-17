// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { callLovableAI, safeParseJSON, corsHeaders } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, customer_context = null } = await req.json();
    if (!conversation_id) throw new Error("conversation_id مطلوب");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // AuthZ: caller must be signed in and belong to the conversation's organization
    const { data: convoOrg } = await supabase
      .from("whatsapp_conversations")
      .select("organization_id")
      .eq("id", conversation_id)
      .maybeSingle();
    if (!convoOrg) throw new Error("المحادثة غير موجودة");
    await requireOrgMember(req, supabase, convoOrg.organization_id);

    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, media_caption, template_name, sent_at")
      .eq("conversation_id", conversation_id)
      .order("sent_at", { ascending: false })
      .limit(20);

    const ordered = (messages || []).reverse();
    const transcript = ordered
      .map((m: any) => {
        const who = m.direction === "inbound" ? "العميل" : "الموظف";
        const text = m.content || m.media_caption || (m.template_name ? `[قالب]` : "[مرفق]");
        return `${who}: ${text}`;
      })
      .join("\n");

    const contextBlock = customer_context
      ? `\n\nمعلومات العميل:\n${JSON.stringify(customer_context, null, 2)}`
      : "";

    const systemPrompt = `أنت مساعد ذكي لموظف خدمة عملاء في شركة سياحة راقية.
اقترح 3 ردود سريعة يمكن للموظف إرسالها الآن بناءً على المحادثة.
اجعل الردود:
- بالعربية الفصحى المهذبة الودّية
- قصيرة (سطر إلى سطرين)
- متنوعة (رد ودّي/رد يطلب تفاصيل/رد يقترح خدمة)
- تعكس نبرة كونسيرج فاخر، وليس بيعًا مباشرًا

أرجع JSON فقط بهذا الشكل:
{ "suggestions": [ { "text": "الرد", "label": "وصف قصير" }, ... ] }`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `المحادثة:\n${transcript}${contextBlock}` },
      ],
      jsonMode: true,
      temperature: 0.6,
    });

    const parsed = safeParseJSON<{ suggestions: any[] }>(raw) || { suggestions: [] };

    return new Response(JSON.stringify({ success: true, suggestions: parsed.suggestions?.slice(0, 3) || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const authRes = authErrorResponse(err, corsHeaders);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
