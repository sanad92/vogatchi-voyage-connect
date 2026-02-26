import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthHeader from '@/components/auth/AuthHeader';

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
    if (!hasOrganization) {
      return <Navigate to="/register-organization" replace />;
    }
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
      setError('فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <AuthLayout>
      <AuthHeader />
      <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border">
        <h2 className="text-xl font-semibold text-foreground text-center mb-6">إنشاء حساب جديد</h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="signup-fullname">الاسم الكامل</Label>
            <Input id="signup-fullname" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="text-right" placeholder="أدخل اسمك الكامل" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">البريد الإلكتروني</Label>
            <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="text-right" placeholder="أدخل بريدك الإلكتروني" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">كلمة المرور</Label>
            <div className="relative">
              <Input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="text-right pr-10" placeholder="6 أحرف على الأقل" disabled={loading} minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" disabled={loading}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> جاري إنشاء الحساب...</div>
            ) : (
              <div className="flex items-center gap-2"><UserPlus size={16} /> إنشاء حساب</div>
            )}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            سجّل دخول
          </Link>
        </div>
      </div>
      <div className="text-center text-sm text-muted-foreground mt-4">
        <p>بعد إنشاء الحساب، ستقوم بتسجيل بيانات شركتك للبدء في استخدام النظام.</p>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
