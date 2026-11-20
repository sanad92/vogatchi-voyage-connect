import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import VogantraLogo from '@/components/brand/VogantraLogo';
import PasswordChecklist from '@/components/auth/PasswordChecklist';
import { getPasswordPolicyError, PASSWORD_MIN_LENGTH } from '@/lib/passwordRules';
import { getSafeInternalRedirect } from '@/lib/safeRedirect';
import { isFreeEmail, BUSINESS_EMAIL_MESSAGE } from '@/lib/business-email';
import { getSignupAuthError } from '@/lib/authErrorMessage';

const signupFields = ['name', 'email', 'password'] as const;
type SignupField = typeof signupFields[number];
type FieldErrors = Partial<Record<SignupField, string>>;

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const pendingFieldFocus = useRef<SignupField | null>(null);
  const focusEmailAfterEdit = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationTitle = useRef<HTMLParagraphElement>(null);
  const { signUp, loading, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();
  const [searchParams] = useSearchParams();
  const requestedRedirect = getSafeInternalRedirect(searchParams.get('redirect'));
  const isAgency = requestedRedirect === '/pilgrimage/agency';
  const isInvitation = requestedRedirect?.startsWith('/accept-invite') ?? false;
  const loggedIn = isLoggedIn();
  const showPasswordGuidance = Boolean(password || fieldErrors.password);

  useEffect(() => {
    const target = pendingFieldFocus.current;
    if (!target || submitting) return;
    pendingFieldFocus.current = null;
    const inputs = { name: nameInput, email: emailInput, password: passwordInput };
    inputs[target].current?.focus();
  }, [fieldErrors, submitting]);

  useEffect(() => {
    if (confirmationEmail) {
      confirmationTitle.current?.focus();
    } else if (focusEmailAfterEdit.current) {
      focusEmailAfterEdit.current = false;
      emailInput.current?.focus();
    }
  }, [confirmationEmail]);

  if (!submitting && (loading || (loggedIn && !requestedRedirect && orgLoading))) {
    return (
      <AuthLayout>
        <div role="status" className="flex items-center justify-center gap-3 text-muted-foreground">
          <div aria-hidden="true" className="size-5 animate-spin rounded-full border-b-2 border-primary" />
          جارٍ التحميل…
        </div>
      </AuthLayout>
    );
  }

  if (!submitting && loggedIn) {
    if (requestedRedirect) return <Navigate to={requestedRedirect} replace />;
    return <Navigate to={hasOrganization ? '/dashboard' : '/create-organization'} replace />;
  }

  const updateField = (field: SignupField, value: string) => {
    const values = { name: setFullName, email: setEmail, password: setPassword };
    values[field](value);
    if (fieldErrors[field]) setFieldErrors(previous => ({ ...previous, [field]: undefined }));
    if (formError) setFormError('');
  };

  const showSignupError = (error: unknown) => {
    const { field, message } = getSignupAuthError(error);
    if (field) {
      pendingFieldFocus.current = field;
      setFieldErrors({ [field]: message });
    } else {
      setFormError(message);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInFlight.current) return;

    setFormError('');
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const nextErrors: FieldErrors = {};
    if (!trimmedName) nextErrors.name = 'اكتب اسمك الكامل.';
    if (!normalizedEmail) {
      nextErrors.email = 'اكتب بريد العمل الرسمي.';
    } else if (emailInput.current?.validity.typeMismatch) {
      nextErrors.email = 'راجع صيغة بريد العمل واكتب عنوانًا صالحًا.';
    } else if (isFreeEmail(normalizedEmail)) {
      nextErrors.email = BUSINESS_EMAIL_MESSAGE;
    }
    nextErrors.password = password ? getPasswordPolicyError(password) : 'اكتب كلمة مرور لحسابك.';

    const firstError = signupFields.find(field => Boolean(nextErrors[field]));
    pendingFieldFocus.current = firstError ?? null;
    setFieldErrors(nextErrors);
    if (firstError) return;

    requestInFlight.current = true;
    setSubmitting(true);
    try {
      const result = await signUp(normalizedEmail, password, trimmedName, requestedRedirect || undefined);
      if (result.error) {
        showSignupError(result.error);
      } else if (result.confirmationRequired) {
        setConfirmationEmail(normalizedEmail);
        setPassword('');
        setShowPassword(false);
      }
    } catch (error) {
      showSignupError(error);
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-5 text-center lg:hidden">
        <Link to="/" className="inline-flex">
          <VogantraLogo size="lg" />
        </Link>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAgency ? 'إنشاء حساب وكيل الحج والعمرة' : 'إنشاء حساب جديد'}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {isAgency ? 'استخدم بريد العمل المسجل في اتفاقية الوكالة.' : isInvitation
              ? 'أنشئ حسابك باستخدام بريد العمل الذي وصلك عليه رابط الدعوة.'
              : 'سجّل شركتك وابدأ تجربتك المجانية لمدة 7 أيام.'}
          </p>
        </div>

        {confirmationEmail ? (
          <Alert role="status">
            <AlertDescription className="space-y-3">
              <p ref={confirmationTitle} tabIndex={-1} className="font-semibold">راجع بريد العمل لإكمال التسجيل</p>
              <p>افتح رسالة التأكيد على <bdi>{confirmationEmail}</bdi> وتابع من الرابط. لو الرسالة مش ظاهرة، راجع البريد غير المرغوب فيه.</p>
              <Button type="button" variant="outline" onClick={() => {
                focusEmailAfterEdit.current = true;
                setConfirmationEmail(null);
              }}>
                تغيير البريد
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSignUp} noValidate aria-busy={submitting} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-fullname">الاسم الكامل</Label>
              <div className="relative">
                <Input
                  ref={nameInput}
                  id="signup-fullname"
                  autoComplete="name"
                  value={fullName}
                  onChange={event => updateField('name', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                  required
                  className="h-11 ps-10"
                  disabled={submitting}
                />
                <User aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {fieldErrors.name && <p id="signup-name-error" role="alert" className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email">بريد العمل الرسمي</Label>
              <div className="relative">
                <Input
                  ref={emailInput}
                  id="signup-email"
                  aria-describedby={fieldErrors.email ? 'signup-email-hint signup-email-error' : 'signup-email-hint'}
                  aria-invalid={Boolean(fieldErrors.email)}
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  dir="ltr"
                  value={email}
                  onChange={event => updateField('email', event.target.value)}
                  required
                  className="h-11 pl-10 text-left"
                  placeholder="name@company.com"
                  disabled={submitting}
                />
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p id="signup-email-hint" className="text-xs text-muted-foreground">
                {isAgency ? 'استخدم البريد المسجل في اتفاقية الوكالة.' : 'استخدم عنوانًا على نطاق شركتك. هنرسل عليه رابط التأكيد.'}
              </p>
              {fieldErrors.email && <p id="signup-email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  ref={passwordInput}
                  id="signup-password"
                  autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => updateField('password', event.target.value)}
                  aria-describedby={showPasswordGuidance ? 'signup-password-guidance' : 'signup-password-hint'}
                  aria-invalid={Boolean(fieldErrors.password)}
                  required
                  className="h-11 pe-12 ps-10"
                  disabled={submitting}
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-controls="signup-password"
                  className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                </button>
                <Lock aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {showPasswordGuidance ? (
                <PasswordChecklist id="signup-password-guidance" password={password} error={fieldErrors.password} />
              ) : (
                <p id="signup-password-hint" className="text-xs text-muted-foreground">استخدم {PASSWORD_MIN_LENGTH} أحرف على الأقل.</p>
              )}
            </div>

            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={submitting}>
              {submitting ? (
                <>
                  <span aria-hidden="true" className="size-4 animate-spin rounded-full border-b-2 border-primary-foreground" />
                  جاري إنشاء الحساب…
                </>
              ) : (
                <>
                  <UserPlus aria-hidden="true" size={18} />
                  إنشاء حساب
                </>
              )}
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link
            to={requestedRedirect ? `/login?redirect=${encodeURIComponent(requestedRedirect)}` : '/login'}
            className="font-semibold text-primary hover:underline"
          >
            سجّل دخول
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isAgency ? 'بعد تأكيد البريد، ستعود إلى بوابة الوكيل.' : isInvitation
            ? 'بعد تأكيد البريد، ستعود لقبول دعوة المؤسسة.'
            : 'بعد تأكيد بريدك، أكمِل بيانات شركتك وابدأ التجربة المجانية.'}
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
