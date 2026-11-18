export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_LENGTH_MESSAGE = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';

export function getPasswordChecks(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    longer: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*()_+\-=[\]{};'\x22|<>?,./:~`\\]/.test(password),
  };
}
