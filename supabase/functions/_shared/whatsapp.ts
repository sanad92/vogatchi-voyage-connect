// Authoritative WhatsApp (Meta Cloud API) helpers shared by every outbound path:
// Inbox composer, customer profile, CRM marketing, follow-ups and broadcasts.

export const WA_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface WaSettings {
  id: string;
  organization_id: string;
  phone_number_id: string;
  access_token: string;
  api_version: string | null;
  waba_id: string | null;
}

/** Meta expects digits only, no leading '+', no separators. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  // Strip international access prefix "00" (e.g. 0020100... -> 20100...)
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export async function appSecretProof(token: string): Promise<string | null> {
  const secret = Deno.env.get('META_APP_SECRET');
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolves the organization's WhatsApp inbox server-side.
 * Preference: explicit inbox id -> org default -> any active inbox.
 */
export async function resolveSettings(
  admin: any,
  organizationId: string,
  settingsId?: string | null,
): Promise<WaSettings> {
  const cols = 'id, organization_id, phone_number_id, access_token, api_version, waba_id';

  if (settingsId) {
    const { data } = await admin.from('whatsapp_settings').select(cols)
      .eq('id', settingsId).eq('organization_id', organizationId).maybeSingle();
    if (data?.access_token && data?.phone_number_id) return data as WaSettings;
  }

  const { data: rows } = await admin.from('whatsapp_settings').select(cols + ', is_default, is_active')
    .eq('organization_id', organizationId)
    .order('is_default', { ascending: false })
    .order('is_active', { ascending: false })
    .limit(10);

  const usable = (rows ?? []).find((r: any) => r.access_token && r.phone_number_id);
  if (!usable) {
    throw new WaError('WHATSAPP_NOT_CONNECTED', 'لم يتم ربط حساب واتساب لهذه المؤسسة | WhatsApp is not connected for this organization');
  }
  return usable as WaSettings;
}

