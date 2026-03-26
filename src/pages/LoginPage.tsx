import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';

import AuthLayout from '@/components/auth/AuthLayout';
import OrganizationSetupNotice from '@/components/auth/OrganizationSetupNotice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, loading, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();

  const loggedIn = isLoggedIn();
  const loggedInWithoutOrganization = loggedIn && !hasOrganization;

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

  if (loggedIn && hasOrganization) {
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
      <div className="lg:hidden text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-3">Hostretor.online - Travel ERP System</h1>
        <p className="text-muted-foreground text-sm mt-1">نظام إدارة شركة السياحة</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">مرحباً بعودتك</h2>
          <p className="text-muted-foreground mt-1">
            {loggedInWithoutOrganization
              ? 'الحساب الحالي يحتاج إلى إنشاء مؤسسة قبل المتابعة.'
              : 'سجّل دخولك للوصول إلى لوحة التحكم'}
          </p>
        </div>

        {loggedInWithoutOrganization ? (
          <OrganizationSetupNotice />
        ) : (
          <>
            <form onSubmit={handleSignIn} className="space-y-5">
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    disabled={loading}
                    className="text-right pr-10 h-12"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">كلمة المرور</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-right pr-10 h-12"
                    placeholder="أدخل كلمة المرور"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    جاري تسجيل الدخول...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn size={18} />
                    تسجيل الدخول
                  </div>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                أنشئ حساب جديد
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
