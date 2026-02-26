import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthHeader from '@/components/auth/AuthHeader';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, loading, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn()) {
    if (!hasOrganization) {
      return <Navigate to="/register-organization" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    const result = await signIn(email, password);
    if (result.error) {
      setError('فشل في تسجيل الدخول. يرجى التحقق من البيانات.');
    }
  };

  return (
    <AuthLayout>
      <AuthHeader />
      <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border">
        <h2 className="text-xl font-semibold text-foreground text-center mb-6">تسجيل الدخول</h2>
        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="signin-email">البريد الإلكتروني</Label>
            <Input id="signin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="أدخل بريدك الإلكتروني" disabled={loading} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">كلمة المرور</Label>
            <div className="relative">
              <Input id="signin-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="text-right pr-10" placeholder="أدخل كلمة المرور" disabled={loading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" disabled={loading}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> جاري تسجيل الدخول...</div>
            ) : (
              <div className="flex items-center gap-2"><LogIn size={16} /> تسجيل الدخول</div>
            )}
          </Button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            أنشئ حساب جديد
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
