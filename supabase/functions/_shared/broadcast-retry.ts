// Failures caused by account setup or temporary Meta issues — safe to resend after fixing settings.
// Keep in sync with src/lib/broadcastRetry.ts
const RETRYABLE = new Set(['131042', '131000', '133000', '130429', '131052', '131048', '1', '2', '4', '80007']);

export const isRetryableFailure = (code?: string | null, message?: string | null): boolean => {
  if (code && RETRYABLE.has(String(code))) return true;
  const m = String(message || '').toLowerCase();
  if (!code) return /non-2xx|temporary|timeout|currency|payment|خطأ مؤقت/.test(m);
  return /currency is not configured|payment/.test(m);
};
