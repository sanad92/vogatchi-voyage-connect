import { useRef, useState } from 'react';
import SafarERPLogo from '@/components/brand/VogantraLogo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedAddress, setSubmittedAddress] = useState('');
  const requestPending = useRef(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestPending.current) return;
    setError('');
    const address = email.trim().toLowerCase();
    if (!address) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    requestPending.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error && error.code !== 'user_not_found') {
        setError(error.status === 429 || error.code === 'over_email_send_rate_limit'
          ? 'تم طلب رسائل كثيرة. انتظر قليلًا ثم أعد المحاولة.'
          : 'تعذّر طلب رابط الاستعادة. حاول مرة أخرى.');
        return;
      }
      setSubmittedAddress(address);
    } catch {
      setError('تعذّر الاتصال بخدمة الاستعادة. تحقق من اتصالك ثم حاول مرة أخرى.');
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" aria-label="العودة إلى صفحة SafarERP الرئيسية" className="inline-flex items-center mb-4">
            <SafarERPLogo size="md" />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">استعادة كلمة المرور</CardTitle>
            <CardDescription>
              أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submittedAddress ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">راجع بريدك</h3>
                <p role="status" className="text-muted-foreground text-sm">
                  لو فيه حساب مسجّل بالبريد <bdi className="break-all font-medium">{submittedAddress}</bdi> هيوصلك رابط الاستعادة.
                  راجع صندوق الوارد والبريد غير المرغوب فيه.
                </p>
                <Button asChild variant="outline" className="mt-4 gap-2">
                  <Link to="/login">
                    <ArrowRight className="h-4 w-4" />
                    العودة لتسجيل الدخول
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      dir="ltr"
                      autoComplete="email"
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="name@company.com"
                      required
                      disabled={loading}
                      className="ps-10"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </Button>
                <div className="text-center">
                  <Link to="/login" className="text-sm text-primary hover:underline">
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
