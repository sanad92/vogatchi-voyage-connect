import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SupabaseAuthFormProps {
  defaultTab?: string;
}

const SupabaseAuthForm = ({ defaultTab = 'signin' }: SupabaseAuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, loading } = useOptimizedAuth();

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
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">مرحباً بك في Vogatchi</h1>
        <p className="text-muted-foreground">منصة إدارة شركات السياحة والسفر</p>
      </div>

      <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-6 mt-6">
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
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-6 mt-6">
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
                  <div className="flex items-center gap-2"><LogIn size={16} /> إنشاء حساب</div>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>بعد إنشاء الحساب، ستقوم بتسجيل بيانات شركتك للبدء في استخدام النظام.</p>
      </div>
    </div>
  );
};

export default SupabaseAuthForm;
