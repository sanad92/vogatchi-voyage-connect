import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signOut, loading, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();
  const { isPlatformAdmin, loading: platformLoading } = usePlatformAdmin();

  if (loading || orgLoading || platformLoading) {
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
    // Pure platform admin (no org) → go straight to platform
    if (isPlatformAdmin && !hasOrganization) return <Navigate to="/platform" replace />;
    if (!hasOrganization) return <Navigate to="/create-organization" replace />;
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
      {/* Mobile logo - visible only on small screens */}
      <div className="lg:hidden text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-3">Hostretor.online — Travel ERP System</h1>
        <p className="text-muted-foreground text-sm mt-1">نظام إدارة شركة السياحة</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">مرحباً بعودتك</h2>
          <p className="text-muted-foreground mt-1">سجّل دخولك للوصول إلى لوحة التحكم</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          {isLoggedIn() && !hasOrganization && (
            <Alert className="border-amber-300/80 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/70">
              <AlertDescription className="text-amber-900 dark:text-amber-200 space-y-3">
                <p>الحساب مسجل دخول بالفعل، لكن لا توجد مؤسسة مرتبطة به حتى الآن.</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/create-organization">
                    <Button type="button" size="sm" variant="secondary">إكمال إنشاء المؤسسة</Button>
                  </Link>
                  <Button type="button" size="sm" variant="outline" onClick={() => signOut()}>
                    تسجيل الخروج والدخول بحساب آخر
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

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
                onChange={e => setEmail(e.target.value)}
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
                onChange={e => setPassword(e.target.value)}
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
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
