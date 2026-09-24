// Shared helper for calling Lovable AI Gateway from Edge Functions.
// OpenAI models go through the Responses API (streamed, consumed server-side);
// other models use the OpenAI-compatible chat completions endpoint.

export const CHAT_COMPLETIONS_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
export const DEFAULT_MODEL = "openai/gpt-6-astra";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function toResponsesInput(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : m.role === "system" ? "developer" : "user",
    content: m.content,
  }));
}

async function callOpenAIResponses(params: {
  messages: ChatMessage[];
  model: string;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const body: any = {
    model: params.model,
    input: toResponsesInput(params.messages),
    stream: true,
    store: false,
    reasoning: { effort: "low" },
  };
  if (params.jsonMode) body.text = { format: { type: "json_object" } };

  const res = await fetch(RESPONSES_URL, {
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
    if (res.status === 429) throw new Error("تم تجاوز حد الطلبات. حاول لاحقاً.");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي منتهي. يرجى إضافة رصيد.");
    throw new Error(`AI Gateway error ${res.status}: ${text}`);
  }

  // Consume the SSE stream server-side and join the answer text.
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";

  const handleEvent = (raw: string) => {
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          output += evt.delta;
        } else if (evt.type === "response.completed" && !output) {
          output = evt.response?.output_text || "";
        }
      } catch { /* ignore keep-alives / partial frames */ }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      handleEvent(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) handleEvent(buffer);

  return output;
}

export async function callLovableAI(params: {
  messages: ChatMessage[];
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const model = params.model || DEFAULT_MODEL;

  if (model.startsWith("openai/")) {
    // gpt-6-astra rejects temperature; reasoning effort is required.
    return callOpenAIResponses({ messages: params.messages, model, jsonMode: params.jsonMode });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const body: any = { model, messages: params.messages };
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(CHAT_COMPLETIONS_URL, {
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
    if (res.status === 429) throw new Error("تم تجاوز حد الطلبات. حاول لاحقاً.");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي منتهي. يرجى إضافة رصيد.");
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
