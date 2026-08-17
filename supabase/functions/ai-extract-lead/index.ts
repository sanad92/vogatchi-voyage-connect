// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { callLovableAI, safeParseJSON, corsHeaders } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, save = true } = await req.json();
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

    // Fetch last 30 messages
    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, media_caption, template_name, sent_at")
      .eq("conversation_id", conversation_id)
      .order("sent_at", { ascending: true })
      .limit(30);
    if (error) throw error;

    const transcript = (messages || [])
      .map((m: any) => {
        const who = m.direction === "inbound" ? "العميل" : "الموظف";
        const text = m.content || m.media_caption || (m.template_name ? `[قالب: ${m.template_name}]` : "[مرفق]");
        return `${who}: ${text}`;
      })
      .join("\n");

    const systemPrompt = `أنت مساعد ذكي متخصص في تحليل محادثات العملاء لشركة سياحة.
مهمتك: استخراج معلومات الطلب من محادثة واتساب وإرجاعها بصيغة JSON فقط.

أعد كائن JSON بالحقول التالية (اترك الحقل null إذا لم يُذكر):
{
  "intent": "hotel|flight|visa|package|transport|other|unknown",
  "destination_city": "المدينة الوجهة",
  "destination_country": "الدولة",
  "check_in_date": "YYYY-MM-DD أو null",
  "check_out_date": "YYYY-MM-DD أو null",
  "nights": عدد الليالي,
  "adults": عدد البالغين,
  "children": عدد الأطفال,
  "budget": "الميزانية كنص",
  "budget_amount": رقم إذا وُجد,
  "budget_currency": "العملة",
  "hotel_preferences": "تفضيلات الفندق",
  "urgency": "high|medium|low",
  "summary": "ملخص من سطر واحد بالعربي",
  "confidence": 0.0-1.0
}

أرجع JSON فقط، بدون أي شرح.`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `المحادثة:\n${transcript}` },
      ],
      jsonMode: true,
      temperature: 0.2,
    });

    const extracted = safeParseJSON(raw) || {};

    if (save) {
      await supabase
        .from("whatsapp_conversations")
        .update({
          category: extracted.intent || null,
        })
        .eq("id", conversation_id);
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
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
