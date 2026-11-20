import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SafarERPLogo from '@/components/brand/VogantraLogo';
import PasswordChecklist from '@/components/auth/PasswordChecklist';
import { getPasswordPolicyError } from '@/lib/passwordRules';
import { getPasswordAuthErrorMessage } from '@/lib/authErrorMessage';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const requestPending = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestPending.current) return;
    setError('');
    setPasswordError('');
    setConfirmationError('');

    const passwordFeedback = getPasswordPolicyError(password, { requireMixedCharacters: true });
    if (passwordFeedback) {
      setPasswordError(passwordFeedback);
      passwordInput.current?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setConfirmationError('كلمتا المرور غير متطابقتين.');
      confirmInput.current?.focus();
      return;
    }

    requestPending.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (cause) {
      const feedback = getPasswordAuthErrorMessage(cause);
      if (feedback) {
        setPasswordError(feedback);
        return;
      }
      setError('تعذّر تحديث كلمة المرور. لو رابط الاستعادة انتهت صلاحيته، اطلب رابطًا جديدًا.');
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" aria-label="الصفحة الرئيسية" className="inline-flex items-center">
            <SafarERPLogo size="md" />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">تعيين كلمة مرور جديدة</CardTitle>
            <CardDescription>أدخل كلمة المرور الجديدة</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">تم التغيير بنجاح!</h3>
                <Button asChild><Link to="/login">متابعة إلى تسجيل الدخول</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertDescription className="space-y-2 text-destructive">
                      <p>{error}</p>
                      <Link to="/forgot-password" className="inline-block underline">اطلب رابط استعادة جديد</Link>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="password" ref={passwordInput} dir="ltr"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setPasswordError('');
                        setConfirmationError('');
                      }}
                      autoComplete="new-password"
                      aria-describedby="reset-password-guidance"
                      aria-invalid={Boolean(passwordError)}
                      placeholder="أدخل كلمة مرور"
                      required
                      disabled={loading}
                      className="pe-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <PasswordChecklist id="reset-password-guidance" password={password} error={passwordError} requireMixedCharacters />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm" ref={confirmInput} dir="ltr"
                    type="password"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      setConfirmationError('');
                    }}
                    autoComplete="new-password"
                    aria-invalid={Boolean(confirmationError)}
                    aria-describedby={confirmationError ? 'confirmation-error' : undefined}
                    placeholder="أعد إدخال كلمة المرور"
                    required
                    disabled={loading}
                  />
                  {confirmationError && <p id="confirmation-error" role="alert" className="text-sm text-destructive">{confirmationError}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'تعيين كلمة المرور'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