export class WaError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, message: string, details: unknown = null, status = 400) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/** True when the customer messaged us within the last 24 hours. */
export async function isWindowOpen(admin: any, conversationId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from('whatsapp_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .gte('sent_at', since)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Number of distinct {{n}} placeholders in a string. */
export function countPlaceholders(text: string | null | undefined): number {
  if (!text) return 0;
  const found = new Set<number>();
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) found.add(Number(m[1]));
  return found.size ? Math.max(...found) : 0;
}

export interface TemplateRow {
  id?: string;
  name: string;
  language: string | null;
  status?: string | null;
  components?: any;
  body_text?: string | null;
  header_text?: string | null;
  header_format?: string | null;
  body_variable_count?: number | null;
  header_variable_count?: number | null;
}

export interface TemplateVarInput {
  body?: string[];
  header?: string[];
}

/**
 * Builds Meta `components` for a template send and validates the parameter
 * count up-front — the #1 cause of Meta error 132000.
 */
export function buildTemplateComponents(tpl: TemplateRow, vars: TemplateVarInput) {
  const comps: any[] = Array.isArray(tpl.components) ? tpl.components : [];
  const bodyComp = comps.find((c: any) => String(c?.type).toUpperCase() === 'BODY');
  const headerComp = comps.find((c: any) => String(c?.type).toUpperCase() === 'HEADER');

  const expectedBody = tpl.body_variable_count ?? countPlaceholders(bodyComp?.text ?? tpl.body_text);
  const headerIsText = String(headerComp?.format ?? tpl.header_format ?? 'TEXT').toUpperCase() === 'TEXT';
  const expectedHeader = headerIsText
    ? (tpl.header_variable_count ?? countPlaceholders(headerComp?.text ?? tpl.header_text))
    : 0;

  const body = (vars.body ?? []).map((v) => (v ?? '').toString());
  const header = (vars.header ?? []).map((v) => (v ?? '').toString());

  if (body.length !== expectedBody) {
    throw new WaError(
      'TEMPLATE_PARAM_MISMATCH',
      `القالب يحتاج ${expectedBody} متغير في النص وتم إرسال ${body.length} | Template expects ${expectedBody} body variable(s), received ${body.length}`,
    );
  }
  if (expectedHeader && header.length !== expectedHeader) {
    throw new WaError(
      'TEMPLATE_PARAM_MISMATCH',
      `القالب يحتاج ${expectedHeader} متغير في العنوان | Template expects ${expectedHeader} header variable(s), received ${header.length}`,
    );
  }
  if (body.some((v) => !v.trim()) || header.some((v) => !v.trim())) {
    throw new WaError('TEMPLATE_PARAM_EMPTY', 'لا يمكن ترك متغيرات القالب فارغة | Template variables cannot be empty');
  }

  const out: any[] = [];
  if (expectedHeader) {
    out.push({ type: 'header', parameters: header.map((t) => ({ type: 'text', text: t })) });
  }
  if (expectedBody) {
    out.push({ type: 'body', parameters: body.map((t) => ({ type: 'text', text: t })) });
  }
  return out;
}

export interface SendResult {
  ok: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetails: unknown;
  httpStatus: number;
}

/** Single place where we actually talk to Meta. Never throws on API errors. */
export async function graphSend(settings: WaSettings, payload: Record<string, unknown>): Promise<SendResult> {
  const gv = settings.api_version || Deno.env.get('META_GRAPH_API_VERSION') || 'v22.0';
  const proof = await appSecretProof(settings.access_token);
  const url = `https://graph.facebook.com/${gv}/${settings.phone_number_id}/messages${proof ? `?appsecret_proof=${proof}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return {
      ok: false, providerMessageId: null, errorCode: 'NETWORK',
      errorMessage: String((e as Error)?.message ?? e), errorDetails: null, httpStatus: 0,
    };
  }

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }

  if (!res.ok) {
    const err = json?.error ?? null;
    return {
      ok: false,
      providerMessageId: null,
      errorCode: err?.code != null ? String(err.code) : String(res.status),
      errorMessage: humanizeMetaError(err) || text.slice(0, 500),
      errorDetails: err ?? text.slice(0, 1000),
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    providerMessageId: json?.messages?.[0]?.id ?? null,
    errorCode: null, errorMessage: null, errorDetails: null, httpStatus: res.status,
  };
}

/** Turn Meta's raw error into something staff can act on (AR | EN). */
export function humanizeMetaError(err: any): string | null {
  if (!err) return null;
  const code = Number(err.code);
  const detail = err.error_data?.details || err.message || err.title || '';
  const map: Record<number, string> = {
    131047: 'انتهت نافذة الـ24 ساعة — يجب استخدام قالب معتمد | 24-hour window expired — an approved template is required',
    131026: 'الرقم غير مسجل على واتساب أو لا يمكنه استقبال الرسائل | Recipient is not a valid WhatsApp number',
    132000: 'عدد متغيرات القالب غير مطابق للقالب المعتمد | Template variable count does not match the approved template',
    132001: 'القالب غير موجود أو غير معتمد بهذه اللغة | Template does not exist or is not approved in this language',
    132005: 'نص القالب أطول من المسموح | Template text exceeds the allowed length',
    132007: 'محتوى القالب مخالف لسياسات واتساب | Template content violates WhatsApp policy',
    131031: 'تم تعطيل حساب واتساب الخاص بك | Your WhatsApp account has been disabled',
    131049: 'منعت Meta هذه الرسالة التسويقية للحفاظ على تجربة المستخدم | Meta throttled this marketing message',
    131056: 'تم تجاوز حد الرسائل لهذا الرقم مؤقتًا | Pair rate limit hit, try again later',
    130429: 'تم تجاوز حد معدل الإرسال | Rate limit exceeded',
    190: 'انتهت صلاحية رمز الوصول — أعد ربط واتساب | Access token expired — reconnect WhatsApp',
    100: `طلب غير صالح | Invalid request: ${detail}`,
  };
  return map[code] ?? (detail ? `${detail}${code ? ` (#${code})` : ''}` : null);
}
