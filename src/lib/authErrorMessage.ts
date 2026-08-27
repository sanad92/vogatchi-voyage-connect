type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

const readAuthError = (error: unknown): AuthErrorLike =>
  typeof error === 'object' && error !== null ? error : {};

export const getAuthErrorMessage = (
  error: unknown,
  fallback = 'فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.',
) => {
  const authError = readAuthError(error);
  const code = typeof authError.code === 'string' ? authError.code.toLowerCase() : '';
  const message = typeof authError.message === 'string' ? authError.message.trim() : '';
  const normalized = `${code} ${message}`.toLowerCase();

  if (
    code === 'invalid_credentials' ||
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }

  if (code === 'email_not_confirmed' || normalized.includes('email not confirmed')) {
    return 'البريد الإلكتروني لم يتم تأكيده بعد. افتح رسالة التأكيد في بريدك ثم حاول مرة أخرى.';
  }

  if (code === 'user_banned' || normalized.includes('user is banned')) {
    return 'هذا الحساب موقوف. تواصل مع مدير النظام لإعادة تفعيله.';
  }

  if (
    authError.status === 429 ||
    code.includes('rate_limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('rate limit')
  ) {
    return 'تم تجاوز عدد محاولات تسجيل الدخول مؤقتًا. انتظر دقائق قليلة ثم حاول مرة أخرى.';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت ثم أعد المحاولة.';
  }

  if (code === 'captcha_failed' || normalized.includes('captcha')) {
    return 'فشل التحقق الأمني. حدّث الصفحة ثم حاول مرة أخرى.';
  }

  return message ? `تعذر تسجيل الدخول: ${message}` : fallback;
};
