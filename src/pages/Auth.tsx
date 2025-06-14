
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const Auth = () => {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSuperAdmin, setIsCreatingSuperAdmin] = useState(false);

  // إعادة توجيه المستخدمين المسجلين
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    await signIn(email, password);
    setIsLoading(false);
  };

  const createSuperAdmin = async () => {
    setIsCreatingSuperAdmin(true);
    
    try {
      // إنشاء المستخدم
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'Res@vogatchitrips.com',
        password: 'Voga@12345@',
        options: {
          data: {
            full_name: 'Super Admin'
          }
        }
      });

      if (authError) {
        // إذا كان المستخدم موجود بالفعل، نحاول تسجيل الدخول
        if (authError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'Res@vogatchitrips.com',
            password: 'Voga@12345@'
          });
          
          if (signInError) {
            toast({
              title: "خطأ",
              description: "فشل في تسجيل الدخول للسوبر أدمن",
              variant: "destructive",
            });
            return;
          }
        } else {
          throw authError;
        }
      }

      // الحصول على المستخدم الحالي
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // تحديث الملف الشخصي ليكون نشط
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', currentUser.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // إضافة دور السوبر أدمن
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: currentUser.id,
            role: 'super_admin'
          });

        if (roleError) {
          console.error('Role assignment error:', roleError);
        }

        toast({
          title: "تم إنشاء السوبر أدمن بنجاح",
          description: "مرحباً بك في نظام Vogatchi CRM",
        });

        // إعادة تحميل الصفحة للحصول على الصلاحيات الجديدة
        window.location.reload();
      }
    } catch (error) {
      console.error('Super admin creation error:', error);
      toast({
        title: "خطأ في إنشاء السوبر أدمن",
        description: "حدث خطأ أثناء إنشاء حساب السوبر أدمن",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSuperAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-blue-700">Vogatchi CRM</h1>
          <p className="text-gray-600 mt-2">نظام إدارة شركة السياحة</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-center text-xl text-gray-800">
              تسجيل الدخول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vogatchi.com"
                  required
                  dir="ltr"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="mt-4">
              <Button
                onClick={createSuperAdmin}
                disabled={isCreatingSuperAdmin}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                variant="outline"
              >
                <Shield className="w-4 h-4 mr-2" />
                {isCreatingSuperAdmin ? 'جارٍ إنشاء السوبر أدمن...' : 'إنشاء حساب السوبر أدمن'}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">ملاحظة مهمة:</h3>
              <p className="text-sm text-amber-700 mb-2">
                تم إلغاء التسجيل الذاتي. يتم إنشاء الحسابات الجديدة فقط من خلال السوبر أدمن.
                إذا كنت بحاجة لحساب جديد، يرجى التواصل مع الإدارة.
              </p>
              <p className="text-xs text-amber-600">
                للمرة الأولى فقط: اضغط على زر "إنشاء حساب السوبر أدمن" لإنشاء الحساب الأول.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>نظام محمي - للموظفين المصرح لهم فقط</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
