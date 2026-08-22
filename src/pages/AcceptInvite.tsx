
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAcceptInvitation, type AcceptInvitationResult } from '@/hooks/useInvitations';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Loader2, UserPlus } from 'lucide-react';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useOptimizedAuth();
  const token = searchParams.get('token');
  const { mutateAsync: acceptInvitation, isPending } = useAcceptInvitation();
  const [result, setResult] = useState<AcceptInvitationResult | null>(null);
  const redirectPath = token ? `/accept-invite?token=${encodeURIComponent(token)}` : '/accept-invite';

  useEffect(() => {
    if (!token) return;
    if (!user || result || isPending) return;
    
    acceptInvitation(token).then((data) => {
      setResult(data);
    }).catch((error: unknown) => {
      setResult({ success: false, error: error instanceof Error ? error.message : 'تعذر قبول الدعوة' });
    });
  }, [token, user, result, isPending, acceptInvitation]);

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">رابط غير صالح</h2>
            <p className="text-muted-foreground">رابط الدعوة غير صحيح أو مفقود</p>
            <Button onClick={() => navigate('/login')} className="mt-4">تسجيل الدخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />
              دعوة للانضمام
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">يجب تسجيل الدخول أولاً لقبول الدعوة</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)}>
                تسجيل الدخول
              </Button>
              <Button variant="outline" onClick={() => navigate(`/signup?redirect=${encodeURIComponent(redirectPath)}`)}>
                إنشاء حساب جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending || !result) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">جاري قبول الدعوة...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background" dir="rtl">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {result.success ? (
            <>
              <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">تم قبول الدعوة</h2>
              <p className="text-muted-foreground mb-4">{result.message}</p>
              <Button onClick={() => { window.location.href = '/dashboard'; }}>
                الذهاب للوحة التحكم
              </Button>
            </>
          ) : (
            <>
              <X className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">فشل قبول الدعوة</h2>
              <p className="text-muted-foreground mb-4">{result.error}</p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                العودة
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
