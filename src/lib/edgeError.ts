import { FunctionsHttpError } from '@supabase/supabase-js';

export interface EdgeErrorInfo {
  message: string;
  code?: string;
  correlationId?: string;
  /** Safe, token-free provider diagnostics (Meta error code, subcode, trace id). */
  provider?: {
    errorCode?: string | null;
    errorSubcode?: number | null;
    errorType?: string | null;
    errorMessage?: string | null;
    errorDetails?: string | null;
    fbtraceId?: string | null;
    httpStatus?: number | null;
    apiVersion?: string | null;
  } | null;
  details?: unknown;
}

/**
 * `supabase.functions.invoke` collapses every failure into the useless
 * "Edge Function returned a non-2xx status code". This reads the real JSON body
 * so staff see the actual Meta / policy / configuration reason.
 */
export const readEdgeError = async (error: unknown, fallback = 'فشل تنفيذ العملية'): Promise<EdgeErrorInfo> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return {
        message: body?.error || body?.message || error.message,
        code: body?.code,
        correlationId: body?.correlationId,
        provider: body?.provider ?? null,
        details: body?.details ?? null,
      };
    } catch {
      try {
        const text = await error.context.text();
        if (text) return { message: text };
      } catch { /* ignore */ }
    }
  }
  return { message: (error as any)?.message || fallback };
};

/** Human-readable one-liner for toasts, including the admin-facing trace hints. */
export const formatEdgeError = (info: EdgeErrorInfo): string => {
  const bits: string[] = [];
  const metaCode = info.provider?.errorCode;
  if (metaCode) bits.push(`Meta #${metaCode}`);
  else if (info.code && info.code !== 'PROVIDER_ERROR') bits.push(info.code);
  if (info.correlationId) bits.push(info.correlationId.slice(0, 8));
  return bits.length ? `${info.message} (${bits.join(' · ')})` : info.message;
};

export const throwEdgeError = async (error: unknown, fallback?: string): Promise<never> => {
  const info = await readEdgeError(error, fallback);
  const err = new Error(formatEdgeError(info)) as Error & EdgeErrorInfo;
  Object.assign(err, info);
  throw err;
};
