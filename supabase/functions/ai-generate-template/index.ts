import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLovableAI, safeParseJSON, corsHeaders } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser, authErrorResponse } from "../_shared/auth.ts";

const CATEGORY_LABELS: Record<string, string> = {
  marketing: "تسويقية",
  booking_hotels: "حجوزات وفنادق",
  flights: "طيران",
  payments: "مدفوعات",
  visas: "تأشيرات",
  customer_service: "خدمة عملاء",
  crm_followups: "متابعة عملاء",
  seasonal: "موسمية",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await requireUser(req);
    const adminDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: mem } = await adminDb.from("organization_members").select("id")
      .eq("user_id", caller.id).eq("is_active", true).limit(1);
    if (!mem?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const {
      brief,
      category: rawCategory = "marketing",
      tone = "professional",
      locale = "ar",
    } = await req.json();

    const category = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, rawCategory) ? rawCategory : "marketing";
    if (!brief || typeof brief !== "string" || brief.length > 2000) {
      return new Response(JSON.stringify({ error: "brief required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const catLabel = CATEGORY_LABELS[category];
    const lang = locale === "ar" ? "العربية" : "English";
    const toneLabel = tone === "friendly" ? "ودود" : tone === "urgent" ? "عاجل" : "مهني رسمي";

    const systemPrompt = `أنت خبير في كتابة قوالب رسائل WhatsApp Business لشركات السياحة.
اكتب قالباً مطابقاً لمعايير Meta:
- استخدم متغيرات بصيغة {{customer_first_name}}, {{booking_reference}}, {{company_name}}, {{offer_price}} إلخ عند الحاجة.
- تجنب الروابط في جسم الرسالة إلا عند الضرورة.
- استخدم لغة ${lang} فقط.
- الفئة: ${catLabel}
- النبرة: ${toneLabel}

أعِد النتيجة كـ JSON فقط بالشكل التالي (بدون أي شرح إضافي):
{
  "name": "snake_case_english_name_max_40_chars",
  "displayName": "اسم مقروء بالعربية",
  "description": "وصف قصير جداً",
  "header": "عنوان اختياري أو نص فارغ",
  "body": "نص القالب الكامل مع المتغيرات",
  "footer": "توقيع اختياري أو فارغ",
  "variables": ["customer_first_name", "company_name"],
  "suggestedCategory": "${category}"
}`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: brief },
      ],
      jsonMode: true,
      temperature: 0.7,
    });

    const parsed = safeParseJSON<{
      name: string;
      displayName: string;
      description?: string;
      header?: string;
      body: string;
      footer?: string;
      variables?: string[];
      suggestedCategory?: string;
    }>(raw);

    if (!parsed?.body) {
      return new Response(
        JSON.stringify({ error: "AI response could not be parsed", raw }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const authRes = authErrorResponse(err, corsHeaders);
    if (authRes) return authRes;
    const msg = String((err as Error)?.message || err);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
