
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { hasStoredAuthData, cleanupAuthState } from '@/utils/authCleanup';

const Auth = () => {
  const { user, loading, signIn, isLoggedIn, forceResetAuth } = useOptimizedAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForceLogin, setShowForceLogin] = useState(false);
  const [hasStoredAuth, setHasStoredAuth] = useState(false);

  console.log('🔐 صفحة Auth - المستخدم:', !!user, 'التحميل:', loading, 'مسجل دخول:', isLoggedIn());

  // التحقق من وجود بيانات مصادقة مخزنة
  useEffect(() => {
    const checkStoredAuth = () => {
      const hasStored = hasStoredAuthData();
      setHasStoredAuth(hasStored);
      console.log('🔍 فحص البيانات المخزنة:', hasStored);
      
      // إذا وُجدت بيانات مخزنة ولكن المستخدم ليس مسجل دخول، أظهر خيار إجبار تسجيل الدخول
      if (hasStored && !isLoggedIn() && !loading) {
        setShowForceLogin(true);
      }
    };
    
    checkStoredAuth();
    
    // فحص دوري كل ثانية
    const interval = setInterval(checkStoredAuth, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loading]);

  // دالة لإجبار تسجيل الخروج وإعادة التعيين
  const handleForceReset = async () => {
    console.log('🔄 إجبار إعادة تعيين المصادقة');
    setShowForceLogin(false);
    
    try {
      // استخدام forceResetAuth من useOptimizedAuth
      if (forceResetAuth) {
        await forceResetAuth();
      } else {
        // fallback إذا لم تكن متوفرة
        cleanupAuthState();
        window.location.reload();
      }
    } catch (error) {
      console.error('خطأ في إعادة التعيين:', error);
      // إعادة تحميل الصفحة كحل أخير
      window.location.reload();
    }
  };

  // فحص تسجيل الدخول مع delay للتأكد من انتهاء التحميل
  useEffect(() => {
    if (!loading && isLoggedIn() && !showForceLogin) {
      // تأخير صغير للتأكد من انتهاء جميع العمليات
      const redirectTimer = setTimeout(() => {
        console.log('✅ المستخدم مصادق عليه، التحويل إلى الداشبورد');
        // استخدام Navigate بدلاً من window.location للحصول على routing أفضل
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, loading, isLoggedIn, showForceLogin]);

  // إذا كان المستخدم مسجل دخول ولا نُظهر خيار إجبار تسجيل الدخول
  if (isLoggedIn() && !showForceLogin && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading && !showForceLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
          <Button 
            variant="outline" 
            onClick={handleForceReset}
            className="mt-4"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تعيين
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    console.log('🔐 محاولة تسجيل الدخول بالبريد الإلكتروني:', email);

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.error) {
        console.error('❌ فشل تسجيل الدخول:', result.error);
        setError('فشل في تسجيل الدخول. يرجى التحقق من البيانات.');
      } else {
        // إخفاء خيار إجبار تسجيل الدخول عند نجاح التسجيل
        setShowForceLogin(false);
      }
    } catch (error) {
      console.error('❌ خطأ تسجيل الدخول:', error);
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vogatchi CRM</h1>
          <p className="text-gray-600">نظام إدارة علاقات العملاء</p>
        </div>

        {/* تحذير إذا وُجدت بيانات مصادقة مخزنة */}
        {hasStoredAuth && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-amber-800">
              تم العثور على بيانات تسجيل دخول مخزنة. إذا كنت تواجه مشاكل، يرجى إعادة تعيين البيانات.
            </AlertDescription>
          </Alert>
        )}

        {/* تحذير إذا كان المستخدم مسجل دخول */}
        {isLoggedIn() && showForceLogin && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-amber-800">
              أنت مسجل دخول بالفعل. إذا كنت تريد تسجيل الدخول بحساب آخر، يرجى إعادة تعيين البيانات أولاً.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-center text-xl">تسجيل الدخول</CardTitle>
          </CardHeader>
          <CardContent>
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
                  disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
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

            {/* خيارات إضافية */}
            <div className="mt-4 space-y-2">
              {/* إذا وُجدت بيانات مخزنة أو كان المستخدم مسجل دخول، أظهر زر إعادة التعيين */}
              {(hasStoredAuth || (isLoggedIn() && showForceLogin)) && (
                <Button 
                  variant="outline" 
                  onClick={handleForceReset}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة تعيين البيانات وتسجيل دخول جديد
                </Button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>نظام محمي - للموظفين المصرح لهم فقط</p>
            </div>
          </CardContent>
        </Card>

        {/* معلومات debug في وضع التطوير */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <div>حالة التصحيح:</div>
            <div>• مستخدم: {user ? '✅' : '❌'}</div>
            <div>• تحميل: {loading ? '✅' : '❌'}</div>
            <div>• مسجل دخول: {isLoggedIn() ? '✅' : '❌'}</div>
            <div>• بيانات مخزنة: {hasStoredAuth ? '✅' : '❌'}</div>
            <div>• إظهار إجبار: {showForceLogin ? '✅' : '❌'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
