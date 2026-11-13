import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import VogantraLogo from '@/components/brand/VogantraLogo';
import { getAuthErrorMessage } from '@/lib/authErrorMessage';

const PlatformLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signOut, isLoggedIn, loading } = useOptimizedAuth();
  const { isPlatformAdmin, loading: platformLoading } = usePlatformAdmin();

  if (loading || platformLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isLoggedIn() && isPlatformAdmin) return <Navigate to="/platform" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) setError(getAuthErrorMessage(result.error));
  };

  const deniedSession = isLoggedIn() && !isPlatformAdmin;

  return (
    <div dir="rtl" className="min-h-screen bg-sidebar flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><VogantraLogo size="lg" /></div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" /> لوحة إدارة المنصة
          </div>
          <h1 className="text-2xl font-bold text-foreground">دخول مشغّلي المنصة</h1>
          <p className="text-sm text-muted-foreground">هذه الصفحة مخصصة لفريق إدارة SafarERP فقط وليست لحسابات الشركات.</p>
        </div>

        {deniedSession ? (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive space-y-3">
              <p>هذا الحساب ليس لديه صلاحية إدارة المنصة.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => signOut()}>
                تسجيل الخروج والدخول بحساب آخر
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="platform-email">البريد الإلكتروني</Label>
              <div className="relative">
                <Input id="platform-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required disabled={submitting} className="text-right pr-10 h-12" placeholder="admin@safarerp.com" />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-password">كلمة المرور</Label>
              <div className="relative">
                <Input id="platform-password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required disabled={submitting}
                  className="text-right pr-10 h-12" placeholder="أدخل كلمة المرور" />
                <button type="button" onClick={() => setShowPassword(s => !s)} aria-label="إظهار كلمة المرور"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12" disabled={submitting}>
              <LogIn className="h-4 w-4 ml-2" /> {submitting ? 'جارٍ الدخول...' : 'دخول لوحة المنصة'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlatformLoginPage;
