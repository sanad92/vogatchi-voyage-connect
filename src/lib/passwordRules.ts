export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_LENGTH_MESSAGE = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
export const PASSWORD_MAX_BYTES_MESSAGE = 'حجم كلمة المرور أكبر من الحد المسموح (٧٢ بايت). استخدم كلمة أقصر، خصوصًا مع الحروف العربية أو الرموز.';
const PASSWORD_MIXED_CHARACTERS_MESSAGE = 'أضف حرفًا إنجليزيًا كبيرًا وحرفًا إنجليزيًا صغيرًا ورقمًا.';

export function getPasswordChecks(password: string) {
  const characters = [...password].length;
  return {
    length: characters >= PASSWORD_MIN_LENGTH,
    withinLimit: new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
    longer: characters >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*()_+\-=[\]{};'\x22|<>?,./:~`\\]/.test(password),
  };
}

export function getPasswordPolicyError(
  password: string,
  { requireMixedCharacters = false }: { requireMixedCharacters?: boolean } = {},
): string | undefined {
  const checks = getPasswordChecks(password);
  if (!checks.length) return PASSWORD_LENGTH_MESSAGE;
  if (!checks.withinLimit) return PASSWORD_MAX_BYTES_MESSAGE;
  if (requireMixedCharacters && !(checks.uppercase && checks.lowercase && checks.number)) {
    return PASSWORD_MIXED_CHARACTERS_MESSAGE;
  }
  return undefined;
}
