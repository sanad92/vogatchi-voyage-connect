import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import LoginWelcome from './LoginWelcome';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, isLoading } = useSimpleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    const result = await signIn({ email, password });
    if (result.error) {
      setError('فشل في تسجيل الدخول. يرجى التحقق من البيانات.');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">مرحباً بك في نظام فوجاتچي</h1>
        <p className="text-gray-600">نظام إدارة شركة السياحة والسفر</p>
      </div>

      <LoginWelcome />

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl">
        <h2 className="text-xl font-semibold text-center mb-6">تسجيل الدخول</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-right"
              placeholder="أدخل بريدك الإلكتروني"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-right">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-right pr-10"
                placeholder="أدخل كلمة المرور"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                جاري تسجيل الدخول...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn size={16} />
                تسجيل الدخول
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;