import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signUp, loading, isLoggedIn } = useOptimizedAuth();
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
    if (!hasOrganization) return <Navigate to="/register-organization" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !fullName) {
      setError('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    const result = await signUp(email, password, fullName);
    if (result.error) {
      const errorMsg = (result.error as any)?.message || (result.error as any)?.code || '';
      if (errorMsg.includes('already') || errorMsg.includes('user_already_exists')) {
        setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.');
      } else {
        setError('فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  return (
    <AuthLayout>
      {/* Mobile logo */}
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
          <h2 className="text-2xl font-bold text-foreground">إنشاء حساب جديد</h2>
          <p className="text-muted-foreground mt-1">سجّل شركتك وابدأ تجربتك المجانية لـ 14 يوم</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="signup-fullname">الاسم الكامل</Label>
            <div className="relative">
              <Input
                id="signup-fullname"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="text-right pr-10 h-12"
                placeholder="أدخل اسمك الكامل"
                disabled={loading}
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">البريد الإلكتروني</Label>
            <div className="relative">
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="text-right pr-10 h-12"
                placeholder="name@company.com"
                disabled={loading}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="text-right pr-10 h-12"
                placeholder="6 أحرف على الأقل"
                disabled={loading}
                minLength={6}
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
                جاري إنشاء الحساب...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus size={18} />
                إنشاء حساب
              </div>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            سجّل دخول
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          بعد إنشاء الحساب، ستقوم بتسجيل بيانات شركتك للبدء في استخدام النظام.
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
