
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAcceptInvitation } from '@/hooks/useInvitations';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Loader2, UserPlus } from 'lucide-react';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const token = searchParams.get('token');
  const acceptMutation = useAcceptInvitation();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    if (!user) return;
    
    acceptMutation.mutateAsync(token).then((data) => {
      setResult(data);
    }).catch((err) => {
      setResult({ success: false, error: err.message });
    });
  }, [token, user]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />
              دعوة للانضمام
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">يجب تسجيل الدخول أولاً لقبول الدعوة</p>
            <Button onClick={() => navigate(`/login?redirect=/accept-invite?token=${token}`)}>
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isPending || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
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
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
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
