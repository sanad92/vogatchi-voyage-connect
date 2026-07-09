// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLovableAI, corsHeaders } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, save = true } = await req.json();
    if (!conversation_id) throw new Error("conversation_id مطلوب");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, media_caption, template_name, sent_at")
      .eq("conversation_id", conversation_id)
      .order("sent_at", { ascending: true })
      .limit(100);
    if (error) throw error;

    const transcript = (messages || [])
      .map((m: any) => {
        const who = m.direction === "inbound" ? "العميل" : "الموظف";
        const text = m.content || m.media_caption || (m.template_name ? `[قالب]` : "[مرفق]");
        return `${who}: ${text}`;
      })
      .join("\n");

    const systemPrompt = `أنت مساعد يلخّص محادثات العملاء لموظفي شركة سياحة.
لخّص المحادثة في 4-6 نقاط مختصرة بالعربية تشمل:
- ما يريده العميل بالضبط
- الوجهة والتواريخ إن ذُكرت
- عدد المسافرين والميزانية إن ذُكرت
- ما تم الاتفاق عليه أو ما تبقى للحسم
- الخطوة التالية المقترحة

استخدم صيغة نقاط بعلامة "•". لا تضف أي مقدمة أو خاتمة.`;

    const summary = await callLovableAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript || "لا توجد رسائل" },
      ],
      temperature: 0.3,
    });

    if (save) {
      await supabase
        .from("whatsapp_conversations")
        .update({
          ai_summary: summary,
          ai_summary_updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id);
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
