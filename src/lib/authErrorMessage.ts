type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  reasons?: unknown;
  status?: unknown;
};

const readAuthError = (error: unknown): AuthErrorLike =>
  typeof error === 'object' && error !== null ? error : {};

const authErrorCode = (error: AuthErrorLike) =>
  typeof error.code === 'string' ? error.code.toLowerCase() : '';

const isConnectionError = (value: string) =>
  /failed to fetch|networkerror|network request failed|load failed|fetch failed/.test(value);

export const getAuthErrorMessage = (
  error: unknown,
  fallback = 'فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.',
) => {
  const authError = readAuthError(error);
  const code = authErrorCode(authError);
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

  if (isConnectionError(normalized)) {
    return 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت ثم أعد المحاولة.';
  }

  if (code === 'captcha_failed' || normalized.includes('captcha')) {
    return 'فشل التحقق الأمني. حدّث الصفحة ثم حاول مرة أخرى.';
  }

  return message ? `تعذر تسجيل الدخول: ${message}` : fallback;
};

export function getPasswordAuthErrorMessage(error: unknown): string | undefined {
  const authError = readAuthError(error);
  const code = authErrorCode(authError);
  const message = typeof authError.message === 'string' ? authError.message : '';
  const reasons = Array.isArray(authError.reasons) ? authError.reasons : [];
  const knownWeak = /known to be weak|easy to guess/i.test(message);
  const minimum = message.match(/password (?:should|must) be at least (\d+) characters/i)?.[1];
  const requiresCharacters = /password should contain at least one character of each/i.test(message);
  const exceedsMaximum = /password cannot be longer than \d+ characters|password is too long|password length exceeds \d+ bytes/i.test(message);

  if (code === 'same_password') {
    return 'اختَر كلمة مرور مختلفة عن الكلمة المستخدمة حاليًا.';
  }
  if (exceedsMaximum && (!code || code === 'validation_failed' || code === 'weak_password')) {
    return 'كلمة المرور أكبر من الحد المسموح به. استخدم كلمة أقصر.';
  }
  if (code !== 'weak_password' && !knownWeak && !minimum && !requiresCharacters) return undefined;
  if (reasons.includes('pwned') || knownWeak) {
    return 'كلمة المرور دي شائعة أو سهلة التخمين. اختَر كلمة مرور مختلفة وأطول.';
  }
  if (minimum) return `كلمة المرور أقصر من المطلوب. استخدم ${minimum} أحرف على الأقل.`;
  if (reasons.includes('length')) {
    return 'كلمة المرور أقصر من المطلوب. استخدم كلمة مرور أطول.';
  }
  if (reasons.includes('characters') || requiresCharacters) {
    const required = [
      message.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ') && 'حرف إنجليزي كبير',
      message.includes('abcdefghijklmnopqrstuvwxyz') && 'حرف إنجليزي صغير',
      message.includes('0123456789') && 'رقم',
      message.includes('!@#$%^&*()') && 'رمز مثل ! أو #',
    ].filter(Boolean);
    if (requiresCharacters && required.length > 0) {
      return `لازم كلمة المرور تحتوي على ${required.join('، ')}.`;
    }
    return 'جرّب حروفًا إنجليزية كبيرة وصغيرة مع أرقام. جرّب إضافة رمز لو ما زالت كلمة المرور مرفوضة.';
  }
  return 'كلمة المرور غير مقبولة. جرّب كلمة مرور أطول ومختلفة.';
}

type SignupAuthFeedback = { field?: 'email' | 'password'; message: string };

export function getSignupAuthError(error: unknown): SignupAuthFeedback {
  const authError = readAuthError(error);
  const code = authErrorCode(authError);
  const normalized = typeof authError.message === 'string' ? authError.message.trim().toLowerCase() : '';
  const passwordError = getPasswordAuthErrorMessage(error);
  if (passwordError) return { field: 'password', message: passwordError };

  if (code === 'user_already_exists' || code === 'email_exists' ||
    /user already registered|email (?:is )?already (?:registered|in use)|email address has already been registered/.test(normalized)) {
    return { field: 'email', message: 'البريد الإلكتروني ده مسجّل بالفعل. سجّل دخولك أو اطلب إعادة تعيين كلمة المرور.' };
  }
  if (code === 'email_address_invalid' || /invalid (?:email|email address)|unable to validate email address/.test(normalized)) {
    return { field: 'email', message: 'راجع عنوان البريد الإلكتروني واكتب بريد عمل صالحًا.' };
  }
  if (code === 'business_email_required' || /بريد العمل الرسمي|work email is required|business email is required/.test(normalized)) {
    return { field: 'email', message: 'التسجيل مخصص للشركات. استخدم بريد العمل الرسمي.' };
  }
  if (code === 'email_address_not_authorized') {
    return { message: 'تعذّر إرسال رسالة التأكيد للبريد ده حاليًا. تواصل مع الدعم.' };
  }
  if (authError.status === 429 || code.includes('rate_limit') || /too many requests|rate limit/.test(normalized)) {
    return { message: 'فيه محاولات تسجيل أو رسائل تأكيد كثيرة. انتظر شوية وحاول تاني.' };
  }
  if (isConnectionError(normalized)) {
    return { message: 'تعذّر الاتصال بخدمة التسجيل. راجع الإنترنت وحاول تاني.' };
  }
  if (code === 'captcha_failed') {
    return { message: 'تعذّر إكمال التحقق الأمني. حدّث الصفحة وحاول تاني.' };
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return { message: 'إنشاء حساب بالبريد الإلكتروني غير متاح حاليًا. تواصل مع الدعم.' };
  }
  return { message: 'تعذّر إنشاء الحساب حاليًا. حاول تاني، ولو المشكلة استمرت تواصل مع الدعم.' };
}
