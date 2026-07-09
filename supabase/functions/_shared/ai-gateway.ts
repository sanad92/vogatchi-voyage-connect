// Shared helper for calling Lovable AI Gateway from Edge Functions.
// Non-streaming, OpenAI-compatible chat completions endpoint.

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLovableAI(params: {
  messages: ChatMessage[];
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const body: any = {
    model: params.model || DEFAULT_MODEL,
    messages: params.messages,
  };
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "custom-fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) {
      throw new Error("تم تجاوز حد الطلبات. حاول لاحقاً.");
    }
    if (res.status === 402) {
      throw new Error("رصيد الذكاء الاصطناعي منتهي. يرجى إضافة رصيد.");
    }
    throw new Error(`AI Gateway error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export function safeParseJSON<T = any>(text: string): T | null {
  try { return JSON.parse(text); } catch {}
  // Try to extract JSON object from mixed text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
